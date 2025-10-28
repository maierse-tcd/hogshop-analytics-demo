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
          <h1 className="text-4xl font-bold mb-4">Welcome to Hogster Demo 🦔</h1>
          <p className="text-xl text-muted-foreground">
            A showcase of advanced product analytics, AI integration, and experimentation
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
                Hogster is a fully functional e-commerce demo that demonstrates real-world implementation 
                of product analytics, AI-powered customer support, A/B testing, and user behavior tracking.
              </p>
              <div className="grid gap-3">
                <div className="flex gap-3">
                  <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">AI Hedgehog Care Assistant</p>
                    <p className="text-sm text-muted-foreground">
                      Chat with our AI assistant powered by Gemini 2.5 Flash. Every conversation is tracked 
                      with token usage, latency, and cost metrics.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ShoppingCart className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Complete E-commerce Flow</p>
                    <p className="text-sm text-muted-foreground">
                      Browse products, add to cart, and complete purchases with Stripe integration. 
                      Every action is tracked for analytics.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <FlaskConical className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Live A/B Experiments</p>
                    <p className="text-sm text-muted-foreground">
                      Experience real-time feature flag experiments testing different UI variants 
                      and messaging strategies.
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
                Events We Track
              </CardTitle>
              <CardDescription>
                Every interaction is captured to provide actionable insights
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
              <p><strong>Customer Segments:</strong> Users are grouped by CLTV (high_value, medium_value, low_value)</p>
              <p><strong>Engagement Levels:</strong> Classified as power_user, active, or casual based on session count</p>
              <p><strong>Subscription Tiers:</strong> Tracked for subscription vs one-time purchase customers</p>
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
                This is a demo environment. All purchases use Stripe test mode with dummy card numbers. 
                No real transactions occur.
              </p>
              <p>
                Analytics data helps us understand user behavior and improve the shopping experience. 
                Session recordings capture UI interactions (not form inputs) to identify usability issues.
              </p>
              <p className="text-muted-foreground">
                Test card: 4242 4242 4242 4242 • Exp: Any future date • CVV: Any 3 digits
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Readme;
