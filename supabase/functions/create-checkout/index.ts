import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping of product IDs to Stripe price IDs
const PRICE_MAP: Record<string, string> = {
  "plushie": "price_1SMnmLLVW76jxQhl2ZTnrB7P", // Hedgehog Plushie
  "pro-analytics": "price_1SMnlSLVW76jxQhlqJcKYAsU", // PostHog Pro
  "feature-flags": "price_1SMnmBLLVW76jxQhlJRoK93jN", // Feature Flags
  "team-plan": "price_1SMnmLLVW76jxQhlx8MBNgyL", // Team Plan
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items } = await req.json();
    
    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Build line items for Stripe
    const lineItems = items.map((item: any) => {
      // Try to map to a Stripe price, or use product price
      let priceId = null;
      
      // Match subscription products
      if (item.is_subscription) {
        if (item.title.includes("Pro Analytics")) priceId = PRICE_MAP["pro-analytics"];
        else if (item.title.includes("Feature Flags")) priceId = PRICE_MAP["feature-flags"];
        else if (item.title.includes("Team Plan")) priceId = PRICE_MAP["team-plan"];
      } else if (item.title.includes("Plushie")) {
        priceId = PRICE_MAP["plushie"];
      }

      // If we have a price ID, use it; otherwise create price_data
      if (priceId) {
        return {
          price: priceId,
          quantity: item.quantity || 1,
        };
      }

      // Fallback to price_data for items without a mapping
      return {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.title,
            images: [item.image_url],
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
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
