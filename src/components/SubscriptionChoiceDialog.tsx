import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { posthog, trackEvent, slugifyCompany, getCampaignContext } from "@/lib/posthog";
import { getUser } from "@/lib/auth";

interface SubscriptionProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  subscription_interval: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionChoiceDialog = ({ open, onOpenChange }: Props) => {
  const [plans, setPlans] = useState<SubscriptionProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    trackEvent("subscription_choice_viewed", {});
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, title, description, price, subscription_interval")
          .eq("is_subscription", true);
        if (cancelled) return;
        if (error) console.error("Failed to load subscription plans", error);
        setPlans((data as SubscriptionProduct[]) || []);
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load subscription plans", e);
          setPlans([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const handleSubscribe = async (plan: SubscriptionProduct) => {
    const user = getUser();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Please log in",
        description: "You need to be logged in to start a subscription.",
      });
      return;
    }

    setSubscribingId(plan.id);
    try {
      const item = {
        id: plan.id,
        title: plan.title,
        price: plan.price,
        quantity: 1,
        is_subscription: true,
        subscription_interval: plan.subscription_interval || "month",
      };

      // Same B2B / attribution context as CheckoutContext's main checkout path.
      const trimmedCompany = user.companyName?.trim() || undefined;
      const companyKey = trimmedCompany ? slugifyCompany(trimmedCompany) : undefined;
      const icpType = trimmedCompany ? "B2B" : "B2C";
      const companyProps = trimmedCompany ? { company_name: trimmedCompany, company_key: companyKey } : {};

      trackEvent("checkout_started", {
        items_count: 1,
        basket_value: plan.price,
        revenue: plan.price,
        list_value: plan.price,
        discount_percent: 0,
        currency: "USD",
        items: [{ id: item.id, title: item.title, price: item.price, quantity: item.quantity, is_subscription: true }],
        hashed_example_property: "posthog",
        icp_type: icpType,
        ...companyProps,
        is_subscription: true,
        plan_name: plan.title,
      });

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          items: [item],
          customer_email: user.email,
          customer_name: user.name,
          ph_session_id: posthog.get_session_id(),
          ph_distinct_id: posthog.get_distinct_id(),
          // This picker always shows list price, so request no discount.
          discount_percent: 0,
          company_name: trimmedCompany,
          company_key: companyKey,
          icp_type: icpType,
          ...getCampaignContext(),
        },
      });
      if (error) throw error;

      if (data?.url) {
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem(
          "checkout_user",
          JSON.stringify({ email: user.email, name: user.name, companyName: trimmedCompany, expiresAt })
        );
        localStorage.setItem(
          "checkout_basket",
          JSON.stringify({
            items: [item],
            total: plan.price,
            timestamp: Date.now(),
            expiresAt,
            needs_tracking: true,
          })
        );
        window.open(data.url, "_blank");
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Subscription checkout error", err);
      toast({
        variant: "destructive",
        title: "Couldn't start subscription",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubscribingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Choose a Subscription</DialogTitle>
          <DialogDescription>
            Get regular deliveries of hedgehog essentials, straight to your door.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No subscription plans available right now.
          </p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                data-attr="subscription-plan"
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${plan.price.toFixed(2)}/{plan.subscription_interval || "month"}
                  </p>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {plan.description}
                    </p>
                  )}
                </div>
                <Button
                  data-attr="subscription-subscribe"
                  onClick={() => handleSubscribe(plan)}
                  disabled={subscribingId !== null}
                  size="sm"
                >
                  {subscribingId === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
