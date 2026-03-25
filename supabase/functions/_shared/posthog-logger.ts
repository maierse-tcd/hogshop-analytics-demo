/**
 * PostHog OTLP Logger
 * Sends structured logs to PostHog Logs product via OpenTelemetry HTTP endpoint.
 * https://posthog.com/docs/logs
 */

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

// OTLP severity number mapping
const SEVERITY_MAP: Record<LogLevel, { number: number; text: string }> = {
  DEBUG: { number: 5, text: "DEBUG" },
  INFO: { number: 9, text: "INFO" },
  WARN: { number: 13, text: "WARN" },
  ERROR: { number: 17, text: "ERROR" },
};

interface LogEntry {
  timeUnixNano: string;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: number; boolValue?: boolean } }>;
}

// Buffer logs and flush in batch
const logBuffer: LogEntry[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

const POSTHOG_HOST = "https://eu.i.posthog.com";
const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY") || Deno.env.get("POSTHOG_PROJECT_API_KEY") || "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

function toAttributes(obj: Record<string, unknown>): LogEntry["attributes"] {
  return Object.entries(obj).map(([key, value]) => {
    if (typeof value === "number") return { key, value: { intValue: value } };
    if (typeof value === "boolean") return { key, value: { boolValue: value } };
    return { key, value: { stringValue: String(value ?? "") } };
  });
}

function addLog(level: LogLevel, message: string, attrs: Record<string, unknown> = {}) {
  const now = BigInt(Date.now()) * 1_000_000n; // nanoseconds
  const sev = SEVERITY_MAP[level];

  logBuffer.push({
    timeUnixNano: now.toString(),
    severityNumber: sev.number,
    severityText: sev.text,
    body: { stringValue: message },
    attributes: [
      { key: "service.name", value: { stringValue: attrs["service.name"] as string || "hogshop-edge" } },
      ...toAttributes(attrs),
    ],
  });

  // Also log to console for edge function logs visibility
  const d = Object.keys(attrs).length > 0 ? ` ${JSON.stringify(attrs)}` : "";
  console.log(`[${sev.text}] ${message}${d}`);
}

async function flush() {
  if (logBuffer.length === 0) return;

  const entries = logBuffer.splice(0, logBuffer.length);

  const otlpPayload = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "hogshop-edge" } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: "hogshop" },
            logRecords: entries,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(`${POSTHOG_HOST}/i/v1/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POSTHOG_KEY}`,
      },
      body: JSON.stringify(otlpPayload),
    });
    if (!res.ok) {
      console.error(`[PostHog Logs] OTLP flush failed: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error("[PostHog Logs] OTLP flush error:", err);
  }
}

/**
 * Create a logger scoped to a specific edge function.
 */
export function createLogger(functionName: string) {
  const baseAttrs = { "function.name": functionName };

  return {
    debug: (msg: string, attrs?: Record<string, unknown>) =>
      addLog("DEBUG", msg, { ...baseAttrs, ...attrs }),
    info: (msg: string, attrs?: Record<string, unknown>) =>
      addLog("INFO", msg, { ...baseAttrs, ...attrs }),
    warn: (msg: string, attrs?: Record<string, unknown>) =>
      addLog("WARN", msg, { ...baseAttrs, ...attrs }),
    error: (msg: string, attrs?: Record<string, unknown>) =>
      addLog("ERROR", msg, { ...baseAttrs, ...attrs }),
    /**
     * Flush all buffered logs to PostHog. Call at end of request.
     */
    flush,
  };
}
