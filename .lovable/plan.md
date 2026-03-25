

## Plan: Enable Random Errors for PostHog Error Tracking

### Problem
The existing `demoErrorSimulator.ts` only fires in development mode (`import.meta.env.DEV`), so PostHog error tracking has nothing to report in production/preview.

### Changes

**1. `src/utils/demoErrorSimulator.ts`** — Remove the dev-only guard so errors fire on every environment. Also add randomization so only a subset of errors fire per session (more realistic), and stagger them over a longer time window.

- Remove the `isDemoMode` check that blocks production
- Randomly select 3-5 of the 12 error types per session instead of firing all 12
- Spread them out over 5-30 seconds with random delays
- Add a few new realistic error types: WebSocket disconnect, localStorage quota exceeded, image load failure

**2. `src/pages/Index.tsx`** — No changes needed (already calls `simulateDemoErrors` on mount).

### Result
Every visitor session will generate 3-5 random errors in PostHog, providing realistic error tracking data including stack traces, session replay URLs, and contextual metadata.

