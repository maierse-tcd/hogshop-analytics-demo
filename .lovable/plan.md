

## Wire Up Real Stripe Cancellation via User Dropdown

### Problem
Users authenticate via localStorage (no Supabase auth), but the `cancel-subscription` edge function requires a Supabase auth token. Need to bypass Supabase auth and pass the email directly.

### Changes

**1. Modify `cancel-subscription` edge function** (`supabase/functions/cancel-subscription/index.ts`)
- Remove Supabase auth token validation
- Accept `{ email: string }` from the request body instead
- Keep the existing Stripe customer lookup by email and subscription cancellation logic
- Keep all PostHog tracking as-is

**2. Add dropdown menu under username** (`src/components/Header.tsx`)
- Replace the plain username text + separate Logout button with a `DropdownMenu`
- Clicking the username opens a dropdown with "Cancel Subscription" and "Logout"
- Remove the standalone "Subscription" nav link and `show_subscription` feature flag dependency
- "Cancel Subscription" opens the existing `SubscriptionManagementDialog`

**3. Update `SubscriptionManagementDialog`** (`src/components/SubscriptionManagementDialog.tsx`)
- In `proceedWithCancellation`, call the edge function via `fetch` (not `supabase.functions.invoke` since there's no auth token), passing the user's email from `getUser()`
- On success: fire PostHog events + show toast (existing logic)
- On failure: show error toast

### Flow
1. Logged-in user clicks their name → dropdown appears
2. Clicks "Cancel Subscription" → confirmation dialog opens
3. Confirms → edge function called with email → Stripe subscription cancelled
4. PostHog tracks `subscription_cancelled` event
5. Playwright bots can click through this same flow

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/cancel-subscription/index.ts` | Accept email from body instead of Supabase auth |
| `src/components/Header.tsx` | Add `DropdownMenu` under username, remove standalone subscription nav |
| `src/components/SubscriptionManagementDialog.tsx` | Call edge function with email, handle response |

