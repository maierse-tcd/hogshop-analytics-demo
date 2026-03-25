import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { posthog } from "@/lib/posthog";

export const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof window !== "undefined" && posthog) {
      // Track pageview with PostHog's built-in event
      posthog.capture("$pageview", {
        $current_url: window.location.href,
        path: location.pathname,
        search: location.search,
        title: document.title,
      });

      // Also track custom page_view event for backwards compatibility
      posthog.capture("page_view", {
        page: location.pathname,
        search: location.search,
        url: window.location.href,
      });

      console.log("PostHog: Route tracked", location.pathname);
    }
  }, [location]);

  return null;
};
