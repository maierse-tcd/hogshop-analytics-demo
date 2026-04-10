

## PostHog Implementation: Current State Assessment

The core fixes from the previous round landed well — no more double `$pageview`, no more `$feature_view` spam, `products_viewed` fires once, `posthog.debug()` is dev-only, and `add_to_cart` tracking is consolidated. The implementation is functional and captures good data.

However, there's still cleanup to do. Here's what remains:

### Issues to Fix

**1. RouteTracker still fires a redundant `page_view` event (line 22)**
Every navigation sends both `$pageview` (correct) and a custom `page_view` event "for backwards compatibility." This is unnecessary noise — remove it.

**2. RouteTracker has an unconditional `console.log` (line 28)**
`console.log("PostHog: Route tracked", ...)` fires in production on every page navigation.

**3. Success.tsx has ~25 unconditional `console.log` statements**
All the `🟡 SUCCESS:` and `PostHog:` logs fire in production. These should be gated behind `import.meta.env.DEV`.

**4. Header.tsx has unconditional `console.log` statements (lines 56, 64, 73)**
`"Header: User logged in..."`, `"Header: handleLogout called"`, `"Header: User logged out..."` all fire in production.

**5. Dead `NEXT_PUBLIC_` env var references in posthog.ts (lines 8, 14)**
This is a Vite project — `import.meta.env.NEXT_PUBLIC_*` will never resolve. Dead code.

**6. Five unused exported functions in posthog.ts**
`setCustomerSegment`, `setEngagementLevel`, `setSubscriptionTier`, `trackExperimentView`, `trackExperimentGoal` — none are imported anywhere. They add 60 lines of dead code and clutter the module's API surface.

**7. Deprecated `setCustomerTypeGroup` still exported**
Marked `@deprecated` but still present. Should be removed since `setCustomerGroups` replaced it.

### Plan

| # | Change | File |
|---|--------|------|
| 1 | Remove redundant `page_view` event and unconditional console.log | `RouteTracker.tsx` |
| 2 | Gate all console.logs behind `import.meta.env.DEV` | `Success.tsx` |
| 3 | Gate all console.logs behind `import.meta.env.DEV` | `Header.tsx` |
| 4 | Remove `NEXT_PUBLIC_` fallbacks | `posthog.ts` |
| 5 | Remove 5 unused functions + deprecated `setCustomerTypeGroup` | `posthog.ts` |

No behavioral changes — just removing dead code, noise, and production console spam. The actual tracking logic stays intact.

