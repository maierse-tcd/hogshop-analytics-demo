import { Header } from "@/components/Header";
import { useEffect } from "react";
import { trackEvent } from "@/lib/posthog";

const Terms = () => {
  useEffect(() => {
    trackEvent("page_view", { page: "terms" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms & Conditions</h1>
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms (Featuring Posthoggy™)</h2>
            <p className="text-muted-foreground">
              By accessing HogShop, you acknowledge that Posthoggy™, our beloved mascot, has personally approved your presence. 
              Posthoggy reserves the right to revoke approval at any time, especially if you don't appreciate hedgehogs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. The Hedgebox Guarantee™</h2>
            <p className="text-muted-foreground">
              All products are shipped in our proprietary Hedgebox™ packaging. Each box is inspected by a committee of hedgehogs 
              to ensure maximum cuteness upon delivery. If your Hedgebox arrives without at least 47 hedgehog-themed stickers, 
              please contact our support team immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Analytics Tracking (We See Everything)</h2>
            <p className="text-muted-foreground">
              By using HogShop, you agree that PostHog will track every click, scroll, and existential crisis you experience 
              while shopping. This data is used exclusively to make Posthoggy feel important and to improve your shopping experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Product Authenticity</h2>
            <p className="text-muted-foreground">
              All merchandise is 100% hedgehog-approved. Our plushies are made from ethically-sourced cuteness. 
              No actual hedgehogs were harmed in the making of these products (though several were mildly inconvenienced).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Subscription Services</h2>
            <p className="text-muted-foreground">
              Our analytics subscriptions come with unlimited hedgehog puns in your dashboard. Feature flags may occasionally 
              deploy hedgehog-themed easter eggs. Session recordings will include commentary from Posthoggy (psychically transmitted).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              HogShop is not responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Excessive happiness caused by hedgehog merchandise</li>
              <li>Data-driven decisions that lead to world domination</li>
              <li>Spontaneous urges to adopt a hedgehog after visiting our store</li>
              <li>Hedgebox hoarding syndrome</li>
              <li>Posthoggy appearing in your dreams</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Privacy & Data</h2>
            <p className="text-muted-foreground">
              Your data is protected by state-of-the-art hedgehog encryption™. Only authorized hedgehogs and PostHog engineers 
              have access to your information. We do not sell your data, but Posthoggy might gossip about your cart contents 
              with other hedgehogs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Dispute Resolution</h2>
            <p className="text-muted-foreground">
              Any disputes will be resolved through hedgehog mediation. Both parties must present their case to a panel of 
              three hedgehogs who will deliver a verdict based on cuteness metrics and snack availability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Modifications to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to update these terms whenever Posthoggy deems necessary. You will be notified via 
              hedgehog telepathy or email, whichever comes first.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these terms, please send a hand-written letter to Posthoggy at PostHog headquarters. 
              Response time: 3-5 business days or whenever Posthoggy finishes napping.
            </p>
          </section>

          <p className="text-sm text-muted-foreground italic mt-8 pt-8 border-t">
            Last updated: When Posthoggy last rolled over in their sleep (recently)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
