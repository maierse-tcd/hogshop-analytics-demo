import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined") {
    // Read from environment variables with fallbacks
    const POSTHOG_KEY = 
      import.meta.env.VITE_POSTHOG_KEY || 
      import.meta.env.NEXT_PUBLIC_POSTHOG_KEY || 
      "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";
    
    const POSTHOG_HOST = 
      import.meta.env.VITE_POSTHOG_HOST || 
      import.meta.env.NEXT_PUBLIC_POSTHOG_HOST || 
      "https://eu.i.posthog.com";
    
    if (!POSTHOG_KEY) {
      console.warn("PostHog: No API key provided. Tracking disabled.");
      return;
    }
    
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        ui_host: POSTHOG_HOST.includes("eu.i.posthog") ? "https://eu.posthog.com" : "https://us.posthog.com",
        loaded: (posthog) => {
          console.log("PostHog loaded successfully!", { api_host: POSTHOG_HOST });
          if (import.meta.env.DEV) {
            posthog.debug();
          }
        },
        capture_pageview: true,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        cross_subdomain_cookie: false,
        disable_session_recording: true,
        respect_dnt: false,
        opt_out_capturing_by_default: false,
        sanitize_properties: null,
        bootstrap: {
          distinctID: undefined,
        },
        session_recording: {
          recordCrossOriginIframes: false,
        },
      });
      
      console.log("PostHog initialized", { 
        host: POSTHOG_HOST, 
        key: POSTHOG_KEY.substring(0, 10) + "..." 
      });

      // Set up feature flags loaded callback
      posthog.onFeatureFlags(() => {
        console.log("PostHog: Feature flags loaded");
      });

      // Force reload feature flags to ensure they're loaded
      posthog.reloadFeatureFlags();
    } catch (error) {
      console.error("PostHog initialization failed:", error);
    }
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

/**
 * Set user properties in PostHog
 * Use this to update profile properties
 */
export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window !== "undefined") {
    try {
      posthog.setPersonProperties(properties);
      console.log("PostHog user properties set:", properties);
    } catch (error) {
      console.error("PostHog set properties error:", error);
    }
  }
};

/**
 * Set user properties only once (won't overwrite existing values)
 * Useful for initializing properties
 */
export const setUserPropertiesOnce = (properties: Record<string, any>) => {
  if (typeof window !== "undefined") {
    try {
      posthog.setPersonPropertiesForFlags(properties);
      console.log("PostHog user properties set once:", properties);
    } catch (error) {
      console.error("PostHog set once error:", error);
    }
  }
};

/**
 * Increment overall CLTV by adding the purchase amount
 * Since PostHog JS doesn't have increment, we track cumulative value manually
 */
export const updateCLTV = (purchaseAmount: number) => {
  if (typeof window !== "undefined") {
    try {
      // Get current CLTV from person properties
      const currentProperties = posthog.get_distinct_id() ? posthog.getFeatureFlag('$stored_person_properties') as any : {};
      const currentCLTV = (currentProperties?.overall_CLTV || 0);
      const newCLTV = currentCLTV + purchaseAmount;
      
      // Set the new cumulative value
      posthog.setPersonProperties({
        overall_CLTV: newCLTV,
      });
      
      console.log("PostHog CLTV updated:", { previous: currentCLTV, added: purchaseAmount, new: newCLTV });
    } catch (error) {
      console.error("PostHog CLTV update error:", error);
      // Fallback: just set the purchase amount
      posthog.setPersonProperties({
        overall_CLTV: purchaseAmount,
      });
    }
  }
};

/**
 * Captures an exception to PostHog with rich metadata
 * Use this for consistent error formatting across the app
 */
export const captureException = (
  error: Error, 
  context?: string,
  additionalProperties?: Record<string, any>
) => {
  if (typeof window !== "undefined") {
    try {
      posthog.capture('$exception', {
        $exception_message: error.message,
        $exception_type: error.name,
        $exception_stack_trace_raw: error.stack,
        $exception_personURL: posthog.get_session_replay_url(),
        context: context || 'unknown',
        timestamp: new Date().toISOString(),
        ...additionalProperties,
      });
      console.log("PostHog exception captured:", error.message, context);
    } catch (captureError) {
      console.error("PostHog exception capture failed:", captureError);
    }
  }
};

export { posthog };
