import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createLogger } from "../_shared/posthog-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const log = createLogger("check-subscription");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    log.info("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Optional body { email } lets the client (localStorage auth, no JWT)
    // query by email directly. Falls back to Authorization token if no email.
    let bodyEmail: string | undefined;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.email && typeof body.email === "string") bodyEmail = body.email;
      } catch (_) {
        // no body / not JSON — fall through to token path
      }
    }

    let lookupEmail: string;
    if (bodyEmail) {
      lookupEmail = bodyEmail;
      log.info("Using email from request body", { email: lookupEmail });
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No authorization header or email provided");
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      const user = userData.user;
      if (!user?.email) throw new Error("User not authenticated or email not available");
      lookupEmail = user.email;
      log.info("User authenticated via token", { email: lookupEmail });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: lookupEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      log.info("No customer found");
      await log.flush();
      return new Response(JSON.stringify({ subscribed: false, subscription_id: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      log.info("Active subscription found", { subscriptionId });
    } else {
      log.info("No active subscription found");
    }

    await log.flush();

    return new Response(JSON.stringify({ subscribed: hasActiveSub, subscription_id: subscriptionId, subscription_end: subscriptionEnd }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Check subscription error", { message: errorMessage });
    await log.flush();
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
