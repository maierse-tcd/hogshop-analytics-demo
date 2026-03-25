

## Create Stripe Customers During Checkout

### Problem
The checkout uses `customer_email` which creates "guest" checkout sessions — Stripe processes payments but doesn't create reusable Customer objects. This means you can't track repeat buyers, manage subscriptions properly, or see customer profiles in Stripe.

### Solution
Before creating the checkout session, look up or create a Stripe Customer, then pass `customer` (not `customer_email`) to the session.

### Changes

**File: `supabase/functions/create-checkout/index.ts`**

After initializing Stripe and before creating the session:

1. If `customer_email` is provided, search for an existing Stripe customer with that email
2. If none found, create a new Stripe Customer with the email and name
3. Pass `customer: customerId` to `stripe.checkout.sessions.create()` instead of `customer_email`

```typescript
// Find or create Stripe customer
let customerId: string | undefined;
if (customer_email) {
  const existing = await stripe.customers.list({ email: customer_email, limit: 1 });
  if (existing.data.length > 0) {
    customerId = existing.data[0].id;
  } else {
    const newCustomer = await stripe.customers.create({
      email: customer_email,
      name: customer_name || undefined,
    });
    customerId = newCustomer.id;
  }
}

// Then in session create:
customer: customerId,
customer_email: customerId ? undefined : customer_email || undefined,
```

This ensures every checkout creates a proper Stripe Customer profile, linking all future transactions to the same person.

