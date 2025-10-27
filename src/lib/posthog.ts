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
