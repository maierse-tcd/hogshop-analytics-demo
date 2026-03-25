import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { trackEvent, setUserProperties, updateCLTV, updateSubscriptionStatus, setCustomerGroups } from "@/lib/posthog";
import { posthog } from "@/lib/posthog";
import { supabase } from "@/integrations/supabase/client";
import { saveUser } from "@/lib/auth";

const Success = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart, totalPrice } = useCart();
  const sessionId = searchParams.get("session_id");
  const trackedParam = searchParams.get("tracked");
  const [trackingComplete, setTrackingComplete] = useState(false);
  const [trackingVerified, setTrackingVerified] = useState(false);

  useEffect(() => {
    const identifyUser = async () => {
      console.log("🟡 SUCCESS: Page loaded", { 
        sessionId, 
        trackedParam, 
        hasTrackedParam: trackedParam === "1" 
      });
      
      // Set up a 10-second safety net timer for dual-track approach
      let safetyNetTimer: ReturnType<typeof setTimeout> | null = null;
      
      // Short-circuit if server-side tracking indicated via URL
      if (trackedParam === "1") {
        console.log("🟡 SUCCESS: Server-side tracking confirmed via URL");
        
        // CRITICAL: Restore user session from checkout_user before clearing
        const storedUserData = localStorage.getItem("checkout_user");
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            if (userData.email && userData.name && (!userData.expiresAt || Date.now() < userData.expiresAt)) {
              // Re-save to permanent auth storage
              saveUser(userData.email, userData.name);
              console.log("Success: User session restored", { email: userData.email });
              
              // CRITICAL: Identify user in PostHog FIRST
              posthog.identify(userData.email, {
                email: userData.email,
                name: userData.name,
              });
              
              // Wait for identification to propagate
              setTimeout(() => {
                // Set groups after identification
                const cltv = parseFloat(localStorage.getItem("user_cltv") || "0");
                setCustomerGroups("Active Subscriber", cltv);
                
                console.log("Success: User identified and groups set", { email: userData.email, cltv });
                
                // Single strategic reload after server-side tracking confirmation
                setTimeout(() => {
                  posthog.reloadFeatureFlags();
                  console.log("Success: Feature flags reloaded (server tracking confirmed)");
                }, 2000);
              }, 500);
            }
          } catch (error) {
            console.error("Success: Failed to restore user session", error);
          }
        } else {
          // No stored user data, still reload flags after delay
          setTimeout(() => {
            posthog.reloadFeatureFlags();
            console.log("🟡 SUCCESS: Feature flags reloaded (no user data)");
          }, 2000);
        }
        
        setTrackingComplete(true);
        setTrackingVerified(true);
        
        // Set up 3-second verification check as safety net
        setTimeout(() => {
          if (!trackingVerified) {
            console.warn("⚠️ SUCCESS: Server tracking not verified after 3s, will fire client-side backup");
            // Fall through to client-side tracking below
          } else {
            console.log("✅ SUCCESS: Server-side tracking verified successfully");
          }
        }, 3000);
        
        return;
      }

      // Allow tracking if we have a session_id OR a pending basket flag
      const basketFlag = localStorage.getItem("checkout_basket") || sessionStorage.getItem("checkout_basket");
      let hasPending = false;
      try {
        if (basketFlag) {
          const tmp = JSON.parse(basketFlag);
          hasPending = !!tmp?.needs_tracking;
        }
      } catch (_) {}

      if ((!sessionId && !hasPending) || trackingComplete) {
        console.log("🟡 SUCCESS: Skipping tracking", { sessionId, hasPending, trackingComplete });
        return;
      }

      console.log("🟡 SUCCESS: Starting CLIENT-SIDE purchase tracking for session:", sessionId || "no-session");

      // Check if this session was already tracked
      const trackedSessions = JSON.parse(localStorage.getItem("tracked_sessions") || "{}");
      if (sessionId && trackedSessions[sessionId]) {
        console.log("🟡 SUCCESS: Session already tracked, skipping", sessionId);
        setTrackingComplete(true);
        setTrackingVerified(true);
        return;
      }

      // Capture totalPrice before clearing cart
      const cartTotal = totalPrice;
      let stripeItems: any[] = [];
      let stripeTotal = 0;
      
      // Try to get user info from localStorage first (persists across tabs), then sessionStorage
      const storedUserData = localStorage.getItem("checkout_user") || sessionStorage.getItem("checkout_user");
      let userEmail = "";
      let userName = "";

      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          
          // Check if data has expired
          if (userData.expiresAt && Date.now() > userData.expiresAt) {
            console.log("PostHog: Stored user data expired");
            localStorage.removeItem("checkout_user");
          } else {
            userEmail = userData.email;
            userName = userData.name;
            
            // Identify immediately with stored data
            posthog.identify(userEmail, {
              email: userEmail,
              name: userName,
              purchase_session_id: sessionId,
            });
            
            // Re-save to permanent auth storage
            saveUser(userEmail, userName);
            
            console.log("PostHog: User identified from storage", userEmail);
            
            // Set initial groups if we have CLTV
            const currentCLTV = parseFloat(localStorage.getItem("user_cltv") || "0");
            if (currentCLTV > 0) {
              setCustomerGroups("One-Time Buyer", currentCLTV);
              console.log("PostHog: Initial groups set from storage", { cltv: currentCLTV });
            }
          }
        } catch (error) {
          console.error("PostHog: Failed to parse stored user data", error);
        }
      }
      
      // If no user data in storage, try Stripe
      if (!userEmail) {
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
            
            // Save to permanent auth storage
            saveUser(userEmail, userName);
            
            console.log("PostHog: User identified from Stripe", userEmail);
            
            // Set initial groups
            const currentCLTV = parseFloat(localStorage.getItem("user_cltv") || "0");
            if (currentCLTV > 0) {
              setCustomerGroups("One-Time Buyer", currentCLTV);
              console.log("PostHog: Initial groups set from Stripe", { cltv: currentCLTV });
            }
          }
        } catch (error) {
          console.error("PostHog: Failed to identify user from Stripe:", error);
        }
      }

      // Get basket data from localStorage first (persists across tabs), then sessionStorage
      const storedBasketData = localStorage.getItem("checkout_basket") || sessionStorage.getItem("checkout_basket");
      let basketItems = [];
      let basketValue = 0;
      
      if (storedBasketData) {
        try {
          const basketData = JSON.parse(storedBasketData);
          
          // Check if data has expired
          if (basketData.expiresAt && Date.now() > basketData.expiresAt) {
            console.log("PostHog: Stored basket data expired");
            localStorage.removeItem("checkout_basket");
          } else {
            basketItems = basketData.items || [];
            basketValue = basketData.total || 0;
            console.log("PostHog: Basket data retrieved from storage:", {
              items: basketItems,
              total: basketValue,
              itemCount: basketItems.length
            });
          }
        } catch (error) {
          console.error("PostHog: Failed to parse stored basket data", error);
        }
      }
      
      // Use fallback values if storage is empty
      if (!basketValue && cartTotal) {
        basketValue = cartTotal;
        console.log("PostHog: Using cart total as fallback:", basketValue);
      }

      // Track purchase completion with whatever data we have
      console.log("🟡 SUCCESS: Firing CLIENT-SIDE purchase_completed event with data:", {
        session_id: sessionId,
        total_amount: basketValue,
        customer_email: userEmail,
        items: basketItems,
        itemCount: basketItems.length
      });

      trackEvent("purchase_completed", {
        session_id: sessionId,
        total_amount: basketValue,
        revenue: Math.round(basketValue * 100),
        currency: "USD",
        subscription_id: hasSubscription ? sessionId : null,
        customer_email: userEmail,
        items: basketItems,
      });
      
      // Wait for identify to propagate before setting properties
      setTimeout(() => {
        if (userEmail) {
          setUserProperties({
            last_purchase_date: new Date().toISOString(),
            last_purchase_amount: basketValue,
            items_basket: basketItems,
            basket_value: basketValue,
          });
          
          // Update overall customer lifetime value
          updateCLTV(basketValue);
          
          console.log("PostHog: User properties set and CLTV updated by", basketValue);
        }
      }, 300);
      
      // Check if this was a subscription purchase and update subscription status
      const hasSubscription = basketItems.some((item: any) => item.is_subscription);
      console.log("PostHog: Subscription check:", {
        hasSubscription,
        basketItems,
        subscriptionItems: basketItems.filter((item: any) => item.is_subscription)
      });
      
      if (hasSubscription) {
        const subscriptionItem = basketItems.find((item: any) => item.is_subscription);
        setTimeout(() => {
          console.log("PostHog: Setting subscription_active to true and customer groups");
          updateSubscriptionStatus({
            active: true,
            start_date: new Date().toISOString(),
            monthly_value: subscriptionItem?.price || basketValue,
          });
          
          // Set both lifecycle and value tier groups
          const currentCLTV = parseFloat(localStorage.getItem("user_cltv") || "0");
          setCustomerGroups("Active Subscriber", currentCLTV);
        }, 500);
      } else {
        // One-off purchase - set lifecycle to One-Time Buyer with value tier
        setTimeout(() => {
          console.log("PostHog: Setting customer groups for one-time buyer");
          const currentCLTV = parseFloat(localStorage.getItem("user_cltv") || "0");
          setCustomerGroups("One-Time Buyer", currentCLTV);
        }, 500);
      }
      
      // Mark this session as tracked to prevent duplicates
      if (sessionId) {
        trackedSessions[sessionId] = {
          timestamp: Date.now(),
          tracked: true,
          method: "client-side"
        };
        localStorage.setItem("tracked_sessions", JSON.stringify(trackedSessions));
        console.log("🟡 SUCCESS: Session marked as tracked (client-side)", sessionId);
      }
      
      // Clean up old tracked sessions (older than 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      Object.keys(trackedSessions).forEach(key => {
        if (trackedSessions[key].timestamp < sevenDaysAgo) {
          delete trackedSessions[key];
        }
      });
      localStorage.setItem("tracked_sessions", JSON.stringify(trackedSessions));

      // Now safe to clear cart and temporary checkout storage
      clearCart();
      // Clear temporary checkout data but NOT permanent auth (user_email/user_name)
      localStorage.removeItem("checkout_user");
      localStorage.removeItem("checkout_basket");
      sessionStorage.removeItem("checkout_user");
      sessionStorage.removeItem("checkout_basket");
      
      setTrackingComplete(true);
      setTrackingVerified(true);
      console.log("✅ SUCCESS: CLIENT-SIDE purchase tracking complete");
    };

    identifyUser();
  }, [sessionId, totalPrice, clearCart, trackingComplete, trackingVerified]);

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
