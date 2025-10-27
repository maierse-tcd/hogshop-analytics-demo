import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { trackEvent, setUserProperties, updateCLTV } from "@/lib/posthog";
import { posthog } from "@/lib/posthog";
import { supabase } from "@/integrations/supabase/client";

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart, totalPrice } = useCart();
  const sessionId = searchParams.get("session_id");
  const [identified, setIdentified] = useState(false);

  useEffect(() => {
    const identifyUser = async () => {
      if (sessionId && !identified) {
        // Try to get user info from session storage first
        const storedUser = sessionStorage.getItem("checkout_user");
        let userEmail = "";
        let userName = "";

        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userEmail = userData.email;
          userName = userData.name;
          
          // Identify immediately with stored data
          posthog.identify(userEmail, {
            email: userEmail,
            name: userName,
            purchase_session_id: sessionId,
          });
          console.log("PostHog: User identified from session", userEmail);
          
          // Clear the session storage
          sessionStorage.removeItem("checkout_user");
        } else {
          // Fallback: fetch from Stripe
          try {
            const { data, error } = await supabase.functions.invoke("get-session", {
              body: { session_id: sessionId },
            });

            if (!error && data?.customer_email) {
              userEmail = data.customer_email;
              userName = data.customer_name;
              
              posthog.identify(userEmail, {
                email: userEmail,
                name: userName,
                purchase_session_id: sessionId,
              });
              console.log("PostHog: User identified from Stripe", userEmail);
            }
          } catch (error) {
            console.error("Failed to identify user:", error);
          }
        }

        // Get basket data from session storage
        const storedBasket = sessionStorage.getItem("checkout_basket");
        let basketItems = [];
        let basketValue = totalPrice;
        
        if (storedBasket) {
          const basketData = JSON.parse(storedBasket);
          basketItems = basketData.items;
          basketValue = basketData.total;
          sessionStorage.removeItem("checkout_basket");
        }

        // Track purchase completion
        trackEvent("purchase_completed", {
          session_id: sessionId,
          total_amount: basketValue,
          customer_email: userEmail,
          items: basketItems,
        });
        
        // Update user properties with completed purchase
        setUserProperties({
          last_purchase_date: new Date().toISOString(),
          last_purchase_amount: basketValue,
          items_basket: basketItems,
          basket_value: basketValue,
        });
        
        // Update overall customer lifetime value
        updateCLTV(basketValue);
        
        console.log("PostHog: Purchase tracked and CLTV updated by", basketValue);
        
        clearCart();
        setIdentified(true);
      }
    };

    identifyUser();
  }, [sessionId, totalPrice, clearCart, identified]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16">
        <div className="max-w-md mx-auto text-center space-y-6">
          <CheckCircle2 className="w-20 h-20 mx-auto text-primary" />
          <h1 className="text-4xl font-bold">Order Successful!</h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your purchase. Your order has been confirmed and you'll receive an email shortly.
          </p>
          <div className="pt-4">
            <Button onClick={() => navigate("/")} size="lg">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
