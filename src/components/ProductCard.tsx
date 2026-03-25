import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { trackEvent, posthog } from "@/lib/posthog";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFeatureFlagEnabled } from "posthog-js/react";
import { useEffect } from "react";
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
  
  // Determine active seasonal theme
  const seasonalMode = halloweenMode ? 'halloween' 
    : christmasMode ? 'christmas'
    : easterMode ? 'easter'
    : summerMode ? 'summer'
    : null;

  // Track feature flag views (rich analytics)
  useEffect(() => {
    if (halloweenMode !== undefined) {
      posthog.capture('$feature_view', { feature_flag: 'hero_banner_halloween' });
    }
  }, [halloweenMode]);

  const handleAddToCart = (e: React.MouseEvent) => {
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
    });
    
    trackEvent("add_to_cart", {
      product_id: id,
      product_name: title,
      price,
      category,
      is_subscription,
      quantity: 1,
      source: "product_card"
    });
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
        className="overflow-hidden group transition-all duration-300 border-2 cursor-pointer hover:shadow-lg"
        onClick={handleCardClick}
      >
        <div className="flex">
          <div className="relative w-1/2 overflow-hidden">
            <img
              src={imageSrc}
              alt={title}
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
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
            <div className="flex items-baseline gap-2 mt-auto mb-3">
              <p className="text-2xl font-bold">${price.toFixed(2)}</p>
              {is_subscription && <span className="text-sm text-muted-foreground">/{subscription_interval}</span>}
            </div>
            <Button
              className="w-full gap-2 font-semibold"
              onClick={handleAddToCart}
              disabled={stock === 0}
            >
              <ShoppingCart className="h-4 w-4" />
              {stock === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Default vertical card
  return (
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
      onClick={handleCardClick}
    >
      <div className={`relative aspect-square overflow-hidden ${
        seasonalMode && themeConfig ? '' : 'bg-accent/5'
      }`}
           style={seasonalMode && themeConfig ? { backgroundColor: themeConfig.colors.dark + '4d' } : {}}>
        <img
          src={imageSrc}
          alt={title}
          className={`object-cover w-full h-full transition-transform duration-300 ${
            seasonalMode ? 'group-hover:scale-110 group-hover:brightness-110' : 'group-hover:scale-105'
          }`}
        />
        {seasonalMode && themeConfig && (
          <>
            <div className="absolute top-2 left-2 text-2xl animate-bounce opacity-60" style={{ animationDuration: '2s' }}>{themeConfig.emoji.decorative[0]}</div>
            <div className="absolute bottom-2 right-2 text-2xl animate-bounce opacity-60" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>{themeConfig.emoji.decorative[1]}</div>
          </>
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
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold bg-primary/10 px-2 py-0.5 rounded-md w-fit"
             style={seasonalMode && themeConfig ? {
               color: themeConfig.colors.primary,
               textShadow: `0 0 10px ${themeConfig.colors.primary}`
             } : {}}>
            ${price.toFixed(2)}
          </p>
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
          style={seasonalMode && themeConfig ? {
            background: `linear-gradient(to right, ${themeConfig.colors.primary}, ${themeConfig.colors.secondary})`,
            boxShadow: `hover: 0 0 20px ${themeConfig.colors.primary}`
          } : {}}
          onClick={handleAddToCart}
          disabled={stock === 0}
          size="lg"
        >
          <ShoppingCart className="h-4 w-4" />
          {stock === 0 ? "Out of Stock" : seasonalMode && themeConfig ? `${themeConfig.emoji.primary} Add to Cart` : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
};
