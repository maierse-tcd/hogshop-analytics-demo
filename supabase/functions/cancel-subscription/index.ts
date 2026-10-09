import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createLogger } from "../_shared/posthog-logger.ts";
import { createTracer, parseTraceparent, SpanKind } from "../_shared/otel.ts";
import { createMetrics } from "../_shared/metrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, traceparent, x-app-version",
};

const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://ph.hogflix.dev";
const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY") || "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

function parseStackFrames(stack?: string) {
  if (!stack) return undefined;
  const frames = stack.split("\n").slice(1).map((line) => {
    const m = line.trim().match(/^at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
    if (!m) return null;
    return { function: m[1] || "<anonymous>", filename: m[2], lineno: Number(m[3]), colno: Number(m[4]), platform: "custom", lang: "javascript", in_app: true };
  }).filter(Boolean).reverse();
  return frames.length ? { type: "raw", frames } : undefined;
}

async function reportException(error: unknown, fn: string, versionNumber: string, distinctId?: string) {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: "$exception",
        distinct_id: distinctId || "hogshop-edge",
        properties: {
          $exception_list: [{ type: err.name || "Error", value: err.message, mechanism: { handled: true, synthetic: false }, stacktrace: parseStackFrames(err.stack) }],
          $exception_level: "error",
          function: fn,
          source: "edge_function",
          version_number: versionNumber,
          $geoip_disable: true,
        },
      }),
    });
  } catch (_) { /* never throw from reporting */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const incoming = parseTraceparent(req.headers.get("traceparent"));
  const tracer = createTracer("hogshop-edge", incoming);
  const metrics = createMetrics("hogshop-edge");
  const requestStartedAt = Date.now();
  let requestStatus: "ok" | "error" = "ok";
  let logRef: ReturnType<typeof createLogger> | null = null;
  let errorDistinctId: string | undefined;

  try {
    return await tracer.withSpan(
      "cancel-subscription.handle_request",
      async (rootSpan) => {
        rootSpan.setAttributes({
          "http.method": req.method,
          "http.route": "/functions/v1/cancel-subscription",
          "trace.distributed": incoming !== null,
        });

        const log = createLogger("cancel-subscription", {
          traceId: rootSpan.traceId,
          spanId: rootSpan.spanId,
        });
        logRef = log;
        log.info("Function started");

        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

        const { email } = await req.json();
        if (!email || typeof email !== "string") {
          throw new Error("Email is required in request body");
        }
        errorDistinctId = email;
        rootSpan.setAttribute("customer.email", email);
        log.info("Email received", { email });

        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

        const customerId = await tracer.withSpan(
          "stripe.customer.list",
          async (span) => {
            span.setAttributes({ "stripe.api": "customers.list", "customer.email": email });
            const customers = await stripe.customers.list({ email, limit: 1 });
            if (customers.data.length === 0) throw new Error("No Stripe customer found for this email");
            span.setAttribute("customer.id", customers.data[0].id);
            return customers.data[0].id;
          },
          { kind: SpanKind.CLIENT },
        );
        log.info("Found Stripe customer", { customerId });

        const subscriptions = await tracer.withSpan(
          "stripe.subscriptions.list_active",
          async (span) => {
            span.setAttribute("stripe.api", "subscriptions.list");
            const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 100 });
            if (subs.data.length === 0) throw new Error("No active subscription found to cancel");
            span.setAttribute("subscription.count", subs.data.length);
            return subs.data;
          },
          { kind: SpanKind.CLIENT },
        );
        log.info("Found active subscriptions", { count: subscriptions.length, ids: subscriptions.map((s) => s.id) });

        const cancelledSubscriptions = await tracer.withSpan(
          "stripe.subscriptions.cancel_all",
          async (span) => {
            span.setAttributes({
              "stripe.api": "subscriptions.cancel",
              "subscription.count": subscriptions.length,
              "subscription.ids": subscriptions.map((s) => s.id).join(","),
            });
            const results = [];
            for (const sub of subscriptions) {
              const c = await stripe.subscriptions.cancel(sub.id);
              results.push(c);
            }
            return results;
          },
          { kind: SpanKind.CLIENT },
        );
        const cancelledSubscription = cancelledSubscriptions[0];
        const cancelledIds = cancelledSubscriptions.map((c) => c.id);
        const firstTs = (cancelledSubscription as any).canceled_at;
        const firstIso = typeof firstTs === "number" ? new Date(firstTs * 1000).toISOString() : new Date().toISOString();
        log.info("Subscriptions cancelled", {
          count: cancelledSubscriptions.length,
          ids: cancelledIds,
        });

        // Take icp_type / company_key / company_name from the first subscription that has them
        // (`subscriptions` is already the array of subscriptions). Defensive: nothing after the
        // Stripe cancel may ever fail the request.
        let icpType: string = "B2C";
        let icpTypeFound = false;
        let companyKey: string | undefined = undefined;
        let companyName: string | undefined = undefined;
        try {
          for (const sub of subscriptions) {
            const meta = (sub as any).metadata ?? {};
            if (!icpTypeFound && meta.icp_type) {
              icpType = meta.icp_type;
              icpTypeFound = true;
            }
            if (!companyKey && meta.company_key) companyKey = meta.company_key;
            if (!companyName && meta.company_name) companyName = meta.company_name;
          }
        } catch (metaErr) {
          log.warn("Subscription metadata extraction failed (non-critical)", { error: String(metaErr) });
          icpType = "B2C";
          icpTypeFound = false;
          companyKey = undefined;
          companyName = undefined;
        }

        // Churn context (monthly_value, plan_name, started_at, age) — defensive:
        // any failure here must NEVER fail the cancellation; properties just become null.
        let monthlyValue: number | null = null;
        let currency: string | null = null;
        let planNames: string[] = [];
        let startedIso: string | null = null;
        let subscriptionAgeDays: number | null = null;
        try {
          // Collect unique product ids across all cancelled subscriptions
          const productIds = new Set<string>();
          const priceFallbackName = new Map<string, string>(); // productId -> nickname/price id fallback
          let oldestStartTs: number | null = null;
          for (const sub of subscriptions) {
            for (const item of sub.items.data) {
              const price = (item as any).price ?? {};
              const unitAmount = typeof price.unit_amount === "number" ? price.unit_amount : 0;
              const quantity = typeof (item as any).quantity === "number" ? (item as any).quantity : 1;
              const amount = (unitAmount * quantity) / 100;
              if (amount > 0) {
                const interval = price.recurring?.interval;
                const normalized = interval === "year" ? amount / 12 : interval === "week" ? amount * 4.33 : amount;
                monthlyValue = (monthlyValue ?? 0) + normalized;
              }
              if (!currency && price.currency) currency = price.currency;
              const productId = typeof price.product === "string" ? price.product : price.product?.id;
              if (productId) {
                productIds.add(productId);
                if (!priceFallbackName.has(productId)) {
                  priceFallbackName.set(productId, price.nickname || price.id || "unknown");
                }
              }
            }
            const startedAt = (sub as any).start_date;
            if (typeof startedAt === "number" && !Number.isNaN(startedAt) && (oldestStartTs === null || startedAt < oldestStartTs)) {
              oldestStartTs = startedAt;
            }
          }
          monthlyValue = monthlyValue === null ? null : Math.round(monthlyValue * 100) / 100;

          // Resolve product names AFTER cancellation; failures fall back to nickname/price id
          const planNameSet = new Set<string>();
          for (const productId of productIds) {
            try {
              const product = await stripe.products.retrieve(productId);
              planNameSet.add(product.name || priceFallbackName.get(productId) || "unknown");
            } catch (prodErr) {
              log.warn("Product name lookup failed, using fallback", { productId, error: String(prodErr) });
              planNameSet.add(priceFallbackName.get(productId) || "unknown");
            }
          }
          planNames = Array.from(planNameSet);

          startedIso = oldestStartTs !== null ? new Date(oldestStartTs * 1000).toISOString() : null;
          subscriptionAgeDays =
            oldestStartTs !== null
              ? Math.max(0, Math.floor((Date.now() - oldestStartTs * 1000) / 86400000))
              : null;
        } catch (churnErr) {
          log.warn("Churn context computation failed (non-critical)", { error: String(churnErr) });
          monthlyValue = null;
          currency = null;
          planNames = [];
          startedIso = null;
          subscriptionAgeDays = null;
        }

        log.info("Churn context from Stripe subscription", {
          icp_type: icpType,
          company_key: companyKey,
          company_name: companyName,
          monthly_value: monthlyValue,
          currency,
          plan_name: planNames.join(", "),
          subscription_age_days: subscriptionAgeDays,
        });

        // ---------- PostHog updates ----------
        try {
          await tracer.withSpan(
            "posthog.churn_updates",
            async (span) => {
              span.setAttribute("customer.email", email);
              const post = (payload: unknown) =>
                fetch(`${POSTHOG_HOST}/capture/`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...(payload as Record<string, unknown>),
                    properties: {
                      ...((payload as { properties?: Record<string, unknown> }).properties || {}),
                      version_number: req.headers.get("x-app-version") || "unknown",
                    },
                  }),
                });

              await post({
                api_key: POSTHOG_KEY,
                event: "$groupidentify",
                distinct_id: email,
                properties: {
                  $group_type: "customer_lifecycle",
                  $group_key: "Churned Subscriber",
                  $group_set: { name: "Churned Subscriber", is_subscriber: false, churned: true },
                },
              });

              await post({
                api_key: POSTHOG_KEY,
                event: "subscription_cancelled",
                distinct_id: email,
                properties: {
                  subscription_id: cancelledIds[0],
                  cancelled_subscription_ids: cancelledIds,
                  cancelled_count: cancelledIds.length,
                  cancelled_at: firstIso,
                  icp_type: icpType,
                  ...(companyKey ? { company_key: companyKey } : {}),
                  ...(companyName ? { company_name: companyName } : {}),
                  monthly_value: monthlyValue,
                  currency,
                  subscription_started_at: startedIso,
                  subscription_age_days: subscriptionAgeDays,
                  plan_name: planNames.join(", "),
                  hashed_example_property: "posthog",
                  $groups: companyKey
                    ? { customer_lifecycle: "Churned Subscriber", company: companyKey }
                    : { customer_lifecycle: "Churned Subscriber" },
                },
              });

              await post({
                api_key: POSTHOG_KEY,
                event: "$set",
                distinct_id: email,
                properties: {
                  $set: {
                    subscription_active: false,
                    subscription_cancelled: true,
                    subscription_cancelled_at: firstIso,
                    customer_lifecycle: "Churned Subscriber",
                    icp_type: icpType,
                    ...(companyKey ? { company_key: companyKey } : {}),
                  },
                },
              });
            },
            { kind: SpanKind.CLIENT },
          );
        } catch (phError) {
          log.warn("PostHog update failed (non-critical)", { error: String(phError) });
        }

        await log.flush();

        return new Response(JSON.stringify({
          success: true,
          subscription_id: cancelledIds[0],
          cancelled_at: firstIso,
          cancelled_count: cancelledIds.length,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      },
      { kind: SpanKind.SERVER },
    );
  } catch (error) {
    requestStatus = "error";
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[cancel-subscription] error:", errorMessage);
    try { const l = logRef as ReturnType<typeof createLogger> | null; l?.error("Request failed", { error: errorMessage }); await l?.flush(); } catch (_) { /* ignore */ }
    await reportException(error, "cancel-subscription", req.headers.get("x-app-version") || "unknown", errorDistinctId as string | undefined);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  } finally {
    metrics.count("hogshop.edge.requests", 1, {
      attributes: { function: "cancel-subscription", status: requestStatus },
    });
    metrics.histogram("hogshop.edge.duration", Date.now() - requestStartedAt, {
      unit: "ms",
      attributes: { function: "cancel-subscription" },
    });
    await tracer.flush();
    await metrics.flush();
  }
});
