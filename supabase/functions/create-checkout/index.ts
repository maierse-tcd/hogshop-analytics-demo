import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createLogger } from "../_shared/posthog-logger.ts";
import { createTracer, parseTraceparent, SpanKind } from "../_shared/otel.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const incoming = parseTraceparent(req.headers.get("traceparent"));
  const tracer = createTracer("hogshop-edge", incoming);

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

        const { items, customer_email, customer_name } = await req.json();

        rootSpan.setAttributes({
          "cart.item_count": items?.length ?? 0,
          "customer.email": customer_email ?? "",
        });
        log.info("Request data", { itemCount: items?.length, customer_email, customer_name });

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

        const lineItems = items.map((item: any) => {
          const priceId = PRICE_MAP[item.title];
          if (priceId) return { price: priceId, quantity: item.quantity || 1 };
          log.warn("No price mapping found, using price_data", { title: item.title });
          return {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(item.price * 100),
              product_data: { name: item.title, description: item.description || "" },
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
        const successUrl = `${functionsBase}/track-success?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(origin + "/success")}`;
        log.info("Building checkout session", { mode, origin, successUrl });

        // ---------- Stripe checkout session ----------
        const session = await tracer.withSpan(
          "stripe.checkout.session.create",
          async (span) => {
            span.setAttributes({
              "stripe.api": "checkout.sessions.create",
              "checkout.mode": mode,
              "checkout.line_item_count": sessionLineItems.length,
            });
            const s = await stripe.checkout.sessions.create({
              line_items: sessionLineItems,
              mode,
              success_url: successUrl,
              cancel_url: `${origin}/`,
              allow_promotion_codes: true,
              billing_address_collection: "required",
              customer: customerId,
              customer_email: customerId ? undefined : customer_email || undefined,
              ...(mode === "payment" && {
                payment_intent_data: { setup_future_usage: "off_session" },
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[create-checkout] error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  } finally {
    await tracer.flush();
  }
});
