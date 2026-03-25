

## Fix: Missing Web Analytics Data for Playwright Bots

### Root Cause

`person_profiles: 'identified_only'` (line 26 in `src/lib/posthog.ts`).

With this setting, events from unidentified users are **personless** -- they exist in the raw event stream but PostHog's Web Analytics dashboard ignores them because it needs person-level data to calculate visitors, sessions, session duration, entry/exit paths, channels, etc.

The Playwright bots (casualBrowser, engagedShopper, etc.) browse the site **without ever calling `posthog.identify()`**. Only bots that go through registration/login get identified. So all anonymous bot sessions are invisible to web analytics.

### Fix

Change `person_profiles` from `'identified_only'` to `'always'` in `src/lib/posthog.ts`.

```typescript
person_profiles: 'always',
```

This single-line change ensures every visitor (identified or not) gets a person profile, which is what Web Analytics requires for:
- Unique visitors
- Pageviews
- Sessions & session duration
- Entry/exit paths
- Channels & referrers

### Trade-off

`'always'` creates person profiles for all anonymous visitors, slightly increasing PostHog event volume. For a demo/analytics site like HogShop this is the correct setting -- you *want* to track all visitors, not just registered ones. Real e-commerce sites almost always use `'always'` for this reason.

### Files Changed

| File | Change |
|------|--------|
| `src/lib/posthog.ts` | Line 26: `'identified_only'` → `'always'` |

One line, one file.

