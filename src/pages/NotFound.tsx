import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { trackEvent, captureException, posthog } from "@/lib/posthog";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Enhanced error tracking with PostHog
    const error = new Error("404 Error: Page not found");
    
    // Capture exception with session replay
    captureException(error, "404_page_not_found", {
      attempted_route: location.pathname,
      referrer: document.referrer,
      session_replay_url: posthog.get_session_replay_url(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Track 404 event
    trackEvent("404_error", {
      route: location.pathname,
      referrer: document.referrer,
      session_replay_url: posthog.get_session_replay_url(),
      timestamp: new Date().toISOString(),
    });

    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleRecovery = (action: string) => {
    trackEvent("404_recovery_attempted", {
      recovery_action: action,
      from_page: location.pathname,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
      <div className="mx-auto max-w-2xl px-6 text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold text-primary">404</h1>
          <p className="text-3xl font-semibold">Page Not Found</p>
        </div>
        
        <p className="text-xl text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button 
            size="lg" 
            asChild
            onClick={() => handleRecovery("home")}
            className="gap-2"
          >
            <Link to="/">
              <Home className="h-5 w-5" />
              Return to Home
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => {
              handleRecovery("back");
              window.history.back();
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Go Back
          </Button>
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          <p>Error tracked with session replay for analysis</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
