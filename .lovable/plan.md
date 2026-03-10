

## Fix User Identification at Checkout Registration

### Problem Summary
When users complete the registration dialog during checkout, they're not being properly identified in PostHog because:
1. The `ensureIdentified()` function incorrectly checks if distinct_id equals 'anonymous' - but PostHog uses random UUIDs, not 'anonymous'
2. No explicit event is tracked when registration is completed

### Solution

#### 1. Fix `ensureIdentified()` in `src/lib/posthog.ts`
Update the function to always call `posthog.identify()` regardless of current distinct_id:

```typescript
export const ensureIdentified = async (email: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined") {
    return new Promise<void>((resolve) => {
      // Always identify the user with their email - this will merge anonymous events
      posthog.identify(email, properties);
      
      // Wait for identification to propagate
      setTimeout(() => {
        console.log("PostHog: User identified with email", email);
        resolve();
      }, 100);
    });
  }
  return Promise.resolve();
};
```

#### 2. Add `checkout_registration_completed` Event in `CartDrawer.tsx`
Track when users complete checkout registration:

```typescript
const handleRegistrationComplete = async (email: string, name: string) => {
  // Store user info using unified auth helper
  saveUser(email, name);
  
  // Identify user in PostHog and WAIT for it to complete
  await ensureIdentified(email, {
    email,
    name,
    identified_at: new Date().toISOString(),
  });
  
  // Track registration completion event
  trackEvent("checkout_registration_completed", {
    email,
    name,
    registration_source: "checkout_dialog",
    timestamp: new Date().toISOString(),
  });
  
  // NOW initialize CLTV (after user is identified)
  initializeCLTV();
  
  setShowRegistration(false);
  proceedToCheckout(email, name);
};
```

#### 3. Add Person Properties at Registration
Set initial person properties when user registers:

```typescript
// After ensureIdentified succeeds
setUserProperties({
  $name: name,
  $email: email,
  first_seen_at: new Date().toISOString(),
  registration_source: "checkout",
});
```

### Files to Modify
1. `src/lib/posthog.ts` - Fix `ensureIdentified()` logic
2. `src/components/CartDrawer.tsx` - Add `checkout_registration_completed` event and person properties

### Expected Outcome
- Users will be properly identified with their email when completing checkout registration
- Anonymous session events will be merged with the identified user profile
- A new `checkout_registration_completed` event will be visible in PostHog
- Person properties (`$name`, `$email`, `first_seen_at`, `registration_source`) will be set

