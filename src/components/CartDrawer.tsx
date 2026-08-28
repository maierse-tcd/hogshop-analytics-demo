import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/posthog";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useFeatureFlagVariantKey } from "posthog-js/react";
import { useFlashSale } from "@/hooks/useFlashSale";

export const CartDrawer = () => {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice } = useCart();
  const { startCheckout, isCheckingOut } = useCheckout();
  const { flashSaleActive, discountPct, getDiscountedPrice } = useFlashSale();
  const discountAmount = flashSaleActive ? +(totalPrice * (discountPct / 100)).toFixed(2) : 0;
  const discountedTotal = +(totalPrice - discountAmount).toFixed(2);

  const freeShippingVariant = useFeatureFlagVariantKey("exp-free-shipping-nudge");
  const showFreeShipping = freeShippingVariant === "test";
  const FREE_SHIPPING_THRESHOLD = 50;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice);
  const progressPct = Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Sheet
      onOpenChange={(open) => {
        if (open) {
          trackEvent("cart_viewed", {
            items_count: totalItems,
            cart_value: totalPrice,
            items: items.map((item) => ({
              id: item.id,
              title: item.title,
              quantity: item.quantity,
              price: item.price,
            })),
          });
        } else if (items.length > 0) {
          trackEvent("checkout_abandoned", {
            items_count: totalItems,
            cart_value: totalPrice,
            abandonment_stage: "cart_view",
          });
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" data-attr="cart-button" className="rounded-full relative">
          <ShoppingCart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalItems}
            </Badge>
          )}
          <span className="sr-only">Shopping cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col z-[2147483647]">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Shopping Cart ({totalItems})</SheetTitle>
        </SheetHeader>


        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
            {showFreeShipping && items.length > 0 && (
              <div
                data-attr="free-shipping-progress"
                className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-3"
              >
                <div className="flex items-center justify-between text-sm font-medium mb-2">
                  {remaining > 0 ? (
                    <span>
                      Add <span className="text-primary font-bold">${remaining.toFixed(2)}</span> more for FREE shipping 🚚
                    </span>
                  ) : (
                    <span className="text-primary font-bold">You've unlocked FREE shipping! 🎉</span>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-display text-lg font-semibold">Your cart is empty</p>
                <p className="text-sm text-muted-foreground mt-1">Add some hedgehog goodness!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-xl border bg-card p-3 shadow-xs">
                    <img src={item.image_url} alt={item.title} className="w-20 h-20 object-cover rounded-lg bg-surface-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm leading-snug line-clamp-2">{item.title}</h4>
                      {item.is_subscription && (
                        <Badge variant="secondary" className="mt-1 rounded-full text-[10px]">
                          {item.subscription_interval}ly subscription
                        </Badge>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {!item.is_subscription && (
                          <div className="flex items-center gap-1 rounded-full border bg-surface-2/60 p-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {flashSaleActive ? (
                          <div className="ml-auto text-right">
                            <p className="font-bold text-primary leading-tight">${getDiscountedPrice(item.price).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground line-through leading-tight">${item.price.toFixed(2)}</p>
                          </div>
                        ) : (
                          <p className="font-bold ml-auto">${item.price.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        trackEvent("remove_from_cart", {
                          product_id: item.id,
                          product_name: item.title,
                          price: item.price,
                          quantity: item.quantity,
                        });
                        removeFromCart(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

          </div>

          {items.length > 0 && (
            <div className="border-t pt-4 space-y-3 shrink-0 pb-[env(safe-area-inset-bottom)]">
              {flashSaleActive && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-primary">
                    <span>⚡ Flash Sale −{discountPct}%</span>
                    <span>−${discountAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-2xl font-bold">${(flashSaleActive ? discountedTotal : totalPrice).toFixed(2)}</span>
              </div>
              <Button className="w-full rounded-full font-semibold" size="lg" data-attr="proceed-to-checkout" onClick={startCheckout} disabled={isCheckingOut}>
                {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Secure checkout · 30-day returns</p>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>
  );
};
