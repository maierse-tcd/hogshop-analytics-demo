import { useState } from "react";
import { useFeatureFlagVariantKey } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LoginDialog } from "@/components/LoginDialog";
import { getUser } from "@/lib/auth";

export const LoyaltyPrompt = () => {
  const variant = useFeatureFlagVariantKey("exp-loyalty-prompt");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  if (variant !== "test") return null;

  const handleClick = () => {
    const user = getUser();
    if (user) {
      toast({
        title: "You're all set! 🎉",
        description: "We'll email your 10% off code shortly.",
      });
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <div
        data-attr="loyalty-prompt"
        className="max-w-md mx-auto mb-8 rounded-xl border-2 border-primary bg-primary/5 p-6 text-left shadow-sm"
      >
        <h2 className="text-xl font-bold mb-2">🎁 Save 10% on your next order</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create your HogShop account and we'll email you a code for 10% off your next purchase.
        </p>
        <Button
          onClick={handleClick}
          className="w-full font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Create my account
        </Button>
      </div>
      <LoginDialog
        open={open}
        onOpenChange={setOpen}
        onLoginSuccess={() => {
          setOpen(false);
          toast({
            title: "You're all set! 🎉",
            description: "We'll email your 10% off code shortly.",
          });
        }}
        discountPercent={10}
      />
    </>
  );
};
