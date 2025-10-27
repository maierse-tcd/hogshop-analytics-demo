import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { trackEvent, posthog, checkFeatureFlag } from "@/lib/posthog";
import { ArrowRight } from "lucide-react";
import { Newsletter } from "@/components/Newsletter";

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
  }, [products]);

  const categories = ["All", "Food & Nutrition", "Housing", "Toys & Exercise", "Care & Grooming", "Bedding & Comfort", "Merchandise"];
  
  const filteredProducts = selectedCategory === "All" 
    ? products 
    : products?.filter(p => p.category === selectedCategory);

  // Check feature flag and subscription status
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  
  useEffect(() => {
    // Check localStorage for subscription status
    const subscribed = localStorage.getItem("newsletter_subscribed") === "true";
    setHasSubscribed(subscribed);
    console.log("Newsletter subscription status from localStorage:", subscribed);

    // Robust feature flag check with PostHog
    const updateFeatureFlag = () => {
      const isEnabled = checkFeatureFlag("show_newsletter");
      console.log("Setting showNewsletter to:", isEnabled);
      setShowNewsletter(isEnabled);
    };
    
    // Immediate check
    updateFeatureFlag();
    
    // Listen for feature flags to load
    posthog.onFeatureFlags(() => {
      console.log("PostHog feature flags loaded callback triggered");
      updateFeatureFlag();
    });
    
    // Reload feature flags to ensure fresh data
    console.log("Reloading PostHog feature flags...");
    posthog.reloadFeatureFlags();
    
    // Poll for feature flag changes every 3 seconds (for testing)
    const interval = setInterval(() => {
      console.log("Polling feature flag...");
      updateFeatureFlag();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-background via-accent/5 to-background border-b overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_1px,transparent_1px)] bg-[length:32px_32px]" />
        </div>
        <div className="container py-24 md:py-36 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="text-sm px-4 py-1.5 font-semibold" variant="secondary">
              🦔 Everything for your Hedgehog
            </Badge>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[1.1]">
              Your Hedgehog's
              <br />
              <span className="text-primary">Happy Place</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              From premium nutrition to cozy habitats. Everything your spiky friend needs to thrive, delivered with love.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
              <Button size="lg" className="gap-2 h-12 px-8 text-base font-semibold" onClick={() => {
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                trackEvent("hero_cta_clicked", { cta: "shop_now" });
              }}>
                Shop Now <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold" onClick={() => {
                window.location.href = "/about";
                trackEvent("hero_cta_clicked", { cta: "learn_more" });
              }}>
                Learn More About Us
              </Button>
            </div>
            {showNewsletter && !hasSubscribed && (
              <Newsletter 
                variant="banner" 
                onSubscribed={() => setHasSubscribed(true)} 
              />
            )}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="container py-16 md:py-24">
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Shop by Category</h2>
            <p className="text-muted-foreground text-lg">Find everything your hedgehog needs</p>
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
      <footer className="border-t mt-24 bg-accent/5">
        <div className="container py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <h3 className="font-bold text-2xl mb-4 text-primary">
                🦔 HogShop
              </h3>
              <p className="text-muted-foreground max-w-sm leading-relaxed">
                Your trusted source for premium hedgehog supplies. From nutrition to habitats, we provide everything your spiky companion needs to live their best life.
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
  );
};

export default Index;
