import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined") {
    const POSTHOG_KEY = "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";
    const POSTHOG_HOST = "https://us.i.posthog.com"; // Changed to US server
    
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      loaded: (posthog) => {
        console.log("PostHog loaded successfully!");
        if (import.meta.env.DEV) {
          posthog.debug();
        }
      },
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage",
      cross_subdomain_cookie: false,
    });
    
    console.log("PostHog initialization called with US server");
  }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined") {
    try {
      posthog.capture(eventName, properties);
      console.log("PostHog event tracked:", eventName, properties);
    } catch (error) {
      console.error("PostHog tracking error:", error);
    }
  }
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined") {
    try {
      posthog.identify(userId, properties);
      console.log("PostHog user identified:", userId, properties);
    } catch (error) {
      console.error("PostHog identify error:", error);
    }
  }
};

export { posthog };
