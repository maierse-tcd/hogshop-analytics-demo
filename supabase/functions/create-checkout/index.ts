import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createLogger } from "../_shared/posthog-logger.ts";
import { createTracer, parseTraceparent, SpanKind } from "../_shared/otel.ts";
import { createMetrics } from "../_shared/metrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, traceparent",
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

// The flash sale lives behind this flag. The browser also reads it, but the
// discount it applies never reaches this function, so the server evaluates the
// flag itself and is the single source of truth for the charged amount.
const FLASH_SALE_FLAG = "promo-flash-sale";
const FLASH_SALE_DISCOUNT = 0.2;

const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://ph.hogflix.dev";
const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY") || Deno.env.get("POSTHOG_PROJECT_API_KEY") || "";

// Sale price in cents, rounded per unit to match the price the shopper saw.
const discountedUnitAmount = (price: number) =>
  Math.round(+(price * (1 - FLASH_SALE_DISCOUNT)).toFixed(2) * 100);

// Evaluate the flash-sale flag for this shopper. `hint` is the flag state the
// browser rendered; it is used only when the server cannot reach PostHog, so an
// outage never charges more than the displayed price.
async function evaluateFlashSale(
  distinctId: string | undefined,
  hint: boolean,
): Promise<{ active: boolean; source: string }> {
  if (!distinctId || !POSTHOG_KEY) return { active: hint, source: "client_hint_no_id" };
  try {
    const res = await fetch(`${POSTHOG_HOST}/flags/?v=2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: POSTHOG_KEY, distinct_id: distinctId }),
    });
    if (!res.ok) throw new Error(`flags api returned ${res.status}`);
    const data = await res.json();
    const flag = data?.flags?.[FLASH_SALE_FLAG];
    const active =
      flag && typeof flag === "object"
        ? flag.enabled === true
        : data?.featureFlags?.[FLASH_SALE_FLAG] === true;
    return { active, source: "flag_evaluation" };
  } catch (_err) {
    return { active: hint, source: "client_hint_error" };
  }
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
        log.info("Function invoked");

        const { items, customer_email, customer_name, ph_session_id, ph_distinct_id, flash_sale_shown, company_name, company_key, icp_type, utm_source, utm_medium, utm_campaign } = await req.json();

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
          await log.flush();
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

        // ---------- Flash sale (server is the source of truth) ----------
        const distinctId = ph_distinct_id || ph_session_id || customer_email || undefined;
        const flashSale = await tracer.withSpan(
          "posthog.flags.evaluate_flash_sale",
          async (span) => {
            const result = await evaluateFlashSale(distinctId, flash_sale_shown === true);
            span.setAttributes({
              "posthog.flag.key": FLASH_SALE_FLAG,
              "posthog.flag.active": result.active,
              "posthog.flag.source": result.source,
            });
            return result;
          },
          { kind: SpanKind.CLIENT },
        );
        const flashSaleActive = flashSale.active;
        rootSpan.setAttribute("checkout.flash_sale_active", flashSaleActive);
        log.info("Flash sale evaluated", { active: flashSaleActive, source: flashSale.source });

        const lineItems = items.map((item: any) => {
          const quantity = item.quantity || 1;
          const recurring = item.is_subscription
            ? { interval: item.subscription_interval || "month" }
            : undefined;

          // During a sale every item ships as price_data at the discounted amount,
          // so the fixed price identifiers and stored list prices never bill full.
          if (flashSaleActive) {
            return {
              price_data: {
                currency: "usd",
                unit_amount: discountedUnitAmount(item.price),
                product_data: { name: item.title, description: item.description || "" },
                recurring,
              },
              quantity,
            };
          }

          const priceId = PRICE_MAP[item.title];
          if (priceId) return { price: priceId, quantity };
          log.warn("No price mapping found, using price_data", { title: item.title });
          return {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(item.price * 100),
              product_data: { name: item.title, description: item.description || "" },
              recurring,
            },
            quantity,
          };
        });

        const subscriptionItems = lineItems.filter((_: any, i: number) => items[i].is_subscription);
        const oneTimeItems = lineItems.filter((_: any, i: number) => !items[i].is_subscription);
        const hasSubscription = subscriptionItems.length > 0;
        const hasOneTime = oneTimeItems.length > 0;

        if (hasSubscription && hasOneTime) {
          log.warn("Mixed cart: subscription + one-time items.", {
            subscriptionCount: subscriptionItems.length,
            oneTimeCount: oneTimeItems.length,
          });
        }

        const mode = hasSubscription ? "subscription" : "payment";
        const sessionLineItems = hasSubscription ? subscriptionItems : lineItems;

        rootSpan.setAttributes({
          "checkout.mode": mode,
          "checkout.has_subscription": hasSubscription,
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

            const s = await stripe.checkout.sessions.create({
              line_items: sessionLineItems,
              mode,
              success_url: successUrl,
              cancel_url: `${origin}/`,
              allow_promotion_codes: true,
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
