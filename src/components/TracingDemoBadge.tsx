import { useEffect, useState } from "react";
import { useFeatureFlagEnabled } from "posthog-js/react";
import { Activity } from "lucide-react";

/**
 * Demo overlay — gated by the `promo-tracing-demo` PostHog feature flag.
 *
 * When the flag is ON, shows a small pill in the bottom-left corner that
 * surfaces the most recent OpenTelemetry trace ID emitted by this browser
 * session. Useful for live PostHog tracing demos: copy the ID, paste it
 * into PostHog → Traces, and watch the span tree appear.
 *
 * When the flag is OFF (default), the component renders nothing.
 */
export const TracingDemoBadge = () => {
  const enabled = useFeatureFlagEnabled("promo-tracing-demo");
  const [latestTraceId, setLatestTraceId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Monkey-patch our OTel buffer flushes by listening on a CustomEvent
    // emitted by src/lib/otel.ts (see `traceEmittedEvent`).
    const onTrace = (e: Event) => {
      const detail = (e as CustomEvent<{ traceId: string }>).detail;
      if (detail?.traceId) setLatestTraceId(detail.traceId);
    };
    window.addEventListener("hogshop:trace", onTrace);
    return () => window.removeEventListener("hogshop:trace", onTrace);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (!latestTraceId) return;
        navigator.clipboard?.writeText(latestTraceId).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-primary/40 bg-background/80 px-3 py-2 text-xs font-mono shadow-lg backdrop-blur transition hover:-translate-y-0.5 active:scale-[0.98]"
      title="Click to copy. Paste into PostHog → Traces."
    >
      <Activity className="h-3.5 w-3.5 text-primary" />
      <span className="text-muted-foreground">trace:</span>
      <span className="text-foreground">
        {latestTraceId ? `${latestTraceId.slice(0, 8)}…${latestTraceId.slice(-4)}` : "waiting…"}
      </span>
      {copied && <span className="text-primary">copied!</span>}
    </button>
  );
};
