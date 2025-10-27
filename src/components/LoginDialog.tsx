import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { identifyUser, setUserProperties, trackEvent } from "@/lib/posthog";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: (email: string, name: string) => void;
  discountPercent?: number;
}

export const LoginDialog = ({ open, onOpenChange, onLoginSuccess, discountPercent }: LoginDialogProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  const handleLogin = () => {
    if (email && name) {
      // Store in localStorage (using same keys for consistency)
      localStorage.setItem("user_email", email);
      localStorage.setItem("user_name", name);
      // Also store in hedgehog_user format for checkout compatibility
      localStorage.setItem("hedgehog_user", JSON.stringify({ email, name }));
      
      // Identify in PostHog
      identifyUser(email, { name, email });
      
      onLoginSuccess(email, name);
      onOpenChange(false);
      setEmail("");
      setName("");
    }
  };

  const handleSignup = () => {
    if (email && name) {
      // Store in localStorage (using same keys for consistency)
      localStorage.setItem("user_email", email);
      localStorage.setItem("user_name", name);
      // Also store in hedgehog_user format for checkout compatibility
      localStorage.setItem("hedgehog_user", JSON.stringify({ email, name }));
      
      // Identify in PostHog and set signup properties
      identifyUser(email, { 
        name, 
        email,
        signup_discount_percent: discountPercent || 0,
        signup_date: new Date().toISOString()
      });

      // Set user properties for the discount
      if (discountPercent) {
        setUserProperties({
          initial_signup_discount: discountPercent,
          signup_experiment_variant: `${discountPercent}percent`
        });
      }

      // Track signup event
      trackEvent('user_signed_up', {
        discount_percent: discountPercent || 0,
        experiment_variant: discountPercent ? `${discountPercent}percent` : 'control'
      });
      
      onLoginSuccess(email, name);
      onOpenChange(false);
      setEmail("");
      setName("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to HogShop!</DialogTitle>
          <DialogDescription>
            {discountPercent ? (
              <span className="text-primary font-medium">
                🎉 Get {discountPercent}% off your first order when you sign up!
              </span>
            ) : (
              "Login or create an account to continue"
            )}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">
              Sign Up
              {discountPercent && <span className="ml-1 text-xs">({discountPercent}% off)</span>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="login-name">Name</Label>
              <Input
                id="login-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleLogin} className="w-full" disabled={!email || !name}>
              Login
            </Button>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4 mt-4">
            {discountPercent && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                <p className="text-sm font-medium text-primary">
                  🎁 {discountPercent}% discount will be applied to your first order!
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="signup-name">Name</Label>
              <Input
                id="signup-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleSignup} className="w-full" disabled={!email || !name}>
              Sign Up {discountPercent && `& Get ${discountPercent}% Off`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
