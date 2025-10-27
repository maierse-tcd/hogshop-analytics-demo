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
 * Tracks CLTV locally and syncs to PostHog as a custom person property
 */
export const updateCLTV = (purchaseAmount: number) => {
  if (typeof window !== "undefined") {
    try {
      // Get current CLTV from localStorage (our source of truth)
      const currentCLTV = parseFloat(localStorage.getItem('user_cltv') || '0');
      const newCLTV = currentCLTV + purchaseAmount;
      
      // Store updated CLTV in localStorage
      localStorage.setItem('user_cltv', newCLTV.toString());
      
      // Set as person property in PostHog (this is persistent on PostHog's servers)
      posthog.setPersonProperties({
        customer_lifetime_value: newCLTV,
        last_purchase_amount: purchaseAmount,
        last_purchase_date: new Date().toISOString(),
      });
      
      console.log("PostHog CLTV updated:", { previous: currentCLTV, added: purchaseAmount, new: newCLTV });
    } catch (error) {
      console.error("PostHog CLTV update error:", error);
      // Fallback: just set the purchase amount as CLTV
      localStorage.setItem('user_cltv', purchaseAmount.toString());
      posthog.setPersonProperties({
        customer_lifetime_value: purchaseAmount,
        last_purchase_amount: purchaseAmount,
        last_purchase_date: new Date().toISOString(),
      });
    }
  }
};

/**
 * Initialize CLTV for a new user or sync existing CLTV to PostHog
 * ALWAYS syncs the current localStorage value to PostHog person properties
 */
const initializeCLTV = () => {
  if (typeof window !== "undefined") {
    // Get CLTV from localStorage (our source of truth)
    let currentCLTV = parseFloat(localStorage.getItem('user_cltv') || '0');
    
    // If it doesn't exist, initialize to 0
    if (!localStorage.getItem('user_cltv')) {
      localStorage.setItem('user_cltv', '0');
      currentCLTV = 0;
    }
    
    // ALWAYS sync the current CLTV to PostHog person properties
    posthog.setPersonProperties({
      customer_lifetime_value: currentCLTV,
    });
    
    console.log("PostHog CLTV synced:", currentCLTV);
  }
};

/**
 * Ensures user is identified before setting properties
 * Waits for PostHog to be ready and user to be identified
 */
export const ensureIdentified = async (email: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined") {
    return new Promise<void>((resolve) => {
      // If already identified, resolve immediately
      if (posthog.get_distinct_id() && posthog.get_distinct_id() !== 'anonymous') {
        resolve();
        return;
      }
      
      // Otherwise, identify and wait for it to complete
      posthog.identify(email, properties);
      
      // Wait a small amount for identification to propagate
      setTimeout(() => {
        console.log("PostHog: User identification complete", email);
        resolve();
      }, 100);
    });
  }
  return Promise.resolve();
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

/**
 * Update subscription status in PostHog
 * Tracks subscription state, dates, and recurring value
 */
export const updateSubscriptionStatus = (subscriptionData: {
  active: boolean;
  start_date?: string;
  monthly_value?: number;
  subscription_id?: string;
  cancelled?: boolean;
}) => {
  if (typeof window !== "undefined") {
    try {
      posthog.setPersonProperties({
        subscription_active: subscriptionData.active,
        subscription_start_date: subscriptionData.start_date || null,
        subscription_monthly_value: subscriptionData.monthly_value || null,
        subscription_id: subscriptionData.subscription_id || null,
        subscription_cancelled: subscriptionData.cancelled || false,
        subscription_updated_at: new Date().toISOString(),
      });
      
      console.log("PostHog subscription status updated:", subscriptionData);
    } catch (error) {
      console.error("PostHog subscription update error:", error);
    }
  }
};

export { posthog, initializeCLTV };
