import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Contextual canned responses - keyword matching for realistic chat behavior
const RESPONSES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ["food", "feed", "eat", "diet", "nutrition"],
    reply: "Great question! 🦔 Hedgehogs need high-protein food (30%+). Our **Premium Hedgehog Food** ($29.99/month subscription) is specially formulated with natural ingredients. You can also supplement with our **Freeze-Dried Mealworms** ($12.99) — hedgehogs love them! Avoid dairy, grapes, and sugary foods.",
  },
  {
    keywords: ["cage", "habitat", "house", "housing", "home", "mansion"],
    reply: "For housing, hedgehogs need at least 2 sq ft of floor space at 72-78°F. We have three options:\n\n- **Deluxe Hedgehog Habitat** ($129.99) — 36\"x24\", great starter cage\n- **Luxury Hedgehog Mansion** ($249.99) — 48\"x30\", multi-level\n- **Travel Carrier** ($44.99) — perfect for vet visits\n\nAll include hideaway spots which hedgehogs need to feel secure! 🦔",
  },
  {
    keywords: ["wheel", "exercise", "toy", "play", "run", "active"],
    reply: "Exercise is essential! Hedgehogs need 10+ hours of activity nightly. Our **Exercise Wheel** ($39.99) is a 12\" silent spinner — won't keep you up at night! 😄 For enrichment, the **Climbing Adventure Set** ($59.99) and **Interactive Play Set** ($34.99) encourage natural foraging behaviors. 🦔",
  },
  {
    keywords: ["subscribe", "subscription", "monthly", "recurring", "mrr"],
    reply: "Our subscription is a great deal! 🦔 The **Premium Hedgehog Food** subscription ($29.99/month) includes:\n\n- 10% savings vs one-time purchase\n- Free shipping every month\n- Never run out of food\n- Pause or cancel anytime\n\nIt's our most popular option for dedicated hedgehog parents!",
  },
  {
    keywords: ["gift", "present", "birthday", "christmas"],
    reply: "We have perfect gifts for hedgehog lovers! 🎁\n\n- **Hedgehog Plushie** ($29.99) — adorable and cuddly\n- **Hedgehog Coffee Mug** ($16.99) — start every day with cuteness\n- **Hedgehog Lover T-Shirt** ($24.99) — available in multiple sizes\n\nYou can also send a gift directly using our Gift Checkout feature!",
  },
  {
    keywords: ["care", "groom", "nail", "bath", "brush", "health", "vet", "sick"],
    reply: "For care essentials, check out our **Hedgehog Care Starter Kit** ($79.99) — it includes nail clippers, soft brush, and a care guide. Our **Premium Grooming Kit** ($29.99) has professional tools including conditioning oil. 🦔\n\nTip: Watch for weight changes, quill loss, or lethargy — these can signal health issues. Regular vet checkups are recommended!",
  },
  {
    keywords: ["bed", "sleep", "fleece", "cozy", "warm", "hide", "burrow"],
    reply: "Hedgehogs love burrowing! We have great options:\n\n- **Cozy Hedgehog Hideout** ($24.99) — soft fleece pouch, machine washable\n- **Hedgehog Sleeping Bag** ($34.99) — ultra-soft, perfect for staying warm\n- **Soft Fleece Bedding** ($22.99) — 2 yards of comfortable bedding\n\nAll are hedgehog-safe and easy to wash! 🦔",
  },
  {
    keywords: ["price", "cost", "expensive", "cheap", "budget", "afford"],
    reply: "We have options for every budget! 🦔 Starting from $12.99 for treats up to $249.99 for the luxury mansion. Our most popular items are the **Exercise Wheel** ($39.99) and **Care Starter Kit** ($79.99). The food subscription saves you 10% monthly too!",
  },
  {
    keywords: ["ship", "deliver", "shipping", "delivery", "arrive"],
    reply: "We offer standard shipping on all orders! 📦 Subscription orders always ship free. Most orders arrive within 3-5 business days. Check our Shipping page for full details. 🦔",
  },
  {
    keywords: ["hello", "hi", "hey", "help", "start"],
    reply: "Welcome to Hogster! 🦔 I'm here to help you find everything your hedgehog needs. I can help with:\n\n- 🍽️ Food & nutrition advice\n- 🏠 Housing recommendations\n- 🎡 Toys & exercise\n- 💊 Care & grooming tips\n\nWhat would you like to know about?",
  },
  {
    keywords: ["thank", "thanks", "awesome", "great", "perfect"],
    reply: "You're welcome! 🦔 Happy to help. If you have any other questions about hedgehog care or our products, just ask! Enjoy shopping at Hogster! 🛒",
  },
];

const DEFAULT_REPLY = "That's a great question! 🦔 While I'm not sure about that specific topic, I can help you with our products, hedgehog care tips, subscriptions, and shipping. What would you like to know about? Browse our full catalog on the homepage!";

function findResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  for (const entry of RESPONSES) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.reply;
    }
  }
  return DEFAULT_REPLY;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user");

    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: "No user message found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reply = findResponse(lastUserMessage.content);

    // Simulate slight delay for realism
    await new Promise(r => setTimeout(r, 300 + Math.random() * 700));

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
