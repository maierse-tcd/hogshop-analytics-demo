import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CartProvider } from "@/contexts/CartContext";
import { CheckoutProvider } from "@/contexts/CheckoutContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { initPostHog, posthog, applyPostHogIdentityHash } from "@/lib/posthog";
import { initOtel } from "@/lib/otel";
import { getUser } from "@/lib/auth";
import { PostHogProvider, useFeatureFlagEnabled } from "posthog-js/react";
import { RouteTracker } from "@/components/RouteTracker";
import { AIChatWidget } from "@/components/AIChatWidget";
import { StickyCheckoutBar } from "@/components/StickyCheckoutBar";
import { FlashSaleBanner } from "@/components/FlashSaleBanner";
import { TracingDemoBadge } from "@/components/TracingDemoBadge";
import Index from "./pages/Index";
import Success from "./pages/Success";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Shipping from "./pages/Shipping";
import Terms from "./pages/Terms";
import Readme from "./pages/Readme";
import GiftLanding from "./pages/GiftLanding";
import GiftCheckoutNotFound from "./pages/GiftCheckoutNotFound";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const AppContent = () => {
  const showChatbot = useFeatureFlagEnabled('show_chatbot');

  return (
    <>
      <Toaster />
      <Sonner />
      <div id="chat-slot" data-slot="ai-chat">
        {showChatbot && <AIChatWidget />}
      </div>
      <div id="tracing-badge-slot" data-slot="tracing-badge">
        <TracingDemoBadge />
      </div>
      <BrowserRouter>
        <RouteTracker />
        <div id="flash-sale-slot" data-slot="flash-sale">
          <FlashSaleBanner />
        </div>
        <CheckoutProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/success" element={<Success />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/readme" element={<Readme />} />
            <Route path="/gift" element={<GiftLanding />} />
            <Route path="/checkout/gift" element={<GiftCheckoutNotFound />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <StickyCheckoutBar />
        </CheckoutProvider>
      </BrowserRouter>
    </>
  );
};

const App = () => {
  useEffect(() => {
    initPostHog();
    initOtel();
    // If a user is already logged in (returning visitor), apply identity hash
    const existing = getUser();
    if (existing?.email) {
      void applyPostHogIdentityHash(existing.email);
    }
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <CartProvider>
            <TooltipProvider>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </TooltipProvider>
          </CartProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </PostHogProvider>
  );
};

export default App;
