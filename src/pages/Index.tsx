import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/posthog";
import { ArrowRight } from "lucide-react";

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

  const categories = ["All", "Merchandise", "Apparel", "Subscription"];
  
  const filteredProducts = selectedCategory === "All" 
    ? products 
    : products?.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary/10 via-primary/5 to-background border-b overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80')] bg-cover bg-center opacity-5" />
        <div className="container py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <Badge className="text-sm px-4 py-1" variant="secondary">
              🦔 PostHog-Powered Analytics Demo
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary via-purple-400 to-accent bg-clip-text text-transparent">
                HogShop
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Where hedgehog dreams become reality. Premium merchandise and analytics subscriptions for the modern data-driven team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="gap-2" onClick={() => {
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                trackEvent("hero_cta_clicked", { cta: "shop_now" });
              }}>
                Shop Now <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => {
                window.open("https://posthog.com", "_blank");
                trackEvent("hero_cta_clicked", { cta: "learn_more" });
              }}>
                Learn About PostHog
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="container py-12 md:py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4">Shop All Products</h2>
          <div className="flex gap-2 flex-wrap mb-6">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
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
      <footer className="border-t mt-16">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                HogShop
              </h3>
              <p className="text-sm text-muted-foreground">
                Premium hedgehog merchandise and PostHog analytics subscriptions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {categories.filter(c => c !== "All").map(cat => (
                  <li key={cat}>
                    <button onClick={() => setSelectedCategory(cat)} className="hover:text-foreground transition-colors">
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
                <li><a href="/shipping" className="text-muted-foreground hover:text-foreground transition-colors">Shipping</a></li>
                <li><a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="https://posthog.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">PostHog</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 HogShop. A PostHog analytics demo environment.
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by hedgehogs 🦔 and analytics
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
