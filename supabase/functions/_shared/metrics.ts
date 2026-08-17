/**
 * PostHog Metrics (hand-rolled, no npm deps).
 * Sends counters/gauges/histograms to PostHog Metrics over OTLP/HTTP+JSON.
 * Companion to _shared/otel.ts (traces) — same host/key resolution and flush shape.
 *
 * IMPORTANT: metric attributes must be LOW cardinality. Never use user id,
 * distinct id, session id, request id, trace id, product id or email.
 */

const POSTHOG_HOST = "https://ph.hogflix.dev";
const POSTHOG_KEY =
  Deno.env.get("POSTHOG_KEY") ||
  Deno.env.get("POSTHOG_PROJECT_API_KEY") ||
  "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

type AttrValue = string | number | boolean | null | undefined;
export type MetricAttributes = Record<string, AttrValue>;

interface OtlpAttribute {
  key: string;
  value:
    | { stringValue: string }
    | { intValue: string }
    | { doubleValue: number }
    | { boolValue: boolean };
}

/** DELTA temporality — what PostHog Metrics expects. */
const AGGREGATION_TEMPORALITY_DELTA = 1;

const HISTOGRAM_BOUNDS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

function toAttrs(obj: MetricAttributes): OtlpAttribute[] {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) => {
      if (typeof value === "number") {
        return Number.isInteger(value)
          ? { key, value: { intValue: String(value) } }
          : { key, value: { doubleValue: value } };
      }
      if (typeof value === "boolean") return { key, value: { boolValue: value } };
      return { key, value: { stringValue: String(value) } };
    });
}

function nowNano(): string {
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

interface OtlpMetric {
  name: string;
  unit: string;
  sum?: {
    aggregationTemporality: number;
    isMonotonic: boolean;
    dataPoints: unknown[];
  };
  gauge?: { dataPoints: unknown[] };
  histogram?: { aggregationTemporality: number; dataPoints: unknown[] };
}

export interface MetricOptions {
  attributes?: MetricAttributes;
  unit?: string;
}

export interface Metrics {
  /** Monotonic counter (delta). Defaults to +1. */
  count(name: string, value?: number, opts?: MetricOptions): void;
  /** Point-in-time gauge value. */
  gauge(name: string, value: number, opts?: MetricOptions): void;
  /** Single-observation histogram (bucketed against fixed bounds). */
  histogram(name: string, value: number, opts?: MetricOptions): void;
  /** Flush queued metrics to PostHog. Call before the edge function returns. */
  flush(): Promise<void>;
}

function bucketCountsFor(value: number): string[] {
  const counts = new Array(HISTOGRAM_BOUNDS.length + 1).fill(0);
  let idx = HISTOGRAM_BOUNDS.findIndex((b) => value <= b);
  if (idx === -1) idx = HISTOGRAM_BOUNDS.length;
  counts[idx] = 1;
  return counts.map(String);
}

/**
 * Create a metrics buffer bound to a service name.
 * All methods are defensive — they never throw into the request path.
 */
export function createMetrics(serviceName: string): Metrics {
  const buffer: OtlpMetric[] = [];
  const startTimeUnixNano = nowNano();

  const push = (metric: OtlpMetric) => {
    try {
      buffer.push(metric);
    } catch (err) {
      console.error("[PostHog Metrics] buffer error:", err);
    }
  };

  return {
    count(name, value = 1, opts) {
      push({
        name,
        unit: opts?.unit ?? "1",
        sum: {
          aggregationTemporality: AGGREGATION_TEMPORALITY_DELTA,
          isMonotonic: true,
          dataPoints: [
            {
              asInt: String(Math.round(value)),
              startTimeUnixNano,
              timeUnixNano: nowNano(),
              attributes: toAttrs(opts?.attributes ?? {}),
            },
          ],
        },
      });
    },
    gauge(name, value, opts) {
      push({
        name,
        unit: opts?.unit ?? "1",
        gauge: {
          dataPoints: [
            {
              asDouble: value,
              startTimeUnixNano,
              timeUnixNano: nowNano(),
              attributes: toAttrs(opts?.attributes ?? {}),
            },
          ],
        },
      });
    },
    histogram(name, value, opts) {
      push({
        name,
        unit: opts?.unit ?? "1",
        histogram: {
          aggregationTemporality: AGGREGATION_TEMPORALITY_DELTA,
          dataPoints: [
            {
              count: "1",
              sum: value,
              min: value,
              max: value,
              explicitBounds: HISTOGRAM_BOUNDS,
              bucketCounts: bucketCountsFor(value),
              startTimeUnixNano,
              timeUnixNano: nowNano(),
              attributes: toAttrs(opts?.attributes ?? {}),
            },
          ],
        },
      });
    },
    async flush() {
      if (buffer.length === 0) return;
      const metrics = buffer.splice(0, buffer.length);
      const payload = {
        resourceMetrics: [
          {
            resource: {
              attributes: toAttrs({ "service.name": serviceName }),
            },
            scopeMetrics: [
              {
                scope: { name: "hogshop" },
                metrics,
              },
            ],
          },
        ],
      };
      try {
        const res = await fetch(`${POSTHOG_HOST}/i/v1/metrics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${POSTHOG_KEY}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.error(
            `[PostHog Metrics] OTLP flush failed: ${res.status} ${await res.text()}`,
          );
        }
      } catch (err) {
        console.error("[PostHog Metrics] OTLP flush error:", err);
      }
    },
  };
}
