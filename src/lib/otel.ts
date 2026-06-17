/**
 * PostHog OTLP Tracer (browser, hand-rolled, no SDK deps).
 * Sends spans to PostHog Distributed Tracing over OTLP/HTTP+JSON.
 * https://posthog.com/docs/distributed-tracing
 *
 * Kept intentionally small — we don't pull the OpenTelemetry web SDK because
 * `posthog-js` already covers pageviews/autocapture/network. This module exists
 * specifically to emit cross-boundary spans (browser → edge function → Gemini)
 * that PostHog's tracing UI can stitch together.
 */

const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://ph.hogflix.dev";
const POSTHOG_KEY =
  (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ||
  "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

const SERVICE_NAME = "hogshop-web";

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

export const SpanKind = { INTERNAL: 1, SERVER: 2, CLIENT: 3 } as const;
export const SpanStatus = { UNSET: 0, OK: 1, ERROR: 2 } as const;

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
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

export interface Span {
  traceId: string;
  spanId: string;
  setAttribute(key: string, value: AttrValue): void;
  setAttributes(attrs: SpanAttributes): void;
  recordException(err: unknown): void;
  end(status?: { code: number; message?: string }): void;
}

const buffer: OtlpSpan[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 2000;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  const spans = buffer.splice(0, buffer.length);
  const payload = {
    resourceSpans: [
      {
        resource: { attributes: toAttrs({ "service.name": SERVICE_NAME }) },
        scopeSpans: [{ scope: { name: "hogshop" }, spans }],
      },
    ],
  };
  try {
    const body = JSON.stringify(payload);
    // Prefer sendBeacon on unload paths; sendBeacon doesn't support custom headers,
    // so we always use fetch — keepalive lets it survive page hide.
    const res = await fetch(`${POSTHOG_HOST}/i/v1/traces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POSTHOG_KEY}`,
      },
      body,
      keepalive: true,
    });
    if (!res.ok) {
      console.warn(`[OTel] trace flush failed: ${res.status}`);
    }
  } catch (err) {
    // Silent — tracing must never break the app.
    console.warn("[OTel] trace flush error:", err);
  }
}

let initialized = false;

export function initOtel(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  // Best-effort flush on page hide.
  window.addEventListener("pagehide", () => {
    void flush();
  });
}

export interface StartSpanOptions {
  parent?: Span;
  kind?: number;
  attributes?: SpanAttributes;
}

export function startSpan(name: string, opts: StartSpanOptions = {}): Span {
  const startNano = nowNano();
  const startPerf = performance.now();
  const traceId = opts.parent?.traceId ?? randomHex(16);
  const parentSpanId = opts.parent?.spanId;
  const spanId = randomHex(8);
  const attrs: SpanAttributes = { ...(opts.attributes ?? {}) };
  let status: { code: number; message?: string } = { code: SpanStatus.UNSET };

  return {
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
      status = { code: SpanStatus.ERROR, message: e.message };
    },
    end(s) {
      if (s) status = s;
      const endNano = (
        BigInt(startNano) + BigInt(Math.round((performance.now() - startPerf) * 1_000_000))
      ).toString();
      buffer.push({
        traceId,
        spanId,
        parentSpanId,
        name,
        kind: opts.kind ?? SpanKind.INTERNAL,
        startTimeUnixNano: startNano,
        endTimeUnixNano: endNano,
        attributes: toAttrs(attrs),
        status,
      });
      // Emit a browser event so demo overlays (e.g. TracingDemoBadge) can
      // surface the current trace ID without holding a direct reference.
      if (typeof window !== "undefined" && !parentSpanId) {
        window.dispatchEvent(
          new CustomEvent("hogshop:trace", { detail: { traceId, spanId, name } }),
        );
      }
      scheduleFlush();
    },
  };
}

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T> | T,
  opts: StartSpanOptions = {},
): Promise<T> {
  const span = startSpan(name, opts);
  try {
    const result = await fn(span);
    span.end({ code: SpanStatus.OK });
    return result;
  } catch (err) {
    span.recordException(err);
    span.end();
    throw err;
  }
}

/**
 * Build a W3C traceparent header for outgoing fetch() requests.
 * Pair with `extractTraceContext` on the edge to stitch a distributed trace.
 */
export function traceparent(span: Span): string {
  return `00-${span.traceId}-${span.spanId}-01`;
}

export const flushOtel = flush;
