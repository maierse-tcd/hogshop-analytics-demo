import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/posthog";
import { ShoppingCart } from "lucide-react";

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
  const { toast } = useToast();

  const handleAddToCart = () => {
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
    
    trackEvent("product_added_to_cart", {
      product_id: id,
      product_name: title,
      price,
      category,
      is_subscription,
    });

    toast({
      title: "Added to cart",
      description: `${title} has been added to your cart.`,
    });
  };

  const imageSrc = imageMap[image_url] || image_url;

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300 border-2">
      <div className="relative aspect-square overflow-hidden bg-accent/5">
        <img
          src={imageSrc}
          alt={title}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        {stock < 10 && stock > 0 && (
          <Badge className="absolute top-3 right-3 bg-yellow text-yellow-foreground">
            Only {stock} left
          </Badge>
        )}
        {stock === 0 && (
          <Badge className="absolute top-3 right-3" variant="destructive">
            Out of Stock
          </Badge>
        )}
        {is_subscription && (
          <Badge className="absolute top-3 left-3 bg-primary">
            Subscription
          </Badge>
        )}
      </div>
      <CardContent className="p-5">
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs font-medium">
            {category}
          </Badge>
        </div>
        <h3 className="font-bold text-lg mb-2 line-clamp-1">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {description}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-primary">
            ${price.toFixed(2)}
          </p>
          {is_subscription && (
            <span className="text-sm text-muted-foreground">/{subscription_interval}</span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0">
        <Button
          className="w-full gap-2 font-semibold"
          onClick={handleAddToCart}
          disabled={stock === 0}
          size="lg"
        >
          <ShoppingCart className="h-4 w-4" />
          {stock === 0 ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
};
