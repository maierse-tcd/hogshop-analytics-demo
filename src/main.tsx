import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureCampaignFromUrl, initPostHog } from "./lib/posthog";

// Initialise PostHog before React renders so descendant components (e.g.
// RouteTracker) can record metrics/pageviews on first mount without racing
// against the posthog.init() call.
initPostHog();
captureCampaignFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
