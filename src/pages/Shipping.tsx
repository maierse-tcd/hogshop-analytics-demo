import { Header } from "@/components/Header";
import { useEffect } from "react";
import { trackEvent } from "@/lib/posthog";
import { Package, Truck, Clock, MapPin, Globe, Mail, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

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
            <div className="bg-primary/10 p-2 rounded-full h-fit"><Globe className="h-5 w-5 text-primary flex-shrink-0" /></div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Where We Ship</h3>
              <p className="text-muted-foreground mb-3">
                Our international hedgehog couriers are trained in 47 languages and will navigate any terrain. Here's
                exactly where they'll go:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">🇺🇸 United States</span> — all 50 states, plus Puerto
                  Rico and other US territories.
                </li>
                <li>
                  <span className="font-medium text-foreground">🇨🇦 Canada</span> — yes, we ship to Canada! All
                  provinces and territories. Delivery adds 2-4 business days at the border while our hedgehogs clear
                  customs.
                </li>
                <li>
                  <span className="font-medium text-foreground">🌍 International</span> — we ship to most countries
                  worldwide. Delivery times vary by location (hedgehogs swim slower than they run) and typically add
                  5-10 business days.
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                For orders shipped outside the US, any import duties, taxes, or customs fees charged on arrival are the
                recipient's responsibility. A handful of destinations are off-limits — see Shipping Restrictions below.
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" /> Order Confirmation & Tracking
            </h2>
            <p className="text-muted-foreground">
              Here's exactly what lands in your inbox and when:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-3">
              <li>
                <span className="font-medium text-foreground">Order confirmation email</span> — sent immediately after
                checkout, with your order number and receipt. If it hasn't arrived within a few minutes, check your spam
                folder and confirm the email address on your order is correct.
              </li>
              <li>
                <span className="font-medium text-foreground">Shipping &amp; tracking email</span> — sent the moment your
                order leaves the burrow (typically within 24 hours of ordering; see Processing Time above). It includes a
                tracking number and live GPS coordinates of the hedgehog carrying your package.
              </li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Ordered more than 2 business days ago and still no tracking email? First check your spam folder, then reach
              out to our support team with your order number and we'll track down your hedgehog. Digital products
              (analytics subscriptions and feature flags) don't ship physically — see Digital Products below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="h-6 w-6 text-primary" /> Changing Your Shipping Address
            </h2>
            <p className="text-muted-foreground">
              Sent your Hedgebox to the wrong den? You can change the shipping address on an order within
              <span className="font-medium text-foreground"> 24 hours of placing it</span>, as long as it hasn't shipped
              yet. Contact our support team with your order number and the corrected address and we'll reroute the
              hedgehogs. Once an order has shipped (you'll know from the tracking email above), the address is locked in
              and can't be changed — but if it's returned to us undelivered, we'll happily re-send it to the right place.
            </p>
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

          <p className="text-sm text-muted-foreground mt-8 pt-8 border-t">
            Still stuck? Check our <Link to="/faq" className="text-primary underline underline-offset-4 hover:no-underline">FAQ</Link> or
            message our hedgehog support team with your order number — they're standing by (or napping, it's honestly 50/50).
          </p>
        </div>
      </div>
    </div>
  );
};

export default Shipping;
