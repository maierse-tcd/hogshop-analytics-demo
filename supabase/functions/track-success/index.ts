import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createLogger } from "../_shared/posthog-logger.ts";
import { createTracer, parseTraceparent, SpanKind, type Span } from "../_shared/otel.ts";
import { createMetrics } from "../_shared/metrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, traceparent, x-app-version",
};

const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://ph.hogflix.dev";
const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY") || "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

// Only redirect to our own storefront hosts (prevents open redirects).
function isAllowedRedirect(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname;
    if (u.protocol === "https:" && (host === "shop.hogflix.dev" || host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com"))) return u;
    if ((u.protocol === "http:" || u.protocol === "https:") && (host === "localhost" || host === "127.0.0.1")) return u;
    return null;
  } catch {
    return null;
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
  // Set once the Stripe session is retrieved, so failures after that point
  // still send the buyer to the success page (with tracked=0).
  let errorRedirect: URL | null = null;
  let errorSessionId = "";
  let errorVersion = req.headers.get("x-app-version") || "unknown";
  let errorDistinctId: string | undefined;

  try {
    return await tracer.withSpan(
      "track-success.handle_request",
      async (rootSpan) => {
        rootSpan.setAttributes({
          "http.method": req.method,
          "http.route": "/functions/v1/track-success",
          "trace.distributed": incoming !== null,
        });

        const log = createLogger("track-success", {
          traceId: rootSpan.traceId,
          spanId: rootSpan.spanId,
        });
        logRef = log;
        log.info("Function invoked", { method: req.method, url: req.url });

        const url = new URL(req.url);
        let sessionId = url.searchParams.get("session_id");
        const redirectParam = url.searchParams.get("redirect");
        const redirectUrlBase = isAllowedRedirect(redirectParam);
        if (redirectParam && !redirectUrlBase) log.warn("Ignoring disallowed redirect", { redirect: redirectParam });
        const redirect = redirectUrlBase ? redirectUrlBase.toString() : null;
        const phSessionId = url.searchParams.get("ph_session_id") || undefined;
        log.info("URL params", { sessionId, redirect });

        const bodyUtm: Record<string, string> = {};
        if (!sessionId) {
          try {
            const body = await req.json();
            sessionId = body?.session_id;
            for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
              if (body?.[key]) bodyUtm[key] = String(body[key]);
            }
          } catch (err) {
            log.warn("Failed to parse body", { error: String(err) });
          }
        }

        if (!sessionId) {
          log.error("No session_id provided");
          rootSpan.setAttribute("error.kind", "missing_session_id");
          throw new Error("No session_id provided");
        }

        rootSpan.setAttribute("stripe.session.id", sessionId);

        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
        if (!stripeKey) {
          throw new Error("Missing STRIPE_SECRET_KEY");
        }
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

        // ---------- Retrieve Stripe session ----------
        const session = await tracer.withSpan(
          "stripe.checkout.session.retrieve",
          async (span) => {
            span.setAttributes({
              "stripe.api": "checkout.sessions.retrieve",
              "stripe.session.id": sessionId!,
            });
            const s = await stripe.checkout.sessions.retrieve(sessionId!, {
              expand: ["line_items.data.price.product"],
            });
            span.setAttributes({
              "stripe.session.payment_status": s.payment_status ?? "",
              "stripe.session.amount_total": s.amount_total ?? 0,
            });
            return s;
          },
          { kind: SpanKind.CLIENT },
        );

        log.info("Stripe session retrieved", {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          customerEmail: session.customer_details?.email,
          amountTotal: session.amount_total,
        });

        const meta = (session.metadata || {}) as Record<string, string>;
        const versionNumber =
          req.headers.get("x-app-version") ||
          url.searchParams.get("version_number") ||
          meta.version_number ||
          "unknown";
        errorVersion = versionNumber;
        errorSessionId = sessionId;
        errorRedirect = redirectUrlBase;
        errorDistinctId = session.customer_details?.email || (session as any).customer_email || undefined;

        const respond = (tracked: boolean, extra: Record<string, unknown> = {}) => {
          if (redirectUrlBase) {
            const redirectUrl = new URL(redirectUrlBase.toString());
            redirectUrl.searchParams.set("session_id", sessionId!);
            redirectUrl.searchParams.set("tracked", tracked ? "1" : "0");
            return new Response(null, {
              status: 302,
              headers: { ...corsHeaders, Location: redirectUrl.toString() },
            });
          }
          return new Response(
            JSON.stringify({ tracked, session_id: sessionId, ...extra }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
          );
        };

        // ---------- Idempotency: already tracked ----------
        if (meta.ph_tracked) {
          log.info("Session already tracked, skipping PostHog", { sessionId });
          rootSpan.setAttribute("purchase.already_tracked", true);
          await log.flush();
          return respond(true, { already_tracked: true });
        }

        // ---------- Only track paid sessions ----------
        if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
          log.warn("Session not paid, not tracking", { paymentStatus: session.payment_status });
          rootSpan.setAttribute("purchase.unpaid", true);
          await log.flush();
          return respond(false, { reason: "not_paid", payment_status: session.payment_status });
        }

        const lineItems = session.line_items?.data.map((item: any) => {
          const lineTotal = (item.amount_total || 0) / 100;
          const qty = item.quantity || 1;
          return {
            name: item.description,
            price: +(lineTotal / qty).toFixed(2),
            line_total: lineTotal,
            quantity: item.quantity,
            is_subscription: item.price?.type === "recurring",
          };
        }) || [];

        const customerEmail = session.customer_details?.email || (session as any).customer_email || "";
        const customerName = session.customer_details?.name || "";
        const totalAmount = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || "USD";
        const itemCount = lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        const hasSubscription = lineItems.some((item: any) => item.is_subscription);
        const subscriptionValue = hasSubscription
          ? lineItems.filter((item: any) => item.is_subscription).reduce((sum: number, item: any) => sum + item.line_total, 0)
          : 0;

        // B2B attribution — metadata was set by create-checkout.
        const companyName = meta.company_name || "";
        const companyKey = meta.company_key || "";
        const icpType = meta.icp_type === "B2B" ? "B2B" : "B2C";

        // Marketing attribution: request body / query params (direct invocation)
        // win, then Stripe metadata set by create-checkout. Only non-empty
        // values are attached so absent attribution stays absent.
        const utm: Record<string, string> = {};
        for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
          const value = bodyUtm[key] || url.searchParams.get(key) || meta[key] || "";
          if (value) utm[key] = String(value);
        }
        const isB2B = icpType === "B2B" && !!companyKey;

        rootSpan.setAttributes({
          "purchase.total_amount": totalAmount,
          "purchase.currency": currency,
          "purchase.item_count": itemCount,
          "purchase.has_subscription": hasSubscription,
          "customer.email": customerEmail,
          "customer.icp_type": icpType,
          "customer.company_key": companyKey,
        });

        const getValueTier = (amount: number): string => {
          if (amount >= 1000) return "Platinum";
          if (amount >= 500) return "Gold";
          if (amount >= 100) return "Silver";
          return "Bronze";
        };

        // Look up prior lifetime value BEFORE computing tier, so tier reflects
        // lifetime spend rather than a single order (repeat customers shouldn't
        // flip-flop tiers based on order size).
        let priorSum: number | null = null;
        let priorCount = 0;
        let lastSub = 0;
        let lastCancel = 0;
        if (customerEmail) {
          try {
            const PROJECT_ID = Deno.env.get("POSTHOG_PROJECT_ID");
            const PERSONAL_KEY = Deno.env.get("POSTHOG_PERSONAL_API_KEY");
            const API_HOST = Deno.env.get("POSTHOG_API_HOST") || "https://eu.posthog.com";
            if (PROJECT_ID && PERSONAL_KEY) {
              const safeId = customerEmail.replace(/'/g, "''");
              const hogql = `SELECT
                coalesce(sumIf(toFloat(properties.total_amount), event='purchase_completed' AND ifNull(toString(properties.backfilled),'') != 'true'),0) AS s,
                countIf(event='purchase_completed' AND ifNull(toString(properties.backfilled),'') != 'true') AS c,
                maxIf(toUnixTimestamp(timestamp), event='subscription_created' OR (event='purchase_completed' AND properties.has_subscription = true)) AS last_sub,
                maxIf(toUnixTimestamp(timestamp), event='subscription_cancelled') AS last_cancel
              FROM events WHERE distinct_id = '${safeId}' AND event IN ('purchase_completed','subscription_created','subscription_cancelled')`;
              const ctrl = new AbortController();
              const timer = setTimeout(() => ctrl.abort(), 3000);
              let qr: Response;
              try {
                qr = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/query/`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${PERSONAL_KEY}` },
                  body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
                  signal: ctrl.signal,
                });
              } finally {
                clearTimeout(timer);
              }
              if (qr.ok) {
                const j = await qr.json();
                const row = (j.results && j.results[0]) || [0, 0, 0, 0];
                priorSum = Number(row[0]) || 0;
                priorCount = Number(row[1]) || 0;
                lastSub = Number(row[2]) || 0;
                lastCancel = Number(row[3]) || 0;
              }
            }
          } catch (e) {
            log.warn("CLTV prior lookup failed", { error: String(e) });
          }
        }
        const lifetimeValue = priorSum !== null ? priorSum + totalAmount : totalAmount;
        const valueTier = getValueTier(lifetimeValue);

        // Lifecycle from full history + this order — never downgrade an active
        // subscriber just because their latest order was a one-time purchase.
        // If the HogQL lookup failed, lastSub/lastCancel remain 0 and this
        // reduces to the previous single-order behavior.
        const isActiveSubscriber = hasSubscription || (lastSub > 0 && lastSub >= lastCancel);
        const lifecycle = isActiveSubscriber
          ? "Active Subscriber"
          : (lastCancel > 0 ? "Churned Subscriber" : "One-Time Buyer");

        const postJson = async (span: Span, event: string, payload: unknown) => {
          span.setAttribute("posthog.event", event);
          const p = payload as { properties?: Record<string, unknown> };
          p.properties = { ...(p.properties || {}), version_number: versionNumber, $geoip_disable: true };
          let res: Response;
          try {
            res = await fetch(`${POSTHOG_HOST}/capture/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } catch (err) {
            log.warn("PostHog capture failed", { event, error: String(err) });
            span.setAttribute("http.response.ok", false);
            return new Response(null, { status: 599 });
          }
          if (!res.ok) log.warn("PostHog capture non-OK", { event, status: res.status });
          span.setAttributes({
            "http.status_code": res.status,
            "http.response.ok": res.ok,
          });
          return res;
        };

        // ---------- $identify ----------
        await tracer.withSpan(
          "posthog.identify",
          (span) => postJson(span, "$identify", {
            api_key: POSTHOG_KEY,
            event: "$identify",
            distinct_id: customerEmail || sessionId,
            properties: { $session_id: phSessionId, $set: { email: customerEmail, name: customerName } },
          }),
          { kind: SpanKind.CLIENT },
        );

        const subscriptionId = (session as any).subscription || null;

        const eventGroups: Record<string, string> = {
          customer_lifecycle: lifecycle,
          customer_value_tier: valueTier,
        };
        if (isB2B) eventGroups.company = companyKey;

        const capturePayload = {
          api_key: POSTHOG_KEY,
          event: "purchase_completed",
          distinct_id: customerEmail || sessionId,
          properties: {
            $session_id: phSessionId,
            session_id: sessionId,
            total_amount: totalAmount,
            revenue: totalAmount,
            currency,
            subscription_id: subscriptionId,
            item_count: itemCount,
            has_subscription: hasSubscription,
            subscription_value: subscriptionValue,
            customer_email: customerEmail,
            customer_name: customerName,
            items: lineItems,
            source: "edge_function",
            timestamp: new Date().toISOString(),
            hashed_example_property: "posthog",
            icp_type: icpType,
            ...(isB2B ? { company_name: companyName, company_key: companyKey } : {}),
            ...utm,
            $groups: eventGroups,
          },
        };

        // ---------- group identifies (parallel) ----------
        await tracer.withSpan(
          "posthog.group_identify",
          async (span) => {
            span.setAttributes({
              "groups.lifecycle": lifecycle,
              "groups.value_tier": valueTier,
              "groups.company": companyKey,
            });
            const identifies: Promise<Response>[] = [
              postJson(span, "$groupidentify:lifecycle", {
                api_key: POSTHOG_KEY,
                event: "$groupidentify",
                distinct_id: customerEmail || sessionId,
                properties: {
                  $group_type: "customer_lifecycle",
                  $group_key: lifecycle,
                  $group_set: { name: lifecycle, is_subscriber: isActiveSubscriber },
                },
              }),
              postJson(span, "$groupidentify:value_tier", {
                api_key: POSTHOG_KEY,
                event: "$groupidentify",
                distinct_id: customerEmail || sessionId,
                properties: {
                  $group_type: "customer_value_tier",
                  $group_key: valueTier,
                  $group_set: {
                    name: valueTier,
                    min_value: valueTier === "Platinum" ? 1000 : valueTier === "Gold" ? 500 : valueTier === "Silver" ? 100 : 0,
                  },
                },
              }),
            ];
            if (isB2B) {
              identifies.push(
                postJson(span, "$groupidentify:company", {
                  api_key: POSTHOG_KEY,
                  event: "$groupidentify",
                  distinct_id: customerEmail || sessionId,
                  properties: {
                    $group_type: "company",
                    $group_key: companyKey,
                    $group_set: { name: companyName, icp_type: "B2B" },
                  },
                }),
              );
            }
            await Promise.all(identifies);
          },
          { kind: SpanKind.CLIENT },
        );

        // ---------- purchase_completed ----------
        const phRes = await tracer.withSpan(
          "posthog.capture.purchase_completed",
          (span) => postJson(span, "purchase_completed", capturePayload),
          { kind: SpanKind.CLIENT },
        );
        const ok = phRes.ok;

        // ---------- mark session tracked (idempotency) ----------
        if (ok) {
          try {
            await stripe.checkout.sessions.update(sessionId, { metadata: { ph_tracked: "1" } });
          } catch (e) {
            log.warn("Failed to mark session tracked", { error: String(e) });
          }
        }

        // ---------- subscription_created ----------
        if (hasSubscription) {
          const subscriptionItems = lineItems.filter((item: any) => item.is_subscription);
          await tracer.withSpan(
            "posthog.capture.subscription_created",
            (span) => postJson(span, "subscription_created", {
              api_key: POSTHOG_KEY,
              event: "subscription_created",
              distinct_id: customerEmail || sessionId,
              properties: {
                $session_id: phSessionId,
                subscription_id: subscriptionId,
                plan_name: subscriptionItems.map((item: any) => item.name).join(", "),
                monthly_value: subscriptionValue,
                customer_email: customerEmail,
                session_id: sessionId,
                source: "edge_function",
                timestamp: new Date().toISOString(),
                hashed_example_property: "posthog",
                icp_type: icpType,
                ...(isB2B ? { company_name: companyName, company_key: companyKey } : {}),
                $groups: eventGroups,
              },
            }),
            { kind: SpanKind.CLIENT },
          );
        }

        // ---------- person properties ----------
        if (customerEmail) {
          const setProps: Record<string, unknown> = {
            subscription_active: isActiveSubscriber,
            customer_lifecycle: lifecycle,
            customer_value_tier: valueTier,
            last_purchase_date: new Date().toISOString(),
            last_purchase_amount: totalAmount,
            icp_type: icpType,
          };
          if (hasSubscription) {
            setProps.subscription_start_date = new Date().toISOString();
            setProps.subscription_monthly_value = subscriptionValue;
          }
          if (isB2B) {
            setProps.company_name = companyName;
            setProps.company_key = companyKey;
          }
          if (priorSum !== null) {
            setProps.customer_lifetime_value = lifetimeValue;
            setProps.total_purchases = priorCount + 1;
          }

          await tracer.withSpan(
            "posthog.person.set",
            (span) => postJson(span, "$set", {
              api_key: POSTHOG_KEY,
              event: "$set",
              distinct_id: customerEmail,
              properties: {
                $session_id: phSessionId,
                $set: setProps,
              },
            }),
            { kind: SpanKind.CLIENT },
          );
        }

        await log.flush();

        return respond(ok, { total_amount: totalAmount });
      },
      { kind: SpanKind.SERVER },
    );
  } catch (error) {
    requestStatus = "error";
    const message = error instanceof Error ? error.message : String(error);
    console.error("[track-success] error:", message);
    try { logRef?.error("Request failed", { error: message }); await logRef?.flush(); } catch (_) { /* ignore */ }
    await reportException(error, "track-success", errorVersion, errorDistinctId);
    if (errorRedirect) {
      const redirectUrl = new URL(errorRedirect.toString());
      redirectUrl.searchParams.set("session_id", errorSessionId);
      redirectUrl.searchParams.set("tracked", "0");
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: redirectUrl.toString() },
      });
    }
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  } finally {
    metrics.count("hogshop.edge.requests", 1, {
      attributes: { function: "track-success", status: requestStatus },
    });
    metrics.histogram("hogshop.edge.duration", Date.now() - requestStartedAt, {
      unit: "ms",
      attributes: { function: "track-success" },
    });
    await tracer.flush();
    await metrics.flush();
  }
});
