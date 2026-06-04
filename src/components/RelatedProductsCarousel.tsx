import { useQuery } from "@tanstack/react-query";
import { useFeatureFlagVariantKey } from "posthog-js/react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { productImageMap } from "@/lib/productImages";

interface RelatedProductsCarouselProps {
  currentProductId: string;
}

const INDIGO = "#6366f1";

export const RelatedProductsCarousel = ({ currentProductId }: RelatedProductsCarouselProps) => {
  const variant = useFeatureFlagVariantKey("exp-related-carousel");
  const { addToCart } = useCart();

  const enabled = variant === "test";

  const { data: products } = useQuery({
    queryKey: ["related-products", currentProductId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .neq("id", currentProductId)
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!enabled) return null;
  if (!products || products.length === 0) return null;

  return (
    <section
      data-attr="related-products-carousel"
      className="border-t pt-12 mt-12"
    >
      <div className="flex items-center gap-3 mb-6">
        <span
          className="inline-block rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${INDIGO}1a`, color: INDIGO }}
        >
          Recommended
        </span>
        <h2 className="text-2xl font-bold" style={{ color: INDIGO }}>
          You may also like
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory">
        {products.slice(0, 6).map((p: any) => {
          const img = productImageMap[p.image_url] || p.image_url;
          return (
            <div
              key={p.id}
              className="snap-start shrink-0 w-56 rounded-lg border bg-card overflow-hidden flex flex-col"
            >
              <div className="aspect-square bg-accent/5 overflow-hidden">
                <img src={img} alt={p.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <h3 className="font-semibold text-sm line-clamp-2">{p.title}</h3>
                <p className="font-bold" style={{ color: INDIGO }}>
                  ${Number(p.price).toFixed(2)}
                </p>
                <Button
                  size="sm"
                  className="mt-auto gap-2"
                  style={{ backgroundColor: INDIGO, color: "#ffffff" }}
                  onClick={() =>
                    addToCart(
                      {
                        id: p.id,
                        title: p.title,
                        description: p.description,
                        price: p.price,
                        image_url: img,
                        stock: p.stock,
                        category: p.category,
                        is_subscription: p.is_subscription,
                        subscription_interval: p.subscription_interval,
                      },
                      "related-carousel"
                    )
                  }
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
