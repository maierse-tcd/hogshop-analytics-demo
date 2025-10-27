import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trackEvent } from "@/lib/posthog";

export const Newsletter = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      trackEvent("newsletter_signup", { email });
      toast.success("Thanks for subscribing!");
      setEmail("");
    }
  };

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
          required
          className="flex-1"
        />
        <Button type="submit">Subscribe</Button>
      </form>
    </div>
  );
};
