import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined") {
    const POSTHOG_KEY = "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";
    const POSTHOG_HOST = "https://eu.i.posthog.com";
    
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      loaded: (posthog) => {
        if (import.meta.env.DEV) posthog.debug();
      },
      capture_pageview: true,
      capture_pageleave: true,
    });
  }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.capture(eventName, properties);
  }
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined" && posthog.__loaded) {
    posthog.identify(userId, properties);
  }
};

export { posthog };
