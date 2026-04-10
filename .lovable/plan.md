

## Quick Test: Force the Checkout Error

### Problem
The 12% failure rate means you need ~8 checkout attempts to see it. That's tedious for manual testing.

### Plan
1. **Temporarily set `CHECKOUT_FAILURE_RATE` to `1.0`** (100%) in `src/components/CartDrawer.tsx` line 94
2. You add an item to cart, click checkout, and it will fail every time — confirm:
   - The "Checkout failed" toast appears
   - The `CheckoutError` shows up in PostHog Error Tracking
   - The session replay captures the full flow
3. **Revert back to `0.12`** after confirming

### Files Modified
| File | Change |
|------|--------|
| `src/components/CartDrawer.tsx` | Line 94: `0.12` → `1.0` (temporary), then back to `0.12` |

One-line change, immediate verification, then revert.

