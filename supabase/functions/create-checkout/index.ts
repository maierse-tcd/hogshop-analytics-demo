import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping of product titles to Stripe price IDs
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, customer_email, customer_name } = await req.json();
    
    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    console.log("Creating checkout for:", customer_email);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Build line items for Stripe
    const lineItems = items.map((item: any) => {
      // Try to find the Stripe price ID by product title
      const priceId = PRICE_MAP[item.title];

      // If we have a price ID, use it
      if (priceId) {
        return {
          price: priceId,
          quantity: item.quantity || 1,
        };
      }

      // Fallback to price_data for items without a mapping
      // Note: Stripe doesn't require images for line items, so we omit them to avoid URL validation errors
      console.log(`No price mapping found for: ${item.title}, using price_data`);
      return {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.title,
            description: item.description || "",
          },
          recurring: item.is_subscription ? {
            interval: item.subscription_interval || "month",
          } : undefined,
        },
        quantity: item.quantity || 1,
      };
    });

    // Determine if this is a subscription or one-time payment
    const hasSubscription = items.some((item: any) => item.is_subscription);
    const mode = hasSubscription ? "subscription" : "payment";

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode,
      success_url: `${req.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/`,
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

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Checkout error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
