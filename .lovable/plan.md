

## Fix: Duplicate `add_to_cart` Events Causing Category Data Gap

### Root Cause

Every "Add to Cart" click fires **two** `add_to_cart` events:
1. One from the UI component (`ProductCard.tsx` line 134 and `ProductDetail.tsx` line 118) — includes `category`
2. One from `CartContext.tsx` (line 51) inside `addToCart()` — also includes `category`

This means PostHog receives **double the events**. While both currently include `category`, the duplication inflates totals and can cause mismatches if the properties diverge slightly between the two calls. The "None" bar (1,540 events) likely comes from historical events where `category` wasn't yet tracked in one of the two locations, or from edge cases where `category` is `undefined` (it's optional in CartContext's Product interface).

### Plan

**Consolidate `add_to_cart` tracking to CartContext only** — since that's the single source of truth for cart state. Remove the duplicate `trackEvent("add_to_cart", ...)` calls from `ProductCard.tsx` and `ProductDetail.tsx`.

| File | Change |
|------|--------|
| `src/components/ProductCard.tsx` | Remove `trackEvent("add_to_cart", ...)` call (lines 134-143) |
| `src/pages/ProductDetail.tsx` | Remove `trackEvent("add_to_cart", ...)` call (lines 118-125) |
| `src/contexts/CartContext.tsx` | Add `source` property to the existing `add_to_cart` event so you retain that context; ensure `hashed_example_property` is included (already is) |

This halves the event volume, eliminates the "None" gap going forward, and keeps a single authoritative tracking point.

