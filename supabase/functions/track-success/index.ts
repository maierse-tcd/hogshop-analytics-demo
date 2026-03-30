import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createLogger } from "../_shared/posthog-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const log = createLogger("track-success");
  log.info("Function invoked", { method: req.method, url: req.url });
  
  if (req.method === "OPTIONS") {
    log.info("Handling OPTIONS request");
    await log.flush();
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("session_id");
    const redirect = url.searchParams.get("redirect");
    
    log.info("URL params", { sessionId, redirect });

    if (!sessionId) {
      log.info("No session_id in URL, checking body");
      try {
        const body = await req.json();
        sessionId = body?.session_id;
        log.info("Session ID from body", { sessionId });
      } catch (err) {
        log.warn("Failed to parse body", { error: String(err) });
      }
    }

    if (!sessionId) {
      log.error("No session_id provided in URL or body");
      await log.flush();
      throw new Error("No session_id provided");
    }
    
    log.info("Processing session", { sessionId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) {
      log.error("Missing STRIPE_SECRET_KEY");
      await log.flush();
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
    log.info("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    log.info("Retrieving Stripe session", { sessionId });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price.product"],
    });
    
    log.info("Stripe session retrieved", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
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
    const itemCount = lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const hasSubscription = lineItems.some((item: any) => item.is_subscription);
    const subscriptionValue = hasSubscription 
      ? lineItems.filter((item: any) => item.is_subscription).reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
      : 0;

    // PostHog capture (server-side) using public token via reverse proxy
    const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://ph.hogflix.dev";
    const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY") || "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

    // Determine customer lifecycle and value tier
    const lifecycle = hasSubscription ? "Active Subscriber" : "One-Time Buyer";
    const getValueTier = (amount: number): string => {
      if (amount >= 1000) return "Platinum";
      if (amount >= 500) return "Gold";
      if (amount >= 100) return "Silver";
      return "Bronze";
    };
    const valueTier = getValueTier(totalAmount);

    // Send $identify FIRST to create person profile
    const identifyPayload = {
      api_key: POSTHOG_KEY,
      event: "$identify",
      distinct_id: customerEmail || sessionId,
      properties: {
        $set: {
          email: customerEmail,
          name: customerName,
        },
      },
    };

    log.info("Sending PostHog $identify", { distinct_id: customerEmail || sessionId });
    const identifyRes = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identifyPayload),
    });
    log.info("PostHog $identify response", { status: identifyRes.status, ok: identifyRes.ok });
    
    const subscriptionId = (session as any).subscription || null;

    const capturePayload = {
      api_key: POSTHOG_KEY,
      event: "purchase_completed",
      distinct_id: customerEmail || sessionId,
      properties: {
        session_id: sessionId,
        total_amount: totalAmount,
        revenue: Math.round(totalAmount * 100),
        currency: currency,
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
        $groups: {
          customer_lifecycle: lifecycle,
          customer_value_tier: valueTier
        },
      },
    };

    log.info("Prepared purchase event payload", {
      event: capturePayload.event,
      distinct_id: capturePayload.distinct_id,
      total_amount: totalAmount,
      item_count: itemCount,
      has_subscription: hasSubscription,
    });
    
    log.info("Sending PostHog capture", { host: POSTHOG_HOST, distinct_id: capturePayload.distinct_id });

    // Send $groupidentify events
    const lifecycleGroupPayload = {
      api_key: POSTHOG_KEY,
      event: "$groupidentify",
      distinct_id: customerEmail || sessionId,
      properties: {
        $group_type: "customer_lifecycle",
        $group_key: lifecycle,
        $group_set: { name: lifecycle, is_subscriber: hasSubscription },
      },
    };

    const valueTierGroupPayload = {
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
    };

    log.info("Sending PostHog groupIdentify", { lifecycle, valueTier });
    const groupPromises = await Promise.all([
      fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lifecycleGroupPayload),
      }),
      fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valueTierGroupPayload),
      })
    ]);
    
    log.info("GroupIdentify responses", { lifecycle: groupPromises[0].status, valueTier: groupPromises[1].status });

    // Send purchase_completed event
    const phRes = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(capturePayload),
    });

    const ok = phRes.ok;
    const text = await phRes.text();
    log.info("PostHog purchase_completed response", { status: phRes.status, ok, body: text.substring(0, 200) });

    // Set person properties
    if (customerEmail) {
      const personPropertiesPayload = {
        api_key: POSTHOG_KEY,
        event: "$set",
        distinct_id: customerEmail,
        properties: {
          $set: {
            subscription_active: hasSubscription,
            subscription_start_date: hasSubscription ? new Date().toISOString() : null,
            subscription_monthly_value: subscriptionValue || null,
            customer_lifecycle: lifecycle,
            customer_value_tier: valueTier,
            customer_lifetime_value: totalAmount,
            last_purchase_date: new Date().toISOString(),
            last_purchase_amount: totalAmount,
          },
        },
      };

      log.info("Sending PostHog person properties", { email: customerEmail, subscription_active: hasSubscription });
      const propsRes = await fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personPropertiesPayload),
      });
      log.info("PostHog person properties response", { status: propsRes.status, ok: propsRes.ok });
    }

    // Flush all logs to PostHog Logs
    await log.flush();

    // Redirect if specified
    if (redirect) {
      const redirectUrl = new URL(redirect);
      redirectUrl.searchParams.set("session_id", sessionId);
      redirectUrl.searchParams.set("tracked", "1");
      
      const finalUrl = redirectUrl.toString();
      log.info("Redirecting user to success page", { finalUrl });
      
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: finalUrl },
      });
    }

    return new Response(
      JSON.stringify({ tracked: ok, session_id: sessionId, total_amount: totalAmount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Function error", { message });
    await log.flush();
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
