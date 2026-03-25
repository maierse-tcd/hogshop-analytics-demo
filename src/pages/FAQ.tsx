import { Header } from "@/components/Header";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/posthog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqItems = [
  { value: "item-1", question: "What is HogShop and why does it exist?", answer: "HogShop is a demonstration e-commerce platform showcasing PostHog's analytics capabilities. We sell premium hedgehog merchandise and PostHog analytics subscriptions. Think of us as the intersection of cute and data-driven decision making." },
  { value: "item-2", question: "Who is Posthoggy and why should I trust them?", answer: "Posthoggy is our Chief Hedgehog Officer and mascot. They have a PhD in Cuteness Studies from the University of Adorable Analytics. Trust them because they have excellent judgement and never make bad decisions (according to Posthoggy)." },
  { value: "item-3", question: "What's the deal with Hedgebox™?", answer: "Hedgebox™ is our proprietary packaging system. Each box is engineered to maximum hedgehog specifications, includes hedgehog-safe padding, and is decorated with exactly 47 hedgehog stickers. We take packaging seriously (but not too seriously)." },
  { value: "item-4", question: "How do analytics subscriptions work?", answer: "Our analytics subscriptions give you access to PostHog's powerful features: product analytics, session replay, feature flags, and A/B testing. Choose from Pro ($49.99/mo), Feature Flags Enterprise ($99.99/mo), or Team Plan ($149.99/mo). All prices include unlimited hedgehog puns." },
  { value: "item-5", question: "Do the plushies come to life at night?", answer: 'Our legal team advises us to say "no." However, several customers have reported finding their hedgehog plushie in different positions each morning. We cannot confirm or deny any nocturnal hedgehog activities.' },
  { value: "item-6", question: "What payment methods do you accept?", answer: "We accept all major credit cards through Stripe. We also accept treats for Posthoggy, though these don't count toward your order total. Hedgehogs have expensive tastes." },
  { value: "item-7", question: "How fast is shipping?", answer: "Standard shipping takes 5-7 business days. Premium Rush is 2-3 days. Overnight Teleportation™ gets your order to you next day via quantum hedgehog technology (results may vary in alternate dimensions)." },
  { value: "item-8", question: "What's your return policy?", answer: "30-day returns on physical merchandise, no questions asked (though we might ask how the hedgehogs feel). Subscriptions can be cancelled anytime. The hedgehogs will be sad but they'll get over it." },
  { value: "item-9", question: "Are you tracking my every move?", answer: "Yes, but for science! We use PostHog to track events like page views, cart additions, and purchases. This data helps us optimize your shopping experience and gives Posthoggy something to analyze during nap breaks. We never sell your data (hedgehogs have strong ethical principles)." },
  { value: "item-10", question: "Can I visit the hedgehog warehouse?", answer: "While we'd love to accommodate visitors, our hedgehog logistics center is currently classified. Security reasons. Also, the hedgehogs get shy around strangers and productivity drops by 78%." },
  { value: "item-11", question: "What makes your hoodies special?", answer: "Our hoodies feature an embroidered PostHog logo blessed by Posthoggy themselves. They're made from premium cotton, ethically sourced, and rated 10/10 for comfort by our hedgehog testing panel. Plus they make you 37% more attractive (results not scientifically verified)." },
  { value: "item-12", question: "Is this a real store?", answer: "HogShop is a fully functional demo store built to showcase PostHog's analytics features. While the products and checkout process are real, this is primarily an educational platform. But the hedgehog love is 100% genuine." },
];

const FAQ = () => {
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  useEffect(() => {
    trackEvent("page_view", { page: "faq" });
  }, []);

  const handleValueChange = (value: string) => {
    setOpenItem(value);
    if (value) {
      const item = faqItems.find(f => f.value === value);
      trackEvent("faq_item_expanded", {
        faq_item: value,
        question: item?.question,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-12">Everything you need to know about HogShop and our hedgehog-powered services.</p>
        
        <Accordion type="single" collapsible className="space-y-4" value={openItem} onValueChange={handleValueChange}>
          {faqItems.map((item) => (
            <AccordionItem key={item.value} value={item.value} className={`border rounded-lg px-6 transition-all duration-300 hover:bg-accent/30 ${openItem === item.value ? 'border-l-4 border-l-primary shadow-sm' : ''}`}>
              <AccordionTrigger className="text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
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
