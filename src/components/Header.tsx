import { Moon, Sun, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { CartDrawer } from "./CartDrawer";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { LoginDialog } from "./LoginDialog";
import { posthog } from "@/lib/posthog";
import { useFeatureFlagEnabled } from "posthog-js/react";

export const Header = () => {
  const { theme, setTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const signupVariant = posthog.getFeatureFlag('increase_signup');

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              HogShop
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Shop
            </Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link to="/shipping" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Shipping
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden md:inline">
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
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 animate-pulse">
                  <span className="text-xs font-medium text-primary">
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
      </div>
    </header>
  );
};
