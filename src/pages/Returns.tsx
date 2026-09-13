import { Header } from "@/components/Header";
import { useEffect } from "react";
import { trackEvent } from "@/lib/posthog";
import { RotateCcw, PackageCheck, Wallet, RefreshCw } from "lucide-react";

const Returns = () => {
  useEffect(() => {
    trackEvent("page_view", { page: "returns" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Returns & Exchanges</h1>
        <p className="text-muted-foreground mb-12">
          Not happy with your hedgehog haul? Here is exactly how to send it back or swap it.
        </p>

        <div className="grid gap-6 mb-12">
          <div className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="bg-primary/10 p-2 rounded-full h-fit"><RotateCcw className="h-5 w-5 text-primary flex-shrink-0" /></div>
            <div>
              <h3 className="font-semibold text-lg mb-2">30-Day Returns</h3>
              <p className="text-muted-foreground">
                We accept returns on physical merchandise within 30 days of delivery, no questions asked
                (though we might ask how the hedgehogs feel). Items should be unused and in their original Hedgebox™ packaging.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="bg-primary/10 p-2 rounded-full h-fit"><RefreshCw className="h-5 w-5 text-primary flex-shrink-0" /></div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Exchanges</h3>
              <p className="text-muted-foreground">
                Wrong size or want a different item? We are happy to exchange it within the same 30-day window.
                Start an exchange and our hedgehogs will ready the replacement while your original item travels back.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="bg-primary/10 p-2 rounded-full h-fit"><Wallet className="h-5 w-5 text-primary flex-shrink-0" /></div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Refunds</h3>
              <p className="text-muted-foreground">
                Once we receive and inspect your return, we refund the original payment method within 5-7 business days.
                Original shipping charges are not refundable, but return shipping on faulty items is on us.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="bg-primary/10 p-2 rounded-full h-fit"><PackageCheck className="h-5 w-5 text-primary flex-shrink-0" /></div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Subscriptions</h3>
              <p className="text-muted-foreground">
                Analytics and food subscriptions can be cancelled anytime from your customer portal. You keep access
                until the end of the current billing period (the hedgehogs will be sad but they will get over it).
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">How to Start a Return</h2>
            <ol className="list-decimal list-inside text-muted-foreground space-y-2 ml-4">
              <li>Reply to your order confirmation email or contact our support team with your order number.</li>
              <li>Tell us which items you want to return or exchange, and why.</li>
              <li>We send a prepaid return label and a hedgehog-safe packing guide.</li>
              <li>Drop off the parcel and watch its journey home via our PostHog-powered tracking.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Damaged or Wrong Items</h2>
            <p className="text-muted-foreground">
              If your Hedgebox arrives damaged or holds the wrong item, contact us right away. We dispatch a
              replacement via Express Hedgehog at no cost and send a formal apology letter signed by the hedgehog responsible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">What We Cannot Accept</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Perishable treats and food that has been opened</li>
              <li>Items returned after the 30-day window</li>
              <li>Products missing their original Hedgebox™ packaging</li>
              <li>Live hedgehogs (we do not sell those, but people keep asking)</li>
            </ul>
          </section>

          <p className="text-sm text-muted-foreground italic mt-8 pt-8 border-t">
            Questions about a return? Our hedgehog support team is standing by (or napping, it is honestly 50/50).
          </p>
        </div>
      </div>
    </div>
  );
};

export default Returns;
