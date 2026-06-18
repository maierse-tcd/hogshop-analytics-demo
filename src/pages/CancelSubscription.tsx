import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { trackEvent, captureException, posthog } from "@/lib/posthog";
import { ArrowLeft, AlertTriangle, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Step = "intro" | "reason" | "offer" | "confirm" | "done" | "failed";

const REASONS = [
  "Too expensive",
  "Not using it enough",
  "Found an alternative",
  "Just trying it out",
  "Other",
] as const;

const CANCEL_FAILURE_RATE = 0.1;

export default function CancelSubscription() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("intro");
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    trackEvent("subscription_cancel_started", { entry_step: "intro" });
  }, []);

  // Fire an aborted event if the user navigates away before reaching `done`.
  useEffect(() => {
    const onHide = () => {
      if (step !== "done" && step !== "failed" && document.visibilityState === "hidden") {
        trackEvent("subscription_cancel_aborted", { at_step: step });
        captureException(
          new Error(`Subscription cancellation aborted at step: ${step}`),
          "subscription_cancel_aborted",
          { at_step: step, reason }
        );
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [step, reason]);

  const advance = (next: Step) => {
    trackEvent("subscription_cancel_step_completed", { from: step, to: next, reason });
    setStep(next);
  };

  const abort = (reason_label: string) => {
    trackEvent("subscription_cancel_aborted", { at_step: step, abort_reason: reason_label });
    navigate("/");
  };

  const confirm = async () => {
    setSubmitting(true);
    // Synthetic backend failure — feeds the error-tracking inbox.
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));
    if (Math.random() < CANCEL_FAILURE_RATE) {
      const err = new Error("Subscription cancellation failed: billing provider returned 503");
      err.name = "SubscriptionCancelError";
      captureException(err, "subscription_cancel_failed", {
        reason,
        billing_provider: "stripe",
        retry_eligible: true,
      });
      trackEvent("subscription_cancel_failed", { reason, error: err.message });
      setSubmitting(false);
      setStep("failed");
      return;
    }
    trackEvent("subscription_cancelled", { reason, source: "cancel_subscription_page" });
    posthog.setPersonProperties({
      subscription_active: false,
      subscription_cancelled: true,
      subscription_cancelled_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setStep("done");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-2xl py-12">
        <Button variant="ghost" onClick={() => abort("back_button")} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Keep my subscription
        </Button>

        {step === "intro" && (
          <Card data-attr="cancel-step-intro" className="p-8 space-y-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Cancel your hedgehog supply subscription?</h1>
                <p className="text-muted-foreground">
                  We're sorry to see you go. If you cancel today, your subscription will end at the next billing cycle.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button data-attr="cancel-continue" onClick={() => advance("reason")} variant="destructive">
                Continue cancelling
              </Button>
              <Button data-attr="cancel-back" onClick={() => abort("intro_keep")} variant="outline" className="text-foreground">
                Keep my subscription
              </Button>
            </div>
          </Card>
        )}

        {step === "reason" && (
          <Card data-attr="cancel-step-reason" className="p-8 space-y-6">
            <h1 className="text-2xl font-bold text-foreground">What's the main reason?</h1>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  data-attr={`cancel-reason-${r.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => {
                    setReason(r);
                    advance("offer");
                  }}
                  className="w-full text-left px-4 py-3 rounded-md border hover:border-primary transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
            <Button onClick={() => abort("reason_back")} variant="ghost">
              I changed my mind
            </Button>
          </Card>
        )}

        {step === "offer" && (
          <Card data-attr="cancel-step-offer" className="p-8 space-y-6 border-primary/30">
            <div className="flex items-start gap-3">
              <Heart className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Wait — here's 25% off your next 3 months</h1>
                <p className="text-muted-foreground">
                  Many subscribers tell us they love the convenience but want to pause spend. We'd love to keep helping Max thrive.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                data-attr="cancel-accept-offer"
                onClick={() => {
                  trackEvent("subscription_save_offer_accepted", { reason });
                  navigate("/");
                  toast({
                    title: "Discount applied",
                    description: "We've applied 25% off your next three months. No subscription changes.",
                  });
                }}
              >
                Accept the offer
              </Button>
              <Button
                data-attr="cancel-decline-offer"
                onClick={() => advance("confirm")}
                variant="outline"
                className="text-foreground"
              >
                No thanks, cancel anyway
              </Button>
            </div>
          </Card>
        )}

        {step === "confirm" && (
          <Card data-attr="cancel-step-confirm" className="p-8 space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Confirm cancellation</h1>
            <p className="text-muted-foreground">
              This will end your hedgehog supply subscription at the next billing date. You can resubscribe at any time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                data-attr="cancel-confirm"
                onClick={confirm}
                variant="destructive"
                disabled={submitting}
              >
                {submitting ? "Cancelling…" : "Confirm cancellation"}
              </Button>
              <Button
                data-attr="cancel-keep"
                onClick={() => abort("confirm_keep")}
                variant="outline"
                disabled={submitting}
                className="text-foreground"
              >
                Keep my subscription
              </Button>
            </div>
          </Card>
        )}

        {step === "done" && (
          <Card data-attr="cancel-step-done" className="p-8 space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Subscription cancelled</h1>
            <p className="text-muted-foreground">
              You'll continue to receive supplies until the end of the current billing cycle. We'll miss you — Max waves goodbye 👋
            </p>
            <Button onClick={() => navigate("/")}>Back to shop</Button>
          </Card>
        )}

        {step === "failed" && (
          <Card data-attr="cancel-step-failed" className="p-8 space-y-6 border-destructive/40">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">We couldn't cancel right now</h1>
                <p className="text-muted-foreground">
                  Our billing provider returned an error. Your subscription is unchanged. Please try again in a moment, or contact support.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button data-attr="cancel-retry" onClick={() => setStep("confirm")} variant="destructive">
                Try again
              </Button>
              <Button data-attr="cancel-give-up" onClick={() => navigate("/")} variant="outline">
                Back to shop
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
