import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShoppingCart, MessageCircle, FlaskConical, BarChart3, Users, Shield } from "lucide-react";

const Readme = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Hogshop Technical Demo 🦔</h1>
          <p className="text-xl text-muted-foreground">
            Production-grade PostHog analytics implementation featuring Max the Hedgehog
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            A comprehensive e-commerce platform demonstrating product analytics, AI/LLM tracking, feature flags, experiments, and session replay
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                What Makes This Demo Special
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Hogshop is a production-grade technical demo showcasing comprehensive PostHog integration. 
                Built with React 18, TypeScript, and Lovable Cloud (Supabase), it demonstrates advanced 
                analytics patterns including AI/LLM tracking, experiments, and real-time event capture.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Mascot:</strong> Max the Hedgehog | <strong>Product Catalog:</strong> 18 hedgehog care products across 6 categories
              </p>
              <div className="grid gap-3">
                <div className="flex gap-3">
                  <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">AI Hedgehog Care Assistant (Max)</p>
                    <p className="text-sm text-muted-foreground">
                      AI chatbot powered by Lovable AI (Google Gemini 2.5 Flash). Tracks full AI traces with 
                      $ai_generation events including token counts, costs ($ai_total_cost_usd), and conversation IDs.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ShoppingCart className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Complete E-commerce Flow</p>
                    <p className="text-sm text-muted-foreground">
                      18 products (Food, Housing, Toys, Care, Bedding, Merchandise) with cart operations, 
                      Stripe checkout, and subscription management. Tracks Customer Lifetime Value (CLTV) on purchases.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <FlaskConical className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Feature Flags & Experiments</p>
                    <p className="text-sm text-muted-foreground">
                      9 active feature flags including seasonal themes, product card designs, discount banners, 
                      and newsletter CTAs. Proper $feature_view and $feature_interaction tracking.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Event Taxonomy
              </CardTitle>
              <CardDescription>
                Comprehensive event tracking with structured properties for advanced analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">E-commerce Events</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">product_viewed</Badge>
                      <span className="text-muted-foreground">Product page visits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">add_to_cart</Badge>
                      <span className="text-muted-foreground">Items added to cart</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">cart_viewed</Badge>
                      <span className="text-muted-foreground">Cart drawer opened</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">checkout_started</Badge>
                      <span className="text-muted-foreground">Checkout initiated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">purchase_completed</Badge>
                      <span className="text-muted-foreground">Successful purchases</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">AI & Chat Events</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">chat_opened</Badge>
                      <span className="text-muted-foreground">AI assistant launched</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">chat_message_sent</Badge>
                      <span className="text-muted-foreground">User messages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">$ai_generation</Badge>
                      <span className="text-muted-foreground">AI responses with metrics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">$ai_trace</Badge>
                      <span className="text-muted-foreground">Full conversation sessions</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">User Behavior</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">newsletter_subscribed</Badge>
                      <span className="text-muted-foreground">Email signups</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">$survey_shown</Badge>
                      <span className="text-muted-foreground">Survey displays</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">$survey_response</Badge>
                      <span className="text-muted-foreground">Survey submissions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">$exception</Badge>
                      <span className="text-muted-foreground">Error tracking</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Experiments</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">experiment_viewed</Badge>
                      <span className="text-muted-foreground">Variant exposures</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">banner_clicked</Badge>
                      <span className="text-muted-foreground">Promo banner clicks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">$feature_view</Badge>
                      <span className="text-muted-foreground">Feature flag views</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Active Experiments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border rounded-lg">
                <p className="font-semibold">Product Card Design (A/B Test)</p>
                <p className="text-sm text-muted-foreground">
                  Testing vertical vs horizontal product card layouts to optimize add-to-cart rates
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-semibold">Discount Banner (A/B Test)</p>
                <p className="text-sm text-muted-foreground">
                  Measuring impact of "20% off first order" banner on conversion rates
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-semibold">AI Chat Proactive Prompt (A/B Test)</p>
                <p className="text-sm text-muted-foreground">
                  Testing auto-shown tooltip vs basic chat icon for engagement
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-semibold">Subscription Highlight (A/B Test)</p>
                <p className="text-sm text-muted-foreground">
                  Testing "Most Popular" badge on subscription products
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Segmentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Tech Stack:</strong> React 18.3 + TypeScript 5.x, Vite 6, Tailwind CSS 3, TanStack Query v5</p>
              <p><strong>Backend:</strong> Lovable Cloud (Supabase) with PostgreSQL 15, Edge Functions (Deno runtime)</p>
              <p><strong>Analytics:</strong> PostHog (posthog-js v1.280+) with session replay, feature flags, and web experiments</p>
              <p><strong>Customer Segments:</strong> CLTV-based (high_value, medium_value, low_value), engagement tracking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Data
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                <strong>Demo Environment:</strong> All purchases use Stripe test mode. No real transactions occur.
              </p>
              <p>
                <strong>Security:</strong> Row Level Security (RLS) on all tables, server-side payment processing, 
                environment variables secured in Supabase secrets, CORS configured for edge functions.
              </p>
              <p>
                <strong>Session Replay:</strong> Captures UI interactions, console logs, and network requests 
                (form inputs are masked by default).
              </p>
              <p className="font-mono text-xs bg-muted p-2 rounded">
                Test Card: 4242 4242 4242 4242 | Exp: Any future date | CVV: Any 3 digits
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Readme;
