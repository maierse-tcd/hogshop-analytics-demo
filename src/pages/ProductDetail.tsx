import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, ArrowLeft, Zap } from "lucide-react";
import { RelatedProductsCarousel } from "@/components/RelatedProductsCarousel";
import { trackEvent } from "@/lib/posthog";
import { useFlashSale } from "@/hooks/useFlashSale";
import { useTour } from "@/hooks/useTour";
import { TourTooltip } from "@/components/TourTooltip";
import { StableMount } from "@/components/StableMount";
import { productDetailBuyingSteps } from "@/lib/tours";

// Import all product images
import hedgehogFood from "@/assets/hedgehog-food.jpg";
import hedgehogHabitat from "@/assets/hedgehog-habitat.jpg";
import hedgehogTreats from "@/assets/hedgehog-treats.jpg";
import hedgehogWheel from "@/assets/hedgehog-wheel.jpg";
import hedgehogCareKit from "@/assets/hedgehog-care-kit.jpg";
import hedgehogHideout from "@/assets/hedgehog-hideout.jpg";
import hedgehogPlushie from "@/assets/hedgehog-plushie.jpg";
import hedgehogSleepingBag from "@/assets/hedgehog-sleeping-bag.jpg";
import hedgehogClimbingToys from "@/assets/hedgehog-climbing-toys.jpg";
import hedgehogBowls from "@/assets/hedgehog-bowls.jpg";
import hedgehogMealworms from "@/assets/hedgehog-mealworms.jpg";
import hedgehogTravelCage from "@/assets/hedgehog-travel-cage.jpg";
import hedgehogMansion from "@/assets/hedgehog-mansion.jpg";
import hedgehogPlaySet from "@/assets/hedgehog-play-set.jpg";
import hedgehogGroomingKit from "@/assets/hedgehog-grooming-kit.jpg";
import hedgehogBedding from "@/assets/hedgehog-bedding.jpg";
import hedgehogTshirt from "@/assets/hedgehog-tshirt.jpg";
import hedgehogMug from "@/assets/hedgehog-mug.jpg";

