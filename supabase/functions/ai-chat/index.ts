import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    console.log("AI Chat - Processing request with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are a helpful Hedgehog Care Assistant for Hogster, an e-commerce store selling hedgehog products and supplies.

## Our Complete Product Catalog

### Food & Nutrition
1. **Premium Hedgehog Food** - $29.99/month (Subscription)
   - Monthly delivery of 2kg premium hedgehog food blend
   - Natural ingredients specially formulated for hedgehogs
   - High protein content with balanced nutrition

2. **Hedgehog Treat Pack** - $14.99
   - Assorted mealworms and insect treats in premium jar
   - Perfect for training and bonding with your hedgehog
   - Natural protein-rich snacks

### Housing
3. **Deluxe Hedgehog Habitat** - $129.99
   - Spacious 36" x 24" cage with natural wood elements
   - Includes accessories and hideaway spots
   - Easy to clean with removable bottom tray

### Toys & Exercise
4. **Hedgehog Exercise Wheel** - $39.99
   - 12" silent spinner wheel for nighttime activity
   - Smooth running surface prevents foot injuries
   - Quiet operation for peaceful nights

5. **Hedgehog Climbing Adventure Set** - $59.99
   - Natural wood climbing toys, tunnels, and ramps
   - Enrichment and exercise for active hedgehogs
   - Safe, non-toxic materials

### Care & Grooming
6. **Hedgehog Care Starter Kit** - $79.99
   - Complete grooming tools and care essentials
   - Includes nail clippers, soft brush, and care guide
   - Everything new hedgehog owners need

7. **Ceramic Food & Water Bowls** - $19.99
   - Shallow ceramic bowl set in natural earth tones
   - Dishwasher safe and tip-resistant design
   - Perfect size for hedgehogs

### Bedding & Comfort
8. **Cozy Hedgehog Hideout** - $24.99
   - Soft fleece sleeping pouch with adorable pattern
   - Machine washable and hedgehog-safe materials
   - Perfect for burrowing and feeling secure

9. **Hedgehog Sleeping Bag** - $34.99
   - Ultra-soft fleece sleeping bag with hedgehog-safe materials
   - Perfect for burrowing and staying warm
   - Easy to wash and maintain

### Merchandise
10. **Hedgehog Plushie** - $29.99
    - Adorable PostHog mascot plushie
    - Soft and cuddly for hedgehog lovers
    - Great gift for hedgehog enthusiasts

## Hedgehog Care Knowledge

**Diet:** Hedgehogs need high-protein food (30%+), insects as treats, and fresh water daily. Avoid dairy, grapes, and sugary foods.

**Habitat:** Minimum 2 sq ft floor space, 72-78°F temperature, solid flooring (no wire), and hideaway spots for security.

**Exercise:** Need 10+ hours of activity nightly. Exercise wheels are essential. Provide tunnels and toys for enrichment.

**Health:** Watch for weight changes, quill loss, lethargy. Regular vet checkups recommended. Common issues: mites, respiratory infections.

**Behavior:** Nocturnal, solitary animals. May huff when scared. Bonding takes patience and treats.

## Subscription Benefits
- 10% savings on Premium Hedgehog Food subscription
- Never run out of food
- Free shipping on all subscription orders
- Can pause or cancel anytime

Be friendly, concise, and helpful. Keep responses under 100 words unless detailed info is requested. Use warm tone and occasional hedgehog emojis 🦔. Always recommend products that match customer needs.` 
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    console.log("AI Chat - Streaming response");
    
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
