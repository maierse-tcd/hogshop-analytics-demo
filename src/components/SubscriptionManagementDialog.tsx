import { useState } from "react";
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
import { posthog } from "@/lib/posthog";

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

  const handleCancel = async () => {
    setShowSurvey(true);
    
    // Show PostHog survey
    posthog.getActiveMatchingSurveys((surveys) => {
      const cancelSurvey = surveys.find(
        (survey) => survey.name === "subscription_cancellation"
      );
      
      if (cancelSurvey) {
        // PostHog will automatically show the survey in a popup
        console.log("PostHog: Showing cancellation survey", cancelSurvey.id);
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

        // Update user properties
        posthog.setPersonProperties({
          subscription_status: "cancelled",
          subscription_cancelled_at: new Date().toISOString(),
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
            Are you sure you want to cancel your subscription?
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your subscription will be cancelled immediately and you'll lose access to premium features.
          </AlertDescription>
        </Alert>

        {showSurvey && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Please help us improve by answering a quick survey...
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
