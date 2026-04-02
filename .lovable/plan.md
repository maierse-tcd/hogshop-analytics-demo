

## Fix: Delay `purchase_completed` Event Until Identification Propagates

### Root Cause
Checkout opens Stripe in a **new tab**. When Stripe redirects back to `/success`, PostHog initializes with a fresh anonymous UUID. The code calls `posthog.identify(email)` (line 143) but then immediately fires `trackEvent("purchase_completed")` (line 244) — no delay. The event captures with the anonymous ID before identification propagates.

The server-side path (`trackedParam === "1"`) doesn't fire `purchase_completed` client-side at all, so it's fine — but when the client-side fallback runs, it races.

### Fix
In `src/pages/Success.tsx`, wrap the `purchase_completed` event capture in a delay after identification, matching the pattern already used elsewhere (e.g., `ensureIdentified` uses 100ms).

**Before** (line ~233-252):
```typescript
// Track purchase completion with whatever data we have
console.log("🟡 SUCCESS: Firing CLIENT-SIDE purchase_completed...");
trackEvent("purchase_completed", { ... });
```

**After**:
```typescript
// Wait for identify to propagate before firing purchase event
await new Promise(resolve => setTimeout(resolve, 300));
console.log("🟡 SUCCESS: Firing CLIENT-SIDE purchase_completed...");
trackEvent("purchase_completed", { ... });
```

This adds a 300ms delay between the `posthog.identify()` call and the event capture, ensuring the identified `distinct_id` is active when the event fires.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Success.tsx` | Add 300ms await before `purchase_completed` event (1 line added) |

