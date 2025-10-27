import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/posthog";

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
    addToCart({ 
      id, 
      title, 
      price, 
      image_url, 
      is_subscription, 
      subscription_interval 
    });
    
    trackEvent("add_to_cart", {
      product_id: id,
      product_name: title,
      price,
      is_subscription,
    });

    toast({
      title: "Added to cart!",
      description: `${title} has been added to your cart.`,
    });
  };

  return (
    <Card className="group overflow-hidden border-border hover:shadow-lg transition-all duration-300 hover:border-primary/50">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={image_url}
          alt={title}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        {stock < 30 && (
          <Badge 
            variant="secondary" 
            className="absolute top-3 right-3 bg-destructive text-destructive-foreground"
          >
            Low Stock
          </Badge>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge variant="secondary">
            {category}
          </Badge>
          {is_subscription && (
            <Badge className="bg-primary">
              {subscription_interval}ly
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">${price}</span>
          <span className="text-xs text-muted-foreground">{stock} in stock</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          variant="default"
          onClick={handleAddToCart}
          disabled={stock === 0}
        >
          {stock === 0 ? "Out of Stock" : is_subscription ? "Subscribe" : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
};
