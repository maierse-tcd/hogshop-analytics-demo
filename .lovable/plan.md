

## Fix: Auto-Identify Returning Users on Page Load

### Problem
The Header component detects returning users from localStorage (`getUser()`) but only reloads feature flags — it never calls `posthog.identify()`. This means:
- Bot users who stored their email in localStorage on a prior session come back as anonymous
- Any real returning user who doesn't re-login stays anonymous
- Funnel steps show unidentified users with no session replay links

### Fix

**`src/components/Header.tsx`** — Add `identifyUser()` call when a returning user is detected from localStorage (around line 52-64):

```typescript
useEffect(() => {
  const user = getUser();
  if (user) {
    setIsLoggedIn(true);
    setUserName(user.name);
    
    // Identify returning user in PostHog so events link to their profile
    identifyUser(user.email, { name: user.name, email: user.email });
    
    posthog.reloadFeatureFlags();
    console.log("Header: User logged in, reloading feature flags", { email: user.email });
  } else {
    setIsLoggedIn(false);
    setUserName("");
  }
}, [location, isLoggedIn]);
```

### Impact
- One line added, one import updated
- Every page load for a returning user (bot or real) will call `posthog.identify()`
- Anonymous sessions get merged into the identified profile
- Funnel steps will show real person profiles with session replay links

