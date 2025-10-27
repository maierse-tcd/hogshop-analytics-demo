import { Header } from "@/components/Header";
import { useEffect } from "react";
import { trackEvent } from "@/lib/posthog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ = () => {
  useEffect(() => {
    trackEvent("page_view", { page: "faq" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-12">Everything you need to know about HogShop and our hedgehog-powered services.</p>
        
        <Accordion type="single" collapsible className="space-y-4">
          <AccordionItem value="item-1" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What is HogShop and why does it exist?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              HogShop is a demonstration e-commerce platform showcasing PostHog's analytics capabilities. 
              We sell premium hedgehog merchandise and PostHog analytics subscriptions. Think of us as the intersection 
              of cute and data-driven decision making.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              Who is Posthoggy and why should I trust them?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Posthoggy is our Chief Hedgehog Officer and mascot. They have a PhD in Cuteness Studies from the University 
              of Adorable Analytics. Trust them because they have excellent judgement and never make bad decisions 
              (according to Posthoggy).
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What's the deal with Hedgebox™?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Hedgebox™ is our proprietary packaging system. Each box is engineered to maximum hedgehog specifications, 
              includes hedgehog-safe padding, and is decorated with exactly 47 hedgehog stickers. We take packaging 
              seriously (but not too seriously).
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How do analytics subscriptions work?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Our analytics subscriptions give you access to PostHog's powerful features: product analytics, 
              session replay, feature flags, and A/B testing. Choose from Pro ($49.99/mo), Feature Flags Enterprise ($99.99/mo), 
              or Team Plan ($149.99/mo). All prices include unlimited hedgehog puns.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              Do the plushies come to life at night?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Our legal team advises us to say "no." However, several customers have reported finding their hedgehog plushie 
              in different positions each morning. We cannot confirm or deny any nocturnal hedgehog activities.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-6" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What payment methods do you accept?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              We accept all major credit cards through Stripe. We also accept treats for Posthoggy, though these 
              don't count toward your order total. Hedgehogs have expensive tastes.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-7" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              How fast is shipping?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Standard shipping takes 5-7 business days. Premium Rush is 2-3 days. Overnight Teleportation™ gets your 
              order to you next day via quantum hedgehog technology (results may vary in alternate dimensions).
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-8" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What's your return policy?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              30-day returns on physical merchandise, no questions asked (though we might ask how the hedgehogs feel). 
              Subscriptions can be cancelled anytime. The hedgehogs will be sad but they'll get over it.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-9" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              Are you tracking my every move?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Yes, but for science! We use PostHog to track events like page views, cart additions, and purchases. 
              This data helps us optimize your shopping experience and gives Posthoggy something to analyze during nap breaks. 
              We never sell your data (hedgehogs have strong ethical principles).
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-10" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              Can I visit the hedgehog warehouse?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              While we'd love to accommodate visitors, our hedgehog logistics center is currently classified. 
              Security reasons. Also, the hedgehogs get shy around strangers and productivity drops by 78%.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-11" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              What makes your hoodies special?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Our hoodies feature an embroidered PostHog logo blessed by Posthoggy themselves. They're made from premium cotton, 
              ethically sourced, and rated 10/10 for comfort by our hedgehog testing panel. Plus they make you 37% more attractive 
              (results not scientifically verified).
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-12" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left">
              Is this a real store?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              HogShop is a fully functional demo store built to showcase PostHog's analytics features. While the products 
              and checkout process are real, this is primarily an educational platform. But the hedgehog love is 100% genuine.
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-12 p-6 rounded-lg border bg-card text-center">
          <h3 className="font-semibold text-lg mb-2">Still have questions?</h3>
          <p className="text-muted-foreground">
            Send a message to our hedgehog support team. Response time: whenever they wake up from their nap.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
