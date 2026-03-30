

## Add `hashed_example_property` to Every PostHog Event

### Approach
Use `posthog.register()` — a built-in super properties feature that automatically appends properties to **every** event. One line of code, added right after PostHog initializes.

### Change

**`src/lib/posthog.ts`** — Inside the `loaded` callback (line 39-42), add:

```typescript
loaded: (posthog) => {
  console.log("PostHog loaded successfully!", { api_host: POSTHOG_HOST });
  posthog.debug();
  posthog.register({ hashed_example_property: "posthog" });
},
```

This ensures every client-side event includes `hashed_example_property: "posthog"` automatically — no need to modify individual `trackEvent` calls.

For **server-side events** (edge functions like `track-success`, `cancel-subscription`), add `hashed_example_property: "posthog"` to the PostHog capture payloads in those functions as well.

| File | Change |
|------|--------|
| `src/lib/posthog.ts` | Add `posthog.register(...)` in `loaded` callback |
| `supabase/functions/track-success/index.ts` | Add property to server-side PostHog capture calls |
| `supabase/functions/cancel-subscription/index.ts` | Add property to server-side PostHog capture calls |

