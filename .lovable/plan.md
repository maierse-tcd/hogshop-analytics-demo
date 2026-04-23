

## Demoing PostHog MCP to a Customer

Short answer: **no, you don't need to download this project.** This Hogshop repo doesn't contain an MCP server — it's a demo storefront that *emits* PostHog data. The "PostHog MCP" is a separate hosted service from PostHog that exposes your analytics/flags/experiments to an MCP-compatible client.

For a clean customer demo, run the PostHog MCP in an MCP-capable client pointed at a PostHog project that already has rich data (this Hogshop project is a great data source because the bots generate continuous events, funnels, experiments, and session replays).

### Recommended demo setup

**Best option — Claude Desktop or Cursor on your laptop**

1. Install the PostHog MCP locally with the official wizard:
   ```
   npx @posthog/wizard mcp add
   ```
   It auto-configures Claude Desktop, Cursor, VS Code, or Windsurf and walks through PostHog auth.
2. Point it at the PostHog project that backs Hogshop (so the customer sees real funnels, flags like `add-to-cart-cta-experiment` and `newsletter_sub`, session replays, errors from the error simulator, etc.).
3. Demo prompts to run live:
   - "Show me the top events in the last 24 hours"
   - "What's the conversion rate of the add-to-cart experiment variants?"
   - "Find session replays where users hit a checkout error"
   - "Which feature flags are currently active and what's their rollout?"
   - "Summarize the funnel from homepage → product view → add to cart → checkout"

**Alternative — Claude Code in this repo**

You *can* clone this repo and use Claude Code, but cloning Hogshop adds nothing to the MCP demo itself. Claude Code would still need the PostHog MCP configured separately in its MCP settings. Only do this if you also want to show "AI editing the storefront code while reading live analytics" as a combined story.

**Alternative — Lovable itself**

The PostHog MCP is also available as a Lovable connector (Connectors → PostHog). Once connected, I can answer PostHog questions directly in chat. Good for showing the Lovable + PostHog story, less good as a standalone "MCP" demo since it's wrapped in Lovable's UI.

### Why this repo is still valuable for the demo

Even though you don't run the repo *for* the MCP, keep it running in the background because it produces:

- Live event stream (bots fire continuously)
- Multiple active experiments and feature flags
- Error tracking data (intentional error simulator)
- Session replays with console logs
- Group analytics (UX Choice / theme)
- Subscription lifecycle events
- A verified-identity Support widget setup (just shipped)

That gives the MCP something interesting to query during the demo instead of an empty project.

### Recommendation

Use **Claude Desktop + `npx @posthog/wizard mcp add`** pointed at the Hogshop PostHog project. Fastest setup, cleanest "look what an AI can do with your analytics" story, no repo clone needed.

Want me to draft a 5-minute demo script with specific prompts and expected outputs tailored to this customer?

