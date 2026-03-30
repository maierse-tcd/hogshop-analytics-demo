import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined") {
    // Read from environment variables with fallbacks
    const POSTHOG_KEY = 
      import.meta.env.VITE_POSTHOG_KEY || 
      import.meta.env.NEXT_PUBLIC_POSTHOG_KEY || 
      "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";
    
    // Use custom domain for first-party data collection via reverse proxy
    const POSTHOG_HOST = 
      import.meta.env.VITE_POSTHOG_HOST || 
      import.meta.env.NEXT_PUBLIC_POSTHOG_HOST || 
      "https://ph.hogflix.dev";
    
    if (!POSTHOG_KEY) {
      console.warn("PostHog: No API key provided. Tracking disabled.");
      return;
    }
    
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        ui_host: "https://eu.posthog.com",
        person_profiles: 'always',
        capture_pageview: true,
        capture_pageleave: true,
        capture_performance: true,
        enable_heatmaps: true,
        persistence: "localStorage+cookie",
        cross_subdomain_cookie: false,
        disable_session_recording: false,
        disable_web_experiments: false,
        enable_recording_console_log: true,
        session_recording: {
          recordCrossOriginIframes: false,
        },
        loaded: (posthog) => {
          console.log("PostHog loaded successfully!", { api_host: POSTHOG_HOST });
          posthog.debug();
          posthog.register({ hashed_example_property: "posthog" });
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
      // Always identify the user with their email - this will merge anonymous events
      posthog.identify(email, properties);
      
      // Wait for identification to propagate
      setTimeout(() => {
        console.log("PostHog: User identified with email", email);
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
        $exception_list: [
          {
            type: error.name,
            value: error.message,
            mechanism: { handled: false, synthetic: false },
          }
        ],
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
      
      console.log("PostHog subscription status updated:", {
        ...subscriptionData,
        distinctId: posthog.get_distinct_id(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("PostHog subscription update error:", error);
    }
  }
};

/**
 * Calculate customer value tier based on CLTV
 */
const getValueTier = (cltv: number): string => {
  if (cltv >= 1000) return "Platinum";
  if (cltv >= 500) return "Gold";
  if (cltv >= 100) return "Silver";
  return "Bronze";
};

/**
 * Set customer lifecycle and value tier groups
 * Dual-group system for maximum analytics power
 */
export const setCustomerGroups = (
  lifecycle: "One-Time Buyer" | "Active Subscriber" | "Churned Subscriber" | "Reactivated Subscriber", 
  cltv?: number
) => {
  if (typeof window !== "undefined") {
    try {
      // Set lifecycle group
      posthog.group("customer_lifecycle", lifecycle);
      
      // Set value tier group if CLTV provided
      if (cltv !== undefined) {
        const tier = getValueTier(cltv);
        posthog.group("customer_value_tier", tier);
        
        posthog.setPersonProperties({
          customer_lifecycle: lifecycle,
          customer_value_tier: tier,
          customer_lifetime_value: cltv,
          customer_groups_updated_at: new Date().toISOString(),
        });
        
        console.log("PostHog: Customer groups set", { lifecycle, tier, cltv });
      } else {
        posthog.setPersonProperties({
          customer_lifecycle: lifecycle,
          customer_groups_updated_at: new Date().toISOString(),
        });
        
        console.log("PostHog: Customer lifecycle set", lifecycle);
      }
    } catch (error) {
      console.error("PostHog customer groups error:", error);
    }
  }
};

/**
 * Legacy function for backwards compatibility
 * @deprecated Use setCustomerGroups instead
 */
export const setCustomerTypeGroup = (customerType: "subscription" | "one-off") => {
  const lifecycle = customerType === "subscription" ? "Active Subscriber" : "One-Time Buyer";
  const cltv = parseFloat(localStorage.getItem("user_cltv") || "0");
  
  setCustomerGroups(lifecycle, cltv);
};

/**
 * Force reload feature flags from PostHog
 * Useful after server-side changes to user properties
 */
export const reloadFeatureFlags = () => {
  if (typeof window !== "undefined") {
    try {
      posthog.reloadFeatureFlags();
      console.log("PostHog: Feature flags reloaded");
    } catch (error) {
      console.error("PostHog: Failed to reload feature flags", error);
    }
  }
};

/**
 * Track AI Generation for PostHog LLM Analytics
 */
export const trackAIGeneration = (data: {
  model: string;
  provider: string;
  input: string;
  output: string[];
  inputTokens: number;
  outputTokens: number;
  latency: number;
  traceId: string;
  additionalProps?: Record<string, any>;
}) => {
  trackEvent("$ai_generation", {
    $ai_model: data.model,
    $ai_provider: data.provider,
    $ai_input: data.input,
    $ai_output_choices: data.output,
    $ai_input_tokens: data.inputTokens,
    $ai_output_tokens: data.outputTokens,
    $ai_total_tokens: data.inputTokens + data.outputTokens,
    $ai_latency: data.latency,
    $ai_trace_id: data.traceId,
    ...data.additionalProps,
  });
};

/**
 * Track AI Trace (complete conversation session)
 */
export const trackAITrace = (data: {
  traceId: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  durationSeconds: number;
  messageCount: number;
  additionalProps?: Record<string, any>;
}) => {
  trackEvent("$ai_trace", {
    $ai_trace_id: data.traceId,
    $ai_total_input_tokens: data.totalInputTokens,
    $ai_total_output_tokens: data.totalOutputTokens,
    $ai_total_tokens: data.totalInputTokens + data.totalOutputTokens,
    conversation_duration_seconds: data.durationSeconds,
    total_messages: data.messageCount,
    ...data.additionalProps,
  });
};

/**
 * Track AI Error
 */
export const trackAIError = (data: {
  traceId: string;
  errorMessage: string;
  errorType: string;
  additionalProps?: Record<string, any>;
}) => {
  trackEvent("ai_error", {
    trace_id: data.traceId,
    error_message: data.errorMessage,
    error_type: data.errorType,
    ...data.additionalProps,
  });
};

/**
 * Set customer segment group based on CLTV
 */
export const setCustomerSegment = (cltv: number) => {
  const segment = cltv > 500 ? "high_value" : cltv > 100 ? "medium_value" : "low_value";
  
  if (posthog) {
    posthog.group("customer_segment", segment, {
      cltv,
      segment,
    });
  }
};

/**
 * Set engagement level based on session count
 */
export const setEngagementLevel = (sessionCount: number) => {
  const level = sessionCount > 10 ? "power_user" : sessionCount > 5 ? "active" : "casual";
  
  if (posthog) {
    posthog.group("engagement_level", level, {
      session_count: sessionCount,
      level,
    });
  }
};

/**
 * Set subscription tier group
 */
export const setSubscriptionTier = (tier: "free" | "basic" | "pro" | "premium") => {
  if (posthog) {
    posthog.group("subscription_tier", tier, {
      tier,
    });
  }
};

/**
 * Track experiment view
 */
export const trackExperimentView = (experimentName: string, variant: string) => {
  trackEvent("experiment_viewed", {
    experiment_name: experimentName,
    variant,
  });
};

/**
 * Track experiment goal conversion
 */
export const trackExperimentGoal = (experimentName: string, variant: string, goalName: string, goalValue?: number) => {
  trackEvent("experiment_goal_achieved", {
    experiment_name: experimentName,
    variant,
    goal_name: goalName,
    goal_value: goalValue,
  });
};

export { posthog, initializeCLTV };
