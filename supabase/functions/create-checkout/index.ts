import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createLogger } from "../_shared/posthog-logger.ts";
import { createTracer, parseTraceparent, SpanKind } from "../_shared/otel.ts";
import { createMetrics } from "../_shared/metrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, traceparent, x-app-version",
};

const PRICE_MAP: Record<string, string> = {
  "Premium Hedgehog Food": "price_1SMoRdLVW76jxQhlNLBKgkjF",
  "Deluxe Hedgehog Habitat": "price_1SMoRgLVW76jxQhlkgmMqwBU",
  "Hedgehog Treat Pack": "price_1SMoRhLVW76jxQhldEicBNXv",
  "Hedgehog Exercise Wheel": "price_1SMoRjLVW76jxQhlcmaiy2pn",
  "Hedgehog Care Starter Kit": "price_1SMoRjLVW76jxQhlJXAdsXoC",
  "Cozy Hedgehog Hideout": "price_1SMoRkLVW76jxQhl9AOgqSsm",
  "Hedgehog Plushie": "price_1SMnmLLVW76jxQhl2ZTnrB7P",
  "Hedgehog Lover T-Shirt": "price_1TEsUvLVW76jxQhlUX20Txyz",
};

const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://ph.hogflix.dev";
const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY") || "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

// Mirrors the cart UI (useFlashSale + CartDrawer): the only discount the cart
// displays is the flash sale, 20% off every line item (one-time and recurring),
// no stacking. The increase_sales_cta variants only change sign-up copy; the
// cart never shows or applies them, so they are not billed here either.
const FLASH_SALE_FLAG = "promo-flash-sale";
const FLASH_SALE_PERCENT = 20;
const UI_DISCOUNT_VALUES = [0, FLASH_SALE_PERCENT];

