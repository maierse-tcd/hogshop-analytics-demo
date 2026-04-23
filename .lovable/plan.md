

## Fix stale `customer_lifetime_value` person property

### Root cause

`supabase/functions/track-success/index.ts` (line 252) sets:
```ts
customer_lifetime_value: totalAmount,
```
This **overwrites** the property with just the most recent order amount — not a running total. Worse, this server-side `$set` runs after every purchase and clobbers whatever the client had accumulated in `localStorage` via `updateCLTV`.

Result: `customer_lifetime_value` is always the value of the latest single purchase (or 0 if the server's `$set` raced and the property was reset).

### Fix

PostHog supports atomic increment via the `$add` operation in a `$set_once`/`$add` payload. We'll switch the server-side person-properties write to use `$add` for `customer_lifetime_value` so each purchase increments the running total, plus keep `$set` for the non-cumulative fields.

**File:** `supabase/functions/track-success/index.ts`

Replace the `personPropertiesPayload` (around lines 241–257) with:

```ts
const personPropertiesPayload = {
  api_key: POSTHOG_KEY,
  event: "$set",
  distinct_id: customerEmail,
  properties: {
    $set: {
      subscription_active: hasSubscription,
      subscription_start_date: hasSubscription ? new Date().toISOString() : null,
      subscription_monthly_value: subscriptionValue || null,
      customer_lifecycle: lifecycle,
      customer_value_tier: valueTier,
      last_purchase_date: new Date().toISOString(),
      last_purchase_amount: totalAmount,
    },
    $add: {
      customer_lifetime_value: totalAmount,
      total_purchases: 1,
    },
  },
};
```

Notes:
- `$add` atomically increments on PostHog's side — no read-modify-write race.
- Bonus: `total_purchases` counter comes for free.
- `customer_value_tier` is computed from a single purchase amount in this function and will be wrong for repeat buyers, but that's a separate (smaller) issue — flagging only.

### Client-side cleanup

`src/lib/posthog.ts` `updateCLTV` is no longer the source of truth. Two options:

1. **Recommended:** Remove the `posthog.setPersonProperties({ customer_lifetime_value: newCLTV })` call from `updateCLTV` so the client never overwrites the server's incremented value. Keep the `localStorage` mirror for any UI that reads it locally.
2. Leave it alone — the server's `$set` ran *after* it anyway, so the bug pre-existed. But best to remove the conflicting writer.

Plan goes with option 1: strip the `setPersonProperties` call from `updateCLTV` and `initializeCLTV`. Keep `last_purchase_amount` / `last_purchase_date` writes since those aren't cumulative.

### Backfill (optional, not in this change)

Existing person profiles will keep their stale value until their next purchase increments it. If you want a one-shot backfill, that'd be a separate PostHog query → CSV → `$set` import. Skip unless you want it.

### Files changed

- `supabase/functions/track-success/index.ts` — switch to `$add` for CLTV
- `src/lib/posthog.ts` — remove conflicting `customer_lifetime_value` writes from `updateCLTV` and `initializeCLTV`

