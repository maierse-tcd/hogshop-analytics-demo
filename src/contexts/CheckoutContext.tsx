import { createContext, useContext, useState, ReactNode } from "react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { RegistrationDialog } from "@/components/RegistrationDialog";
import { posthog, trackEvent, trackMetric, deviceType, setUserProperties, initializeCLTV, ensureIdentified, applyCompanyGroup, slugifyCompany, getCampaignContext } from "@/lib/posthog";
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
      proceedToCheckout(user.email, user.name, user.companyName);
    } else {
      setShowRegistration(true);
    }
  };

  const handleRegistrationComplete = async (email: string, name: string, companyName?: string) => {
    const trimmedCompany = companyName?.trim() || undefined;
    saveUser(email, name, trimmedCompany);

    // Identify FIRST so subsequent group + events attach to the right person.
    await ensureIdentified(email, {
      email,
      name,
      identified_at: new Date().toISOString(),
    });

    if (trimmedCompany) {
      applyCompanyGroup(trimmedCompany);
    } else {
      posthog.setPersonProperties({ icp_type: "B2C" });
    }

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
      icp_type: trimmedCompany ? "B2B" : "B2C",
      ...(trimmedCompany ? { company_name: trimmedCompany, company_key: slugifyCompany(trimmedCompany) } : {}),
    });
    initializeCLTV();
    setShowRegistration(false);
    proceedToCheckout(email, name, trimmedCompany);
  };

  const proceedToCheckout = async (email: string, name: string, companyName?: string) => {
    setIsCheckingOut(true);

    const trimmedCompany = companyName?.trim() || undefined;
    const companyKey = trimmedCompany ? slugifyCompany(trimmedCompany) : undefined;
    const icpType = trimmedCompany ? "B2B" : "B2C";

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
      if (trimmedCompany) applyCompanyGroup(trimmedCompany);
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
        icp_type: icpType,
        ...(trimmedCompany ? { company_name: trimmedCompany, company_key: companyKey } : {}),
      });

      trackMetric("count", "hogshop.checkout.started", 1, {
        attributes: { device_type: deviceType() },
      });
      trackMetric("histogram", "hogshop.checkout.basket_value", totalPrice, {
        attributes: { currency: "USD" },
        unit: "USD",
      });

      // Synthetic pre-Stripe failure for demos. It is off by default. Enable the
      // `checkout-simulate-failure` flag to show the error and retry path without
      // blocking real shoppers.
      if (posthog.isFeatureEnabled("checkout-simulate-failure")) {
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
        body: {
          items,
          customer_email: email,
          customer_name: name,
          ph_session_id: posthog.get_session_id(),
          company_name: trimmedCompany,
          company_key: companyKey,
          icp_type: icpType,
          ...getCampaignContext(),
        },
        headers: { traceparent: traceparent(checkoutSpan) },
      });
      if (error) throw error;
      if (!data?.url) {
        checkoutSpan.setAttribute("checkout.session.url_received", false);
        throw new Error("Checkout session did not return a payment URL");
      }

      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(
        "checkout_user",
        JSON.stringify({ email, name, companyName: trimmedCompany, expiresAt })
      );
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

      // The Stripe hand-off runs after awaits, so it is no longer a trusted user
      // gesture and a browser can block the new tab. Try the tab first, then fall
      // back to an in-page redirect so the shopper always reaches Stripe.
      const stripeTab = window.open(data.url, "_blank");
      if (!stripeTab) {
        window.location.assign(data.url);
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
              void proceedToCheckout(email, name, trimmedCompany);
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
