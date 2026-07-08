import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches an HMAC-SHA256 of the distinct_id from the edge function
 * and registers it as PostHog super properties so the Support product
 * can verify the user's identity.
 * Docs: https://posthog.com/docs/support
 */
export const applyPostHogIdentityHash = async (distinctId: string) => {
  if (typeof window === "undefined" || !distinctId) return;
  try {
    const { data, error } = await supabase.functions.invoke(
      "posthog-identity-hash",
      { body: { distinct_id: distinctId } },
    );
    if (error || !data?.identity_hash) {
      console.warn("PostHog: identity hash unavailable", error);
      return;
    }
    posthog.register({
      identity_distinct_id: distinctId,
      identity_hash: data.identity_hash,
    });
    if (import.meta.env.DEV) {
      console.log("PostHog: identity hash applied for", distinctId);
    }
  } catch (e) {
    console.error("PostHog: failed to apply identity hash", e);
  }
};

export const initPostHog = () => {
  if (typeof window !== "undefined") {
    const POSTHOG_KEY = 
      import.meta.env.VITE_POSTHOG_KEY || 
      "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";
    
    const POSTHOG_HOST = 
      import.meta.env.VITE_POSTHOG_HOST || 
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
        capture_exceptions: true,
        capture_pageview: false,
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
          if (import.meta.env.DEV) {
            console.log("PostHog loaded successfully!", { api_host: POSTHOG_HOST });
            posthog.debug();
          }
      
          // Expose globally for bot scripts and debugging
          (window as any).posthog = posthog;
        },
      });
      
      if (import.meta.env.DEV) {
        console.log("PostHog initialized", { 
          host: POSTHOG_HOST, 
          key: POSTHOG_KEY.substring(0, 10) + "..." 
        });
      }

      // Set up feature flags loaded callback
      posthog.onFeatureFlags(() => {
        if (import.meta.env.DEV) console.log("PostHog: Feature flags loaded");
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
      if (import.meta.env.DEV) console.log("PostHog event tracked:", eventName, properties);
    } catch (error) {
      console.error("PostHog tracking error:", error);
    }
  }
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined") {
    try {
      posthog.identify(userId, {
        $email: userId,
        $name: properties?.name || userId,
        ...properties,
      });
      if (import.meta.env.DEV) console.log("PostHog user identified:", userId, properties);
      // Apply verified identity hash for PostHog Support product
      void applyPostHogIdentityHash(userId);
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
      if (import.meta.env.DEV) console.log("PostHog user properties set:", properties);
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
      posthog.capture('$set', { $set_once: properties });
      if (import.meta.env.DEV) console.log("PostHog user properties set once:", properties);
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
      const currentCLTV = parseFloat(localStorage.getItem('user_cltv') || '0');
      const newCLTV = currentCLTV + purchaseAmount;
      
      localStorage.setItem('user_cltv', newCLTV.toString());

      // Note: customer_lifetime_value is owned server-side by track-success,
      // which computes it from purchase history via HogQL and writes it with
      // $set (PostHog's capture API does not support $add for person properties).
      // Client only mirrors CLTV to localStorage and writes non-cumulative
      // last_purchase_* fields here.
      posthog.setPersonProperties({
        last_purchase_amount: purchaseAmount,
        last_purchase_date: new Date().toISOString(),
      });

      if (import.meta.env.DEV) console.log("PostHog CLTV updated (local mirror):", { previous: currentCLTV, added: purchaseAmount, new: newCLTV });
    } catch (error) {
      console.error("PostHog CLTV update error:", error);
      localStorage.setItem('user_cltv', purchaseAmount.toString());
      posthog.setPersonProperties({
        last_purchase_amount: purchaseAmount,
        last_purchase_date: new Date().toISOString(),
      });
    }
  }
};

/**
 * Initialize CLTV for a new user or sync existing CLTV to PostHog
 */
const initializeCLTV = () => {
  if (typeof window !== "undefined") {
    let currentCLTV = parseFloat(localStorage.getItem('user_cltv') || '0');
    
    if (!localStorage.getItem('user_cltv')) {
      localStorage.setItem('user_cltv', '0');
      currentCLTV = 0;
    }

    // Do not write customer_lifetime_value here — it is owned server-side
    // (incremented atomically via $add in the track-success edge function).
    if (import.meta.env.DEV) console.log("PostHog CLTV local mirror:", currentCLTV);
  }
};

/**
 * Ensures user is identified before setting properties
 */
export const ensureIdentified = async (email: string, properties?: Record<string, any>) => {
  if (typeof window !== "undefined") {
    return new Promise<void>((resolve) => {
      posthog.identify(email, {
        $email: email,
        $name: properties?.name || email,
        ...properties,
      });
      void applyPostHogIdentityHash(email);

      setTimeout(() => {
        if (import.meta.env.DEV) console.log("PostHog: User identified with email", email);
        resolve();
      }, 100);
    });
  }
  return Promise.resolve();
};

/**
 * Captures an exception to PostHog with rich metadata
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
      if (import.meta.env.DEV) console.log("PostHog exception captured:", error.message, context);
    } catch (captureError) {
      console.error("PostHog exception capture failed:", captureError);
    }
  }
};

/**
 * Update subscription status in PostHog
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
      
      if (import.meta.env.DEV) console.log("PostHog subscription status updated:", subscriptionData);
    } catch (error) {
      console.error("PostHog subscription update error:", error);
    }
  }
};

/**
 * Set customer lifecycle group + person property.
 * customer_value_tier is owned server-side (derived from lifetime value in
 * track-success), so we no longer write it from the client to avoid
 * clobbering the accurate lifetime-based tier on the Success page.
 */
export const setCustomerGroups = (
  lifecycle: "One-Time Buyer" | "Active Subscriber" | "Churned Subscriber" | "Reactivated Subscriber",
  _cltv?: number
) => {
  if (typeof window !== "undefined") {
    try {
      posthog.group("customer_lifecycle", lifecycle);
      posthog.setPersonProperties({
        customer_lifecycle: lifecycle,
        customer_groups_updated_at: new Date().toISOString(),
      });

      if (import.meta.env.DEV) console.log("PostHog: Customer lifecycle set", lifecycle);
    } catch (error) {
      console.error("PostHog customer groups error:", error);
    }
  }
};

/**
 * Force reload feature flags from PostHog
 */
export const reloadFeatureFlags = () => {
  if (typeof window !== "undefined") {
    try {
      posthog.reloadFeatureFlags();
      if (import.meta.env.DEV) console.log("PostHog: Feature flags reloaded");
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

export const slugifyCompany = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const applyCompanyGroup = (companyName: string) => {
  if (typeof window === "undefined" || !companyName) return;
  const key = slugifyCompany(companyName);
  if (!key) return;
  try {
    posthog.group("company", key, { name: companyName.trim(), icp_type: "B2B" });
    posthog.setPersonProperties({ icp_type: "B2B", company_name: companyName.trim(), company_key: key });
    if (import.meta.env.DEV) console.log("PostHog: company group applied", { key, name: companyName.trim() });
  } catch (error) {
    console.error("PostHog applyCompanyGroup error:", error);
  }
};

export { posthog, initializeCLTV };
