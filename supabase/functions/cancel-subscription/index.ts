import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createLogger } from "../_shared/posthog-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const log = createLogger("cancel-subscription");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    log.info("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    log.info("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    log.info("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) throw new Error("No Stripe customer found for this user");

    const customerId = customers.data[0].id;
    log.info("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    if (subscriptions.data.length === 0) throw new Error("No active subscription found to cancel");

    const subscription = subscriptions.data[0];
    log.info("Found active subscription", { subscriptionId: subscription.id });

    const cancelledSubscription = await stripe.subscriptions.cancel(subscription.id);
    log.info("Subscription cancelled", { subscriptionId: cancelledSubscription.id, status: cancelledSubscription.status });

    // Update PostHog
    const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://eu.i.posthog.com";
    const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY") || "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

    try {
      const groupIdentifyPayload = {
        api_key: POSTHOG_KEY,
        event: "$groupidentify",
        distinct_id: user.email,
        properties: {
          $group_type: "customer_lifecycle",
          $group_key: "Churned Subscriber",
          $group_set: { name: "Churned Subscriber", is_subscriber: false, churned: true },
        },
      };

      log.info("Sending PostHog groupIdentify", { email: user.email, lifecycle: "Churned Subscriber" });
      await fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupIdentifyPayload),
      });

      const groupUpdatePayload = {
        api_key: POSTHOG_KEY,
        event: "subscription_cancelled",
        distinct_id: user.email,
        properties: {
          subscription_id: cancelledSubscription.id,
          cancelled_at: new Date(cancelledSubscription.canceled_at! * 1000).toISOString(),
          $groups: { customer_lifecycle: "Churned Subscriber" },
        },
      };

      log.info("Sending PostHog subscription_cancelled event");
      const phRes = await fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupUpdatePayload),
      });
      log.info("PostHog response", { status: phRes.status, ok: phRes.ok });

      const personPropertiesPayload = {
        api_key: POSTHOG_KEY,
        event: "$set",
        distinct_id: user.email,
        properties: {
          $set: {
            subscription_active: false,
            subscription_cancelled: true,
            subscription_cancelled_at: new Date(cancelledSubscription.canceled_at! * 1000).toISOString(),
            customer_lifecycle: "Churned Subscriber",
          },
        },
      };

      await fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personPropertiesPayload),
      });
      log.info("PostHog person properties updated");
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Cancel subscription error", { message: errorMessage });
    await log.flush();
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
