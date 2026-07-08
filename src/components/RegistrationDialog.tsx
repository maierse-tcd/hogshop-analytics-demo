import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { Mail, User, Building2 } from "lucide-react";
import { trackEvent, slugifyCompany } from "@/lib/posthog";

interface RegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (email: string, name: string, companyName?: string) => void;
}

export const RegistrationDialog = ({ open, onOpenChange, onComplete }: RegistrationDialogProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isCompanyPurchase, setIsCompanyPurchase] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [formStarted, setFormStarted] = useState(false);

  useEffect(() => {
    if (open) {
      trackEvent("registration_form_opened", { source: "checkout" });
      setFormStarted(false);
    }
  }, [open]);

  const handleInputFocus = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackEvent("registration_form_started", { source: "checkout" });
    }
  };
  const [errors, setErrors] = useState<{ email?: string; name?: string; companyName?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; name?: string; companyName?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!name || name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (isCompanyPurchase && (!companyName || companyName.trim().length < 2)) {
      newErrors.companyName = "Company name must be at least 2 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      const trimmedCompany = isCompanyPurchase ? companyName.trim() : undefined;
      const icpType = trimmedCompany ? "B2B" : "B2C";
      trackEvent("registration_form_submitted", {
        source: "checkout",
        timestamp: new Date().toISOString(),
        icp_type: icpType,
        ...(trimmedCompany ? { company_name: trimmedCompany, company_key: slugifyCompany(trimmedCompany) } : {}),
      });
      onComplete(email.trim(), name.trim(), trimmedCompany);
      setEmail("");
      setName("");
      setCompanyName("");
      setIsCompanyPurchase(false);
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Complete Your Order</DialogTitle>
          <p className="text-muted-foreground">
            Please provide your details to continue to checkout
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={handleInputFocus}
                className="pl-10"
              />
            </div>
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={handleInputFocus}
                className="pl-10"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="company-purchase"
              checked={isCompanyPurchase}
              onCheckedChange={(checked) => setIsCompanyPurchase(checked === true)}
            />
            <Label htmlFor="company-purchase" className="text-sm font-normal cursor-pointer">
              I'm buying for a company
            </Label>
          </div>

          {isCompanyPurchase && (
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-name"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onFocus={handleInputFocus}
                  className="pl-10"
                />
              </div>
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName}</p>
              )}
            </div>
          )}

          <div className="pt-4 space-y-3">
            <Button type="submit" className="w-full" size="lg">
              Continue to Checkout
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              We'll use this information to send you order updates
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
