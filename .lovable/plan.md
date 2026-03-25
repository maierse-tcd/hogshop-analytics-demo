

## Plan: Add PostHog Revenue Analytics Properties for MRR Tracking

PostHog Revenue Analytics requires specific event properties (`revenue`, `currency`, `subscription_id`) on purchase events to calculate MRR. Currently our `purchase_completed` events use `total_amount` instead of `revenue`, and don't include `subscription_id`.

### Changes

**1. `supabase/functions/track-success/index.ts`** (server-side — primary tracking path)

Add the required revenue properties to the `purchase_completed` capture payload:
- `revenue`: amount in cents (minor currency unit) — PostHog expects this
- `currency`: already present, keep as-is
- `subscription_id`: extract from Stripe session's subscription ID for recurring purchases

Also retrieve the Stripe subscription ID by checking `session.subscription` on the checkout session.

```typescript
// Add to capture payload properties:
revenue: Math.round(totalAmount * 100),  // cents
currency: currency,
subscription_id: session.subscription || null,  // Stripe sub ID for MRR
```

**2. `src/pages/Success.tsx`** (client-side fallback)

Add matching `revenue`, `currency`, and `subscription_id` properties to the client-side `purchase_completed` event so MRR is tracked even if the edge function fails:

```typescript
trackEvent("purchase_completed", {
  // ...existing props
  revenue: Math.round(basketValue * 100),
  currency: "USD",
  subscription_id: hasSubscription ? sessionId : null,
});
```

### Impact
- PostHog Revenue Analytics will automatically compute MRR from subscription purchases
- One-time purchases will show as revenue but not MRR (no `subscription_id`)
- No new edge functions or database changes needed

