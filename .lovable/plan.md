

## PostHog Implementation Review

### Issues Found

#### 1. Runtime Error: `useCart` outside `CartProvider`
There's an active crash — `CartDrawer` (used in `Header`) is rendering outside `CartProvider` in some code path. This is the `useCart must be used within CartProvider` error currently showing. Likely a hot-reload edge case, but worth investigating if `Header` is ever rendered outside the provider tree.

#### 2. Double Pageview Tracking
`capture_pageview: true` is set in `posthog.init()` (line 27 of posthog.ts), which makes the SDK auto-capture `$pageview` on every URL change. But `RouteTracker.tsx` **also** manually fires `posthog.capture("$pageview", ...)` on every route change. This means every navigation fires **two** `$pageview` events. Additionally, `RouteTracker` fires a third custom `page_view` event.

**Fix**: Set `capture_pageview: false` in `posthog.init()` since `RouteTracker` handles it manually with richer properties. Or remove the manual capture from `RouteTracker` and rely on the SDK's autocapture.

#### 3. `$feature_view` Spam
In `Index.tsx` and `ProductCard.tsx`, every feature flag fires a `$feature_view` event when its value loads. These fire on **every render** (not just once per session), because the `useEffect` dependencies are the flag values which can re-trigger. PostHog already tracks `$feature_flag_called` automatically — these manual `$feature_view` events are redundant and create noise. There are ~10 of these across the two files.

**Fix**: Remove all manual `$feature_view` captures. PostHog's SDK handles this automatically.

#### 4. `products_viewed` Fires on Every Product Data Change
In `Index.tsx` line 49, `products_viewed` is in a `useEffect` with `[products]` as a dependency. This fires on mount (good), but also re-fires if React Query refetches or the cache updates.

**Fix**: Use a ref to ensure it only fires once.

#### 5. `setUserPropertiesOnce` Uses Wrong API
Line 112 of `posthog.ts`: `setUserPropertiesOnce` calls `posthog.setPersonPropertiesForFlags()`, which sets properties for **flag evaluation only** — it does NOT persist them as person properties. The function name and JSDoc are misleading.

**Fix**: Use `posthog.setPersonProperties()` with `$set_once` semantics, or rename/remove this function.

#### 6. Event Seeding Pollutes Production Data
`Index.tsx` lines 64-89 send fake `newsletter_subscribed` and `add_to_cart` events with `_demo_event: true` for "event seeding." These pollute real analytics. If needed for PostHog setup, they should be behind an env flag or removed.

#### 7. `purchase_completed` Potential Double-Fire
Both the `track-success` edge function (server-side) AND the `Success.tsx` page (client-side) can fire `purchase_completed`. The dedup logic uses `tracked=1` URL param and `tracked_sessions` localStorage, but there's a race condition: if the edge function is slow, the client fires first, then the server fires too — creating a duplicate.

**Fix**: Either make the client-side tracking truly a fallback (wait longer before firing), or remove client-side tracking entirely and rely on the edge function.

#### 8. CLTV Tracking Uses localStorage as Source of Truth
`updateCLTV` accumulates lifetime value in localStorage, but this resets when the user clears their browser. Server-side `track-success` sets `customer_lifetime_value` to just the current purchase amount (not cumulative). These two systems conflict.

#### 9. `posthog.debug()` Enabled in Production
Line 41: `posthog.debug()` is called unconditionally in the `loaded` callback. This floods the browser console in production with verbose PostHog logs. Should be gated behind a dev/debug flag.

#### 10. Excessive Console Logging
Every `trackEvent`, `identifyUser`, `setUserProperties` call logs to the console. Combined with `posthog.debug()`, this creates extreme console noise in production.

---

### Recommended Fixes (Priority Order)

| # | Fix | Files | Impact |
|---|-----|-------|--------|
| 1 | Fix `useCart` runtime error | Investigate `Header`/`CartDrawer` render tree | **Crash** |
| 2 | Remove double `$pageview` — set `capture_pageview: false` | `posthog.ts` | **Data quality** |
| 3 | Remove all manual `$feature_view` captures | `Index.tsx`, `ProductCard.tsx` | **Data noise** |
| 4 | Fire `products_viewed` only once | `Index.tsx` | **Data accuracy** |
| 5 | Fix `setUserPropertiesOnce` to use correct API | `posthog.ts` | **Bug** |
| 6 | Gate event seeding behind env check or remove | `Index.tsx` | **Data hygiene** |
| 7 | Guard `posthog.debug()` behind dev mode | `posthog.ts` | **Production hygiene** |
| 8 | Remove redundant console.log from tracking helpers | `posthog.ts` | **Production hygiene** |

Shall I implement all of these, or a subset?

