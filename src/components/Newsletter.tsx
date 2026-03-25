import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trackEvent } from "@/lib/posthog";

interface NewsletterProps {
  variant?: "card" | "banner";
  onSubscribed?: (email: string) => void;
}

export const Newsletter = ({ variant = "card", onSubscribed }: NewsletterProps) => {
  const [email, setEmail] = useState("");
  const formStartedRef = useRef(false);

  const handleEmailFocus = () => {
    if (!formStartedRef.current) {
      formStartedRef.current = true;
      trackEvent("newsletter_form_started", {
        source: variant === "banner" ? "hero_banner" : "newsletter_card",
        variant,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      trackEvent("newsletter_subscribed", { 
        email, 
        source: variant === "banner" ? "hero_banner" : "newsletter_card",
        variant,
        subscribed_at: new Date().toISOString()
      });
      toast.success("Thanks for subscribing! Check your inbox for your 15% discount code.");
      localStorage.setItem("newsletter_subscribed", "true");
      onSubscribed?.(email);
      setEmail("");
    }
  };

  if (variant === "banner") {
    return (
      <div className="mt-8 max-w-xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-primary/10 border border-primary/30 rounded-full p-2 flex gap-2 items-center backdrop-blur-sm">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={handleEmailFocus}
            required
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10"
          />
          <Button type="submit" size="lg" className="rounded-full whitespace-nowrap px-6">
            🎉 Get 15% Off
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 max-w-2xl mx-auto">
      <div className="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold mb-3">
        🎉 15% OFF Your First Order
      </div>
      <h3 className="text-2xl font-bold text-center mb-2">
        Join Our Hedgehog Community
      </h3>
      <p className="text-muted-foreground text-center mb-6">
        Get exclusive tips, discounts, and hedgehog care advice delivered to your inbox
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={handleEmailFocus}
          required
          className="flex-1"
        />
        <Button type="submit">Subscribe</Button>
      </form>
    </div>
  );
};
