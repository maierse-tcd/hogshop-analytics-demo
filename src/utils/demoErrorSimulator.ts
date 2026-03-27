import { posthog } from "@/lib/posthog";

const captureDemoException = (
  error: Error,
  context: string,
  additionalProps?: Record<string, any>
) => {
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

interface DemoError {
  create: () => { error: Error; context: string; props: Record<string, any> };
}

const errorTypes: DemoError[] = [
  {
    create: () => ({
      error: new Error("Failed to fetch user preferences from API"),
      context: "network_request",
      props: { endpoint: "/api/user/preferences", method: "GET", status_code: 503 },
    }),
  },
  {
    create: () => ({
      error: new TypeError("Cannot read property 'price' of undefined"),
      context: "data_processing",
      props: { operation: "product_transformation", affected_product_id: "prod_123" },
    }),
  },
  {
    create: () => ({
      error: new Error("Stripe payment processing timeout"),
      context: "third_party_integration",
      props: { service: "stripe", operation: "create_payment_intent", timeout_ms: 30000 },
    }),
  },
  {
    create: () => ({
      error: new Error("Payment declined by card issuer"),
      context: "payment_failed",
      props: { payment_method: "card", decline_code: "insufficient_funds", amount: 89.99, currency: "USD" },
    }),
  },
  {
    create: () => ({
      error: new Error("WebSocket connection closed unexpectedly"),
      context: "websocket_disconnect",
      props: { url: "wss://realtime.hogflix.dev", close_code: 1006, reconnect_attempts: 3 },
    }),
  },
  {
    create: () => ({
      error: new DOMException("Failed to execute 'setItem' on 'Storage': Setting the value exceeded the quota"),
      context: "storage_quota_exceeded",
      props: { storage_type: "localStorage", key: "cart_cache", estimated_size_kb: 5120 },
    }),
  },
];

/**
 * Simulates random errors for PostHog error tracking demonstration.
 * Picks 1-2 random error types per session, staggered over 5-30 seconds.
 */
export const simulateDemoErrors = () => {
  const count = 1 + Math.floor(Math.random() * 2); // 1-2 errors
  const selected = [...errorTypes].sort(() => 0.5 - Math.random()).slice(0, count);

  console.log(`[Demo Errors] Scheduling ${selected.length} random errors...`);

  selected.forEach((errorDef) => {
    const delay = 5000 + Math.random() * 25000; // 5-30 seconds
    setTimeout(() => {
      try {
        const { error, context, props } = errorDef.create();
        captureDemoException(error, context, props);
      } catch (e) {
        // never break the app
      }
    }, delay);
  });
};

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

if (typeof window !== "undefined") {
  (window as any).triggerDemoError = triggerDemoError;
  (window as any).simulateDemoErrors = simulateDemoErrors;
}
