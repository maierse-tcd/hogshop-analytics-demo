

## PostHog MCP Connection Issue

The PostHog MCP connector is available in Lovable's catalog but isn't currently linked to this project. Let's get it connected so I can access your PostHog analytics, feature flags, and experiments directly while building.

### Action

Click the button below to launch the PostHog MCP connection flow. You'll be prompted to authorize Lovable to access your PostHog workspace.

### If the connect button still doesn't work

A few common causes and fixes:

1. **Popup blocker** — The OAuth flow opens in a popup. Check your browser's address bar for a blocked-popup icon and allow popups for `lovable.dev`.
2. **Third-party cookies blocked** — Safari and some Chrome configurations block third-party cookies by default, which breaks OAuth handshakes. Enable third-party cookies for `lovable.dev` and `posthog.com`.
3. **Logged into wrong PostHog account** — If you're already logged into a different PostHog account in the same browser, log out first or use an incognito window.
4. **Workspace permissions** — MCP connectors are scoped to the workspace. Make sure you're the workspace owner or have permission to add connectors. Check **Connectors** (root level in the sidebar) to see what's enabled at the workspace level.
5. **Browser extension interference** — Ad blockers and privacy extensions sometimes block OAuth redirects. Try in incognito mode with extensions disabled.

### Alternative if it still won't connect

Go to **Connectors** (root level in the sidebar) → find PostHog → connect from there directly. That UI gives clearer error messages than the in-chat button if something is failing.

### What you'll get once connected

- I can read your feature flags, experiments, and event taxonomy directly
- I can validate that events I add to the code actually show up in your PostHog project
- I can help debug why a flag isn't returning the expected variant
- I can suggest funnels/insights based on actual events in your project

<lov-actions>
<lov-mcp-connect connectorId="posthog" displayName="PostHog">Connect PostHog MCP</lov-mcp-connect>
<lov-suggestion message="Still won't connect — what error message am I seeing? Let me share a screenshot.">Share error screenshot</lov-suggestion>
<lov-suggestion message="Skip the MCP — let's just continue building without it for now">Skip MCP for now</lov-suggestion>
</lov-actions>
