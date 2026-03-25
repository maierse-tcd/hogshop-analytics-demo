

## Fix: Save Payment Method to Stripe Customer During Checkout

### Root Cause
The checkout session is created without instructing Stripe to save the payment method. By default, Stripe Checkout processes the payment but does **not** attach the card to the Customer object. This is why customers show up in Stripe but have no "primary payment method" recorded.

### Fix
Add `payment_intent_data.setup_future_usage` to the checkout session creation in `supabase/functions/create-checkout/index.ts`.

### Change

**File: `supabase/functions/create-checkout/index.ts`**

In the `stripe.checkout.sessions.create()` call, add:
- For `payment` mode: `payment_intent_data: { setup_future_usage: 'off_session' }`
- For `subscription` mode: no change needed (subscriptions automatically save the payment method)

```typescript
const session = await stripe.checkout.sessions.create({
  line_items: sessionLineItems,
  mode,
  success_url: successUrl,
  cancel_url: `${origin}/`,
  allow_promotion_codes: true,
  billing_address_collection: "required",
  customer: customerId,
  customer_email: customerId ? undefined : customer_email || undefined,
  // Save payment method to customer for one-time payments
  ...(mode === "payment" && {
    payment_intent_data: {
      setup_future_usage: "off_session",
    },
  }),
  // ... rest unchanged
});
```

### Impact
- Future one-time checkouts will save the card to the Stripe Customer
- The customer's "primary payment method" will appear in Stripe
- No impact on subscription checkouts (they already save the method)
- No frontend changes needed

