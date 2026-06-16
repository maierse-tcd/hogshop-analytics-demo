import { useEffect, useState, useCallback } from "react";
import posthog from "posthog-js";

export interface TourStep {
  target: string; // CSS selector for the anchor element
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface UseTourOptions {
  flagKey: string;
  steps?: TourStep[]; // pass steps directly, or let them come from the flag payload
  storageKey?: string; // localStorage key to remember completion; defaults to `tour-${flagKey}`
}

/**
 * Reusable product-tour hook. Gated on a PostHog feature flag, remembers
 * completion in localStorage, and emits the tour funnel events
 * (`tour started`, `tour step viewed`, `tour step completed`, `tour completed`,
 * `tour dismissed`) so drop-off can be analysed per `tour_id`.
 *
 * Shared across every tour — only the `flagKey` and `steps` change per tour.
 */
export function useTour({
  flagKey,
  steps: staticSteps,
  storageKey,
}: UseTourOptions) {
  const key = storageKey ?? `tour-${flagKey}`;
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>(staticSteps ?? []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(key) === "done") return;

    let started = false;
    const start = () => {
      if (started) return;
      if (!posthog.isFeatureEnabled(flagKey)) return;
      started = true;

      // An optional flag payload can override the steps without a redeploy.
      const payload = posthog.getFeatureFlagPayload(flagKey) as {
        steps?: TourStep[];
      } | null;
      if (payload?.steps?.length) setSteps(payload.steps);

      setActive(true);
      posthog.capture("tour started", { tour_id: flagKey });
      posthog.capture("tour step viewed", { tour_id: flagKey, step: 0 });
    };

    // Flags may already be cached (synchronous) or still loading — try both.
    start();
    const unsubscribe = posthog.onFeatureFlags(() => start());
    return unsubscribe;
  }, [flagKey, key]);

  const advance = useCallback(() => {
    posthog.capture("tour step completed", {
      tour_id: flagKey,
      step: stepIndex,
    });
    const next = stepIndex + 1;
    if (next >= steps.length) {
      localStorage.setItem(key, "done");
      setActive(false);
      posthog.capture("tour completed", { tour_id: flagKey });
    } else {
      setStepIndex(next);
      posthog.capture("tour step viewed", { tour_id: flagKey, step: next });
    }
  }, [flagKey, key, stepIndex, steps.length]);

  const dismiss = useCallback(() => {
    localStorage.setItem(key, "done");
    setActive(false);
    posthog.capture("tour dismissed", { tour_id: flagKey, at_step: stepIndex });
  }, [flagKey, key, stepIndex]);

  return {
    active,
    step: steps[stepIndex] ?? null,
    stepIndex,
    totalSteps: steps.length,
    advance,
    dismiss,
  };
}
