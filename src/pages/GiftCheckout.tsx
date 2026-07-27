import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackEvent, ensureIdentified, setUserProperties } from "@/lib/posthog";
import { getUser, saveUser } from "@/lib/auth";
import { Gift, Package, User, Mail, MapPin, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

const GIFT_NAME = "Max's Starter Kit";
const GIFT_VALUE = 45;

const GIFT_CONTENTS = [
  "Premium Bedding Sample",
  "Nutritious Food Starter",
  "Mini Hideout Cave",
  "Care Guide Booklet",
];

type Step = "form" | "done";

// Real gift checkout for the free "Max's Starter Kit" claim. The CTA on
// /gift (and the homepage promo) navigates here. It's a free gift, so there's
// no payment step — we collect shipping details, record the completed claim
// (gift_order_completed), then show a confirmation.
const GiftCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);

  const existing = getUser();
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    address?: string;
    city?: string;
    postalCode?: string;
  }>({});

  useEffect(() => {
    trackEvent("gift_checkout_viewed", {
      product_name: GIFT_NAME,
      retail_value: GIFT_VALUE,
      route: location.pathname,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    });
  }, [location.pathname]);

  const validateForm = () => {
    const next: typeof errors = {};

    if (!name || name.trim().length < 2) {
      next.name = "Name must be at least 2 characters";
    }
    if (!email) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "Please enter a valid email";
    }
    if (!address || address.trim().length < 4) {
      next.address = "Please enter your shipping address";
    }
    if (!city || city.trim().length < 2) {
      next.city = "Please enter your city";
    }
    if (!postalCode || postalCode.trim().length < 3) {
      next.postalCode = "Please enter your postal code";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!validateForm()) return;

    setSubmitting(true);
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    try {
      saveUser(trimmedEmail, trimmedName, existing?.companyName);
      await ensureIdentified(trimmedEmail, {
        email: trimmedEmail,
        name: trimmedName,
      });

      trackEvent("gift_order_completed", {
        product_name: GIFT_NAME,
        retail_value: GIFT_VALUE,
        shipping_city: city.trim(),
        shipping_postal_code: postalCode.trim(),
        timestamp: new Date().toISOString(),
      });

      setUserProperties({
        last_gift_claimed: GIFT_NAME,
        last_gift_claimed_at: new Date().toISOString(),
      });

      setStep("done");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16">
          <div className="max-w-md mx-auto text-center space-y-6">
            <CheckCircle2 className="w-20 h-20 mx-auto text-primary" />
            <h1 className="text-4xl font-bold">Your Free Gift Is On Its Way!</h1>
            <p className="text-lg text-muted-foreground">
              Thanks, {name.trim()}! We've reserved <span className="font-semibold">{GIFT_NAME}</span> for you
              and sent a confirmation to <span className="font-semibold">{email.trim()}</span>. It'll ship to
              your address with free delivery.
            </p>
            <div className="pt-4">
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
        <div className="max-w-2xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate("/gift")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to gift details
          </Button>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Gift className="h-8 w-8 text-primary" />
              Claim Your Free Gift
            </h1>
            <p className="text-muted-foreground">
              Tell us where to ship <span className="font-semibold">{GIFT_NAME}</span> — a ${GIFT_VALUE} value,
              yours free. No credit card required.
            </p>
          </div>

          {/* Gift summary */}
          <Card className="p-6 border-primary/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-full">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{GIFT_NAME}</p>
                <p className="text-sm text-muted-foreground">Free shipping included • ${GIFT_VALUE} value</p>
              </div>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 pt-2 border-t">
              {GIFT_CONTENTS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Shipping form */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Shipping details</h2>
            <form onSubmit={handleSubmit} className="space-y-4" data-attr="gift-checkout-form">
              <div className="space-y-2">
                <Label htmlFor="gift-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="gift-name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gift-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="gift-email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gift-address">Shipping Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="gift-address"
                    placeholder="123 Hedgehog Lane"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gift-city">City</Label>
                  <Input
                    id="gift-city"
                    placeholder="Amsterdam"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gift-postal">Postal Code</Label>
                  <Input
                    id="gift-postal"
                    placeholder="1011 AB"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                  {errors.postalCode && <p className="text-sm text-destructive">{errors.postalCode}</p>}
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={submitting}
                  data-attr="gift-checkout-submit"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Claiming your gift…
                    </>
                  ) : (
                    "Claim My Free Gift"
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  No credit card required • While supplies last
                </p>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GiftCheckout;
