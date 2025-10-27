import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined") {
    // Initialize PostHog - users will need to add their project API key
    // For now, we'll set up the structure
    const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
    const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";
    
    if (POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        loaded: (posthog) => {
          if (import.meta.env.DEV) posthog.debug();
        },
      });
    }
  }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.capture(eventName, properties);
  }
};

export { posthog };
