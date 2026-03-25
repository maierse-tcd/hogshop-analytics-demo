import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createLogger } from "../_shared/posthog-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const log = createLogger("get-session");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      try {
        const body = await req.json();
        sessionId = body?.session_id;
      } catch (_) {
        // ignore body parse errors
      }
    }

    if (!sessionId) {
      log.error("No session_id provided");
      await log.flush();
      throw new Error("No session_id provided");
    }

    log.info("Retrieving session", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product']
    });

    const lineItems = session.line_items?.data.map((item: any) => ({
      name: item.description,
      price: item.amount_total / 100,
      quantity: item.quantity,
      is_subscription: item.price?.type === 'recurring'
    })) || [];

    log.info("Session retrieved", { email: session.customer_details?.email, itemCount: lineItems.length });
    await log.flush();

    return new Response(
      JSON.stringify({
        customer_email: session.customer_details?.email || session.customer_email,
        customer_name: session.customer_details?.name,
        line_items: lineItems,
        total_amount: session.amount_total ? session.amount_total / 100 : 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Get session error", { message: errorMessage });
    await log.flush();
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