// Returns the flash-sale percent from server-side flag evaluation, or null if
// evaluation failed/timed out.
async function evaluateFlashSale(distinctId: string): Promise<number | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch(`${POSTHOG_HOST}/flags?v=2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: POSTHOG_KEY, distinct_id: distinctId }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (j?.errorsWhileComputingFlags) return null;
    const flag = j?.flags?.[FLASH_SALE_FLAG];
    const enabled = flag ? flag.enabled === true : j?.featureFlags?.[FLASH_SALE_FLAG] === true;
    return enabled ? FLASH_SALE_PERCENT : 0;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

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
  const appVersion = req.headers.get("x-app-version") || "unknown";
  let customerEmailForErrors: string | undefined;

  try {
    return await tracer.withSpan(
      "create-checkout.handle_request",
      async (rootSpan) => {
        rootSpan.setAttributes({
          "http.method": req.method,
          "http.route": "/functions/v1/create-checkout",
          "trace.distributed": incoming !== null,
        });

        const log = createLogger("create-checkout", {
          traceId: rootSpan.traceId,
          spanId: rootSpan.spanId,
        });
        logRef = log;
        log.info("Function invoked");

        const { items, customer_email, customer_name, ph_session_id, company_name, company_key, icp_type, utm_source, utm_medium, utm_campaign, ph_distinct_id, discount_percent } = await req.json();
        if (typeof customer_email === "string" && customer_email) customerEmailForErrors = customer_email;

        rootSpan.setAttributes({
          "cart.item_count": items?.length ?? 0,
          "customer.email": customer_email ?? "",
          "customer.icp_type": icp_type || "B2C",
          "customer.company_key": company_key || "",
        });
        log.info("Request data", { itemCount: items?.length, customer_email, customer_name, icp_type, company_key });

        if (!items || items.length === 0) {
          log.error("No items in cart");
          rootSpan.setAttribute("error.kind", "empty_cart");
          throw new Error("No items in cart");
        }

        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });

        // ---------- Find or create Stripe customer ----------
        let customerId: string | undefined;
        if (customer_email) {
          customerId = await tracer.withSpan(
            "stripe.customer.lookup_or_create",
            async (span) => {
              span.setAttributes({
                "stripe.api": "customers.list",
                "customer.email": customer_email,
              });
              const existing = await stripe.customers.list({ email: customer_email, limit: 1 });
              if (existing.data.length > 0) {
                span.setAttributes({ "customer.created": false, "customer.id": existing.data[0].id });
                log.info("Found existing Stripe customer", { customerId: existing.data[0].id });
                return existing.data[0].id;
              }
              const newCustomer = await stripe.customers.create({
                email: customer_email,
                name: customer_name || undefined,
              });
              span.setAttributes({ "customer.created": true, "customer.id": newCustomer.id });
              log.info("Created new Stripe customer", { customerId: newCustomer.id });
              return newCustomer.id;
            },
            { kind: SpanKind.CLIENT },
          );
        }

        const lineItems = items.map((item: any) => {
          const priceId = PRICE_MAP[item.title];
          if (priceId) return { price: priceId, quantity: item.quantity || 1 };
          log.warn("No price mapping found, using price_data", { title: item.title });
          return {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(item.price * 100),
              product_data: { name: item.title, ...(item.description ? { description: item.description } : {}) },
              recurring: item.is_subscription ? { interval: item.subscription_interval || "month" } : undefined,
            },
            quantity: item.quantity || 1,
          };
        });

        const subscriptionItems = lineItems.filter((_: any, i: number) => items[i].is_subscription);
        const oneTimeItems = lineItems.filter((_: any, i: number) => !items[i].is_subscription);
        const hasSubscription = subscriptionItems.length > 0;
        const hasOneTime = oneTimeItems.length > 0;

        if (hasSubscription && hasOneTime) {
          log.info("Mixed cart: subscription + one-time items.", {
            subscriptionCount: subscriptionItems.length,
            oneTimeCount: oneTimeItems.length,
          });
        }

        const mode = hasSubscription ? "subscription" : "payment";
        // Subscription mode accepts one-time prices alongside recurring ones
        // (they are billed on the first invoice), so always send everything.
        const sessionLineItems = lineItems;

        // ---------- Discount (server-authoritative) ----------
        const clientPct = typeof discount_percent === "number" && UI_DISCOUNT_VALUES.includes(discount_percent)
          ? discount_percent
          : null;
        const flagDistinctId = (typeof ph_distinct_id === "string" && ph_distinct_id) || customer_email || "";
        const serverPct = flagDistinctId ? await evaluateFlashSale(flagDistinctId) : null;
        let discountPercent: number;
        if (serverPct !== null) {
          // Flags decide eligibility. A client that shows a lower (valid) price
          // than the flag allows — e.g. the subscription picker, which never
          // displays the sale — is charged what it showed.
          discountPercent = clientPct !== null ? Math.min(serverPct, clientPct) : serverPct;
        } else {
          discountPercent = clientPct ?? 0;
        }
        const discountSource = discountPercent > 0 ? FLASH_SALE_FLAG : "";
        log.info("Discount resolved", { serverPct, clientPct, discountPercent, flagDistinctId: !!flagDistinctId });

        let couponId: string | undefined;
        if (discountPercent > 0) {
          couponId = `hogshop-flash-${discountPercent}`;
          try {
            await stripe.coupons.retrieve(couponId);
          } catch (e: any) {
            if (e?.statusCode !== 404 && e?.code !== "resource_missing") throw e;
            try {
              await stripe.coupons.create({
                id: couponId,
                percent_off: discountPercent,
                // The cart shows the sale price on recurring items without a
                // "first month" qualifier, so the discount applies forever.
                duration: "forever",
                name: `Flash Sale −${discountPercent}%`,
              });
            } catch (ce: any) {
              // Concurrent create — id already exists, which is fine.
              if (ce?.code !== "resource_already_exists") throw ce;
            }
          }
        }

        rootSpan.setAttributes({
          "checkout.mode": mode,
          "checkout.has_subscription": hasSubscription,
          "checkout.discount_percent": discountPercent,
        });

        const origin = req.headers.get("origin") || "http://localhost:3000";
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const functionsBase = `${supabaseUrl}/functions/v1`;
        const successUrl = `${functionsBase}/track-success?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(origin + "/success")}${ph_session_id ? `&ph_session_id=${encodeURIComponent(ph_session_id)}` : ""}`;
        log.info("Building checkout session", { mode, origin, successUrl });

        // ---------- Stripe checkout session ----------
        const stripeStartedAt = Date.now();
        const session = await tracer.withSpan(
          "stripe.checkout.session.create",
          async (span) => {
            span.setAttributes({
              "stripe.api": "checkout.sessions.create",
              "checkout.mode": mode,
              "checkout.line_item_count": sessionLineItems.length,
            });
            const metadata: Record<string, string> = {
              icp_type: icp_type || "B2C",
            };
            if (company_name) metadata.company_name = String(company_name);
            if (company_key) metadata.company_key = String(company_key);
            if (ph_session_id) metadata.ph_session_id = String(ph_session_id);
            // Marketing attribution captured in the browser, carried through
            // Stripe so the server-side purchase_completed event keeps campaign
            // context. Only set when present — no empty "unknown" values.
            if (utm_source) metadata.utm_source = String(utm_source);
            if (utm_medium) metadata.utm_medium = String(utm_medium);
            if (utm_campaign) metadata.utm_campaign = String(utm_campaign);
            metadata.version_number = appVersion;
            metadata.discount_percent = String(discountPercent);
            if (discountSource) metadata.discount_source = discountSource;

            const s = await stripe.checkout.sessions.create({
              line_items: sessionLineItems,
              mode,
              success_url: successUrl,
              cancel_url: `${origin}/`,
              ...(couponId ? { discounts: [{ coupon: couponId }] } : { allow_promotion_codes: true }),
              billing_address_collection: "required",
              customer: customerId,
              customer_email: customerId ? undefined : customer_email || undefined,
              metadata,
              ...(mode === "subscription" && {
                subscription_data: { metadata },
              }),
              ...(mode === "payment" && {
                payment_intent_data: { setup_future_usage: "off_session", metadata },
              }),
              ...(customer_name && {
                custom_fields: [{
                  key: "customer_name",
                  label: { type: "custom", custom: "Full Name" },
                  type: "text",
                  optional: false,
                }],
              }),
            });
            span.setAttribute("stripe.session.id", s.id);
            return s;
          },
          { kind: SpanKind.CLIENT },
        );

        metrics.histogram("hogshop.stripe.checkout.duration", Date.now() - stripeStartedAt, {
          unit: "ms",
          attributes: { function: "create-checkout" },
        });

        log.info("Stripe session created", { sessionId: session.id, checkoutUrl: session.url, mode: session.mode });
        await log.flush();

        return new Response(JSON.stringify({ url: session.url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      },
      { kind: SpanKind.SERVER },
    );
  } catch (error) {
    requestStatus = "error";
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout] error:", errorMessage);
    try { const l = logRef as ReturnType<typeof createLogger> | null; l?.error("Request failed", { error: errorMessage }); await l?.flush(); } catch (_) { /* ignore */ }
    await reportException(error, "create-checkout", appVersion, customerEmailForErrors);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  } finally {
    metrics.count("hogshop.edge.requests", 1, {
      attributes: { function: "create-checkout", status: requestStatus },
    });
    metrics.histogram("hogshop.edge.duration", Date.now() - requestStartedAt, {
      unit: "ms",
      attributes: { function: "create-checkout" },
    });
    await tracer.flush();
    await metrics.flush();
  }
});
