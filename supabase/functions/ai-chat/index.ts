import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createTracer, parseTraceparent, SpanKind } from "../_shared/otel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, traceparent",
};

// ---------------------------------------------------------------------------
// Product catalog
//
// This is the source of truth the assistant reasons over. It powers both the
// real LLM call (injected as system context) and the offline fallback
// (keyword + comparison matching). Keeping specs structured lets the fallback
// build genuine side-by-side comparisons instead of returning one product's
// canned blurb.
// ---------------------------------------------------------------------------
type Product = {
  name: string;
  price: string;
  category: string;
  keywords: string[];
  summary: string;
  specs: Record<string, string>;
};

const CATALOG: Product[] = [
  {
    name: "Premium Hedgehog Food",
    price: "$29.99/month (subscription)",
    category: "Food",
    keywords: ["food", "feed", "eat", "diet", "nutrition", "premium hedgehog food"],
    summary: "High-protein (30%+) formula with natural ingredients, delivered monthly.",
    specs: { Protein: "30%+", Format: "Monthly subscription", Perk: "10% cheaper than one-off + free shipping" },
  },
  {
    name: "Freeze-Dried Mealworms",
    price: "$12.99",
    category: "Food",
    keywords: ["mealworm", "mealworms", "treat", "treats", "snack"],
    summary: "A favourite high-protein treat to supplement the main diet.",
    specs: { Use: "Supplement / treat", Protein: "High" },
  },
  {
    name: "Deluxe Hedgehog Habitat",
    price: "$129.99",
    category: "Housing",
    keywords: ["deluxe", "habitat", "starter cage", "deluxe habitat"],
    summary: "A great single-level starter cage with a built-in hideaway spot.",
    specs: { Size: "36\"x24\"", Levels: "Single level", "Best for": "First-time owners / smaller spaces" },
  },
  {
    name: "Luxury Hedgehog Mansion",
    price: "$249.99",
    category: "Housing",
    keywords: ["luxury", "mansion", "multi-level", "multi level", "luxury mansion"],
    summary: "A larger multi-level home with more floor space and enrichment room.",
    specs: { Size: "48\"x30\"", Levels: "Multi-level", "Best for": "More space, enrichment, multiple hideouts" },
  },
  {
    name: "Travel Carrier",
    price: "$44.99",
    category: "Housing",
    keywords: ["carrier", "travel", "vet visit", "transport"],
    summary: "Compact secure carrier, perfect for vet visits and short trips.",
    specs: { Use: "Travel / vet visits", Feature: "Secure and ventilated" },
  },
  {
    name: "Exercise Wheel",
    price: "$39.99",
    category: "Exercise",
    keywords: ["wheel", "exercise", "run", "running", "spinner"],
    summary: "A 12\" silent spinner for the 10+ hours of nightly activity hedgehogs need.",
    specs: { Diameter: "12\"", Noise: "Silent", Use: "Nightly exercise" },
  },
  {
    name: "Climbing Adventure Set",
    price: "$59.99",
    category: "Exercise",
    keywords: ["climb", "climbing", "adventure"],
    summary: "Enrichment set that encourages natural climbing and foraging.",
    specs: { Use: "Enrichment", Encourages: "Climbing & foraging" },
  },
  {
    name: "Interactive Play Set",
    price: "$34.99",
    category: "Exercise",
    keywords: ["play", "toy", "toys", "interactive", "enrichment"],
    summary: "Interactive toys that encourage natural foraging behaviours.",
    specs: { Use: "Enrichment / play", Encourages: "Foraging" },
  },
  {
    name: "Hedgehog Care Starter Kit",
    price: "$79.99",
    category: "Care",
    keywords: ["starter kit", "care kit", "nail", "clippers"],
    summary: "Everything to get started: nail clippers, soft brush, and a care guide.",
    specs: { Includes: "Nail clippers, soft brush, care guide", "Best for": "New owners" },
  },
  {
    name: "Premium Grooming Kit",
    price: "$29.99",
    category: "Care",
    keywords: ["grooming", "groom", "brush", "bath", "conditioning"],
    summary: "Professional grooming tools including conditioning oil.",
    specs: { Includes: "Professional tools + conditioning oil", "Best for": "Regular grooming" },
  },
  {
    name: "Cozy Hedgehog Hideout",
    price: "$24.99",
    category: "Bedding",
    keywords: ["hideout", "hide", "pouch", "cozy"],
    summary: "Soft fleece pouch for burrowing; machine washable.",
    specs: { Material: "Fleece", Washable: "Machine washable", Use: "Burrowing / hiding" },
  },
  {
    name: "Hedgehog Sleeping Bag",
    price: "$34.99",
    category: "Bedding",
    keywords: ["sleeping bag", "sleep", "warm"],
    summary: "Ultra-soft sleeping bag, perfect for staying warm.",
    specs: { Material: "Ultra-soft", Use: "Warmth / sleeping" },
  },
  {
    name: "Soft Fleece Bedding",
    price: "$22.99",
    category: "Bedding",
    keywords: ["bedding", "fleece", "burrow"],
    summary: "2 yards of comfortable, easy-to-wash bedding.",
    specs: { Quantity: "2 yards", Washable: "Yes" },
  },
  {
    name: "Hedgehog Plushie",
    price: "$29.99",
    category: "Gifts",
    keywords: ["plushie", "plush", "gift", "present"],
    summary: "Adorable cuddly plushie — a popular gift.",
    specs: { Type: "Gift / merchandise" },
  },
  {
    name: "Hedgehog Coffee Mug",
    price: "$16.99",
    category: "Gifts",
    keywords: ["mug", "coffee"],
    summary: "Cute mug to start the day — a great small gift.",
    specs: { Type: "Gift / merchandise" },
  },
  {
    name: "Hedgehog Lover T-Shirt",
    price: "$24.99",
    category: "Gifts",
    keywords: ["t-shirt", "tshirt", "shirt", "apparel"],
    summary: "Available in multiple sizes — a fun gift for hedgehog fans.",
    specs: { Type: "Apparel", Sizes: "Multiple" },
  },
];

