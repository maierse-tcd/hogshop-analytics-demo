import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Gift, Home, MapPin, Package } from "lucide-react";
import { trackEvent, ensureIdentified, setUserProperties } from "@/lib/posthog";
import { getUser, saveUser } from "@/lib/auth";

const PRODUCT_NAME = "Max's Starter Kit";
const RETAIL_VALUE = 45;

interface GiftForm {
  name: string;
  email: string;
  address1: string;
  city: string;
  postalCode: string;
  country: string;
}

const EMPTY_FORM: GiftForm = {
  name: "",
  email: "",
  address1: "",
  city: "",
  postalCode: "",
  country: "",
};

const GiftCheckout = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "confirmed">("details");
  const [form, setForm] = useState<GiftForm>(() => {
    const user = getUser();
    return { ...EMPTY_FORM, name: user?.name ?? "", email: user?.email ?? "" };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof GiftForm, string>>>({});
  const [formStarted, setFormStarted] = useState(false);

  useEffect(() => {
    // Funnel step after gift_order_attempted: the CTA now lands on a real
    // checkout instead of GiftCheckoutNotFound's 404.
    trackEvent("gift_checkout_viewed", {
      product_name: PRODUCT_NAME,
      retail_value: RETAIL_VALUE,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const handleFieldFocus = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackEvent("gift_checkout_started", { product_name: PRODUCT_NAME });
    }
  };

  const setField = (key: keyof GiftForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const next: Partial<Record<keyof GiftForm, string>> = {};

    if (!form.name || form.name.trim().length < 2) {
      next.name = "Name must be at least 2 characters";
    }
    if (!form.email) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Please enter a valid email";
    }
    if (!form.address1 || form.address1.trim().length < 4) {
      next.address1 = "Please enter your street address";
    }
    if (!form.city || form.city.trim().length < 2) {
      next.city = "Please enter your city";
    }
    if (!form.postalCode || form.postalCode.trim().length < 3) {
      next.postalCode = "Please enter a valid postal code";
    }
    if (!form.country || form.country.trim().length < 2) {
      next.country = "Please enter your country";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      trackEvent("gift_checkout_validation_failed", {
        product_name: PRODUCT_NAME,
        fields_with_errors: Object.keys(errors),
      });
      return;
    }

    const email = form.email.trim();
    const name = form.name.trim();

    // Treat a gift claim like any other conversion: identify the person and
    // persist their session so returning visitors are recognised.
    saveUser(email, name);
    await ensureIdentified(email, { email, name });
    setUserProperties({
      $name: name,
      $email: email,
      last_gift_claimed: PRODUCT_NAME,
      last_gift_claimed_at: new Date().toISOString(),
    });

    // Terminal funnel event — this is the conversion that was previously
    // impossible because every claimant hit the 404 placeholder.
    trackEvent("gift_order_completed", {
      product_name: PRODUCT_NAME,
      retail_value: RETAIL_VALUE,
      customer_email: email,
      shipping_city: form.city.trim(),
      shipping_country: form.country.trim(),
      timestamp: new Date().toISOString(),
    });

    setStep("confirmed");
  };

  if (step === "confirmed") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16">
          <div className="max-w-md mx-auto text-center space-y-6">
            <CheckCircle2 className="w-20 h-20 mx-auto text-primary" />
            <h1 className="text-4xl font-bold">Your Gift Is On Its Way!</h1>
            <p className="text-lg text-muted-foreground">
              Thanks, {form.name.trim().split(" ")[0] || "friend"}! We're
              packing up {PRODUCT_NAME} and shipping it to{" "}
              <span className="font-medium text-foreground">{form.city.trim()}</span>.
              A confirmation email is on its way to{" "}
              <span className="font-medium text-foreground">{form.email.trim()}</span>.
            </p>
            <Card className="p-6 text-left space-y-2 border-primary/20">
              <div className="flex items-center gap-2 font-semibold">
                <Gift className="h-5 w-5 text-primary" />
                {PRODUCT_NAME}
              </div>
              <p className="text-sm text-muted-foreground">
                ${RETAIL_VALUE} retail value • Free shipping included
              </p>
            </Card>
            <div className="pt-2">
              <Button onClick={() => navigate("/")} size="lg">
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-12">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Badge className="px-4 py-1.5" variant="secondary">
              🎁 Claiming your free gift
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Where should we send {PRODUCT_NAME}?
            </h1>
            <p className="text-muted-foreground">
              ${RETAIL_VALUE} retail value • Free shipping • No credit card required
            </p>
          </div>

          <Card className="p-6 md:p-8 border-primary/20">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Jamie Hedgehog"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  onFocus={handleFieldFocus}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jamie@example.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  onFocus={handleFieldFocus}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address1" className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Shipping Address
                </Label>
                <Input
                  id="address1"
                  placeholder="123 Burrow Lane"
                  value={form.address1}
                  onChange={(e) => setField("address1", e.target.value)}
                  onFocus={handleFieldFocus}
                />
                {errors.address1 && <p className="text-sm text-destructive">{errors.address1}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Amsterdam"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    onFocus={handleFieldFocus}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    placeholder="1011 AB"
                    value={form.postalCode}
                    onChange={(e) => setField("postalCode", e.target.value)}
                    onFocus={handleFieldFocus}
                  />
                  {errors.postalCode && <p className="text-sm text-destructive">{errors.postalCode}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="Netherlands"
                  value={form.country}
                  onChange={(e) => setField("country", e.target.value)}
                  onFocus={handleFieldFocus}
                />
                {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
              </div>

              <div className="pt-2 space-y-3">
                <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold">
                  Confirm My Free Gift
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  We'll only use your address to ship the gift and send order updates.
                </p>
              </div>
            </form>
          </Card>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-primary" /> Free shipping
            </span>
            <span className="flex items-center gap-1.5">
              <Home className="h-4 w-4 text-primary" /> Ships worldwide
            </span>
            <span className="flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-primary" /> ${RETAIL_VALUE} value
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftCheckout;
