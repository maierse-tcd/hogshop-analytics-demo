import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createLogger } from "../_shared/posthog-logger.ts";
import { createTracer, parseTraceparent, SpanKind } from "../_shared/otel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, traceparent",
};

const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://ph.hogflix.dev";
const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY") || "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const incoming = parseTraceparent(req.headers.get("traceparent"));
  const tracer = createTracer("hogshop-edge", incoming);

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
        log.info("Function started");

        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

        const { email } = await req.json();
        if (!email || typeof email !== "string") {
          throw new Error("Email is required in request body");
        }
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

        const subscription = await tracer.withSpan(
          "stripe.subscriptions.list_active",
          async (span) => {
            span.setAttribute("stripe.api", "subscriptions.list");
            const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
            if (subs.data.length === 0) throw new Error("No active subscription found to cancel");
            span.setAttribute("subscription.id", subs.data[0].id);
            return subs.data[0];
          },
          { kind: SpanKind.CLIENT },
        );
        log.info("Found active subscription", { subscriptionId: subscription.id });

        const cancelledSubscription = await tracer.withSpan(
          "stripe.subscription.cancel",
          async (span) => {
            span.setAttributes({
              "stripe.api": "subscriptions.cancel",
              "subscription.id": subscription.id,
            });
            const c = await stripe.subscriptions.cancel(subscription.id);
            span.setAttribute("subscription.status", c.status);
            return c;
          },
          { kind: SpanKind.CLIENT },
        );
        log.info("Subscription cancelled", {
          subscriptionId: cancelledSubscription.id,
          status: cancelledSubscription.status,
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
                  body: JSON.stringify(payload),
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
                  subscription_id: cancelledSubscription.id,
                  cancelled_at: new Date(cancelledSubscription.canceled_at! * 1000).toISOString(),
                  hashed_example_property: "posthog",
                  $groups: { customer_lifecycle: "Churned Subscriber" },
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
                    subscription_cancelled_at: new Date(cancelledSubscription.canceled_at! * 1000).toISOString(),
                    customer_lifecycle: "Churned Subscriber",
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
          subscription_id: cancelledSubscription.id,
          cancelled_at: new Date(cancelledSubscription.canceled_at! * 1000).toISOString(),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      },
      { kind: SpanKind.SERVER },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[cancel-subscription] error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  } finally {
    await tracer.flush();
  }
});
