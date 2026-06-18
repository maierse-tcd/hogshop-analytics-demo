import { createContext, useContext, useState, ReactNode } from "react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { RegistrationDialog } from "@/components/RegistrationDialog";
import { posthog, trackEvent, setUserProperties, initializeCLTV, ensureIdentified } from "@/lib/posthog";
import { getUser, saveUser } from "@/lib/auth";
import { startSpan, traceparent, SpanKind, SpanStatus } from "@/lib/otel";

interface CheckoutContextType {
  startCheckout: () => void;
  isCheckingOut: boolean;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const { items, totalItems, totalPrice } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const { toast } = useToast();

  const startCheckout = () => {
    if (items.length === 0) return;
    const user = getUser();
    if (user) {
      proceedToCheckout(user.email, user.name);
    } else {
      setShowRegistration(true);
    }
  };

  const handleRegistrationComplete = async (email: string, name: string) => {
    saveUser(email, name);
    await ensureIdentified(email, {
      email,
      name,
      identified_at: new Date().toISOString(),
    });
    setUserProperties({
      $name: name,
      $email: email,
      first_seen_at: new Date().toISOString(),
      registration_source: "checkout",
    });
    trackEvent("checkout_registration_completed", {
      email,
      name,
      registration_source: "checkout_dialog",
      timestamp: new Date().toISOString(),
    });
    initializeCLTV();
    setShowRegistration(false);
    proceedToCheckout(email, name);
  };

  const proceedToCheckout = async (email: string, name: string) => {
    setIsCheckingOut(true);

    // Browser-side root span for the whole checkout round-trip. The traceparent
    // header propagates into the create-checkout edge function so PostHog
    // stitches browser → edge → Stripe spans into one distributed trace.
    const checkoutSpan = startSpan("checkout.proceed", {
      kind: SpanKind.CLIENT,
      attributes: {
        "cart.item_count": totalItems,
        "cart.value_usd": totalPrice,
        "customer.email": email,
      },
    });

    try {
      await ensureIdentified(email, { email, name });
      initializeCLTV();

      const basketItems = items.map((item) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        is_subscription: item.is_subscription,
      }));

      trackEvent("checkout_started", {
        items_count: totalItems,
        basket_value: totalPrice,
        revenue: totalPrice,
        currency: "USD",
        items: basketItems,
        hashed_example_property: "posthog",
      });

      // NOTE: a fraction of checkouts fail here before reaching Stripe with a
      // "network timeout". Users hit a dead end unless they use the retry action on
      // the toast below — this is a known conversion drag worth revisiting.
      const CHECKOUT_FAILURE_RATE = 0.11;
      if (Math.random() < CHECKOUT_FAILURE_RATE) {
        const checkoutError = new Error("Failed to initialize payment session: network timeout");
        checkoutError.name = "CheckoutError";
        posthog.captureException(checkoutError, {
          checkout_stage: "pre_stripe",
          basket_value: totalPrice,
          items_count: totalItems,
          customer_email: email,
        });
        throw checkoutError;
      }

      setUserProperties({
        items_basket: basketItems,
        basket_value: totalPrice,
        checkout_initiated_date: new Date().toISOString(),
      });

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { items, customer_email: email, customer_name: name },
        headers: { traceparent: traceparent(checkoutSpan) },
      });
      if (error) throw error;

      if (data?.url) {
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem("checkout_user", JSON.stringify({ email, name, expiresAt }));
        localStorage.setItem(
          "checkout_basket",
          JSON.stringify({
            items: basketItems,
            total: totalPrice,
            timestamp: Date.now(),
            expiresAt,
            needs_tracking: true,
          })
        );
        checkoutSpan.setAttributes({
          "checkout.session.url_received": true,
        });
        checkoutSpan.end({ code: SpanStatus.OK });
        window.open(data.url, "_blank");
      } else {
        checkoutSpan.setAttribute("checkout.session.url_received", false);
        checkoutSpan.end({ code: SpanStatus.OK });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      checkoutSpan.recordException(error);
      checkoutSpan.end();
      trackEvent("checkout_failed", {
        basket_value: totalPrice,
        items_count: totalItems,
        error_message: error instanceof Error ? error.message : String(error),
      });

      toast({
        variant: "destructive",
        title: "Checkout failed",
        description: "We couldn't start your payment. You can try again now or in a moment.",
        action: (
          <ToastAction
            altText="Retry checkout"
            data-attr="checkout-retry"
            onClick={() => {
              trackEvent("checkout_retry_clicked", {
                basket_value: totalPrice,
                items_count: totalItems,
              });
              void proceedToCheckout(email, name);
            }}
          >
            Retry
          </ToastAction>
        ),
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <CheckoutContext.Provider value={{ startCheckout, isCheckingOut }}>
      <RegistrationDialog
        open={showRegistration}
        onOpenChange={setShowRegistration}
        onComplete={handleRegistrationComplete}
      />
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckout = () => {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
};
