import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { trackEvent } from "@/lib/posthog";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFeatureFlagEnabled } from "posthog-js/react";

// Import all product images
import hedgehogFood from "@/assets/hedgehog-food.jpg";
import hedgehogHabitat from "@/assets/hedgehog-habitat.jpg";
import hedgehogTreats from "@/assets/hedgehog-treats.jpg";
import hedgehogWheel from "@/assets/hedgehog-wheel.jpg";
import hedgehogCareKit from "@/assets/hedgehog-care-kit.jpg";
import hedgehogHideout from "@/assets/hedgehog-hideout.jpg";
import hedgehogPlushie from "@/assets/hedgehog-plushie.jpg";

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

  return (
    <Card 
      className={`overflow-hidden group transition-all duration-300 border-2 cursor-pointer ${
        halloweenMode 
          ? 'hover:shadow-[0_0_30px_hsl(var(--halloween-orange))] hover:border-[hsl(var(--halloween-orange))] border-[hsl(var(--halloween-purple))]/30 bg-gradient-to-br from-[hsl(var(--halloween-dark))]/50 to-background' 
          : 'hover:shadow-lg'
      }`}
      onClick={handleCardClick}
    >
      <div className={`relative aspect-square overflow-hidden ${
        halloweenMode ? 'bg-[hsl(var(--halloween-dark))]/30' : 'bg-accent/5'
      }`}>
        <img
          src={imageSrc}
          alt={title}
          className={`object-cover w-full h-full transition-transform duration-300 ${
            halloweenMode ? 'group-hover:scale-110 group-hover:brightness-110' : 'group-hover:scale-105'
          }`}
        />
        {halloweenMode && (
          <>
            <div className="absolute top-2 left-2 text-2xl animate-bounce opacity-60" style={{ animationDuration: '2s' }}>🕷️</div>
            <div className="absolute bottom-2 right-2 text-2xl animate-bounce opacity-60" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>👻</div>
          </>
        )}
        {stock < 10 && stock > 0 && (
          <Badge className={`absolute top-3 right-3 ${
            halloweenMode ? 'bg-[hsl(var(--halloween-orange))] text-white' : 'bg-yellow text-yellow-foreground'
          }`}>
            Only {stock} left
          </Badge>
        )}
        {stock === 0 && (
          <Badge className="absolute top-3 right-3" variant="destructive">
            Out of Stock
          </Badge>
        )}
        {is_subscription && (
          <Badge className={`absolute top-3 left-3 ${
            halloweenMode ? 'bg-[hsl(var(--halloween-purple))] text-white' : 'bg-primary'
          }`}>
            {halloweenMode ? '🎃 Subscription' : 'Subscription'}
          </Badge>
        )}
      </div>
      <CardContent className="p-5">
        <div className="mb-2">
          <Badge variant="secondary" className={`text-xs font-medium ${
            halloweenMode ? 'bg-[hsl(var(--halloween-purple))]/20 text-[hsl(var(--halloween-orange))] border border-[hsl(var(--halloween-orange))]/30' : ''
          }`}>
            {category}
          </Badge>
        </div>
        <h3 className={`font-bold text-lg mb-2 line-clamp-1 ${
          halloweenMode ? 'text-[hsl(var(--halloween-orange))]' : ''
        }`}>
          {title}
        </h3>
        <p className={`text-sm line-clamp-2 mb-3 ${
          halloweenMode ? 'text-[hsl(var(--halloween-purple))]/80' : 'text-muted-foreground'
        }`}>
          {description}
        </p>
        <div className="flex items-baseline gap-2">
          <p className={`text-2xl font-bold ${
            halloweenMode ? 'text-[hsl(var(--halloween-orange))] drop-shadow-[0_0_10px_hsl(var(--halloween-orange))]' : 'text-primary'
          }`}>
            ${price.toFixed(2)}
          </p>
          {is_subscription && (
            <span className={`text-sm ${
              halloweenMode ? 'text-[hsl(var(--halloween-purple))]' : 'text-muted-foreground'
            }`}>
              /{subscription_interval}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0">
        <Button
          className={`w-full gap-2 font-semibold ${
            halloweenMode ? 'bg-gradient-to-r from-[hsl(var(--halloween-orange))] to-[hsl(var(--halloween-purple))] hover:shadow-[0_0_20px_hsl(var(--halloween-orange))]' : ''
          }`}
          onClick={handleAddToCart}
          disabled={stock === 0}
          size="lg"
        >
          <ShoppingCart className="h-4 w-4" />
          {stock === 0 ? "Out of Stock" : halloweenMode ? "🎃 Add to Cart" : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
};
