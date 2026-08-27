import { Moon, Sun, LogIn, LogOut, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { CartDrawer } from "./CartDrawer";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { LoginDialog } from "./LoginDialog";
import { SubscriptionManagementDialog } from "./SubscriptionManagementDialog";
import { SubscriptionChoiceDialog } from "./SubscriptionChoiceDialog";
import { supabase } from "@/integrations/supabase/client";
import { posthog, trackEvent, identifyUser, applyCompanyGroup } from "@/lib/posthog";
import { useFeatureFlagEnabled, useFeatureFlagVariantKey } from "posthog-js/react";
import { getUser, clearUser } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Header = () => {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showSubscriptionChoice, setShowSubscriptionChoice] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState<boolean | null>(null);
  const [subCheckLoading, setSubCheckLoading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const signupVariant = useFeatureFlagVariantKey('increase_sales_cta');
  const halloweenMode = useFeatureFlagEnabled('hero_banner_halloween');
  const showLiveNav = useFeatureFlagEnabled('show_live_navbar');



  // Feature flag tracking is handled automatically by the PostHog SDK

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
      if (user.companyName) {
        applyCompanyGroup(user.companyName);
      } else {
        posthog.setPersonProperties({ icp_type: "B2C" });
      }

      posthog.reloadFeatureFlags();
      if (import.meta.env.DEV) console.log("Header: User logged in, reloading feature flags", { email: user.email });
    } else {
      setIsLoggedIn(false);
      setUserName("");
    }
  }, [location, isLoggedIn]);

  const handleLogout = () => {
    if (import.meta.env.DEV) console.log("Header: handleLogout called");
    trackEvent("user_logged_out", {
      timestamp: new Date().toISOString(),
    });
    clearUser();
    posthog.reset();
    posthog.reloadFeatureFlags();
    setIsLoggedIn(false);
    setUserName("");
    if (import.meta.env.DEV) console.log("Header: User logged out, flags reloaded");
    navigate("/");
  };

  const handleLoginSuccess = (email: string, name: string) => {
    setIsLoggedIn(true);
    setUserName(name);
  };

  const navItems = [
    { to: "/", label: "Shop", emoji: "🛒" },
    { to: "/about", label: "About", emoji: "🦔" },
    { to: "/faq", label: "FAQ", emoji: "❓" },
    { to: "/shipping", label: "Shipping", emoji: "📦" },
    ...(showLiveNav === true ? [{ to: "/live", label: "Live stats", emoji: "📈" }] : []),
  ];

  return (
    <header className={`sticky top-0 z-50 w-full border-b backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 ${
      halloweenMode 
        ? 'bg-gradient-to-r from-[hsl(var(--halloween-dark))] via-[hsl(var(--halloween-purple))]/40 to-[hsl(var(--halloween-dark))]/95 border-[hsl(var(--halloween-orange))]/30' 
        : 'bg-background/85 shadow-xs'
    }`}>
      {halloweenMode && (
        <>
          <div className="absolute top-0 right-10 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>🦇</div>
          <div className="absolute top-0 left-[15%] text-xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>🕷️</div>
          <div className="absolute top-0 right-[30%] text-2xl animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}>🎃</div>
        </>
      )}
      <div className="container flex h-16 items-center justify-between gap-3 relative">
        <div className="flex items-center gap-6 lg:gap-10 min-w-0">
          {/* Mobile nav */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full -ml-2"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="px-6 py-5 border-b">
                <span className="font-display text-xl font-bold text-primary">HogShop</span>
              </div>
              <nav className="flex flex-col p-3">
                {navItems.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileNavOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      location.pathname === to
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" data-attr="brand-logo" className="flex items-center gap-2 shrink-0">
            <span className={`font-display text-xl sm:text-2xl font-bold tracking-tight ${
              halloweenMode 
                ? 'bg-gradient-to-r from-[hsl(var(--halloween-orange))] to-[hsl(var(--halloween-purple))] bg-clip-text text-transparent drop-shadow-[0_0_10px_hsl(var(--halloween-orange))]' 
                : 'text-primary'
            }`}>
              {halloweenMode ? '👻 HogShop 🎃' : 'HogShop'}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, emoji }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    halloweenMode
                      ? isActive
                        ? 'text-[hsl(var(--halloween-orange))]'
                        : 'text-[hsl(var(--halloween-orange))]/80 hover:text-[hsl(var(--halloween-orange))]'
                      : isActive
                        ? 'text-foreground bg-muted'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {halloweenMode ? `${emoji} ${label}` : label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <DropdownMenu
                onOpenChange={(isOpen) => {
                  // Check subscription only when dropdown opens for the first time.
                  // Synthetic traffic makes per-pageview checks too expensive (hits Stripe).
                  if (!isOpen || isSubscriber !== null || subCheckLoading) return;
                  const user = getUser();
                  if (!user?.email) {
                    setIsSubscriber(false);
                    return;
                  }
                  setSubCheckLoading(true);
                  supabase.functions
                    .invoke("check-subscription", { body: { email: user.email } })
                    .then(({ data, error }) => {
                      if (error) {
                        console.error("check-subscription failed", error);
                        setIsSubscriber(false);
                      } else {
                        setIsSubscriber(!!data?.subscribed);
                      }
                    })
                    .catch((err) => {
                      console.error("check-subscription error", err);
                      setIsSubscriber(false);
                    })
                    .finally(() => setSubCheckLoading(false));
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-attr="account-menu-trigger" className="gap-1.5 rounded-full px-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
                      {(userName || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className={`text-sm hidden md:inline max-w-[10rem] truncate ${
                      halloweenMode ? 'text-[hsl(var(--halloween-orange))]' : 'text-muted-foreground'
                    }`}>
                      {userName}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isSubscriber === null ? (
                    <DropdownMenuItem disabled>
                      {subCheckLoading ? "Checking subscription…" : "Checking subscription…"}
                    </DropdownMenuItem>
                  ) : isSubscriber ? (
                    <DropdownMenuItem data-attr="menu-cancel-subscription" onClick={() => setShowSubscriptionDialog(true)}>
                      Cancel Subscription
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem data-attr="menu-choose-subscription" onClick={() => setShowSubscriptionChoice(true)}>
                      Choose a Subscription
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-attr="menu-logout" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              {(signupVariant === '10percent' || signupVariant === '15percent') && (
                <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border ${
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
              <Button
                variant="outline"
                size="sm"
                data-attr="header-login"
                onClick={() => {
                  posthog.capture('login_signup_clicked', {
                    source: 'header',
                    discount_variant: signupVariant || 'control',
                    has_discount_badge: signupVariant === '10percent' || signupVariant === '15percent'
                  });
                  setShowLoginDialog(true);
                }}
                className="gap-2 rounded-full"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden md:inline">Login/Signup</span>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
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
          onCancelled={() => setIsSubscriber(false)}
        />
        <SubscriptionChoiceDialog
          open={showSubscriptionChoice}
          onOpenChange={setShowSubscriptionChoice}
        />
      </div>
    </header>
  );
};
