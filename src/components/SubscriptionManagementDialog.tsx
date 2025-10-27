import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { posthog, updateSubscriptionStatus } from "@/lib/posthog";

interface SubscriptionManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

export const SubscriptionManagementDialog = ({
  open,
  onOpenChange,
  onCancelled,
}: SubscriptionManagementDialogProps) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const { toast } = useToast();
  const surveyContainerRef = useRef<HTMLDivElement | null>(null);

  // Force PostHog to rescan for survey targets when modal opens
  useEffect(() => {
    if (open) {
      // Give PostHog time to detect the modal content
      setTimeout(() => {
        posthog.reloadFeatureFlags();
        console.log("PostHog: Modal opened, rescanning for survey targets");
      }, 300);
    }
  }, [open]);

  const handleCancel = async () => {
    setShowSurvey(true);
    
    // Show PostHog survey immediately inside the dialog
    posthog.getActiveMatchingSurveys((surveys) => {
      const cancelSurvey = surveys.find((survey) => survey.name === "subscription_cancellation");
      if (cancelSurvey) {
        const render = (posthog as any).renderSurvey as ((id: string, selector?: string) => void) | undefined;
        if (typeof render === "function") {
          const selector = "#ph-survey-container";
          try {
            render(cancelSurvey.id, selector);
            console.log("PostHog: Rendered cancellation survey in container", { id: cancelSurvey.id, selector });
          } catch (e) {
            console.warn("PostHog: renderSurvey failed, proceeding with default behavior", e);
          }
        } else {
          console.warn("PostHog: renderSurvey not available in this SDK version");
        }
      } else {
        console.log("PostHog: No cancellation survey found, proceeding with cancellation");
      }
    }, true);

    // Small delay to let the survey appear
    setTimeout(() => {
      proceedWithCancellation();
    }, 500);
  };

  const proceedWithCancellation = async () => {
    setIsCancelling(true);
    
    try {
      // Track cancellation attempt
      posthog.capture("subscription_cancellation_attempted", {
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase.functions.invoke(
        "cancel-subscription",
        {
          body: {},
        }
      );

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been successfully cancelled.",
        });

        // Track successful cancellation
        posthog.capture("subscription_cancelled", {
          timestamp: new Date().toISOString(),
          cancellation_date: new Date().toISOString(),
        });

        // Update subscription status in PostHog
        updateSubscriptionStatus({
          active: false,
          cancelled: true,
        });

        onCancelled?.();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Cancellation error:", error);
      
      // Track cancellation failure
      posthog.capture("subscription_cancellation_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      toast({
        variant: "destructive",
        title: "Cancellation Failed",
        description: "Failed to cancel subscription. Please try again or contact support.",
      });
    } finally {
      setIsCancelling(false);
      setShowSurvey(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Cancelling will stop monthly deliveries of your Hedgehog Food subscription. This is a product subscription (not a service), so we’ll simply stop shipping future boxes.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            We’ll stop shipping your monthly Hedgehog Food box right away. This isn’t a service subscription—no further shipments will be sent.
          </AlertDescription>
        </Alert>

        {showSurvey && (
          <div className="py-4">
            <div className="text-center text-sm text-muted-foreground mb-2">
              Please help us improve by answering a quick survey...
            </div>
            <div id="ph-survey-container" ref={surveyContainerRef} />
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
            className="w-full sm:w-auto"
          >
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full sm:w-auto"
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Subscription"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
