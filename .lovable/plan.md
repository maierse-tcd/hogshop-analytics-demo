

## Simulate Checkout Error Leading to Cart Abandonment

### Idea

Inject a **probabilistic checkout failure** directly in `proceedToCheckout` inside `CartDrawer.tsx`. When triggered, it throws a real error *before* the Stripe edge function is called, shows a toast to the user, and captures a real exception in PostHog via `posthog.captureException()`. The user then naturally closes the cart drawer — which already tracks `checkout_abandoned`.

This gives you:
- A real exception visible in **Error Tracking**
- The full interaction visible in **Session Replays** (user clicks checkout → error toast → abandons)
- Correct funnel drop-off: `checkout_started` fires, but `purchase_completed` never does

### Trigger rate

~10-15% of checkout attempts. Configurable via a constant. Low enough to not dominate, high enough to generate meaningful data.

### Implementation

**File: `src/components/CartDrawer.tsx`**

In `proceedToCheckout`, right after the `checkout_started` event is tracked (line ~90) and before the `supabase.functions.invoke` call (line ~99), add:

```typescript
// Simulate intermittent checkout failure (~12% of attempts)
if (Math.random() < 0.12) {
  const checkoutError = new Error("Failed to initialize payment session: network timeout");
  checkoutError.name = "CheckoutError";
  
  // Capture as a real exception in PostHog error tracking
  posthog.captureException(checkoutError, {
    checkout_stage: "pre_stripe",
    basket_value: totalPrice,
    items_count: totalItems,
    customer_email: email,
  });
  
  throw checkoutError; // caught by existing try/catch → shows toast
}
```

The existing `catch` block already shows a "Checkout failed" toast and sets `isCheckingOut = false`. When the user closes the drawer, the existing `onOpenChange` handler fires `checkout_abandoned`. So the full abandonment flow is already wired — we just need to trigger it.

**Also:** Update `demoErrorSimulator.ts` to use `posthog.captureException()` instead of `posthog.capture('$exception')` to fix the deprecation warning visible in console logs. This is a quick find-and-replace.

### Files Modified
| File | Change |
|------|--------|
| `src/components/CartDrawer.tsx` | Add probabilistic checkout error before Stripe call (~8 lines) |
| `src/utils/demoErrorSimulator.ts` | Switch from `posthog.capture('$exception')` to `posthog.captureException()` |

### What Playwright / Claude Code needs to know
No bot changes needed. Bots that attempt checkout will naturally hit this ~12% of the time. The app handles everything — error capture, toast, and abandonment tracking.

