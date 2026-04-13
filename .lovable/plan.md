

## Add Subscription Event Alongside Purchase

### Problem
PostHog's customer analytics funnels expect a dedicated "Subscription event" (visible in your screenshot). Currently, subscription purchases only fire `purchase_completed` — there's no separate event for the subscription lifecycle.

### Solution
Fire a `subscription_created` event **without revenue properties** immediately after `purchase_completed` when the purchase contains a recurring item. Revenue stays exclusively on `purchase_completed`, so Revenue Analytics won't double-count.

### What changes

| File | Change |
|------|--------|
| `supabase/functions/track-success/index.ts` | After the `purchase_completed` capture (line 205), add a conditional `subscription_created` event when `hasSubscription` is true. No `revenue` property — only subscription metadata (plan name, monthly value, subscription ID, email). |
| `src/pages/Success.tsx` | In the client-side fallback path (~line 230), add matching `subscription_created` trackEvent when `hasSubscription` is true, also without `revenue`. |

### Event shape

```
event: "subscription_created"
properties:
  subscription_id: string
  plan_name: string (from line item description)
  monthly_value: number (not tagged as revenue)
  customer_email: string
  session_id: string
  source: "edge_function" | "client_fallback"
```

No `revenue` or `$revenue` property means PostHog Revenue Analytics ignores it completely. Your funnel can use `subscription_created` as the dedicated subscription step.

