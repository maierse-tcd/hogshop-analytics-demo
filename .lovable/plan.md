

## Fix: Ensure PostHog Identification Before Cancellation Events

### Problem
`SubscriptionManagementDialog` captures cancellation events without calling `posthog.identify()` first. If the Header's page-load identification hasn't completed (or was skipped), these events fire under an anonymous ID.

### Fix
In `proceedWithCancellation`, right after `getUser()` succeeds and before any `posthog.capture()` call, add `posthog.identify(user.email, { email: user.email, name: user.name })`.

### Change

**`src/components/SubscriptionManagementDialog.tsx`** — inside `proceedWithCancellation`, after the `getUser()` check (line 39-40), add:

```typescript
const user = getUser();
if (!user?.email) throw new Error("No user email found");

// Ensure user is identified before capturing any events
posthog.identify(user.email, { email: user.email, name: user.name });
```

This is a single line addition. The existing `posthog` import already exists in the file. No other files need changes — the server-side edge function already uses `email` as `distinct_id`, which will match.

