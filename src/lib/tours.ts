import type { TourStep } from "@/hooks/useTour";

/**
 * Step content for every product tour, kept in one place so the wiring in the
 * pages stays declarative. Each tour is gated on a PostHog feature flag of the
 * same name (see `useTour`). Targets must resolve to elements that are always
 * rendered on the page, independent of other feature flags.
 */

// Flag: tour-shop-getting-started — home page onboarding.
export const shopGettingStartedSteps: TourStep[] = [
  {
    target: '[data-attr="brand-logo"]',
    title: "Welcome to HogShop 🦔",
    body: "Everything your spiky friend needs. Here's a quick 20-second tour.",
    placement: "bottom",
  },
  {
    target: '[data-attr="category-filter"]',
    title: "Shop by category",
    body: "Filter products by type to quickly find food, housing, toys and more.",
    placement: "bottom",
  },
  {
    target: "#products",
    title: "Browse our products",
    body: "Every item is hand-picked for happy, healthy hedgehogs.",
    placement: "top",
  },
  {
    target: '[data-attr="add-to-cart"]',
    title: "Add to cart",
    body: "Tap here on any product to drop it straight into your cart.",
    placement: "top",
  },
  {
    target: '[data-attr="cart-button"]',
    title: "Your cart",
    body: "Review your items and check out whenever you're ready.",
    placement: "bottom",
  },
];

// Flag: tour-product-detail-buying — product page walkthrough.
export const productDetailBuyingSteps: TourStep[] = [
  {
    target: '[data-attr="product-price"]',
    title: "Clear, honest pricing",
    body: "See the price upfront — plus any active flash-sale savings.",
    placement: "bottom",
  },
  {
    target: '[data-attr="product-add-to-cart"]',
    title: "Add it to your cart",
    body: "One tap adds this product to your cart, ready for checkout.",
    placement: "top",
  },
  {
    target: '[data-attr="why-choose"]',
    title: "Why hedgehog parents love this",
    body: "Quality you can trust, fast shipping, and a hedgehog seal of approval.",
    placement: "top",
  },
];