const SHIPPING_NOTE =
  "Standard shipping ships on all orders (3-5 business days); subscription orders always ship free.";

// ---------------------------------------------------------------------------
// LLM call (Lovable AI Gateway)
//
// The gateway serves `google/gemini-2.5-flash` — the exact model this endpoint
// is instrumented as — behind an OpenAI-compatible /chat/completions API. When
// a key is configured we make a real call; otherwise we fall back to the
// comparison-aware matcher below so the demo keeps working with no key.
// ---------------------------------------------------------------------------
const LLM_API_KEY =
  Deno.env.get("LOVABLE_API_KEY") ||
  Deno.env.get("AI_GATEWAY_API_KEY") ||
  Deno.env.get("GEMINI_API_KEY") ||
  "";
const LLM_GATEWAY_URL =
  Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
const LLM_MODEL = "google/gemini-2.5-flash";

function buildCatalogContext(): string {
  return CATALOG.map((p) => {
    const specs = Object.entries(p.specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    return `- ${p.name} — ${p.price} [${p.category}]. ${p.summary} (${specs})`;
  }).join("\n");
}

const SYSTEM_PROMPT = `You are the Hedgehog Care Assistant for Hogster, a hedgehog supplies store. Be warm, concise, and genuinely helpful — the odd 🦔 emoji is fine.

Answer using ONLY the product catalog below. Prices and specs must match it exactly; never invent products, prices, or facts. If something isn't in the catalog, say so briefly and point the shopper to the catalog on the homepage.

When a shopper compares two or more products (e.g. "is X or Y better?", "difference between X and Y?"), do NOT just describe one. Give a genuine side-by-side comparison: contrast the key specs, then give a clear recommendation tailored to what they said (space, budget, experience level, etc.).

${SHIPPING_NOTE}

PRODUCT CATALOG:
${buildCatalogContext()}`;

type LlmResult = { reply: string; inputTokens?: number; outputTokens?: number };

async function callLlm(
  messages: { role: string; content: string }[],
): Promise<LlmResult | null> {
  if (!LLM_API_KEY) return null;

  const chatMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  const resp = await fetch(LLM_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: LLM_MODEL, messages: chatMessages }),
  });

  if (!resp.ok) {
    // Surface the gateway status to the caller so it can decide to fall back.
    throw new Error(`llm_gateway_${resp.status}`);
  }

  const data = await resp.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("llm_empty_response");

  return {
    reply,
    inputTokens: data?.usage?.prompt_tokens,
    outputTokens: data?.usage?.completion_tokens,
  };
}

// ---------------------------------------------------------------------------
// Offline fallback: comparison-aware keyword matching
// ---------------------------------------------------------------------------
function matchProducts(lower: string): Product[] {
  const matched: Product[] = [];
  for (const p of CATALOG) {
    const hit =
      lower.includes(p.name.toLowerCase()) ||
      p.keywords.some((kw) => lower.includes(kw));
    if (hit) matched.push(p);
  }
  return matched;
}

