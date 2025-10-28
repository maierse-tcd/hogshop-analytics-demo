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
  const { toast } = useToast();

  const handleCancel = async () => {
    // No survey on cancel; proceed immediately
    await proceedWithCancellation();
  };

  const proceedWithCancellation = async () => {
    setIsCancelling(true);
    
    try {
      // Track cancellation attempt
      posthog.capture("subscription_cancellation_attempted", {
        timestamp: new Date().toISOString(),
      });

      // Update PostHog to mark as churned subscriber
      updateSubscriptionStatus({
        active: false,
        cancelled: true,
      });
      
      // Update to Churned Subscriber lifecycle (keep value tier unchanged)
      posthog.group("customer_lifecycle", "Churned Subscriber");
      posthog.setPersonProperties({ 
        subscription_active: false,
        customer_lifecycle: "Churned Subscriber",
      });

      toast({
        title: "Subscription Cancelled",
        description: "We’ll stop shipping your monthly Hedgehog Food boxes.",
      });

      // Track successful cancellation
      posthog.capture("subscription_cancelled", {
        timestamp: new Date().toISOString(),
        cancellation_date: new Date().toISOString(),
      });

      onCancelled?.();
      onOpenChange(false);
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
