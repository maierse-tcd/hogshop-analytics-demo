

## Fix: Expose PostHog Instance Globally on `window`

### Problem
The `posthog` instance from `posthog-js` is initialized inside `initPostHog()` but never assigned to `window.posthog`. Playwright bot scripts that call `window.posthog.identify()` or `window.posthog.capture()` get `undefined`. This also affects any browser-console debugging.

### Fix
One line added to `initPostHog()` in `src/lib/posthog.ts`, inside the `loaded` callback (after line ~40):

```typescript
loaded: (posthog) => {
  console.log("PostHog loaded successfully!", { api_host: POSTHOG_HOST });
  posthog.debug();
  posthog.register({ hashed_example_property: "posthog" });
  // Expose globally for bot scripts and debugging
  (window as any).posthog = posthog;
},
```

### Also add `$email` and `$name` to all identify calls

While we're here, update the `identifyUser` helper (line ~76) to always set the reserved display properties:

```typescript
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined") {
    try {
      posthog.identify(userId, {
        $email: userId,
        $name: properties?.name || userId,
        ...properties,
      });
    } catch (error) {
      console.error("PostHog identify error:", error);
    }
  }
};
```

And same for `ensureIdentified` (~line 153):

```typescript
posthog.identify(email, {
  $email: email,
  $name: properties?.name || email,
  ...properties,
});
```

### Files Modified
| File | Change |
|------|--------|
| `src/lib/posthog.ts` | Add `window.posthog = posthog` in `loaded` callback; add `$email`/`$name` to `identifyUser` and `ensureIdentified` |

### What to tell Claude Code / Playwright
After this change, `window.posthog` will be available globally. Bot scripts can safely call `window.posthog.identify(email)` and `window.posthog.capture(...)` after waiting for PostHog readiness.

