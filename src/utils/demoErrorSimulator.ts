import { posthog } from "@/lib/posthog";

/**
 * Captures a demo exception to PostHog with rich metadata
 * This is a safe wrapper that never throws errors itself
 */
const captureDemoException = (
  error: Error,
  context: string,
  additionalProps?: Record<string, any>
) => {
  try {
    posthog.capture('$exception', {
      $exception_message: error.message,
      $exception_type: error.name,
      $exception_stack_trace_raw: error.stack,
      $exception_personURL: posthog.get_session_replay_url(),
      demo_context: context,
      demo_error: true,
      timestamp: new Date().toISOString(),
      ...additionalProps,
    });
    console.log(`[Demo Error Captured] ${context}:`, error.message);
  } catch (captureError) {
    console.error("Failed to capture demo error:", captureError);
  }
};

/**
 * Simulates various error types for PostHog demonstration
 * All errors are caught and isolated - will never affect UI
 */
export const simulateDemoErrors = () => {
  // Only run in development or when explicitly enabled
  const isDemoMode = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ERRORS === 'true';
  
  if (!isDemoMode) {
    console.log("[Demo Errors] Skipped - not in demo mode");
    return;
  }

  console.log("[Demo Errors] Starting background error simulation...");

  // 1. Network Request Failure
  setTimeout(() => {
    try {
      throw new Error("Failed to fetch user preferences from API");
    } catch (error) {
      if (error instanceof Error) {
        captureDemoException(error, "network_request", {
          endpoint: "/api/user/preferences",
          method: "GET",
          status_code: 503,
        });
      }
    }
  }, 1000);

  // 2. Data Processing Error
  setTimeout(() => {
    try {
      throw new TypeError("Cannot read property 'price' of undefined");
    } catch (error) {
      if (error instanceof Error) {
        captureDemoException(error, "data_processing", {
          operation: "product_transformation",
          affected_product_id: "prod_123",
        });
      }
    }
  }, 2000);

  // 3. Validation Error
  setTimeout(() => {
    try {
      throw new Error("Email format validation failed");
    } catch (error) {
      if (error instanceof Error) {
        captureDemoException(error, "validation_error", {
          field: "email",
          input_value: "invalid-email",
          validator: "email_regex",
        });
      }
    }
  }, 3000);

  // 4. Async Operation Failure
  setTimeout(() => {
    try {
      const promise = Promise.reject(new Error("Async image upload failed"));
      promise.catch((error) => {
        captureDemoException(error, "async_operation", {
          operation_type: "file_upload",
          file_type: "image/jpeg",
          file_size: 2048000,
        });
      });
    } catch (error) {
      // Already handled in promise.catch
    }
  }, 4000);

  // 5. Third-party Integration Error
  setTimeout(() => {
    try {
      throw new Error("Stripe payment processing timeout");
    } catch (error) {
      if (error instanceof Error) {
        captureDemoException(error, "third_party_integration", {
          service: "stripe",
          operation: "create_payment_intent",
          timeout_ms: 30000,
        });
      }
    }
  }, 5000);

  // 6. ReferenceError
  setTimeout(() => {
    try {
      throw new ReferenceError("cartData is not defined");
    } catch (error) {
      if (error instanceof Error) {
        captureDemoException(error, "reference_error", {
          missing_variable: "cartData",
          scope: "checkout_flow",
        });
      }
    }
  }, 6000);

  // 7. RangeError
  setTimeout(() => {
    try {
      throw new RangeError("Maximum cart item limit (50) exceeded");
    } catch (error) {
      if (error instanceof Error) {
        captureDemoException(error, "range_error", {
          limit: 50,
          attempted_value: 75,
          resource: "cart_items",
        });
      }
    }
  }, 7000);

  // 8. Auth/Session Error
  setTimeout(() => {
    try {
      throw new Error("User session expired - please log in again");
    } catch (error) {
      if (error instanceof Error) {
        captureDemoException(error, "authentication_error", {
          auth_type: "jwt",
          session_duration_minutes: 120,
          last_activity: new Date(Date.now() - 7200000).toISOString(),
        });
      }
    }
  }, 8000);

  console.log("[Demo Errors] All background errors scheduled");
};

/**
 * Manual error trigger for testing (can be called from dev tools)
 */
export const triggerDemoError = (errorType: string = "generic") => {
  try {
    throw new Error(`Manual demo error: ${errorType}`);
  } catch (error) {
    if (error instanceof Error) {
      captureDemoException(error, "manual_trigger", {
        trigger_source: "developer_console",
        error_type: errorType,
      });
    }
  }
};

// Export for use in window object (debugging)
if (typeof window !== "undefined") {
  (window as any).triggerDemoError = triggerDemoError;
  (window as any).simulateDemoErrors = simulateDemoErrors;
}
