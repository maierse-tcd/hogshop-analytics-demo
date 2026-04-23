

## Fix inflated `revenue` property in `purchase_completed`

The `track-success` edge function sends `revenue` in cents (`totalAmount * 100`) while `total_amount` is in dollars. PostHog's revenue analytics treat the `revenue` property as the currency unit, so every dashboard using it is 100x inflated.

### Change

**File:** `supabase/functions/track-success/index.ts` (line ~99)

Replace:
```ts
revenue: Math.round(totalAmount * 100),
```
With:
```ts
revenue: totalAmount,
```

That's the entire code change. `totalAmount` is already `session.amount_total / 100`, i.e. dollars — which is what PostHog's revenue analytics expect.

### Notes

- No client-side changes needed — this property is only set server-side in this one function.
- No other event sends a `revenue` property (verified: `purchase_completed` is the only place).
- Currency stays `USD` (already correct).

### Historical data

Past events in PostHog will remain 100x inflated. Two options (your call, not part of this change):
1. Leave history as-is and note the cutover date in the PostHog project description.
2. Create a PostHog insight that divides `revenue` by 100 for events before the fix timestamp, and uses raw `revenue` after.

Most teams just accept the discontinuity and move on — historical revenue is rarely re-queried at exact precision.

