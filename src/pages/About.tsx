import { Header } from "@/components/Header";
import { useEffect } from "react";
import { trackEvent } from "@/lib/posthog";
import { Badge } from "@/components/ui/badge";

const About = () => {
  useEffect(() => {
    trackEvent("page_view", { page: "about" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16 max-w-4xl">
        <div className="text-center mb-12">
          <Badge className="mb-4">Est. 2025</Badge>
          <h1 className="text-5xl font-bold mb-4">
            About{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              HogShop
            </span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Where analytics meets adorable
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-3xl font-semibold mb-4">Our Story</h2>
            <p className="text-muted-foreground text-lg">
              HogShop was born from a simple question: "What if we combined the analytical power of PostHog with the 
              undeniable cuteness of hedgehogs?" The answer? Pure magic.
            </p>
            <p className="text-muted-foreground text-lg">
              Founded by a team of data enthusiasts and hedgehog admirers, we set out to create the world's first 
              hedgehog-themed e-commerce platform powered by real-time analytics. Today, HogShop serves as both a 
              demonstration of PostHog's capabilities and a testament to what's possible when you follow your hedgehog dreams.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Meet Posthoggy</h2>
            <div className="flex gap-6 items-start p-6 rounded-lg border bg-card">
              <div className="text-6xl flex-shrink-0">🦔</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Posthoggy - Chief Hedgehog Officer</h3>
                <p className="text-muted-foreground">
                  Posthoggy isn't just our mascot – they're the soul of HogShop. With a degree in Cuteness Studies and 
                  a minor in Data Analytics, Posthoggy oversees everything from product quality to customer happiness. 
                  When not approving new merchandise designs, you'll find them analyzing user behavior patterns or napping 
                  (data analysis is exhausting).
                </p>
                <p className="text-muted-foreground mt-3">
                  <strong>Fun fact:</strong> Posthoggy's favorite metric is "hedgehogs per session" and insists it should 
                  be tracked on every website.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Our Mission</h2>
            <p className="text-muted-foreground text-lg">
              To demonstrate the power of product analytics through an engaging, hedgehog-themed shopping experience. 
              We believe that understanding your users shouldn't be boring – it should be as delightful as discovering 
              a hedgehog in your garden.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">What We Do</h2>
            <div className="grid gap-4">
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold text-lg mb-2">Premium Merchandise</h3>
                <p className="text-muted-foreground">
                  Every product is designed with love and inspected by our quality assurance team of highly trained hedgehogs. 
                  From plushies to hoodies, each item embodies the HogShop spirit of quality and cuteness.
                </p>
              </div>
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold text-lg mb-2">Analytics Subscriptions</h3>
                <p className="text-muted-foreground">
                  Access PostHog's powerful analytics platform through our subscription plans. Track user behavior, 
                  run A/B tests, deploy feature flags, and watch session replays – all while being supported by hedgehogs.
                </p>
              </div>
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold text-lg mb-2">Demo Environment</h3>
                <p className="text-muted-foreground">
                  HogShop serves as a fully functional demonstration of how PostHog can be integrated into an e-commerce 
                  platform. Every click, view, and purchase is tracked, giving you a real-time view of analytics in action.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">The Hedgebox™ Innovation</h2>
            <p className="text-muted-foreground text-lg">
              Our revolutionary Hedgebox™ packaging system represents years of hedgehog research and development. 
              Each box is constructed to precise hedgehog specifications, ensuring your products arrive safe, sound, 
              and surrounded by an appropriate amount of hedgehog imagery (exactly 47 stickers, scientifically determined 
              to be the optimal number).
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Our Values</h2>
            <ul className="space-y-3 text-muted-foreground text-lg">
              <li className="flex gap-3">
                <span className="text-primary">🦔</span>
                <span><strong>Hedgehog-First:</strong> Every decision is reviewed by Posthoggy for hedgehog compliance.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary">📊</span>
                <span><strong>Data-Driven:</strong> We track everything so you don't have to guess what works.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary">💜</span>
                <span><strong>Customer Delight:</strong> Your happiness is measured in smiles per order (SPO).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary">🎨</span>
                <span><strong>Quality Design:</strong> Beautiful interfaces backed by beautiful analytics.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary">🚀</span>
                <span><strong>Innovation:</strong> Constantly improving through A/B tests and hedgehog feedback.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4">Join the Hedgehog Family</h2>
            <p className="text-muted-foreground text-lg">
              Whether you're here to explore PostHog's capabilities, purchase premium hedgehog merchandise, or just 
              enjoy the company of Posthoggy, you're part of something special. Every visitor, every cart addition, 
              every purchase tells a story – and we're tracking it all to make HogShop better for everyone.
            </p>
            <p className="text-muted-foreground text-lg mt-4">
              Welcome to HogShop. Stay for the analytics, stay for the hedgehogs. 🦔
            </p>
          </section>

          <div className="mt-12 p-8 rounded-lg border-2 border-primary/20 bg-primary/5 text-center">
            <p className="text-lg font-semibold mb-2">Powered by PostHog</p>
            <p className="text-muted-foreground">
              This entire platform is a living demonstration of PostHog's analytics capabilities. 
              Every interaction you have is being tracked, analyzed, and used to make HogShop even better.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