const imageMap: Record<string, string> = {
  "hedgehog-food.jpg": hedgehogFood,
  "hedgehog-habitat.jpg": hedgehogHabitat,
  "hedgehog-treats.jpg": hedgehogTreats,
  "hedgehog-wheel.jpg": hedgehogWheel,
  "hedgehog-care-kit.jpg": hedgehogCareKit,
  "hedgehog-hideout.jpg": hedgehogHideout,
  "hedgehog-plushie.jpg": hedgehogPlushie,
  "hedgehog-sleeping-bag.jpg": hedgehogSleepingBag,
  "hedgehog-climbing-toys.jpg": hedgehogClimbingToys,
  "hedgehog-bowls.jpg": hedgehogBowls,
  "hedgehog-mealworms.jpg": hedgehogMealworms,
  "hedgehog-travel-cage.jpg": hedgehogTravelCage,
  "hedgehog-mansion.jpg": hedgehogMansion,
  "hedgehog-play-set.jpg": hedgehogPlaySet,
  "hedgehog-grooming-kit.jpg": hedgehogGroomingKit,
  "hedgehog-bedding.jpg": hedgehogBedding,
  "hedgehog-tshirt.jpg": hedgehogTshirt,
  "hedgehog-mug.jpg": hedgehogMug,
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { flashSaleActive, discountPct, getDiscountedPrice } = useFlashSale();
  const enterTimeRef = useRef(Date.now());

  // Product tour: product-detail buying walkthrough (gated on its flag)
  const tour = useTour({
    flagKey: "tour-product-detail-buying",
    steps: productDetailBuyingSteps,
  });

  // Track time spent on product detail page
  useEffect(() => {
    enterTimeRef.current = Date.now();
    return () => {
      const timeSpent = Math.round((Date.now() - enterTimeRef.current) / 1000);
      if (timeSpent > 1) {
        trackEvent("product_detail_time_spent", {
          product_id: id,
          time_spent_seconds: timeSpent,
        });
      }
    };
  }, [id]);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // Track product view
      if (data) {
        trackEvent("product_viewed", {
          product_id: data.id,
          product_name: data.title,
          price: data.price,
          category: data.category,
          is_subscription: data.is_subscription,
          source: "product_detail_page"
        });
      }
      
      return data;
    },
  });

  const handleAddToCart = () => {
    if (!product) return;
    
    const imageSrc = imageMap[product.image_url] || product.image_url;
    addToCart({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      image_url: imageSrc,
      stock: product.stock,
      category: product.category,
      quantity: 1,
      is_subscription: product.is_subscription,
      subscription_interval: product.subscription_interval,
    }, "product_detail_page");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12">
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
          </Button>
        </div>
      </div>
    );
  }

  const imageSrc = imageMap[product.image_url] || product.image_url;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Button>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg border-2 bg-accent/5">
            <img
              src={imageSrc}
              alt={product.title}
              className="object-cover w-full h-full"
            />
            {product.is_subscription && (
              <Badge className="absolute top-4 left-4 bg-primary text-lg px-4 py-2">
                Subscription
              </Badge>
            )}
            {flashSaleActive && (
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground text-base px-4 py-2 rounded-full shadow-[0_0_20px_hsl(var(--primary)/0.7)] font-bold gap-1">
                <Zap className="h-4 w-4 fill-current" /> −{discountPct}% FLASH SALE
              </Badge>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col space-y-6">
            <div>
              <Badge variant="secondary" className="mb-3">
                {product.category}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {product.title}
              </h1>
              <div data-attr="product-price" className="flex items-baseline gap-3 mb-6 flex-wrap">
                {flashSaleActive ? (
                  <>
                    <p className="text-4xl font-bold text-primary">
                      ${getDiscountedPrice(product.price).toFixed(2)}
                    </p>
                    <p className="text-2xl text-muted-foreground line-through">
                      ${product.price.toFixed(2)}
                    </p>
                    <Badge className="bg-primary text-primary-foreground font-bold">Save {discountPct}%</Badge>
                  </>
                ) : (
                  <p className="text-4xl font-bold text-primary">
                    ${product.price.toFixed(2)}
                  </p>
                )}
                {product.is_subscription && (
                  <span className="text-xl text-muted-foreground">
                    /{product.subscription_interval}
                  </span>
                )}
              </div>
            </div>

            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Stock Info */}
            <div className="flex items-center gap-2">
              {product.stock > 10 ? (
                <Badge variant="secondary" className="text-sm">
                  ✓ In Stock ({product.stock} available)
                </Badge>
              ) : product.stock > 0 ? (
                <Badge className="bg-yellow text-yellow-foreground text-sm">
                  Only {product.stock} left!
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-sm">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              data-attr="product-add-to-cart"
              className="w-full md:w-auto gap-2 h-14 px-8 text-lg font-semibold"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              <ShoppingCart className="h-5 w-5" />
              {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>

            {/* Additional Details */}
            {product.is_subscription && (
              <div className="border-t pt-6 space-y-3">
                <h3 className="font-semibold text-lg">Subscription Details</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Automatic {product.subscription_interval}ly delivery</li>
                  <li>• Cancel anytime through your account</li>
                  <li>• Never run out of supplies</li>
                  <li>• Skip or pause deliveries easily</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Product Features */}
        <div data-attr="why-choose" className="border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Why Choose This Product?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-primary text-3xl">🦔</div>
              <h3 className="font-semibold">Hedgehog Approved</h3>
              <p className="text-sm text-muted-foreground">
                Tested and loved by hedgehogs worldwide
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-primary text-3xl">✓</div>
              <h3 className="font-semibold">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">
                Only the best materials and ingredients
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-primary text-3xl">🚚</div>
              <h3 className="font-semibold">Fast Shipping</h3>
              <p className="text-sm text-muted-foreground">
                Get it delivered to your door quickly
              </p>
          </div>
        </div>

        <StableMount>
          <RelatedProductsCarousel currentProductId={id!} />
        </StableMount>
      </div>
    </div>

      {/* The tour mounts after flags resolve (post first paint); keep it inside
          a StableMount so toggling it never removes a bare sibling node. */}
      <StableMount>
        {tour.active && tour.step && (
          <TourTooltip
            step={tour.step}
            stepIndex={tour.stepIndex}
            totalSteps={tour.totalSteps}
            onNext={tour.advance}
            onDismiss={tour.dismiss}
          />
        )}
      </StableMount>
    </div>
  );
};

export default ProductDetail;
