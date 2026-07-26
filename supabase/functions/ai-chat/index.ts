import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createTracer, parseTraceparent, SpanKind } from "../_shared/otel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, traceparent",
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

// ---------------------------------------------------------------------------
// Fuzzy text matching
//
// The chat widget is the store's de-facto search bar, so matching needs to be
// forgiving: plurals, common typos, and partial words should all resolve. We
// tokenize the query and compare tokens with plural-stripping + a small
// Levenshtein tolerance rather than the old brittle `message.includes(keyword)`
// substring check.
// ---------------------------------------------------------------------------

// Words that carry no discriminating signal for product lookup — nearly every
// catalog title contains them, so a match on these alone shouldn't surface a
// product.
const STOP_TOKENS = new Set([
  "hedgehog", "hedgehogs", "posthog", "the", "a", "an", "and", "or", "for",
  "with", "your", "you", "i", "me", "my", "do", "does", "have", "has", "is",
  "are", "can", "any", "some", "of", "to", "in", "on", "it", "this", "that",
  "want", "need", "looking", "find", "get", "buy", "show", "please", "hi",
  "hello", "hey", "product", "products", "item", "items", "sell",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Strip simple English plurals so "wheels" -> "wheel", "mice" stays as-is etc.
function singularize(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// Bounded Levenshtein edit distance (early-exits once it exceeds `max`).
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr[j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

// Do two tokens refer to the same word, allowing for plurals, prefixes
// (e.g. "ship" ~ "shipping") and small typos?
function tokensMatch(a: string, b: string): boolean {
  a = singularize(a);
  b = singularize(b);
  if (a === b) return true;
  const min = Math.min(a.length, b.length);
  const max = Math.max(a.length, b.length);
  if (max <= 3) return a === b; // too short to fuzzy-match safely
  // prefix containment handles word forms like "ship"/"shipping", "groom"/"grooming"
  if (min >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  // typo tolerance scaled to word length — only for words of near-equal length,
  // so a long word can't collapse into a short keyword (e.g. "replay" -> "play").
  if (max - min > 1) return false;
  const tol = max <= 5 ? 1 : 2;
  return editDistance(a, b, tol) <= tol;
}

// ---------------------------------------------------------------------------
// Live product catalog lookup
//
// Rather than only matching a fixed keyword list, we fuzzy-match the query
// against the real Supabase `products` catalog so new products are findable
// without hand-editing RESPONSES. Results are cached briefly to avoid a DB
// round-trip on every message.
// ---------------------------------------------------------------------------

interface Product {
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  is_subscription: boolean | null;
  subscription_interval: string | null;
}

let productCache: { products: Product[]; expires: number } | null = null;
const PRODUCT_CACHE_MS = 60_000;

async function getProducts(nowMs: number): Promise<Product[]> {
  if (productCache && productCache.expires > nowMs) {
    return productCache.products;
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return [];

  const client = createClient(url, key);
  const { data, error } = await client
    .from("products")
    .select("title, description, price, category, is_subscription, subscription_interval");
  if (error || !data) return [];

  const products = data as Product[];
  productCache = { products, expires: nowMs + PRODUCT_CACHE_MS };
  return products;
}

function formatPrice(p: Product): string {
  const price = `$${Number(p.price).toFixed(2)}`;
  return p.is_subscription && p.subscription_interval ? `${price}/${p.subscription_interval}` : price;
}

// Score a product against the query tokens. Title matches are weighted highest;
// a match must hit at least one non-stopword title token to count as a hit, so
// generic words like "hedgehog" alone never surface a random product.
function scoreProduct(p: Product, queryTokens: string[]): number {
  const titleTokens = tokenize(p.title);
  const extraTokens = [...tokenize(p.category ?? ""), ...tokenize(p.description ?? "")];

  let titleHits = 0;
  let score = 0;
  for (const q of queryTokens) {
    if (STOP_TOKENS.has(q)) continue;
    if (titleTokens.some((t) => tokensMatch(q, t))) {
      titleHits++;
      score += 3;
    } else if (extraTokens.some((t) => tokensMatch(q, t))) {
      score += 1;
    }
  }
  return titleHits > 0 ? score : 0;
}

function catalogReply(userMessage: string, products: Product[]): string | null {
  if (products.length === 0) return null;
  const queryTokens = tokenize(userMessage);
  if (queryTokens.length === 0) return null;

  const ranked = products
    .map((p) => ({ p, score: scoreProduct(p, queryTokens) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;

  // If one product clearly wins, spotlight it; otherwise list the top matches.
  const top = ranked[0];
  const closeMatches = ranked.filter((r) => r.score >= top.score - 1).slice(0, 3);

  if (closeMatches.length === 1) {
    const p = top.p;
    const desc = p.description ? `\n\n${p.description}` : "";
    return `Found it! 🦔 **${p.title}** — ${formatPrice(p)}${desc}\n\nWould you like to add it to your cart?`;
  }

  const list = closeMatches
    .map((r) => `- **${r.p.title}** — ${formatPrice(r.p)}`)
    .join("\n");
  return `Here's what I found in our catalog that might match! 🦔\n\n${list}\n\nLet me know if you'd like more details on any of these.`;
}

function keywordReply(userMessage: string): string | null {
  const queryTokens = tokenize(userMessage);
  let best: { reply: string; score: number } | null = null;
  for (const entry of RESPONSES) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (queryTokens.some((q) => tokensMatch(q, kw))) score++;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { reply: entry.reply, score };
    }
  }
  return best ? best.reply : null;
}

// Returns the reply plus which layer produced it (for tracing/observability).
async function findResponse(
  userMessage: string,
  nowMs: number,
): Promise<{ reply: string; source: "keyword" | "catalog" | "default" }> {
  // 1. Curated advice/keyword responses take priority (richest content).
  const keyword = keywordReply(userMessage);
  if (keyword) return { reply: keyword, source: "keyword" };

  // 2. Fuzzy lookup against the live product catalog. Never let a DB hiccup
  //    break the chat — fall through to the default reply on failure.
  try {
    const products = await getProducts(nowMs);
    const catalog = catalogReply(userMessage, products);
    if (catalog) return { reply: catalog, source: "catalog" };
  } catch (_err) {
    // swallow — degrade gracefully to DEFAULT_REPLY
  }

  return { reply: DEFAULT_REPLY, source: "default" };
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
            const { reply: r, source } = await findResponse(lastUserMessage.content, Date.now());
            genSpan.setAttribute("chat.match_source", source);
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    // Flush spans to PostHog before the function returns.
    await tracer.flush();
  }
});
