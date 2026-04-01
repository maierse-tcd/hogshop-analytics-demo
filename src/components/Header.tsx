import { Moon, Sun, LogIn, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { CartDrawer } from "./CartDrawer";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { LoginDialog } from "./LoginDialog";
import { SubscriptionManagementDialog } from "./SubscriptionManagementDialog";
import { posthog, trackEvent, identifyUser } from "@/lib/posthog";
import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from "posthog-js/react";
import { getUser, clearUser } from "@/lib/auth";

export const Header = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const signupVariant = useFeatureFlagVariantKey('increase_sales_cta');
  const halloweenMode = useFeatureFlagEnabled('hero_banner_halloween');
  const showSubscription = useFeatureFlagEnabled('show_subscription');

  // Debug log for subscription flag
  console.log("Header: showSubscription flag =", showSubscription, "isLoggedIn =", isLoggedIn);

  // Track feature flag views (rich analytics)
  useEffect(() => {
    if (showSubscription !== undefined) {
      posthog.capture('$feature_view', { feature_flag: 'show_subscription' });
    }
  }, [showSubscription]);

  useEffect(() => {
    if (halloweenMode !== undefined) {
      posthog.capture('$feature_view', { feature_flag: 'hero_banner_halloween' });
    }
  }, [halloweenMode]);

  // Check auth state on mount and when location changes
  // Set UX Choice group based on current theme
  useEffect(() => {
    if (theme) {
      const resolvedTheme = theme === "system" 
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;
      posthog.group("ux_choice", `${resolvedTheme}_mode`, { theme: resolvedTheme });
    }
  }, [theme]);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setIsLoggedIn(true);
      setUserName(user.name);
      
      // Identify returning user in PostHog so events link to their profile
      identifyUser(user.email, { name: user.name, email: user.email });
      
      posthog.reloadFeatureFlags();
      console.log("Header: User logged in, reloading feature flags", { email: user.email });
    } else {
      setIsLoggedIn(false);
      setUserName("");
    }
  }, [location, isLoggedIn]);

  const handleLogout = () => {
    console.log("Header: handleLogout called");
    trackEvent("user_logged_out", {
      timestamp: new Date().toISOString(),
    });
    clearUser();
    posthog.reset();
    posthog.reloadFeatureFlags();
    setIsLoggedIn(false);
    setUserName("");
    console.log("Header: User logged out, flags reloaded");
    navigate("/");
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
        : 'bg-background/95 shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)]'
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
                : 'text-primary'
            }`}>
              {halloweenMode ? '👻 HogShop 🎃' : 'HogShop'}
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            {[
              { to: "/", label: "Shop", emoji: "🛒" },
              { to: "/about", label: "About", emoji: "🦔" },
              { to: "/faq", label: "FAQ", emoji: "❓" },
              { to: "/shipping", label: "Shipping", emoji: "📦" },
            ].map(({ to, label, emoji }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-medium transition-all duration-200 relative py-1 hover:-translate-y-[1px] ${
                  halloweenMode 
                    ? 'text-[hsl(var(--halloween-orange))]/80 hover:text-[hsl(var(--halloween-orange))]' 
                    : 'text-muted-foreground hover:text-foreground'
                } ${location.pathname === to ? (halloweenMode ? 'text-[hsl(var(--halloween-orange))]' : '!text-foreground') : ''}`}
              >
                {halloweenMode ? `${emoji} ${label}` : label}
                {location.pathname === to && (
                  <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-primary rounded-full" />
                )}
              </Link>
            ))}
            {isLoggedIn && showSubscription && (
              <button
                onClick={() => {
                  // Track feature interaction with person property
                  posthog.capture('$feature_interaction', {
                    feature_flag: 'show_subscription',
                    $set: { [`$feature_interaction/show_subscription`]: true }
                  });
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
                onClick={() => {
                  posthog.capture('login_signup_clicked', {
                    source: 'header',
                    discount_variant: signupVariant || 'control',
                    has_discount_badge: signupVariant === '10percent' || signupVariant === '15percent'
                  });
                  setShowLoginDialog(true);
                }}
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
            onClick={() => {
              const newTheme = theme === "dark" ? "light" : "dark";
              setTheme(newTheme);
              trackEvent("theme_toggled", { from: theme, to: newTheme });
              posthog.group("ux_choice", `${newTheme}_mode`, { theme: newTheme });
            }}
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
