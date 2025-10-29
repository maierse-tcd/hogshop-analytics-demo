import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { trackEvent } from "@/lib/posthog";
import { Gift, Package, Heart, ShieldCheck } from "lucide-react";

const GiftLanding = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("gift_page_viewed", {
      referrer: document.referrer,
      product_name: "Max's Starter Kit",
      timestamp: new Date().toISOString(),
    });
  }, []);

  const handleClaimGift = () => {
    trackEvent("gift_order_attempted", {
      product_name: "Max's Starter Kit",
      intended_destination: "/checkout/gift",
      retail_value: 45,
      timestamp: new Date().toISOString(),
    });
    navigate("/checkout/gift");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-12 md:py-20">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <Badge className="text-lg px-6 py-2" variant="secondary">
              🎁 Limited Time Free Gift
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Get Max's Starter Kit
              <br />
              <span className="text-primary">Absolutely Free</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything your new hedgehog needs to feel at home. $45 retail value - yours for free!
            </p>
          </div>

          {/* Product Showcase */}
          <Card className="p-8 md:p-12 space-y-8 border-primary/20">
            <div className="aspect-video bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 rounded-lg flex items-center justify-center">
              <Gift className="h-32 w-32 text-primary/40" />
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl font-bold">What's Included:</h2>
              <ul className="grid gap-4 md:grid-cols-2">
                <li className="flex items-start gap-3">
                  <Package className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Premium Bedding Sample</p>
                    <p className="text-sm text-muted-foreground">Soft, safe, and comfortable</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Package className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Nutritious Food Starter</p>
                    <p className="text-sm text-muted-foreground">Balanced diet for healthy growth</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Package className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Mini Hideout Cave</p>
                    <p className="text-sm text-muted-foreground">Perfect privacy spot</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Package className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Care Guide Booklet</p>
                    <p className="text-sm text-muted-foreground">Expert tips for new owners</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-6 pt-6 border-t">
              <div className="text-center space-y-2">
                <Heart className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-semibold">Perfect for New Owners</h3>
                <p className="text-sm text-muted-foreground">Start your hedgehog journey right</p>
              </div>
              <div className="text-center space-y-2">
                <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-semibold">Quality Guaranteed</h3>
                <p className="text-sm text-muted-foreground">Premium products Max approved</p>
              </div>
              <div className="text-center space-y-2">
                <Gift className="h-8 w-8 text-primary mx-auto" />
                <h3 className="font-semibold">$45 Value</h3>
                <p className="text-sm text-muted-foreground">Free shipping included</p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-6">
              <Button 
                size="lg" 
                className="h-14 px-12 text-lg font-semibold"
                onClick={handleClaimGift}
              >
                Claim Your Free Gift Now
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                No credit card required • While supplies last
              </p>
            </div>
          </Card>

          {/* Social Proof */}
          <div className="text-center space-y-4 pt-6">
            <p className="text-muted-foreground">Join 2,847 happy hedgehog owners who started with Max's Starter Kit</p>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-2xl">⭐</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftLanding;
