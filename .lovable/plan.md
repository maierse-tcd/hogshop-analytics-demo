

## Stripe Implementation Issues Found

### Issue 1: Missing Price Mapping for "Hedgehog Lover T-Shirt"
The edge function logs show: `[WARN] No price mapping found, using price_data {"title":"Hedgehog Lover T-Shirt"}`. This product exists in your database but has no entry in the `PRICE_MAP` in `create-checkout/index.ts`. This means it falls back to `price_data` (inline pricing), which:
- Creates a new ad-hoc product in Stripe on every checkout
- Makes it hard to track revenue per product in Stripe
- Won't match any existing Stripe product for reporting

**Fix**: Create a Stripe product+price for "Hedgehog Lover T-Shirt" ($24.99) and add it to `PRICE_MAP`.

### Issue 2: Inconsistent PostHog Host Across Edge Functions
- `track-success/index.ts` defaults to `https://ph.hogflix.dev` (reverse proxy)
- `cancel-subscription/index.ts` defaults to `https://eu.i.posthog.com` (direct API)
- `posthog-logger.ts` hardcodes `https://eu.i.posthog.com`

This could cause inconsistent person identity resolution if the reverse proxy behaves differently from the direct API. All functions should use the same host.

**Fix**: Standardize all edge functions to use the same PostHog host (the reverse proxy `https://ph.hogflix.dev`).

### Issue 3: OTLP Logger Sends `intValue` as Number Instead of String
In `posthog-logger.ts` line 34: `{ intValue: value }` sends a JS number, but the OTLP JSON spec requires `intValue` to be a string. This causes 400 errors on every log flush, meaning structured logs never reach PostHog Logs.

**Fix**: Change to `{ intValue: String(value) }`.

### Issue 4: Shared Log Buffer Across Requests
The `posthog-logger.ts` uses a module-level `logBuffer` array. In Deno edge functions, the module can be reused across requests, meaning logs from one request could leak into another request's flush, or be lost if a concurrent request flushes first.

**Fix**: Move the buffer into the `createLogger` closure so each invocation has its own isolated buffer.

### Issue 5: Mixed Checkout Modes Without Price Validation
The checkout function allows mixing subscription (`recurring`) and one-time items in the same cart. When `hasSubscription` is true, mode becomes `"subscription"`, but Stripe subscription-mode sessions require ALL line items to have recurring prices. If a user adds both a subscription item and a one-time item, the checkout will fail.

**Fix**: Either split into separate sessions, or use `price_data` with `recurring` only for subscription items and handle one-time items as add-ons.

---

### Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/create-checkout/index.ts` | Add "Hedgehog Lover T-Shirt" to PRICE_MAP (after creating Stripe price) |
| `supabase/functions/_shared/posthog-logger.ts` | Fix `intValue` to String; isolate log buffer per logger instance |
| `supabase/functions/cancel-subscription/index.ts` | Change PostHog host default to `https://ph.hogflix.dev` |
| Stripe (via tool) | Create product + price for "Hedgehog Lover T-Shirt" at $24.99 |

