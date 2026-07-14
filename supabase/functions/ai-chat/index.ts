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
// Fuzzy / substring matching helpers
//
// The chat used to only match a message against a static keyword list with
// `lower.includes(kw)`, so anything phrased differently — a synonym, a typo,
// or a product we never hardcoded — silently fell through to DEFAULT_REPLY.
// The helpers below add typo tolerance and, crucially, let us match against
// the *real* product catalog so product searches resolve even when the wording
// doesn't land on a hardcoded keyword.
// ---------------------------------------------------------------------------

// Common filler words that shouldn't drive a product match on their own.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "with", "to", "of", "in", "on", "at",
  "my", "me", "i", "you", "your", "we", "our", "is", "are", "am", "be", "do",
  "does", "did", "can", "could", "would", "should", "will", "get", "got",
  "have", "has", "need", "needs", "want", "wants", "looking", "look", "find",
  "show", "buy", "any", "some", "there", "that", "this", "these", "those",
  "it", "its", "please", "help", "hello", "hi", "hey", "hedgehog", "hedgehogs",
  "product", "products", "item", "items", "sell", "shop", "store",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter((t) => t.length > 0);
}

// Query tokens worth matching on: drop stopwords and very short fragments.
function meaningfulTokens(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokenize(text)) {
    if (t.length < 3 || STOPWORDS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

// Standard Levenshtein edit distance for typo tolerance.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// Does query token `q` match catalog token `t`? Allows exact match, substring
// (for longer tokens) and a small edit distance so typos still resolve.
function tokenMatches(q: string, t: string): boolean {
  if (q === t) return true;
  if (q.length >= 4 && t.length >= 4 && (t.includes(q) || q.includes(t))) {
    return true;
  }
  const maxLen = Math.max(q.length, t.length);
  if (maxLen < 4) return false;
  const allowed = maxLen <= 5 ? 1 : 2;
  return levenshtein(q, t) <= allowed;
}

interface CatalogProduct {
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  is_subscription?: boolean;
  subscription_interval?: string | null;
}

// Keyword matching, now typo-tolerant. Longer keywords match query tokens
// within a small edit distance; short keywords (greetings like "hi") still
// require a substring hit to avoid false positives.
function findKeywordResponse(userMessage: string): string | null {
  const lower = userMessage.toLowerCase();
  const tokens = tokenize(userMessage);
  for (const entry of RESPONSES) {
    const hit = entry.keywords.some((kw) => {
      if (lower.includes(kw)) return true;
      if (kw.length < 5) return false;
      return tokens.some((tok) => tok.length >= 4 && tokenMatches(tok, kw));
    });
    if (hit) return entry.reply;
  }
  return null;
}

function formatPrice(product: CatalogProduct): string {
  const price = `$${product.price.toFixed(2)}`;
  if (product.is_subscription && product.subscription_interval) {
    return `${price}/${product.subscription_interval}`;
  }
  return price;
}

// Match the message against the real product catalog. Titles are weighted more
// heavily than descriptions, and a whole-title substring is treated as a strong
// signal. Returns the best-matching products (highest score first).
function findMatchingProducts(
  userMessage: string,
  products: CatalogProduct[],
): CatalogProduct[] {
  const queryTokens = meaningfulTokens(userMessage);
  if (queryTokens.length === 0) return [];
  const normalizedQuery = normalize(userMessage);

  const scored = products.map((product) => {
    const titleTokens = tokenize(product.title);
    const descTokens = tokenize(product.description ?? "");
    let score = 0;

    for (const q of queryTokens) {
      if (titleTokens.some((t) => tokenMatches(q, t))) {
        score += 3;
      } else if (descTokens.some((t) => tokenMatches(q, t))) {
        score += 2;
      }
    }

    // Strong boost when the message contains (most of) the product title.
    const normalizedTitle = normalize(product.title);
    if (normalizedTitle.length > 0 && normalizedQuery.includes(normalizedTitle)) {
      score += 5;
    }

    return { product, score };
  });

  // A single matched word (title, or a distinctive description term like a
  // synonym) is enough to surface a product — this is a fallback after the
  // curated keyword replies, so we bias toward recall over a generic reply.
  return scored
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.product);
}

function buildProductReply(products: CatalogProduct[]): string {
  const lines = products.map((p) => {
    const desc = (p.description ?? "").trim();
    const shortDesc = desc.length > 120 ? `${desc.slice(0, 117)}…` : desc;
    return `- **${p.title}** (${formatPrice(p)})${shortDesc ? ` — ${shortDesc}` : ""}`;
  });
  const intro = products.length === 1
    ? "I found a product that might be just what you're looking for! 🦔"
    : "Here are some products that might be what you're looking for! 🦔";
  return `${intro}\n\n${lines.join("\n")}\n\nWant more details on any of these? Just ask!`;
}

interface MatchResult {
  reply: string;
  matchType: "keyword" | "catalog" | "default";
  matchedProductCount: number;
}

function findResponse(userMessage: string, products: CatalogProduct[]): MatchResult {
  // 1) Curated topic replies (care advice, shipping, greetings…) — now typo tolerant.
  const keywordReply = findKeywordResponse(userMessage);
  if (keywordReply) {
    return { reply: keywordReply, matchType: "keyword", matchedProductCount: 0 };
  }

  // 2) Fall back to the real catalog with fuzzy matching so synonyms, typos and
  //    products we never hardcoded still surface instead of a generic reply.
  const matches = findMatchingProducts(userMessage, products);
  if (matches.length > 0) {
    return {
      reply: buildProductReply(matches),
      matchType: "catalog",
      matchedProductCount: matches.length,
    };
  }

  return { reply: DEFAULT_REPLY, matchType: "default", matchedProductCount: 0 };
}

// Small in-memory cache so we don't re-query the catalog on every message.
// Edge instances are reused across invocations, so this keeps chat snappy.
let catalogCache: { products: CatalogProduct[]; fetchedAt: number } | null = null;
const CATALOG_TTL_MS = 60_000;

async function loadCatalog(): Promise<CatalogProduct[]> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CATALOG_TTL_MS) {
    return catalogCache.products;
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return catalogCache?.products ?? [];

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase
    .from("products")
    .select("title, description, price, category, is_subscription, subscription_interval");

  if (error || !data) {
    // Fall back to any previously cached catalog (or nothing) — matching then
    // degrades to keyword-only rather than failing the whole request.
    return catalogCache?.products ?? [];
  }

  const products = (data as CatalogProduct[]).map((p) => ({
    ...p,
    price: typeof p.price === "number" ? p.price : Number(p.price),
  }));
  catalogCache = { products, fetchedAt: Date.now() };
  return products;
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

        // Load the real product catalog so product searches can be matched
        // against actual titles/descriptions (with fuzzy tolerance) rather than
        // only a hardcoded keyword list. Failures degrade to keyword matching.
        const catalog = await loadCatalog();

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
            const match = findResponse(lastUserMessage.content, catalog);
            const r = match.reply;
            genSpan.setAttributes({
              "chat.match_type": match.matchType,
              "chat.matched_product_count": match.matchedProductCount,
              "chat.catalog_size": catalog.length,
            });
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
