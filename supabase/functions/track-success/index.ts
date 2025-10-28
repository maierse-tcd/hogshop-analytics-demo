import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to log consistently
const log = (msg: string, details?: unknown) => {
  const d = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[TRACK-SUCCESS] ${msg}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("session_id");
    const redirect = url.searchParams.get("redirect");

    if (!sessionId) {
      try {
        const body = await req.json();
        sessionId = body?.session_id;
      } catch (_) {
        // ignore body parse errors
      }
    }

    if (!sessionId) {
      throw new Error("No session_id provided");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    log("Retrieving Stripe session", { sessionId });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });

    const lineItems = session.line_items?.data.map((item: any) => ({
      name: item.description,
      price: (item.amount_total || 0) / 100,
      quantity: item.quantity,
      is_subscription: item.price?.type === "recurring",
    })) || [];

    const customerEmail = session.customer_details?.email || (session as any).customer_email || "";
    const customerName = session.customer_details?.name || "";
    const totalAmount = session.amount_total ? session.amount_total / 100 : 0;
    const currency = session.currency?.toUpperCase() || "USD";
    const itemCount = lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const hasSubscription = lineItems.some(item => item.is_subscription);
    const subscriptionValue = hasSubscription 
      ? lineItems.filter(item => item.is_subscription).reduce((sum, item) => sum + item.price * item.quantity, 0)
      : 0;

    // PostHog capture (server-side) using public token
    const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://eu.i.posthog.com";
    const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY") || "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

    const capturePayload = {
      api_key: POSTHOG_KEY,
      event: "purchase_completed",
      distinct_id: customerEmail || sessionId,
      properties: {
        session_id: sessionId,
        total_amount: totalAmount,
        currency: currency,
        item_count: itemCount,
        has_subscription: hasSubscription,
        subscription_value: subscriptionValue,
        customer_email: customerEmail,
        customer_name: customerName,
        items: lineItems,
        source: "edge_function",
        timestamp: new Date().toISOString(),
      },
    };

    log("Sending PostHog capture", { host: POSTHOG_HOST, distinct_id: capturePayload.distinct_id });

    const phRes = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(capturePayload),
    });

    const ok = phRes.ok;
    const text = await phRes.text();
    log("PostHog response", { status: phRes.status, ok, body: text });

    // If redirect specified, forward user there with the session_id preserved
    if (redirect) {
      const redirectUrl = new URL(redirect);
      // Preserve provided session id for any client-side usage
      redirectUrl.searchParams.set("session_id", sessionId);
      redirectUrl.searchParams.set("tracked", "1");
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: redirectUrl.toString(),
        },
      });
    }

    return new Response(
      JSON.stringify({ tracked: ok, session_id: sessionId, total_amount: totalAmount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});