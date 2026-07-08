import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { identifyUser, setUserProperties, trackEvent, initializeCLTV, applyCompanyGroup, slugifyCompany, posthog } from "@/lib/posthog";
import { saveUser } from "@/lib/auth";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: (email: string, name: string) => void;
  discountPercent?: number;
}

export const LoginDialog = ({ open, onOpenChange, onLoginSuccess, discountPercent }: LoginDialogProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isCompanyPurchase, setIsCompanyPurchase] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  const resolveCompany = () => {
    const trimmed = isCompanyPurchase ? companyName.trim() : "";
    return trimmed.length >= 2 ? trimmed : "";
  };

  const handleLogin = () => {
    if (email && name) {
      // Preserve any previously stored companyName for this device so we can
      // re-apply the company group after saveUser. Do NOT write icp_type on
      // login — the login tab has no company field, so overwriting would
      // downgrade a returning B2B user to "B2C".
      const priorCompany = getUser()?.companyName;
      saveUser(email, name, priorCompany);

      identifyUser(email, { name, email });
      if (priorCompany) {
        applyCompanyGroup(priorCompany);
      }
      initializeCLTV();

      trackEvent('user_logged_in', {
        login_method: 'email',
        timestamp: new Date().toISOString(),
      });

      onLoginSuccess(email, name);
      onOpenChange(false);
      setEmail("");
      setName("");
    }
  };

  const handleSignup = () => {
    if (!email || !name) return;
    if (isCompanyPurchase && companyName.trim().length < 2) return;

    const company = resolveCompany();
    saveUser(email, name, company || undefined);

    // Identify FIRST so subsequent group + events attach to the right person.
    identifyUser(email, {
      name,
      email,
      signup_discount_percent: discountPercent || 0,
      signup_date: new Date().toISOString(),
    });

    if (company) {
      applyCompanyGroup(company);
    } else {
      posthog.setPersonProperties({ icp_type: "B2C" });
    }

    if (discountPercent) {
      setUserProperties({
        initial_signup_discount: discountPercent,
        signup_experiment_variant: `${discountPercent}percent`,
      });
    }

    trackEvent('user_signed_up', {
      discount_percent: discountPercent || 0,
      experiment_variant: discountPercent ? `${discountPercent}percent` : 'control',
      icp_type: company ? "B2B" : "B2C",
      ...(company ? { company_name: company, company_key: slugifyCompany(company) } : {}),
    });

    initializeCLTV();

    onLoginSuccess(email, name);
    onOpenChange(false);
    setEmail("");
    setName("");
    setCompanyName("");
    setIsCompanyPurchase(false);
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="signup-company-purchase"
                checked={isCompanyPurchase}
                onCheckedChange={(checked) => setIsCompanyPurchase(checked === true)}
              />
              <Label htmlFor="signup-company-purchase" className="text-sm font-normal cursor-pointer">
                I'm buying for a company
              </Label>
            </div>

            {isCompanyPurchase && (
              <div className="space-y-2">
                <Label htmlFor="signup-company-name">Company Name</Label>
                <Input
                  id="signup-company-name"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={handleSignup}
              className="w-full"
              disabled={!email || !name || (isCompanyPurchase && companyName.trim().length < 2)}
            >
              Sign Up {discountPercent && `& Get ${discountPercent}% Off`}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
