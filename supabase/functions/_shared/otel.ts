/**
 * PostHog OTLP Tracer (hand-rolled, no npm deps).
 * Sends spans to PostHog Distributed Tracing over OTLP/HTTP+JSON.
 * https://posthog.com/docs/distributed-tracing
 */

const POSTHOG_HOST = "https://ph.hogflix.dev";
const POSTHOG_KEY =
  Deno.env.get("POSTHOG_KEY") ||
  Deno.env.get("POSTHOG_PROJECT_API_KEY") ||
  "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

type AttrValue = string | number | boolean | null | undefined;
export type SpanAttributes = Record<string, AttrValue>;

interface OtlpAttribute {
  key: string;
  value:
    | { stringValue: string }
    | { intValue: string }
    | { doubleValue: number }
    | { boolValue: boolean };
}

interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpAttribute[];
  status: { code: number; message?: string };
}

const SPAN_KIND = {
  INTERNAL: 1,
  SERVER: 2,
  CLIENT: 3,
} as const;

const STATUS = { UNSET: 0, OK: 1, ERROR: 2 } as const;

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function toAttrs(obj: SpanAttributes): OtlpAttribute[] {
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
  // Date.now() is ms; convert to ns string
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

/**
 * Parse a W3C traceparent header: "00-<32hex traceId>-<16hex spanId>-<2hex flags>".
 * Returns null if missing or malformed.
 */
export function parseTraceparent(
  header: string | null | undefined,
): { traceId: string; parentSpanId: string } | null {
  if (!header) return null;
  const parts = header.trim().split("-");
  if (parts.length !== 4) return null;
  const [, traceId, spanId] = parts;
  if (!/^[0-9a-f]{32}$/i.test(traceId)) return null;
  if (!/^[0-9a-f]{16}$/i.test(spanId)) return null;
  return { traceId: traceId.toLowerCase(), parentSpanId: spanId.toLowerCase() };
}

export interface Span {
  traceId: string;
  spanId: string;
  setAttribute(key: string, value: AttrValue): void;
  setAttributes(attrs: SpanAttributes): void;
  recordException(err: unknown): void;
  end(status?: { code: number; message?: string }): void;
}

export interface Tracer {
  /** Start a span. If parent is omitted, becomes a root span (or child of incoming trace context). */
  startSpan(name: string, opts?: { parent?: Span; kind?: number; attributes?: SpanAttributes }): Span;
  /** Run an async function inside a span; auto-records errors and ends the span. */
  withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T> | T,
    opts?: { parent?: Span; kind?: number; attributes?: SpanAttributes },
  ): Promise<T>;
  /** Flush queued spans to PostHog. Call before the edge function returns. */
  flush(): Promise<void>;
}

/**
 * Create a tracer bound to a service name and (optionally) an incoming trace context
 * extracted from a request's `traceparent` header.
 */
export function createTracer(
  serviceName: string,
  incomingContext?: { traceId: string; parentSpanId: string } | null,
): Tracer {
  const buffer: OtlpSpan[] = [];
  const rootTraceId = incomingContext?.traceId ?? randomHex(16);
  const rootParentSpanId = incomingContext?.parentSpanId;

  const makeSpan = (
    name: string,
    opts?: { parent?: Span; kind?: number; attributes?: SpanAttributes },
  ): Span => {
    const startNano = nowNano();
    const start = performance.now();
    const traceId = opts?.parent?.traceId ?? rootTraceId;
    const parentSpanId =
      opts?.parent?.spanId ?? (opts?.parent ? undefined : rootParentSpanId);
    const spanId = randomHex(8);
    const attrs: SpanAttributes = { ...(opts?.attributes ?? {}) };
    let status: { code: number; message?: string } = { code: STATUS.UNSET };

    const span: Span = {
      traceId,
      spanId,
      setAttribute(key, value) {
        attrs[key] = value;
      },
      setAttributes(more) {
        Object.assign(attrs, more);
      },
      recordException(err) {
        const e = err instanceof Error ? err : new Error(String(err));
        attrs["exception.type"] = e.name;
        attrs["exception.message"] = e.message;
        if (e.stack) attrs["exception.stacktrace"] = e.stack;
        status = { code: STATUS.ERROR, message: e.message };
      },
      end(s) {
        if (s) status = s;
        const endNano = (
          BigInt(startNano) + BigInt(Math.round((performance.now() - start) * 1_000_000))
        ).toString();
        buffer.push({
          traceId,
          spanId,
          parentSpanId,
          name,
          kind: opts?.kind ?? SPAN_KIND.INTERNAL,
          startTimeUnixNano: startNano,
          endTimeUnixNano: endNano,
          attributes: toAttrs(attrs),
          status,
        });
      },
    };
    return span;
  };

  return {
    startSpan: makeSpan,
    async withSpan(name, fn, opts) {
      const span = makeSpan(name, opts);
      try {
        const result = await fn(span);
        span.end({ code: STATUS.OK });
        return result;
      } catch (err) {
        span.recordException(err);
        span.end();
        throw err;
      }
    },
    async flush() {
      if (buffer.length === 0) return;
      const spans = buffer.splice(0, buffer.length);
      const payload = {
        resourceSpans: [
          {
            resource: {
              attributes: toAttrs({ "service.name": serviceName }),
            },
            scopeSpans: [
              {
                scope: { name: "hogshop" },
                spans,
              },
            ],
          },
        ],
      };
      try {
        const res = await fetch(`${POSTHOG_HOST}/i/v1/traces`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${POSTHOG_KEY}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.error(
            `[PostHog Tracing] OTLP flush failed: ${res.status} ${await res.text()}`,
          );
        }
      } catch (err) {
        console.error("[PostHog Tracing] OTLP flush error:", err);
      }
    },
  };
}

// Internal helper — kept here to avoid polluting Span surface.
function status_unset_then_ok(_span: Span): boolean {
  // We can't peek into closures from outside; this is intentionally a no-op flag.
  // The withSpan wrapper always ends successful spans with OK; errors handled separately.
  return true;
}

export const SpanKind = SPAN_KIND;
export const SpanStatus = STATUS;

/**
 * Build a W3C traceparent header for outgoing requests.
 */
export function buildTraceparent(span: Span): string {
  return `00-${span.traceId}-${span.spanId}-01`;
}
