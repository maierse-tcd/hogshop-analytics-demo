import { Header } from "@/components/Header";
import { useEffect } from "react";
import { trackEvent } from "@/lib/posthog";
import { Package, Truck, Clock, MapPin } from "lucide-react";

const Shipping = () => {
  useEffect(() => {
    trackEvent("page_view", { page: "shipping" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Shipping & Handling</h1>
        
        <div className="grid gap-6 mb-12">
          <div className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="bg-primary/10 p-2 rounded-full h-fit"><Package className="h-5 w-5 text-primary flex-shrink-0" /></div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Hedgebox™ Packaging</h3>
              <p className="text-muted-foreground">
                All items are carefully packed in our signature Hedgebox™ containers, lined with recycled hedgehog affirmations 
                and sealed with love. Each box is personally inspected by our quality assurance team of highly trained hedgehogs.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="bg-primary/10 p-2 rounded-full h-fit"><Truck className="h-5 w-5 text-primary flex-shrink-0" /></div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Shipping Methods</h3>
              <div className="space-y-3 text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Standard Hedgehog Express (5-7 business days)</p>
                  <p className="text-sm">Carried by a relay team of enthusiastic hedgehogs. Free on orders over $50.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Premium Hedgehog Rush (2-3 business days)</p>
                  <p className="text-sm">Our fastest hedgehogs will sprint to your door. $12.99 flat rate.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Overnight Hedgehog Teleportation™ (Next day)</p>
                  <p className="text-sm">Quantum hedgehog technology. $24.99 - Available in select dimensions.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="bg-primary/10 p-2 rounded-full h-fit"><Clock className="h-5 w-5 text-primary flex-shrink-0" /></div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Processing Time</h3>
              <p className="text-muted-foreground">
                Orders are processed within 24 hours, or whenever our hedgehogs wake up from their afternoon nap, 
                whichever comes first. Subscription services are activated immediately because hedgehogs don't sleep when 
                it comes to analytics.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="bg-primary/10 p-2 rounded-full h-fit"><MapPin className="h-5 w-5 text-primary flex-shrink-0" /></div>
            <div>
              <h3 className="font-semibold text-lg mb-2">International Shipping</h3>
              <p className="text-muted-foreground mb-3">
                Yes, we ship internationally — including to <span className="font-medium text-foreground">Canada</span>! 🇨🇦
                Our hedgehog couriers are trained in 47 languages and will navigate any terrain. Delivery times vary by
                location (hedgehogs swim slower than they run) and customs fees may apply.
              </p>
              <p className="text-muted-foreground mb-2">We currently ship to these major markets:</p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm text-muted-foreground mb-3">
                <li>🇺🇸 United States</li>
                <li>🇨🇦 Canada</li>
                <li>🇬🇧 United Kingdom</li>
                <li>🇮🇪 Ireland</li>
                <li>🇦🇺 Australia</li>
                <li>🇳🇿 New Zealand</li>
                <li>🇩🇪 Germany</li>
                <li>🇫🇷 France</li>
                <li>🇳🇱 Netherlands</li>
                <li>🇪🇸 Spain</li>
                <li>🇮🇹 Italy</li>
                <li>🇯🇵 Japan</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Don't see your country? We ship to 100+ destinations worldwide — just ask our support hedgehogs in the
                chat widget (bottom-right corner) for the full list and a shipping quote for your region.
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Tracking Your Order</h2>
            <p className="text-muted-foreground">
              Once shipped, you'll receive a tracking number and live GPS coordinates of the hedgehog carrying your package. 
              You can watch their journey in real-time via our PostHog-powered tracking system. Fun fact: you can see when 
              they stop for snacks!
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changing your shipping address</h2>
            <p className="text-muted-foreground">
              Typed the wrong address, or moving before your hedgehogs arrive? No problem:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
              <li>
                <span className="font-medium text-foreground">Before your order ships</span> — update the delivery
                address from your customer portal under <span className="italic">Orders → Edit shipping</span>, or reply
                to your order confirmation email. Changes made while the order still shows{" "}
                <span className="italic">Processing</span> are applied automatically.
              </li>
              <li>
                <span className="font-medium text-foreground">After your order ships</span> — the hedgehogs are already
                on their way, so we can't redirect them mid-sprint. Message our support team in the chat widget with your
                order number and we'll reroute the delivery or arrange a reshipment.
              </li>
              <li>
                <span className="font-medium text-foreground">Subscription orders</span> — update your saved address in
                the customer portal and every future shipment will go to the new location.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Digital Products</h2>
            <p className="text-muted-foreground">
              Analytics subscriptions and feature flags are delivered instantly via hedgehog telepathy. You'll receive 
              your credentials within seconds of purchase. No physical hedgehogs required (but recommended for moral support).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Damaged Packages</h2>
            <p className="text-muted-foreground">
              In the unlikely event your Hedgebox arrives damaged, please contact us immediately. We'll dispatch a new 
              package via Express Hedgehog and send a formal apology letter signed by the hedgehog responsible for the mishap.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Returns & Exchanges</h2>
            <p className="text-muted-foreground">
              Not satisfied with your hedgehog merchandise? We accept returns within 30 days. The return hedgehog will 
              be sad but understanding. Subscriptions can be cancelled anytime through your customer portal 
              (hedgehogs will judge you slightly).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Shipping Restrictions</h2>
            <p className="text-muted-foreground">
              We cannot ship to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Alternate dimensions where hedgehogs don't exist</li>
              <li>Active volcanoes (our hedgehogs have standards)</li>
              <li>The bottom of the ocean (hedgehogs can't swim that deep)</li>
              <li>Addresses that don't appreciate hedgehog puns</li>
            </ul>
          </section>

          <p className="text-sm text-muted-foreground italic mt-8 pt-8 border-t">
            Questions? Our hedgehog support team is standing by (or napping, it's honestly 50/50).
          </p>
        </div>
      </div>
    </div>
  );
};

export default Shipping;
