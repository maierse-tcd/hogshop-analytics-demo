import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { trackEvent, posthog } from "@/lib/posthog";
import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from "posthog-js/react";
import { ArrowRight, X } from "lucide-react";
import { Newsletter } from "@/components/Newsletter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { simulateDemoErrors } from "@/utils/demoErrorSimulator";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  category: string;
  is_subscription: boolean;
  subscription_interval?: string;
  subscription_interval_count?: number;
}

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Product[];
    },
  });

  useEffect(() => {
    trackEvent("products_viewed", {
      product_count: products?.length || 0,
    });

    // Simulate demo errors in background (safe, non-blocking)
    // This runs once after initial render
    const errorTimer = setTimeout(() => {
      simulateDemoErrors();
    }, 2000); // Delay to ensure page is fully loaded

    return () => clearTimeout(errorTimer);
  }, [products]);

  // One-time event seeding for PostHog experiment setup
  useEffect(() => {
    const eventSeeded = localStorage.getItem("posthog_events_seeded");
    if (!eventSeeded) {
      // Send sample event to register it in PostHog
      trackEvent("newsletter_subscribed", {
        email: "demo@example.com",
        source: "event_seeding",
        variant: "test",
        subscribed_at: new Date().toISOString(),
        _demo_event: true
      });
      localStorage.setItem("posthog_events_seeded", "true");
    }
  }, []);

  const categories = ["All", "Food & Nutrition", "Housing", "Toys & Exercise", "Care & Grooming", "Bedding & Comfort", "Merchandise"];
  
  const filteredProducts = selectedCategory === "All" 
    ? products 
    : products?.filter(p => p.category === selectedCategory);

  // Use PostHog React hook for feature flags
  const showNewsletterFlag = useFeatureFlagEnabled('show_newsletter');
  const halloweenHeroFlag = useFeatureFlagEnabled('hero_banner_halloween');
  const newsletterSubVariant = useFeatureFlagVariantKey('newsletter_sub');
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  
  useEffect(() => {
    // Check localStorage for subscription status
    const subscribed = localStorage.getItem("newsletter_subscribed") === "true";
    setHasSubscribed(subscribed);

    // Show modal when feature flag is enabled and user hasn't subscribed
    if (showNewsletterFlag && !subscribed) {
      // Delay modal slightly for better UX
      const timer = setTimeout(() => {
        setShowNewsletterModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showNewsletterFlag]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Header />
      
      {/* Hero Section */}
      <section className={`relative border-b overflow-hidden ${
        halloweenHeroFlag 
          ? 'bg-gradient-to-br from-[hsl(var(--halloween-dark))] via-[hsl(var(--halloween-purple))]/30 to-[hsl(var(--halloween-dark))]' 
          : 'bg-gradient-to-br from-primary/10 via-background to-accent/15'
      }`}>
        {halloweenHeroFlag ? (
          <>
            {/* Halloween Theme */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--halloween-orange))_1px,transparent_1px)] bg-[length:32px_32px]" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[hsl(var(--halloween-orange))]/30 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[hsl(var(--halloween-purple))]/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            {/* Floating Ghosts */}
            <div className="absolute top-20 left-10 text-6xl animate-bounce" style={{ animationDuration: '3s', animationDelay: '0s' }}>👻</div>
            <div className="absolute top-40 right-20 text-5xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>👻</div>
            <div className="absolute bottom-32 left-20 text-4xl animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>👻</div>
            <div className="absolute top-60 right-40 text-3xl animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '2s' }}>🎃</div>
          </>
        ) : (
          <>
            {/* Regular Theme */}
            <div className="absolute inset-0 opacity-[0.15]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_1px,transparent_1px)] bg-[length:32px_32px]" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
          </>
        )}
        <div className="container py-24 md:py-36 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="text-sm px-4 py-1.5 font-semibold" variant="secondary">
              {halloweenHeroFlag ? '🎃 Spooky Supplies for your Hedgehog' : '🦔 Everything for your Hedgehog'}
            </Badge>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[1.1]">
              {halloweenHeroFlag ? (
                <>
                  Spooky Treats for
                  <br />
                  <span className="text-[hsl(var(--halloween-orange))]">Your Little Hedgie</span>
                </>
              ) : (
                <>
                  Your Hedgehog's
                  <br />
                  <span className="text-primary">Happy Place</span>
                </>
              )}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {halloweenHeroFlag 
                ? 'Frighteningly good treats and supplies for your spiky companion this Halloween season! 🦔👻' 
                : 'From premium nutrition to cozy habitats. Everything your spiky friend needs to thrive, delivered with love.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
              <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold" onClick={() => {
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                trackEvent("hero_cta_clicked", { 
                  cta: "shop_now",
                  experiment: "newsletter_sub",
                  variant: newsletterSubVariant || "control"
                });
              }}>
                Shop Now <ArrowRight className="h-5 w-5" />
              </Button>
              
              {/* A/B Test: Newsletter CTA vs Learn More */}
              {newsletterSubVariant === 'test' ? (
                // Test Variant: Newsletter CTA - More pronounced
                <Button 
                  size="lg" 
                  className="h-12 px-8 text-base font-semibold gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/30 animate-pulse hover:animate-none hover:scale-105 transition-transform" 
                  onClick={() => {
                    setShowNewsletterModal(true);
                    trackEvent("hero_cta_clicked", { 
                      cta: "newsletter_signup",
                      experiment: "newsletter_sub",
                      variant: "test"
                    });
                  }}
                >
                  🎉 Get 15% Off Newsletter
                </Button>
              ) : (
                // Control Variant: Learn More
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-12 px-8 text-base font-semibold" 
                  onClick={() => {
                    window.location.href = "/about";
                    trackEvent("hero_cta_clicked", { 
                      cta: "learn_more",
                      experiment: "newsletter_sub",
                      variant: newsletterSubVariant || "control"
                    });
                  }}
                >
                  Learn More About Us
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Modal */}
      {showNewsletterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowNewsletterModal(false);
              trackEvent("newsletter_modal_dismissed");
            }}
          />
          <div className="relative animate-in zoom-in-95 duration-300">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 z-10 rounded-full bg-background shadow-lg hover:bg-accent"
              onClick={() => {
                setShowNewsletterModal(false);
                trackEvent("newsletter_modal_closed");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            <Newsletter 
              variant="card" 
              onSubscribed={(email) => {
                setHasSubscribed(true);
                setShowNewsletterModal(false);
              }} 
            />
          </div>
        </div>
      )}

      {/* Products Section */}
      <section id="products" className={`container py-16 md:py-24 relative ${
        halloweenHeroFlag ? 'overflow-hidden' : ''
      }`}>
        {halloweenHeroFlag && (
          <>
            <div className="absolute top-10 left-5 text-4xl animate-bounce opacity-30" style={{ animationDuration: '4s' }}>🕸️</div>
            <div className="absolute top-20 right-10 text-5xl animate-bounce opacity-30" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>🕷️</div>
            <div className="absolute bottom-20 left-[10%] text-6xl animate-bounce opacity-20" style={{ animationDuration: '5s', animationDelay: '0.5s' }}>🦇</div>
            <div className="absolute top-[50%] right-[5%] text-4xl animate-bounce opacity-25" style={{ animationDuration: '4.5s', animationDelay: '2s' }}>👻</div>
          </>
        )}
        <div className="mb-12 relative">
          <div className="text-center mb-8">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${
              halloweenHeroFlag ? 'text-[hsl(var(--halloween-orange))] drop-shadow-[0_0_20px_hsl(var(--halloween-orange))]' : ''
            }`}>
              {halloweenHeroFlag ? '🎃 Spooky Shop by Category 👻' : 'Shop by Category'}
            </h2>
            <p className={`text-lg ${
              halloweenHeroFlag ? 'text-[hsl(var(--halloween-purple))]' : 'text-muted-foreground'
            }`}>
              {halloweenHeroFlag ? 'Frighteningly good supplies for your hedgehog! 🦔' : 'Find everything your hedgehog needs'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="font-semibold"
                onClick={() => {
                  setSelectedCategory(category);
                  trackEvent("category_filtered", { category });
                }}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found in this category.</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className={`border-t mt-24 relative overflow-hidden ${
        halloweenHeroFlag 
          ? 'bg-gradient-to-br from-[hsl(var(--halloween-dark))] via-[hsl(var(--halloween-purple))]/20 to-[hsl(var(--halloween-dark))] border-[hsl(var(--halloween-orange))]/30' 
          : 'bg-accent/5'
      }`}>
        {halloweenHeroFlag && (
          <>
            <div className="absolute top-5 left-10 text-3xl animate-bounce opacity-40" style={{ animationDuration: '3s' }}>🦇</div>
            <div className="absolute top-10 right-20 text-4xl animate-bounce opacity-40" style={{ animationDuration: '4s', animationDelay: '1s' }}>👻</div>
            <div className="absolute bottom-10 left-[30%] text-3xl animate-bounce opacity-30" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>🎃</div>
            <div className="absolute top-[50%] right-[10%] text-2xl animate-bounce opacity-35" style={{ animationDuration: '4.5s', animationDelay: '2s' }}>🕷️</div>
          </>
        )}
        <div className="container py-16 relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <h3 className={`font-bold text-2xl mb-4 ${
                halloweenHeroFlag 
                  ? 'text-[hsl(var(--halloween-orange))] drop-shadow-[0_0_10px_hsl(var(--halloween-orange))]' 
                  : 'text-primary'
              }`}>
                {halloweenHeroFlag ? '👻 HogShop 🎃' : '🦔 HogShop'}
              </h3>
              <p className={`max-w-sm leading-relaxed ${
                halloweenHeroFlag ? 'text-[hsl(var(--halloween-purple))]/90' : 'text-muted-foreground'
              }`}>
                {halloweenHeroFlag 
                  ? 'Your spooktacular source for premium hedgehog supplies! From frightfully good nutrition to haunted habitats, we provide everything your spiky companion needs! 🦔👻' 
                  : 'Your trusted source for premium hedgehog supplies. From nutrition to habitats, we provide everything your spiky companion needs to live their best life.'}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-lg">Shop</h4>
              <ul className="space-y-3 text-sm">
                {categories.filter(c => c !== "All").slice(0, 5).map(cat => (
                  <li key={cat}>
                    <button 
                      onClick={() => {
                        setSelectedCategory(cat);
                        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                      }} 
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-lg">Support</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
                <li><a href="/shipping" className="text-muted-foreground hover:text-primary transition-colors">Shipping Info</a></li>
                <li><a href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</a></li>
                <li><a href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 HogShop. All rights reserved. Made with ❤️ for hedgehogs.
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Powered by</span>
              <a href="https://posthog.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
                PostHog Analytics
              </a>
            </p>
          </div>
        </div>
      </footer>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
