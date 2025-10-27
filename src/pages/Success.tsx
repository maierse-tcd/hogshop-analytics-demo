import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { trackEvent } from "@/lib/posthog";
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
        try {
          // Fetch session details from Stripe to get customer email
          const { data, error } = await supabase.functions.invoke("get-session", {
            body: { session_id: sessionId },
          });

          if (!error && data?.customer_email) {
            // Identify user in PostHog with their email
            posthog.identify(data.customer_email, {
              email: data.customer_email,
              name: data.customer_name,
              purchase_session_id: sessionId,
            });
            console.log("PostHog: User identified", data.customer_email);
          }
        } catch (error) {
          console.error("Failed to identify user:", error);
        }

        trackEvent("purchase_completed", {
          session_id: sessionId,
          total_amount: totalPrice,
        });
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
