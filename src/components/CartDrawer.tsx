import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RegistrationDialog } from "@/components/RegistrationDialog";
import { posthog, trackEvent, setUserProperties, initializeCLTV, ensureIdentified } from "@/lib/posthog";

export const CartDrawer = () => {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const { toast } = useToast();

  const handleCheckoutClick = () => {
    if (items.length === 0) return;
    
    // Check if user is logged in (from LoginDialog)
    const loggedInEmail = localStorage.getItem("user_email");
    const loggedInName = localStorage.getItem("user_name");
    
    if (loggedInEmail && loggedInName) {
      // User is already logged in
      proceedToCheckout(loggedInEmail, loggedInName);
      return;
    }
    
    // Check if user info was stored from previous checkout (from RegistrationDialog)
    const userInfo = localStorage.getItem("hedgehog_user");
    if (userInfo) {
      const { email, name } = JSON.parse(userInfo);
      proceedToCheckout(email, name);
    } else {
      setShowRegistration(true);
    }
  };

  const handleRegistrationComplete = async (email: string, name: string) => {
    // Store user info in localStorage for future checkouts
    localStorage.setItem("hedgehog_user", JSON.stringify({ email, name }));
    
    // Identify user in PostHog and WAIT for it to complete
    await ensureIdentified(email, {
      email,
      name,
      identified_at: new Date().toISOString(),
    });
    
    // NOW initialize CLTV (after user is identified)
    initializeCLTV();
    
    setShowRegistration(false);
    proceedToCheckout(email, name);
  };

  const proceedToCheckout = async (email: string, name: string) => {
    setIsCheckingOut(true);
    try {
      // Ensure user is identified and CLTV is synced (for logged-in users)
      await ensureIdentified(email, { email, name });
      initializeCLTV();
      
      // Prepare basket data for PostHog
      const basketItems = items.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        is_subscription: item.is_subscription,
      }));
      
      // Track checkout initiation with basket properties
      trackEvent("checkout_started", {
        items_count: totalItems,
        basket_value: totalPrice,
        revenue: totalPrice,
        currency: "USD",
        items: basketItems,
      });
      
      // Set user properties for current basket
      setUserProperties({
        items_basket: basketItems,
        basket_value: totalPrice,
        checkout_initiated_date: new Date().toISOString(),
      });

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          items,
          customer_email: email,
          customer_name: name,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Store user info and basket data in localStorage (persists for 24 hours)
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        localStorage.setItem("checkout_user", JSON.stringify({ 
          email, 
          name, 
          expiresAt 
        }));
        localStorage.setItem("checkout_basket", JSON.stringify({ 
          items: basketItems, 
          total: totalPrice,
          timestamp: Date.now(),
          expiresAt,
          needs_tracking: true
        }));
        console.log("Checkout data stored in localStorage with 24h expiration:", { email, basketItems, totalPrice });
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: "Checkout failed",
        description: "Please try again later.",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      <RegistrationDialog
        open={showRegistration}
        onOpenChange={setShowRegistration}
        onComplete={handleRegistrationComplete}
      />
      
      <Sheet>
        <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
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
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({totalItems})</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Your cart is empty</p>
                <p className="text-sm text-muted-foreground">Add some hedgehog goodness!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      {item.is_subscription && (
                        <Badge variant="secondary" className="mt-1">
                          {item.subscription_interval}ly subscription
                        </Badge>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {!item.is_subscription && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <p className="font-bold ml-auto">${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
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
            <div className="border-t pt-4 space-y-4 shrink-0">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleCheckoutClick}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
};
