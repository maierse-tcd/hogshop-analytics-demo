

## Fix Demo Error Simulator for PostHog Error Tracking

### Problem
The `captureDemoException` function in `demoErrorSimulator.ts` sends `$exception_message`, `$exception_type`, `$exception_stack_trace_raw` — but PostHog Error Tracking requires the `$exception_list` array format. The errors fire but don't appear in the Error Tracking product.

### Changes

**`src/utils/demoErrorSimulator.ts`**

1. Update `captureDemoException` to use the correct `$exception_list` format (matching the working `captureException` in `posthog.ts`):

```typescript
posthog.capture('$exception', {
  $exception_list: [
    {
      type: error.name,
      value: error.message,
      mechanism: { handled: false, synthetic: false },
    }
  ],
  $exception_personURL: posthog.get_session_replay_url(),
  demo_context: context,
  ...additionalProps,
});
```

2. Reduce error count from 3-5 to 1-2 per session (more realistic, "not too many").

3. Trim the error types list from 15 down to ~6 high-quality ones (network failures, payment errors, data processing bugs) so patterns emerge in PostHog rather than noise.

### Result
Errors will appear in PostHog Error Tracking with proper grouping, stack traces, and session replay links. 1-2 errors per session gives enough data without being overwhelming.

