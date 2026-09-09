import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createTracer, parseTraceparent, SpanKind } from "../_shared/otel.ts";
import { createMetrics } from "../_shared/metrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, traceparent",
};

// Contextual canned responses - keyword matching for realistic chat behavior.
// Buckets are ordered most-specific first, so a precise product intent wins
// over a broad one when a message names more than one topic.
const RESPONSES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ["bed", "beds", "bedding", "sleep", "sleeping", "fleece", "blanket", "blankets", "cozy", "hideout", "hideaway", "pouch", "burrow", "burrowing", "nest", "liner"],
    reply: "Hedgehogs love burrowing! We have great options:\n\n- **Cozy Hedgehog Hideout** ($24.99) — soft fleece pouch, machine washable\n- **Hedgehog Sleeping Bag** ($34.99) — ultra-soft, perfect for staying warm\n- **Soft Fleece Bedding** ($22.99) — 2 yards of comfortable bedding\n\nAll are hedgehog-safe and easy to wash! 🦔",
  },
  {
    keywords: ["cage", "cages", "habitat", "habitats", "house", "housing", "home", "enclosure", "mansion", "carrier", "travel", "tank"],
    reply: "For housing, hedgehogs need at least 2 sq ft of floor space at 72-78°F. We have three options:\n\n- **Deluxe Hedgehog Habitat** ($129.99) — 36\"x24\", great starter cage\n- **Luxury Hedgehog Mansion** ($249.99) — 48\"x30\", multi-level\n- **Travel Carrier** ($44.99) — perfect for vet visits\n\nAll include hideaway spots which hedgehogs need to feel secure! 🦔",
  },
  {
    keywords: ["food", "feed", "feeding", "eat", "eats", "eating", "diet", "nutrition", "mealworm", "mealworms", "treat", "treats", "snack", "snacks", "bowl", "bowls", "water", "dish", "dishes"],
    reply: "Great question! 🦔 Hedgehogs need high-protein food (30%+). Our **Premium Hedgehog Food** ($29.99/month subscription) is specially formulated with natural ingredients. You can also supplement with our **Freeze-Dried Mealworms** ($12.99) — hedgehogs love them! Avoid dairy, grapes, and sugary foods.",
  },
  {
    keywords: ["wheel", "wheels", "exercise", "toy", "toys", "play", "playset", "run", "running", "active", "enrichment", "climb", "climbing", "foraging"],
    reply: "Exercise is essential! Hedgehogs need 10+ hours of activity nightly. Our **Exercise Wheel** ($39.99) is a 12\" silent spinner — won't keep you up at night! 😄 For enrichment, the **Climbing Adventure Set** ($59.99) and **Interactive Play Set** ($34.99) encourage natural foraging behaviors. 🦔",
  },
  {
    keywords: ["care", "groom", "grooming", "nail", "nails", "bath", "bathe", "brush", "health", "healthy", "vet", "sick", "illness", "quill", "quills", "mites"],
    reply: "For care essentials, check out our **Hedgehog Care Starter Kit** ($79.99) — it includes nail clippers, soft brush, and a care guide. Our **Premium Grooming Kit** ($29.99) has professional tools including conditioning oil. 🦔\n\nTip: Watch for weight changes, quill loss, or lethargy — these can signal health issues. Regular vet checkups are recommended!",
  },
  {
    keywords: ["gift", "gifts", "present", "presents", "birthday", "christmas", "holiday", "plushie", "plush", "mug", "mugs", "shirt", "shirts", "tshirt", "tee", "apparel", "merch", "merchandise"],
    reply: "We have perfect gifts for hedgehog lovers! 🎁\n\n- **Hedgehog Plushie** ($29.99) — adorable and cuddly\n- **Hedgehog Coffee Mug** ($16.99) — start every day with cuteness\n- **Hedgehog Lover T-Shirt** ($24.99) — available in multiple sizes\n\nYou can also send a gift directly using our Gift Checkout feature!",
  },
  {
    keywords: ["subscribe", "subscription", "subscriptions", "monthly", "recurring", "plan", "plans", "autoship"],
    reply: "Our subscription is a great deal! 🦔 The **Premium Hedgehog Food** subscription ($29.99/month) includes:\n\n- 10% savings vs one-time purchase\n- Free shipping every month\n- Never run out of food\n- Pause or cancel anytime\n\nIt's our most popular option for dedicated hedgehog parents!",
  },
  {
    keywords: ["ship", "ships", "shipping", "deliver", "delivery", "arrive", "arrives", "arrival", "postage", "dispatch"],
    reply: "We offer standard shipping on all orders! 📦 Subscription orders always ship free. Most orders arrive within 3-5 business days. Check our Shipping page for full details. 🦔",
  },
  {
    keywords: ["order", "orders", "track", "tracking", "return", "returns", "refund", "refunds", "exchange", "warranty", "account", "cancel", "cancellation"],
    reply: "Happy to help with orders and returns! 🦔 Track an order from the link in your confirmation email, and view past orders or manage a subscription from your account. To start a return or exchange, reach our team through the site — see the Shipping page for the returns window and steps.",
  },
  {
    keywords: ["price", "prices", "pricing", "cost", "costs", "expensive", "cheap", "cheaper", "cheapest", "budget", "afford", "affordable", "discount", "deal", "deals", "sale"],
    reply: "We have options for every budget! 🦔 Every product page shows its live price, and the full catalog is on our homepage — open any item to see the current price. Subscriptions add free shipping and a recurring saving over one-time orders. Tell me which product you want and I'll point you to it!",
  },
  {
    keywords: ["hello", "hi", "hey", "howdy", "greetings", "help", "start", "support", "assist"],
    reply: "Welcome to Hogster! 🦔 I'm here to help you find everything your hedgehog needs. I can help with:\n\n- 🍽️ Food & nutrition advice\n- 🏠 Housing recommendations\n- 🎡 Toys & exercise\n- 💊 Care & grooming tips\n\nWhat would you like to know about?",
  },
  {
    keywords: ["thank", "thanks", "thankyou", "awesome", "great", "perfect", "amazing", "cheers"],
    reply: "You're welcome! 🦔 Happy to help. If you have any other questions about hedgehog care or our products, just ask! Enjoy shopping at Hogster! 🛒",
  },
];

