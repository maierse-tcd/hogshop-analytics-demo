

## Fix `hashed_example_property` for Hash Transformation Demo

### Problem
`hashed_example_property: "posthog"` is registered as a **super property** via `posthog.register()`, so it appears on **every** event in its original unhashed form. The PostHog-side hash transformation likely only targets specific events, so events outside that scope leak the raw value.

### Plan
1. **Remove from super properties** — delete `posthog.register({ hashed_example_property: "posthog" });` from `src/lib/posthog.ts` line 42
2. **Add explicitly to tracked events** — include `hashed_example_property: "posthog"` as an event property only on the events where you want the transformation to apply (e.g. `add_to_cart`, `checkout_started`, `cart_updated`, etc.) in `src/contexts/CartContext.tsx` and `src/components/CartDrawer.tsx`

This way the property only exists on events the transformation matches, and you won't see the unhashed value leaking on other events like `$pageview`.

### Files Modified
| File | Change |
|------|--------|
| `src/lib/posthog.ts` | Remove `posthog.register({ hashed_example_property: "posthog" })` |
| `src/contexts/CartContext.tsx` | Add `hashed_example_property: "posthog"` to `add_to_cart`, `cart_updated`, `remove_from_cart`, `cart_cleared` trackEvent calls |
| `src/components/CartDrawer.tsx` | Add `hashed_example_property: "posthog"` to `checkout_started` and related trackEvent calls |

