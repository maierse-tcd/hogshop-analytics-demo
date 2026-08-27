import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { trackEvent, posthog } from "@/lib/posthog";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
    e.stopPropagation();
    const imageSrc = imageMap[image_url] || image_url;
    addToCart({
      id,
      title,
      description,
      price: displayPrice,
      image_url: imageSrc,
      stock,
      category,
      quantity: 1,
      is_subscription,
      subscription_interval
    }, "product_card");
  };

  const handleCardClick = () => {
    navigate(`/product/${id}`);
    trackEvent("product_viewed", {
      product_id: id,
      product_name: title,
      category,
    });
  };

  const imageSrc = imageMap[image_url] || image_url;
  const themeConfig = seasonalMode ? getThemeConfig(seasonalMode as SeasonalTheme) : null;

  // Horizontal card variant (experiment)
  if (cardDesignV2) {
    return (
      <Card 
        className="overflow-hidden group h-full rounded-xl border bg-card shadow-soft transition-[transform,box-shadow] duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-elevated"
        onClick={handleCardClick}
      >
        <div className="flex h-full">
          <div className="relative w-2/5 sm:w-1/2 shrink-0 overflow-hidden bg-surface-2">
            <img
              src={imageSrc}
              alt={title}
              loading="lazy"
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
            {flashSaleActive && (
              <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground font-semibold shadow-glow rounded-full px-2.5 py-0.5">
                ⚡ −{discountPct}% SALE
              </Badge>
            )}
            <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-1.5">
              {is_subscription ? (
                <Badge className="rounded-full">
                  {subscriptionHighlight ? "⭐ Subscribe!" : "Subscription"}
                </Badge>
              ) : <span />}
              {stock < 10 && stock > 0 && (
                <Badge variant="secondary" className="rounded-full">Only {stock} left</Badge>
              )}
            </div>
          </div>
          <div className="w-3/5 sm:w-1/2 p-5 flex flex-col">
            <Badge variant="secondary" className="text-[11px] font-medium w-fit mb-2 rounded-full">{category}</Badge>
            <h3 className="font-display font-bold text-lg mb-1.5 leading-snug line-clamp-2">{title}</h3>
            <p className="text-sm line-clamp-2 mb-3 text-muted-foreground leading-relaxed">{description}</p>
            <div className="flex items-baseline gap-2 mt-auto mb-3 flex-wrap">
              {flashSaleActive ? (
                <>
                  <p className="text-2xl font-display font-bold text-primary">${displayPrice.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground line-through">${price.toFixed(2)}</p>
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 rounded-full">−{discountPct}%</Badge>
                </>
              ) : (
                <p className="text-2xl font-display font-bold">${price.toFixed(2)}</p>
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
    );
  }


  // Default vertical card
  return (
    <Card 
      className={`overflow-hidden group h-full flex flex-col rounded-xl border bg-card cursor-pointer transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 ${
        seasonalMode 
          ? 'shadow-soft' 
          : 'shadow-soft hover:shadow-elevated'
      }`}
      style={seasonalMode && themeConfig ? {
        borderColor: themeConfig.colors.secondary + '4d',
        background: `linear-gradient(135deg, ${themeConfig.colors.dark}80 0%, hsl(var(--card)) 100%)`
      } : {}}
      onClick={handleCardClick}
    >
      <div className={`relative aspect-[4/3] overflow-hidden ${
        seasonalMode && themeConfig ? '' : 'bg-surface-2'
      }`}
           style={seasonalMode && themeConfig ? { backgroundColor: themeConfig.colors.dark + '4d' } : {}}>
        <img
          src={imageSrc}
          alt={title}
          loading="lazy"
          className={`object-cover w-full h-full transition-transform duration-500 ease-out animate-fade-in ${
            seasonalMode ? 'group-hover:scale-110' : 'group-hover:scale-105'
          }`}
        />
        {seasonalMode && themeConfig && (
          <>
            <div className="absolute top-2 left-2 text-2xl animate-bounce opacity-60" style={{ animationDuration: '2s' }}>{themeConfig.emoji.decorative[0]}</div>
            <div className="absolute bottom-2 right-2 text-2xl animate-bounce opacity-60" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>{themeConfig.emoji.decorative[1]}</div>
          </>
        )}
        {flashSaleActive && (
          <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground font-semibold shadow-glow rounded-full px-3 py-1">
            ⚡ −{discountPct}% SALE
          </Badge>
        )}
        {/* Badge stack: subscription on the left, stock state on the right */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-1.5">
            {is_subscription && (
              <Badge className="rounded-full max-w-[13rem] truncate"
                     style={seasonalMode && themeConfig ? { backgroundColor: themeConfig.colors.secondary, color: '#fff' } : {}}>
                {subscriptionHighlight 
                  ? "⭐ Most Popular - Subscribe & Save!" 
                  : seasonalMode && themeConfig 
                    ? `${themeConfig.emoji.primary} Subscription` 
                    : 'Subscription'}
              </Badge>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {stock < 10 && stock > 0 && (
              <Badge variant="secondary" className="rounded-full backdrop-blur-sm"
                     style={seasonalMode && themeConfig ? { backgroundColor: themeConfig.colors.primary, color: '#fff' } : {}}>
                Only {stock} left
              </Badge>
            )}
            {stock === 0 && (
              <Badge className="rounded-full" variant="destructive">
                Out of Stock
              </Badge>
            )}
          </div>
        </div>
      </div>
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="mb-2.5">
          <Badge variant="secondary" className="text-[11px] font-medium rounded-full"
                 style={seasonalMode && themeConfig ? {
                   backgroundColor: themeConfig.colors.secondary + '33',
                   color: themeConfig.colors.primary,
                   border: `1px solid ${themeConfig.colors.primary}4d`
                 } : {}}>
            {category}
          </Badge>
        </div>
        <h3 className="font-display font-bold text-lg mb-1.5 leading-snug line-clamp-1"
            style={seasonalMode && themeConfig ? { color: themeConfig.colors.primary } : {}}>
          {title}
        </h3>
        <p className="text-sm line-clamp-2 mb-4 text-muted-foreground leading-relaxed"
           style={seasonalMode && themeConfig ? { color: themeConfig.colors.secondary + 'cc' } : {}}>
          {description}
        </p>
        <div className="flex items-baseline gap-2 flex-wrap mt-auto">
          {flashSaleActive ? (
            <>
              <p className="text-2xl font-display font-bold text-primary"
                 style={seasonalMode && themeConfig ? { color: themeConfig.colors.primary } : {}}>
                ${displayPrice.toFixed(2)}
              </p>
              <p className="text-base text-muted-foreground line-through">${price.toFixed(2)}</p>
            </>
          ) : (
            <p className="text-2xl font-display font-bold"
               style={seasonalMode && themeConfig ? { color: themeConfig.colors.primary } : {}}>
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
            background: `linear-gradient(to right, ${themeConfig.colors.primary}, ${themeConfig.colors.secondary})`
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
  );
};