const DEFAULT_REPLY = "That's a great question! 🦔 While I'm not sure about that specific topic, I can help you with our products, hedgehog care tips, subscriptions, and shipping. What would you like to know about? Browse our full catalog on the homepage!";

// Match each keyword only as a whole word, so short keywords like "eat",
// "run", and "hi" no longer trigger on substrings inside unrelated words.
function buildMatcher(keywords: string[]): RegExp {
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(?:${escaped.join("|")})\\b`, "i");
}

const MATCHERS = RESPONSES.map((entry) => ({
  pattern: buildMatcher(entry.keywords),
  reply: entry.reply,
}));

function findResponse(userMessage: string): string {
  for (const { pattern, reply } of MATCHERS) {
    if (pattern.test(userMessage)) {
      return reply;
    }
  }
  return DEFAULT_REPLY;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const incoming = parseTraceparent(req.headers.get("traceparent"));
  const tracer = createTracer("hogshop-edge", incoming);
  const metrics = createMetrics("hogshop-edge");
  const requestStartedAt = Date.now();
  let requestStatus: "ok" | "error" = "ok";

  try {
    return await tracer.withSpan(
      "ai-chat.handle_request",
      async (rootSpan) => {
        rootSpan.setAttributes({
          "http.method": req.method,
          "http.route": "/functions/v1/ai-chat",
          "trace.distributed": incoming !== null,
        });

        const { messages } = await req.json();
        const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user");

        if (!lastUserMessage) {
          rootSpan.setAttribute("error.kind", "no_user_message");
          return new Response(
            JSON.stringify({ error: "No user message found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        rootSpan.setAttributes({
          "chat.message_count": messages.length,
          "chat.user_message_length": lastUserMessage.content.length,
        });

        // Simulated "Gemini call" — wrapped in a child span with gen_ai.* attributes
        // so it lines up with PostHog's LLM trace conventions.
        const reply = await tracer.withSpan(
          "ai-chat.gemini_call",
          async (genSpan) => {
            genSpan.setAttributes({
              "gen_ai.system": "google",
              "gen_ai.request.model": "google/gemini-2.5-flash",
              "gen_ai.operation.name": "chat",
            });
            const model = "google/gemini-2.5-flash";
            const genStartedAt = Date.now();
            const r = findResponse(lastUserMessage.content);
            // Simulate slight delay for realism
            await new Promise((res) => setTimeout(res, 300 + Math.random() * 700));
            const inputTokens = Math.ceil(
              messages.map((m: { content: string }) => m.content).join("").length / 4,
            );
            const outputTokens = Math.ceil(r.length / 4);
            genSpan.setAttributes({
              "gen_ai.usage.input_tokens": inputTokens,
              "gen_ai.usage.output_tokens": outputTokens,
            });
            metrics.count("hogshop.ai.tokens", inputTokens, {
              attributes: { model, kind: "input" },
            });
            metrics.count("hogshop.ai.tokens", outputTokens, {
              attributes: { model, kind: "output" },
            });
            metrics.histogram("hogshop.ai.latency", Date.now() - genStartedAt, {
              unit: "ms",
              attributes: { model },
            });
            return r;
          },
          { kind: SpanKind.CLIENT },
        );

        rootSpan.setAttribute("chat.reply_length", reply.length);

        return new Response(
          JSON.stringify({ reply }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      },
      { kind: SpanKind.SERVER },
    );
  } catch (error) {
    requestStatus = "error";
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    // Flush spans to PostHog before the function returns.
    metrics.count("hogshop.edge.requests", 1, {
      attributes: { function: "ai-chat", status: requestStatus },
    });
    metrics.histogram("hogshop.edge.duration", Date.now() - requestStartedAt, {
      unit: "ms",
      attributes: { function: "ai-chat" },
    });
    await tracer.flush();
    await metrics.flush();
  }
});
