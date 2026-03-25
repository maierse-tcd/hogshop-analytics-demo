import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createLogger } from "../_shared/posthog-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_MAP: Record<string, string> = {
  "Premium Hedgehog Food": "price_1SMoRdLVW76jxQhlNLBKgkjF",
  "Deluxe Hedgehog Habitat": "price_1SMoRgLVW76jxQhlkgmMqwBU",
  "Hedgehog Treat Pack": "price_1SMoRhLVW76jxQhldEicBNXv",
  "Hedgehog Exercise Wheel": "price_1SMoRjLVW76jxQhlcmaiy2pn",
  "Hedgehog Care Starter Kit": "price_1SMoRjLVW76jxQhlJXAdsXoC",
  "Cozy Hedgehog Hideout": "price_1SMoRkLVW76jxQhl9AOgqSsm",
  "Hedgehog Plushie": "price_1SMnmLLVW76jxQhl2ZTnrB7P",
};

serve(async (req) => {
  const log = createLogger("create-checkout");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log.info("Function invoked");
    
    const { items, customer_email, customer_name } = await req.json();
    
    log.info("Request data", { itemCount: items?.length, customer_email, customer_name });
    
    if (!items || items.length === 0) {
      log.error("No items in cart");
      await log.flush();
      throw new Error("No items in cart");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const lineItems = items.map((item: any) => {
      const priceId = PRICE_MAP[item.title];
      if (priceId) {
        return { price: priceId, quantity: item.quantity || 1 };
      }

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

    const hasSubscription = items.some((item: any) => item.is_subscription);
    const mode = hasSubscription ? "subscription" : "payment";

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const functionsBase = `${supabaseUrl}/functions/v1`;
    
    const successUrl = `${functionsBase}/track-success?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(origin + "/success")}`;
    log.info("Building checkout session", { mode, origin, successUrl });

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode,
      success_url: successUrl,
      cancel_url: `${origin}/`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      customer_email: customer_email || undefined,
      ...(customer_name && {
        custom_fields: [{
          key: "customer_name",
          label: { type: "custom", custom: "Full Name" },
          type: "text",
          optional: false,
        }]
      }),
    });

    log.info("Stripe session created", { sessionId: session.id, checkoutUrl: session.url, mode: session.mode });
    await log.flush();

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Checkout error", { message: errorMessage });
    await log.flush();
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
