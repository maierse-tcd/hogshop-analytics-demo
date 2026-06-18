import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Package } from "lucide-react";
import { trackEvent, captureException, posthog } from "@/lib/posthog";

const GiftCheckoutNotFound = () => {
  // Placeholder route: the real gift checkout (/checkout/gift) isn't built yet, so
  // the "Claim Free Gift" CTA intentionally lands here on a 404. Tracked as a
  // funnel drop-off (funnel_drop_off, stage: gift_checkout); building the actual
  // flow is still TODO.
  const location = useLocation();

  useEffect(() => {
    // Enhanced error tracking for funnel drop-off
    const error = new Error("404 Error: Gift checkout page not found");
    
    // Capture exception with session replay
    captureException(error, "gift_funnel_drop_off", {
      attempted_route: location.pathname,
      referrer: document.referrer,
      session_replay_url: posthog.get_session_replay_url(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Track specific funnel drop-off event
    trackEvent("funnel_drop_off", {
      stage: "gift_checkout",
      route: location.pathname,
      referrer: document.referrer,
      session_replay_url: posthog.get_session_replay_url(),
      error_type: "404_not_found",
      timestamp: new Date().toISOString(),
    });

    console.error("Gift Funnel Drop-off: User attempted to access gift checkout:", location.pathname);
  }, [location.pathname]);

  const handleRecovery = (action: string) => {
    trackEvent("404_recovery_attempted", {
      recovery_action: action,
      from_page: "gift_checkout",
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-2xl px-6 text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold text-primary">404</h1>
          <p className="text-3xl font-semibold">Gift Checkout Unavailable</p>
        </div>
        
        <div className="space-y-4">
          <p className="text-xl text-muted-foreground">
            We're currently working on our free gift checkout process.
          </p>
          <p className="text-lg text-muted-foreground">
            Our team has been notified and will have this fixed soon! In the meantime, explore our other amazing products.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button 
            size="lg" 
            asChild
            onClick={() => handleRecovery("home")}
            className="gap-2"
          >
            <a href="/">
              <Home className="h-5 w-5" />
              Return to Home
            </a>
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            asChild
            onClick={() => handleRecovery("products")}
            className="gap-2"
          >
            <a href="/#products">
              <Package className="h-5 w-5" />
              Browse Products
            </a>
          </Button>
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          <p>Error Code: GIFT_CHECKOUT_404</p>
          <p className="mt-1">This incident has been logged with session replay for analysis</p>
        </div>
      </div>
    </div>
  );
};

export default GiftCheckoutNotFound;
