import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { trackEvent, posthog } from "@/lib/posthog";
import { ShoppingCart, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from "posthog-js/react";
import { useEffect } from "react";
import { useFlashSale } from "@/hooks/useFlashSale";
import { getThemeConfig, type SeasonalTheme } from "@/utils/seasonalThemes";

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

interface ProductCardProps {
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

// Map image URLs to imported images
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

export const ProductCard = ({ 
  id,
  title, 
  description, 
  price, 
  image_url, 
  stock, 
  category,
  is_subscription,
  subscription_interval,
  subscription_interval_count
}: ProductCardProps) => {
  const { addToCart } = useCart();
  const halloweenMode = useFeatureFlagEnabled('hero_banner_halloween');
  const christmasMode = useFeatureFlagEnabled('hero_banner_christmas');
  const easterMode = useFeatureFlagEnabled('hero_banner_easter');
  const summerMode = useFeatureFlagEnabled('hero_banner_summer');
  
  // Experiment: Product card design variant
  const cardDesignV2 = useFeatureFlagEnabled('product-card-design-v2');
  
  // Experiment: Subscription highlight badge
  const subscriptionHighlight = useFeatureFlagEnabled('subscription-highlight');
  
  // Experiment: Add to Cart CTA text
  const ctaVariant = useFeatureFlagVariantKey('add-to-cart-cta-experiment');
  const ctaTextMap: Record<string, string> = {
    'control': 'Add to Cart',
    'urgency': 'Get It Now',
    'social_proof': 'Best Seller — Add to Cart',
  };
  const ctaText = ctaTextMap[ctaVariant as string] || 'Add to Cart';

  const { flashSaleActive, discountPct, getDiscountedPrice } = useFlashSale();
  const displayPrice = getDiscountedPrice(price);
  
  // Determine active seasonal theme
  const seasonalMode = halloweenMode ? 'halloween' 
    : christmasMode ? 'christmas'
    : easterMode ? 'easter'
    : summerMode ? 'summer'
    : null;

  // Feature flag tracking is handled automatically by the PostHog SDK

  const handleAddToCart = (e: React.MouseEvent) => {
    // The button lives inside the product's navigable link, so cancel the
    // link navigation (preventDefault) as well as bubbling (stopPropagation).
    e.preventDefault();
    e.stopPropagation();
    const imageSrc = imageMap[image_url] || image_url;
    addToCart({ 
      id, 
      title, 
      description,
      price, 
      image_url: imageSrc, 
      stock,
      category,
      quantity: 1,
      is_subscription, 
      subscription_interval 
    }, "product_card");
  };

  // Navigation itself is handled by the wrapping <Link>; this only records the
  // analytics event so it fires on every real navigation to the detail page.
  const handleProductView = () => {
    trackEvent("product_viewed", {
      product_id: id,
      product_name: title,
      category,
    });
  };

  const productPath = `/product/${id}`;

  const imageSrc = imageMap[image_url] || image_url;
  const themeConfig = seasonalMode ? getThemeConfig(seasonalMode as SeasonalTheme) : null;

  // Horizontal card variant (experiment)
  if (cardDesignV2) {
    return (
      <Link
        to={productPath}
        onClick={handleProductView}
        data-attr="product-card-link"
        aria-label={`View ${title}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
      >
      <Card
        className="overflow-hidden group transition-all duration-300 border-2 cursor-pointer hover:shadow-lg"
      >
        <div className="flex">
          <div className="relative w-1/2 overflow-hidden">
            <img
              src={imageSrc}
              alt={title}
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100 pointer-events-none">
              <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-4 py-2 text-sm font-semibold shadow-lg">
                <Eye className="h-4 w-4" /> View product
              </span>
            </div>
            {flashSaleActive && (
              <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground font-bold shadow-[0_0_12px_hsl(var(--primary)/0.7)] rounded-full px-2.5 py-0.5">
                ⚡ −{discountPct}% SALE
              </Badge>
            )}
            {stock < 10 && stock > 0 && (
              <Badge className="absolute top-3 right-3">Only {stock} left</Badge>
            )}
            {is_subscription && (
              <Badge className="absolute top-3 left-3">
                {subscriptionHighlight ? "⭐ Subscribe!" : "Subscription"}
              </Badge>
            )}
          </div>
          <div className="w-1/2 p-5 flex flex-col">
            <Badge variant="secondary" className="text-xs font-medium w-fit mb-2">{category}</Badge>
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            <p className="text-sm line-clamp-2 mb-3 text-muted-foreground">{description}</p>
            <div className="flex items-baseline gap-2 mt-auto mb-3 flex-wrap">
              {flashSaleActive ? (
                <>
                  <p className="text-2xl font-bold text-primary">${displayPrice.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground line-through">${price.toFixed(2)}</p>
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">−{discountPct}%</Badge>
                </>
              ) : (
                <p className="text-2xl font-bold">${price.toFixed(2)}</p>
              )}
              {is_subscription && <span className="text-sm text-muted-foreground">/{subscription_interval}</span>}
            </div>
            <Button
              className="w-full gap-2 font-semibold"
              data-attr="add-to-cart"
              onClick={handleAddToCart}
              disabled={stock === 0}
            >
              <ShoppingCart className="h-4 w-4" />
              {stock === 0 ? "Out of Stock" : ctaText}
            </Button>
          </div>
        </div>
      </Card>
      </Link>
    );
  }

  // Default vertical card
  return (
    <Link
      to={productPath}
      onClick={handleProductView}
      data-attr="product-card-link"
      aria-label={`View ${title}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
    >
    <Card
      className={`overflow-hidden group transition-all duration-300 border-2 cursor-pointer hover:-translate-y-1 ${
        seasonalMode
          ? ''
          : 'hover:shadow-xl'
      }`}
      style={seasonalMode && themeConfig ? {
        boxShadow: 'hover: 0 0 30px ' + themeConfig.colors.primary,
        borderColor: themeConfig.colors.secondary + '4d',
        background: `linear-gradient(135deg, ${themeConfig.colors.dark}80 0%, hsl(var(--background)) 100%)`
      } : {}}
    >
      <div className={`relative aspect-square overflow-hidden ${
        seasonalMode && themeConfig ? '' : 'bg-accent/5'
      }`}
           style={seasonalMode && themeConfig ? { backgroundColor: themeConfig.colors.dark + '4d' } : {}}>
        <img
          src={imageSrc}
          alt={title}
          loading="lazy"
          className={`object-cover w-full h-full transition-all duration-300 animate-fade-in ${
            seasonalMode ? 'group-hover:scale-110 group-hover:brightness-110' : 'group-hover:scale-105'
          }`}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100 pointer-events-none">
          <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-4 py-2 text-sm font-semibold shadow-lg">
            <Eye className="h-4 w-4" /> View product
          </span>
        </div>
        {seasonalMode && themeConfig && (
          <>
            <div className="absolute top-2 left-2 text-2xl animate-bounce opacity-60" style={{ animationDuration: '2s' }}>{themeConfig.emoji.decorative[0]}</div>
            <div className="absolute bottom-2 right-2 text-2xl animate-bounce opacity-60" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>{themeConfig.emoji.decorative[1]}</div>
          </>
        )}
        {flashSaleActive && (
          <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground font-bold shadow-[0_0_12px_hsl(var(--primary)/0.7)] rounded-full px-3 py-1">
            ⚡ −{discountPct}% SALE
          </Badge>
        )}
        {stock < 10 && stock > 0 && (
          <Badge className="absolute top-3 right-3 text-white"
                 style={seasonalMode && themeConfig ? { backgroundColor: themeConfig.colors.primary } : {}}>
            Only {stock} left
          </Badge>
        )}
        {stock === 0 && (
          <Badge className="absolute top-3 right-3" variant="destructive">
            Out of Stock
          </Badge>
        )}
        {is_subscription && (
          <Badge className="absolute top-3 left-3 text-white"
                 style={seasonalMode && themeConfig ? { backgroundColor: themeConfig.colors.secondary } : {}}>
            {subscriptionHighlight 
              ? "⭐ Most Popular - Subscribe & Save!" 
              : seasonalMode && themeConfig 
                ? `${themeConfig.emoji.primary} Subscription` 
                : 'Subscription'}
          </Badge>
        )}
      </div>
      <CardContent className="p-5">
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs font-medium"
                 style={seasonalMode && themeConfig ? {
                   backgroundColor: themeConfig.colors.secondary + '33',
                   color: themeConfig.colors.primary,
                   border: `1px solid ${themeConfig.colors.primary}4d`
                 } : {}}>
            {category}
          </Badge>
        </div>
        <h3 className="font-bold text-lg mb-2 line-clamp-1"
            style={seasonalMode && themeConfig ? { color: themeConfig.colors.primary } : {}}>
          {title}
        </h3>
        <p className="text-sm line-clamp-2 mb-3 text-muted-foreground"
           style={seasonalMode && themeConfig ? { color: themeConfig.colors.secondary + 'cc' } : {}}>
          {description}
        </p>
        <div className="flex items-baseline gap-2 flex-wrap">
          {flashSaleActive ? (
            <>
              <p className="text-2xl font-bold bg-primary/10 px-2 py-0.5 rounded-md w-fit text-primary"
                 style={seasonalMode && themeConfig ? { color: themeConfig.colors.primary, textShadow: `0 0 10px ${themeConfig.colors.primary}` } : {}}>
                ${displayPrice.toFixed(2)}
              </p>
              <p className="text-base text-muted-foreground line-through">${price.toFixed(2)}</p>
            </>
          ) : (
            <p className="text-2xl font-bold bg-primary/10 px-2 py-0.5 rounded-md w-fit"
               style={seasonalMode && themeConfig ? {
                 color: themeConfig.colors.primary,
                 textShadow: `0 0 10px ${themeConfig.colors.primary}`
               } : {}}>
              ${price.toFixed(2)}
            </p>
          )}
          {is_subscription && (
            <span className="text-sm text-muted-foreground"
                  style={seasonalMode && themeConfig ? { color: themeConfig.colors.secondary } : {}}>
              /{subscription_interval}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0">
        <Button
          className="w-full gap-2 font-semibold"
          data-attr="add-to-cart"
          style={seasonalMode && themeConfig ? {
            background: `linear-gradient(to right, ${themeConfig.colors.primary}, ${themeConfig.colors.secondary})`,
            boxShadow: `hover: 0 0 20px ${themeConfig.colors.primary}`
          } : {}}
          onClick={handleAddToCart}
          disabled={stock === 0}
          size="lg"
        >
          <ShoppingCart className="h-4 w-4" />
          {stock === 0 ? "Out of Stock" : seasonalMode && themeConfig ? `${themeConfig.emoji.primary} ${ctaText}` : ctaText}
        </Button>
      </CardFooter>
    </Card>
    </Link>
  );
};
