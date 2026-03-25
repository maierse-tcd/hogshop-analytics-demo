

## Fix: Empty Conversion Funnel -- Server-Side Events Not Creating Person Profiles

### Root Cause

The PostHog client is configured with `person_profiles: 'identified_only'`. This means PostHog only creates person profiles when an explicit `$identify` event is received.

The `track-success` edge function sends `purchase_completed` with `distinct_id: customerEmail`, but it never sends an `$identify` event first. PostHog accepts the event (200 response) but treats it as a **personless event** -- it exists in the raw event stream but is invisible to funnels, which require person-level analysis.

The `$set` event IS sent later, but AFTER `purchase_completed`, so the purchase event was already ingested without a person profile.

### Fix

**File: `supabase/functions/track-success/index.ts`**

Add an `$identify` call BEFORE sending `$groupidentify` and `purchase_completed` events. This ensures PostHog creates the person profile first, so all subsequent events are properly attributed.

```typescript
// Send $identify FIRST to create person profile
const identifyPayload = {
  api_key: POSTHOG_KEY,
  event: "$identify",
  distinct_id: customerEmail || sessionId,
  properties: {
    $set: {
      email: customerEmail,
      name: customerName,
    },
  },
};

await fetch(`${POSTHOG_HOST}/capture/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(identifyPayload),
});
```

Insert this block right after computing `valueTier` (around line 98) and before the `$groupidentify` calls. The rest of the function stays the same.

### Why This Works

PostHog's `identified_only` mode requires an `$identify` event to "activate" a person profile. Once identified, all events with that `distinct_id` (email) become person-level events visible in funnels. The existing `$set` call at the end of the function is redundant with this but harmless.

### Single file change, ~15 lines added.

