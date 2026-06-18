import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useRef } from "react";
import { trackEvent, posthog } from "@/lib/posthog";
import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from "posthog-js/react";
import { ArrowRight, X, Gift } from "lucide-react";
import { Newsletter } from "@/components/Newsletter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { simulateDemoErrors } from "@/utils/demoErrorSimulator";
import { getThemeConfig, type SeasonalTheme } from "@/utils/seasonalThemes";
import { useNavigate } from "react-router-dom";
import { useTour } from "@/hooks/useTour";
import { TourTooltip } from "@/components/TourTooltip";
import { shopGettingStartedSteps } from "@/lib/tours";


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
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const productsViewedRef = useRef(false);
  const loadStartRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const cacheHitRef = useRef<boolean | null>(null);
  const productListLoadedRef = useRef(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.
      from("products").
      select("*").
      order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    }
  });

  if (cacheHitRef.current === null) {
    cacheHitRef.current = products !== undefined;
  }

  useEffect(() => {
    if (products && !productsViewedRef.current) {
      productsViewedRef.current = true;
      trackEvent("products_viewed", {
        product_count: products.length
      });
    }

    if (products && !productListLoadedRef.current) {
      productListLoadedRef.current = true;
      let nowMs = 0;
      try {
        nowMs = performance.now();
      } catch {
        nowMs = loadStartRef.current;
      }
      trackEvent("product list loaded", {
        load_duration_ms: Math.round(nowMs - loadStartRef.current),
        product_count: products.length,
        is_cached: cacheHitRef.current === true,
      });
    }

    // Simulate demo errors in background (safe, non-blocking)
    const errorTimer = setTimeout(() => {
      simulateDemoErrors();
    }, 2000);

    return () => clearTimeout(errorTimer);
  }, [products]);


  // Event seeding is only needed in development
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const eventSeeded = localStorage.getItem("posthog_events_seeded");
    if (!eventSeeded) {
      trackEvent("newsletter_subscribed", {
        email: "demo@example.com",
        source: "event_seeding",
        variant: "test",
        subscribed_at: new Date().toISOString(),
        _demo_event: true
      });
      trackEvent("add_to_cart", {
        product_id: "seed",
        product_name: "Demo Product",
        price: 0,
        category: "seeding",
        is_subscription: false,
        quantity: 1,
        source: "event_seeding",
        cta_variant: "control",
        _demo_event: true
      });
      localStorage.setItem("posthog_events_seeded", "true");
    }
  }, []);

  const categories = ["All", "Food & Nutrition", "Housing", "Toys & Exercise", "Care & Grooming", "Bedding & Comfort", "Merchandise"];

  const filteredProducts = selectedCategory === "All" ?
  products :
  products?.filter((p) => p.category === selectedCategory);

  // Use PostHog React hook for feature flags
  const showNewsletterFlag = useFeatureFlagEnabled('show_newsletter');
  const halloweenHeroFlag = useFeatureFlagEnabled('hero_banner_halloween');
  const christmasHeroFlag = useFeatureFlagEnabled('hero_banner_christmas');
  const easterHeroFlag = useFeatureFlagEnabled('hero_banner_easter');
  const summerHeroFlag = useFeatureFlagEnabled('hero_banner_summer');
  const newsletterSubVariant = useFeatureFlagVariantKey('newsletter_sub');

  // Experiment: Discount banner
  const showDiscountBanner = useFeatureFlagEnabled('seasonal-discount-banner');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Determine active seasonal theme (priority: Halloween > Christmas > Easter > Summer)
  const seasonalTheme = halloweenHeroFlag ? 'halloween' :
  christmasHeroFlag ? 'christmas' :
  easterHeroFlag ? 'easter' :
  summerHeroFlag ? 'summer' :
  null;
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);

  // Product tour: home-page getting-started walkthrough (gated on its flag)
  const tour = useTour({
    flagKey: "tour-shop-getting-started",
    steps: shopGettingStartedSteps,
  });

  // Feature flag tracking is handled automatically by the PostHog SDK

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
        
        {/* Discount Banner Experiment */}
        {showDiscountBanner && !bannerDismissed &&
        <div className="bg-primary text-primary-foreground py-3 px-4">
            <div className="container mx-auto flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2">
                🎉 Special Offer: 20% off your first order! Use code: HEDGEHOG20
              </p>
              <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => {
                setBannerDismissed(true);
                trackEvent("banner_dismissed", {
                  banner_type: "discount",
                  variant: "20_percent_off"
                });
              }}>
              
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        }

      {/* Free Gift CTA Banner */}
      <div className="bg-background/60 backdrop-blur-md border-b">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto bg-primary/5 border border-primary/10 rounded-xl px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center md:text-left">
                <p className="font-bold text-lg">Get Max's Starter Kit FREE</p>
                <p className="text-sm text-muted-foreground">Everything your new hedgehog needs • $45 value</p>
              </div>
            </div>
            <Button
                size="lg"
                onClick={() => {
                  trackEvent("gift_cta_clicked", {
                    location: "homepage_banner",
                    cta_text: "Claim Free Gift",
                    timestamp: new Date().toISOString()
                  });
                  navigate("/gift");
                }}
                className="gap-2 whitespace-nowrap">
                
              Claim Free Gift
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Hero Section */}
      <section className={`relative border-b overflow-hidden ${
        seasonalTheme === 'halloween' ?
        'bg-gradient-to-br from-[hsl(var(--halloween-dark))] via-[hsl(var(--halloween-purple))]/30 to-[hsl(var(--halloween-dark))]' :
        seasonalTheme === 'christmas' ?
        'bg-gradient-to-br from-[hsl(var(--christmas-dark))] via-[hsl(var(--christmas-green))]/30 to-[hsl(var(--christmas-dark))]' :
        seasonalTheme === 'easter' ?
        'bg-gradient-to-br from-[hsl(var(--easter-lavender))]/20 via-[hsl(var(--easter-pink))]/20 to-[hsl(var(--easter-mint))]/20' :
        seasonalTheme === 'summer' ?
        'bg-gradient-to-br from-[hsl(var(--summer-blue))]/30 via-[hsl(var(--summer-cyan))]/20 to-[hsl(var(--summer-yellow))]/10' :
        'bg-gradient-to-br from-primary/15 via-background to-accent/20'}`
        }>
        {seasonalTheme ?
          <>
            {/* Seasonal Theme Background */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_1px,transparent_1px)] bg-[length:32px_32px]" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            
            {seasonalTheme === 'halloween' &&
            <>
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[hsl(var(--halloween-orange))]/30 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[hsl(var(--halloween-purple))]/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
              </>
            }
            {seasonalTheme === 'christmas' &&
            <>
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[hsl(var(--christmas-red))]/30 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[hsl(var(--christmas-green))]/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[hsl(var(--christmas-gold))]/20 rounded-full blur-[100px]" />
              </>
            }
            {seasonalTheme === 'easter' &&
            <>
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[hsl(var(--easter-pink))]/40 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[hsl(var(--easter-lavender))]/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-[hsl(var(--easter-mint))]/30 rounded-full blur-[100px]" style={{ animationDelay: '0.5s' }} />
              </>
            }
            {seasonalTheme === 'summer' &&
            <>
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[hsl(var(--summer-cyan))]/40 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[hsl(var(--summer-coral))]/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--summer-yellow))]/30 rounded-full blur-[100px]" />
              </>
            }
            {/* Floating Decorative Elements */}
            {getThemeConfig(seasonalTheme)?.emoji.decorative.slice(0, 6).map((emoji, i) => {
              const positions = [
              { top: '5rem', left: '2.5rem', size: 'text-6xl', duration: '3s', delay: '0s' },
              { top: '10rem', right: '5rem', size: 'text-5xl', duration: '4s', delay: '1s' },
              { bottom: '8rem', left: '5rem', size: 'text-4xl', duration: '3.5s', delay: '0.5s' },
              { top: '15rem', right: '10rem', size: 'text-3xl', duration: '4.5s', delay: '2s' },
              { bottom: '15rem', right: '20%', size: 'text-5xl', duration: '3.8s', delay: '1.5s' },
              { top: '30%', left: '10%', size: 'text-4xl', duration: '4.2s', delay: '0.8s' }];

              const pos = positions[i];
              return (
                <div
                  key={i}
                  className={`absolute ${pos.size} animate-bounce opacity-${seasonalTheme === 'easter' ? '70' : '60'}`}
                  style={{
                    ...Object.fromEntries(Object.entries(pos).filter(([k]) => ['top', 'bottom', 'left', 'right'].includes(k))),
                    animationDuration: pos.duration,
                    animationDelay: pos.delay
                  }}>
                  
                  {emoji}
                </div>);

            })}
          </> :

          <>
            {/* Regular Theme */}
            <div className="absolute inset-0 opacity-[0.08]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_1px,transparent_1px)] bg-[length:32px_32px]" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />
          </>
          }
        <div className="container py-24 md:py-36 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="text-sm px-4 py-1.5 font-semibold" variant="secondary">
              {seasonalTheme ? getThemeConfig(seasonalTheme)?.badge : '🦔 Everything for your Hedgehog'}
            </Badge>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[1.1]">
              {seasonalTheme ?
                <>
                  {getThemeConfig(seasonalTheme)?.title.line1}
                  <br />
                  <span style={{ color: getThemeConfig(seasonalTheme)?.colors.primary }}>
                    {getThemeConfig(seasonalTheme)?.title.line2}
                  </span>
                </> :

                <>
                  Your Hedgehog's
                  <br />
                  <span className="text-primary">Happy Place</span>
                </>
                }
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {seasonalTheme ?
                getThemeConfig(seasonalTheme)?.description :
                'From premium nutrition to cozy habitats. Everything your spiky friend needs to thrive, delivered with love.'}
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
              
              {/* A/B Test: Newsletter CTA - Normal vs Blinking Orange */}
              {newsletterSubVariant === 'test' ?
                // Test Variant: Blinking Orange Newsletter Button
                <Button
                  size="lg"
                  className="h-12 px-8 text-base font-semibold animate-blink-orange hover:animate-none hover:scale-105 transition-transform"
                  onClick={() => {
                    setShowNewsletterModal(true);
                    // Track feature interaction with person property
                    posthog.capture('$feature_interaction', {
                      feature_flag: 'newsletter_sub',
                      $set: { [`$feature_interaction/newsletter_sub`]: true }
                    });
                    trackEvent("hero_cta_clicked", {
                      cta: "newsletter_signup_blink",
                      experiment: "newsletter_sub",
                      variant: "test"
                    });
                  }}>
                  
                  Sign up for newsletter
                </Button> :

                // Control Variant: Normal Newsletter Button
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base font-semibold border-primary/30 hover:border-primary"
                  onClick={() => {
                    setShowNewsletterModal(true);
                    // Track feature interaction with person property
                    posthog.capture('$feature_interaction', {
                      feature_flag: 'newsletter_sub',
                      $set: { [`$feature_interaction/newsletter_sub`]: true }
                    });
                    trackEvent("hero_cta_clicked", {
                      cta: "newsletter_signup",
                      experiment: "newsletter_sub",
                      variant: newsletterSubVariant || "control"
                    });
                  }}>
                  
                  Sign up for newsletter
                </Button>
                }
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Modal */}
      {showNewsletterModal &&
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowNewsletterModal(false);
              trackEvent("newsletter_modal_dismissed");
            }} />
          
          <div className="relative animate-in zoom-in-95 duration-300">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 z-10 rounded-full bg-background shadow-lg hover:bg-accent"
              onClick={() => {
                setShowNewsletterModal(false);
                trackEvent("newsletter_modal_closed");
              }}>
              
              <X className="h-4 w-4" />
            </Button>
            <Newsletter
              variant="card"
              onSubscribed={(email) => {
                setHasSubscribed(true);
                setShowNewsletterModal(false);
              }} />
            
          </div>
        </div>
        }

      {/* Products Section */}
      <section id="products" className={`container py-16 md:py-24 relative ${
        seasonalTheme ? 'overflow-hidden' : ''}`
        }>
        {seasonalTheme && getThemeConfig(seasonalTheme)?.emoji.decorative.slice(0, 4).map((emoji, i) => {
            const positions = [
            { top: '2.5rem', left: '1.25rem', size: 'text-4xl', duration: '4s', delay: '0s', opacity: '30' },
            { top: '5rem', right: '2.5rem', size: 'text-5xl', duration: '3.5s', delay: '1s', opacity: '30' },
            { bottom: '5rem', left: '10%', size: 'text-6xl', duration: '5s', delay: '0.5s', opacity: '20' },
            { top: '50%', right: '5%', size: 'text-4xl', duration: '4.5s', delay: '2s', opacity: '25' }];

            const pos = positions[i];
            return (
              <div
                key={i}
                className={`absolute ${pos.size} animate-bounce opacity-${pos.opacity}`}
                style={{
                  ...Object.fromEntries(Object.entries(pos).filter(([k]) => ['top', 'bottom', 'left', 'right'].includes(k))),
                  animationDuration: pos.duration,
                  animationDelay: pos.delay
                }}>
                
              {emoji}
            </div>);

          })}
        <div className="mb-12 relative">
          <div className="text-center mb-8">
            <h2 className={`text-4xl md:text-5xl font-bold mb-4`}
              style={seasonalTheme ? { color: getThemeConfig(seasonalTheme)?.colors.primary, textShadow: `0 0 20px ${getThemeConfig(seasonalTheme)?.colors.primary}` } : {}}>
              {seasonalTheme ? getThemeConfig(seasonalTheme)?.shopTitle : 'Shop by Category'}
            </h2>
            <p className={`text-lg ${
              seasonalTheme ? '' : 'text-muted-foreground'}`
              }
              style={seasonalTheme ? { color: getThemeConfig(seasonalTheme)?.colors.secondary } : {}}>
              {seasonalTheme ? getThemeConfig(seasonalTheme)?.shopDescription : 'Find everything your hedgehog needs'}
            </p>
          </div>
          <div data-attr="category-filter" className="flex gap-2 flex-wrap justify-center mb-8">
            {categories.map((category) =>
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`font-semibold ${selectedCategory === category ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                onClick={() => {
                  setSelectedCategory(category);
                  trackEvent("category_filtered", { category });
                }}>
                
                {category}
              </Button>
              )}
          </div>
        </div>

        {isLoading ?
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) =>
            <div key={i} className="space-y-4">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
          </div> :
          filteredProducts && filteredProducts.length > 0 ?
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) =>
            <ProductCard key={product.id} {...product} />
            )}
          </div> :

          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found in this category.</p>
          </div>
          }
      </section>

      {/* Footer */}
      <footer className={`border-t mt-12 relative overflow-hidden ${
        seasonalTheme ?
        `bg-gradient-to-br from-[${getThemeConfig(seasonalTheme)?.colors.dark}] via-[${getThemeConfig(seasonalTheme)?.colors.secondary}]/20 to-[${getThemeConfig(seasonalTheme)?.colors.dark}]` :
        'bg-accent/5'}`
        }
        style={seasonalTheme ? { borderColor: `${getThemeConfig(seasonalTheme)?.colors.primary}40` } : {}}>
        {seasonalTheme && getThemeConfig(seasonalTheme)?.emoji.decorative.slice(0, 4).map((emoji, i) => {
            const positions = [
            { top: '1.25rem', left: '2.5rem', size: 'text-3xl', duration: '3s', delay: '0s', opacity: '40' },
            { top: '2.5rem', right: '5rem', size: 'text-4xl', duration: '4s', delay: '1s', opacity: '40' },
            { bottom: '2.5rem', left: '30%', size: 'text-3xl', duration: '3.5s', delay: '0.5s', opacity: '30' },
            { top: '50%', right: '10%', size: 'text-2xl', duration: '4.5s', delay: '2s', opacity: '35' }];

            const pos = positions[i];
            return (
              <div
                key={i}
                className={`absolute ${pos.size} animate-bounce opacity-${pos.opacity}`}
                style={{
                  ...Object.fromEntries(Object.entries(pos).filter(([k]) => ['top', 'bottom', 'left', 'right'].includes(k))),
                  animationDuration: pos.duration,
                  animationDelay: pos.delay
                }}>
                
              {emoji}
            </div>);

          })}
        <div className="container py-16 relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <h3 className={`font-bold text-2xl mb-4 ${
                seasonalTheme ? '' : 'text-primary'}`
                }
                style={seasonalTheme ? { color: getThemeConfig(seasonalTheme)?.colors.primary, textShadow: `0 0 10px ${getThemeConfig(seasonalTheme)?.colors.primary}` } : {}}>
                {seasonalTheme ? getThemeConfig(seasonalTheme)?.footer.logo : '🦔 HogShop'}
              </h3>
              <p className={`max-w-sm leading-relaxed ${
                seasonalTheme ? '' : 'text-muted-foreground'}`
                }
                style={seasonalTheme ? { color: `${getThemeConfig(seasonalTheme)?.colors.secondary}e6` } : {}}>
                {seasonalTheme ?
                  getThemeConfig(seasonalTheme)?.footer.description :
                  'Your trusted source for premium hedgehog supplies. From nutrition to habitats, we provide everything your spiky companion needs to live their best life.'}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-lg">Shop</h4>
              <ul className="space-y-3 text-sm">
                {categories.filter((c) => c !== "All").slice(0, 5).map((cat) =>
                  <li key={cat}>
                    <button
                      onClick={() => {
                        setSelectedCategory(cat);
                        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors">
                      
                      {cat}
                    </button>
                  </li>
                  )}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-lg">Support</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
                <li><a href="/shipping" className="text-muted-foreground hover:text-primary transition-colors">Shipping Info</a></li>
                <li><a href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</a></li>
                <li><a href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
                <li><a href="/readme" className="text-muted-foreground hover:text-primary transition-colors">Demo Info</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-transparent bg-gradient-to-r from-transparent via-primary/20 to-transparent bg-[length:100%_1px] bg-no-repeat bg-top pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 HogShop. All rights reserved. Made with ❤️ for hedgehogs.
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

      <div id="tour-slot" data-slot="product-tour">
        {tour.active && tour.step &&
          <TourTooltip
            step={tour.step}
            stepIndex={tour.stepIndex}
            totalSteps={tour.totalSteps}
            onNext={tour.advance}
            onDismiss={tour.dismiss} />
        }
      </div>
      </div>
    </ErrorBoundary>);

};

export default Index;