function buildComparison(products: Product[]): string {
  const top = products.slice(0, 3);
  const lines = top.map((p) => {
    const specs = Object.entries(p.specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
    return `**${p.name}** — ${p.price}\n${p.summary}\n_${specs}_`;
  });

  // A lightweight recommendation heuristic: prefer the cheaper option for
  // budget-minded phrasing, otherwise nudge toward the more feature-rich pick.
  const cheapest = [...top].sort((a, b) => priceValue(a) - priceValue(b))[0];
  const priciest = [...top].sort((a, b) => priceValue(b) - priceValue(a))[0];
  const rec =
    cheapest.name === priciest.name
      ? ""
      : `\n\n**Quick take:** go with the **${cheapest.name}** if budget or space is tight, or the **${priciest.name}** if you want more room and features. Happy to dig into either! 🦔`;

  return `Great question — here's how they stack up:\n\n${lines.join("\n\n")}${rec}`;
}

function priceValue(p: Product): number {
  const m = p.price.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : Number.MAX_SAFE_INTEGER;
}

const GREETING_REPLY =
  "Welcome to Hogster! 🦔 I can help with food & nutrition, housing, toys & exercise, care & grooming, gifts, subscriptions, and shipping. What are you shopping for?";

const DEFAULT_REPLY =
  "I'm not certain about that one, but I can help you compare products, pick the right food, habitat, wheel, or care kit, and explain our subscription and shipping. Try asking something like \"is the Deluxe Habitat or the Luxury Mansion better?\" — or browse the full catalog on the homepage! 🦔";

const GREETING_WORDS = new Set(["hello", "hi", "hey", "help", "start", "hiya", "howdy"]);

function fallbackReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  const matched = matchProducts(lower);

  // Greeting only when it's a standalone word (not a substring like "hi" in
  // "which") and no product was mentioned, so "which is better?" isn't
  // mistaken for a greeting.
  const words = lower.split(/[^a-z]+/).filter(Boolean);
  if (matched.length === 0 && words.some((w) => GREETING_WORDS.has(w))) {
    return GREETING_REPLY;
  }

  // Two or more products in play → structured side-by-side. This is the core
  // fix: a comparison question ("is X or Y better?") or a broad category match
  // ("housing options") now returns a real comparison, not one product's blurb.
  if (matched.length >= 2) {
    return buildComparison(matched);
  }

  // Single clear product / topic match → describe it with catalog specs.
  if (matched.length === 1) {
    const p = matched[0];
    const specs = Object.entries(p.specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
    return `**${p.name}** — ${p.price}\n${p.summary}\n_${specs}_\n\nWant me to compare it with another option? 🦔`;
  }

  if (["subscribe", "subscription", "monthly", "recurring"].some((k) => lower.includes(k))) {
    return "Our **Premium Hedgehog Food** subscription ($29.99/month) saves you 10% vs one-time, ships free every month, and you can pause or cancel anytime. 🦔";
  }
  if (["ship", "deliver", "shipping", "delivery", "arrive"].some((k) => lower.includes(k))) {
    return `${SHIPPING_NOTE} 📦`;
  }
  if (["price", "cost", "expensive", "cheap", "budget", "afford"].some((k) => lower.includes(k))) {
    return "We've got something for every budget — from $12.99 treats up to the $249.99 Luxury Mansion. Tell me what you're after and I'll point you to the best value. 🦔";
  }

  return DEFAULT_REPLY;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const incoming = parseTraceparent(req.headers.get("traceparent"));
  const tracer = createTracer("hogshop-edge", incoming);

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

        // Real LLM call via the Lovable AI Gateway, wrapped in a child span with
        // gen_ai.* attributes so it lines up with PostHog's LLM trace
        // conventions. Falls back to the comparison-aware matcher if no gateway
        // key is configured or the gateway errors.
        const reply = await tracer.withSpan(
          "ai-chat.gemini_call",
          async (genSpan) => {
            genSpan.setAttributes({
              "gen_ai.system": "google",
              "gen_ai.request.model": LLM_MODEL,
              "gen_ai.operation.name": "chat",
            });

            let text: string;
            let inputTokens: number | undefined;
            let outputTokens: number | undefined;
            let source = "fallback";

            try {
              const llm = await callLlm(messages);
              if (llm) {
                text = llm.reply;
                inputTokens = llm.inputTokens;
                outputTokens = llm.outputTokens;
                source = "llm";
              } else {
                text = fallbackReply(lastUserMessage.content);
                genSpan.setAttribute("gen_ai.fallback.reason", "no_api_key");
              }
            } catch (llmErr) {
              // Gateway failed (rate limit, outage, empty response) — degrade
              // gracefully to the local matcher rather than erroring the chat.
              text = fallbackReply(lastUserMessage.content);
              genSpan.setAttribute(
                "gen_ai.fallback.reason",
                llmErr instanceof Error ? llmErr.message : "llm_error",
              );
            }

            // Estimate tokens when the gateway didn't return usage (fallback path).
            if (inputTokens === undefined) {
              inputTokens = Math.ceil(
                messages.map((m: { content: string }) => m.content).join("").length / 4,
              );
            }
            if (outputTokens === undefined) {
              outputTokens = Math.ceil(text.length / 4);
            }

            genSpan.setAttributes({
              "gen_ai.response.source": source,
              "gen_ai.usage.input_tokens": inputTokens,
              "gen_ai.usage.output_tokens": outputTokens,
            });
            return text;
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    // Flush spans to PostHog before the function returns.
    await tracer.flush();
  }
});
