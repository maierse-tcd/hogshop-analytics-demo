import { Moon, Sun, LogIn, LogOut, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { CartDrawer } from "./CartDrawer";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { LoginDialog } from "./LoginDialog";
import { SubscriptionManagementDialog } from "./SubscriptionManagementDialog";
import { posthog } from "@/lib/posthog";
import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from "posthog-js/react";

export const Header = () => {
  const { theme, setTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const signupVariant = useFeatureFlagVariantKey('increase_sales_cta');
  const halloweenMode = useFeatureFlagEnabled('hero_banner_halloween');
  const showSubscription = useFeatureFlagEnabled('show_subscription');

  useEffect(() => {
    const email = localStorage.getItem("user_email");
    const name = localStorage.getItem("user_name");
    if (email && name) {
      setIsLoggedIn(true);
      setUserName(name);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
    posthog.reset();
    setIsLoggedIn(false);
    setUserName("");
  };

  const handleLoginSuccess = (email: string, name: string) => {
    setIsLoggedIn(true);
    setUserName(name);
  };

  const triggerSubscriptionSurvey = () => {
    try {
      // Always track the click
      posthog.capture("click_subscription", {
        source: "header",
        timestamp: new Date().toISOString(),
      });

      posthog.getActiveMatchingSurveys((surveys) => {
        // Prefer a survey with "subscription" in name, else take the first
        const survey = surveys.find((s: any) => (s.name || "").toLowerCase().includes("subscription")) || surveys[0];
        if (survey) {
          const render = (posthog as any).renderSurvey as ((id: string, selector?: string) => void) | undefined;
          if (typeof render === "function") {
            render(survey.id);
            console.log("PostHog: Rendered survey from header click", { id: survey.id, name: survey.name });
          } else {
            console.warn("PostHog: renderSurvey not available in this SDK version");
          }
        } else {
          console.log("PostHog: No active surveys available on header click");
        }
      }, true);
    } catch (e) {
      console.error("PostHog: Survey trigger error", e);
    }
  };

  return (
    <header className={`sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60 ${
      halloweenMode 
        ? 'bg-gradient-to-r from-[hsl(var(--halloween-dark))] via-[hsl(var(--halloween-purple))]/40 to-[hsl(var(--halloween-dark))]/95 border-[hsl(var(--halloween-orange))]/30' 
        : 'bg-background/95'
    }`}>
      {halloweenMode && (
        <>
          <div className="absolute top-0 right-10 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>🦇</div>
          <div className="absolute top-0 left-[15%] text-xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>🕷️</div>
          <div className="absolute top-0 right-[30%] text-2xl animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}>🎃</div>
        </>
      )}
      <div className="container flex h-16 items-center justify-between relative">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center space-x-2">
            <span className={`text-2xl font-bold ${
              halloweenMode 
                ? 'bg-gradient-to-r from-[hsl(var(--halloween-orange))] to-[hsl(var(--halloween-purple))] bg-clip-text text-transparent drop-shadow-[0_0_10px_hsl(var(--halloween-orange))]' 
                : 'bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent'
            }`}>
              {halloweenMode ? '👻 HogShop 🎃' : 'HogShop'}
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link to="/" className={`text-sm font-medium transition-colors ${
              halloweenMode 
                ? 'text-[hsl(var(--halloween-orange))]/80 hover:text-[hsl(var(--halloween-orange))]' 
                : 'text-muted-foreground hover:text-foreground'
            }`}>
              {halloweenMode ? '🛒 Shop' : 'Shop'}
            </Link>
            <Link to="/about" className={`text-sm font-medium transition-colors ${
              halloweenMode 
                ? 'text-[hsl(var(--halloween-orange))]/80 hover:text-[hsl(var(--halloween-orange))]' 
                : 'text-muted-foreground hover:text-foreground'
            }`}>
              {halloweenMode ? '🦔 About' : 'About'}
            </Link>
            <Link to="/faq" className={`text-sm font-medium transition-colors ${
              halloweenMode 
                ? 'text-[hsl(var(--halloween-orange))]/80 hover:text-[hsl(var(--halloween-orange))]' 
                : 'text-muted-foreground hover:text-foreground'
            }`}>
              {halloweenMode ? '❓ FAQ' : 'FAQ'}
            </Link>
            <Link to="/shipping" className={`text-sm font-medium transition-colors ${
              halloweenMode 
                ? 'text-[hsl(var(--halloween-orange))]/80 hover:text-[hsl(var(--halloween-orange))]' 
                : 'text-muted-foreground hover:text-foreground'
            }`}>
              {halloweenMode ? '📦 Shipping' : 'Shipping'}
            </Link>
            {isLoggedIn && showSubscription && (
              <button
                onClick={() => {
                  triggerSubscriptionSurvey();
                  setTimeout(() => setShowSubscriptionDialog(true), 600);
                }}
                className={`text-sm font-medium transition-colors ${
                  halloweenMode 
                    ? 'text-[hsl(var(--halloween-orange))]/80 hover:text-[hsl(var(--halloween-orange))]' 
                    : 'text-muted-foreground hover:text-foreground'
                } flex items-center gap-1`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Subscription
              </button>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className={`text-sm hidden md:inline ${
                halloweenMode ? 'text-[hsl(var(--halloween-orange))]' : 'text-muted-foreground'
              }`}>
                {userName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLoginDialog(true)}
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden md:inline">Login/Signup</span>
              </Button>
              {(signupVariant === '10percent' || signupVariant === '15percent') && (
                <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border animate-pulse ${
                  halloweenMode 
                    ? 'bg-[hsl(var(--halloween-orange))]/20 border-[hsl(var(--halloween-orange))]/40' 
                    : 'bg-primary/10 border-primary/20'
                }`}>
                  <span className={`text-xs font-medium ${
                    halloweenMode ? 'text-[hsl(var(--halloween-orange))]' : 'text-primary'
                  }`}>
                    🎉 {signupVariant === '10percent' ? '10%' : '15%'} off your first order!
                  </span>
                </div>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <CartDrawer />
        </div>
        <LoginDialog 
          open={showLoginDialog} 
          onOpenChange={setShowLoginDialog}
          onLoginSuccess={handleLoginSuccess}
          discountPercent={signupVariant === '10percent' ? 10 : signupVariant === '15percent' ? 15 : undefined}
        />
        <SubscriptionManagementDialog
          open={showSubscriptionDialog}
          onOpenChange={setShowSubscriptionDialog}
        />
      </div>
    </header>
  );
};
