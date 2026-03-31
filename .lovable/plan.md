

## New Experiment: "Add to Cart" Button CTA Text

### Why This Experiment Works Great for a Demo

This is a classic conversion optimization experiment that's easy to understand, has a clear measurable goal (add-to-cart rate), and produces visually obvious differences in PostHog's experiment results UI. It tests whether changing the CTA button text on product cards increases add-to-cart conversions.

### Variants

| Variant | Button Text | Hypothesis |
|---------|------------|------------|
| **control** | "Add to Cart" | Current baseline |
| **urgency** | "Get It Now" | Creates urgency, may increase impulse buys |
| **social_proof** | "Best Seller — Add to Cart" | Social proof nudge on popular items |

### Implementation

**1. `src/components/ProductCard.tsx`**
- Add a new feature flag hook: `useFeatureFlagVariantKey('add-to-cart-cta-experiment')`
- Track `$feature_view` when the flag loads
- Map the variant key to button text:
  - `control` → "Add to Cart"
  - `urgency` → "Get It Now"  
  - `social_proof` → "Best Seller — Add to Cart"
- Include `variant` in the existing `add_to_cart` event properties so PostHog can measure conversion per variant

**2. `src/pages/Index.tsx`**
- Add a one-time event seed for `add_to_cart` (like the existing `newsletter_subscribed` seed) so the event is registered in PostHog for experiment goal setup

### What It Showcases in PostHog
- **Experiment results page** with conversion rates per variant
- **Statistical significance** calculation across variants
- **Funnel analysis**: product viewed → add to cart → purchase, split by variant
- Clean integration with the existing `add_to_cart` and `purchase_completed` events

### No PostHog Dashboard Setup Needed from Lovable
The feature flag (`add-to-cart-cta-experiment`) needs to be created in PostHog with 3 variants. The code will gracefully fall back to "Add to Cart" if the flag isn't set up yet.

