import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { posthog } from "@/lib/posthog";
import { startSpan, SpanKind, SpanStatus } from "@/lib/otel";

export const RouteTracker = () => {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (typeof window !== "undefined" && posthog) {
      // Track pageview with PostHog's built-in event
      posthog.capture("$pageview", {
        $current_url: window.location.href,
        path: location.pathname,
        search: location.search,
        title: document.title,
      });

      // Emit a short navigation span so PostHog Traces always has fresh
      // browser activity to show, even for users who never hit an edge function.
      const navSpan = startSpan("navigation", {
        kind: SpanKind.INTERNAL,
        attributes: {
          "navigation.from": prevPathRef.current ?? "(initial)",
          "navigation.to": location.pathname,
          "navigation.search": location.search,
          "page.title": document.title,
        },
      });
      // End on next frame so the span has non-zero duration covering
      // first paint after the route change.
      requestAnimationFrame(() => navSpan.end({ code: SpanStatus.OK }));

      prevPathRef.current = location.pathname;

      if (import.meta.env.DEV) {
        console.log("PostHog: Route tracked", location.pathname);
      }
    }
  }, [location]);

  return null;
};
