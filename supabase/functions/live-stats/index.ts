import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createLogger } from "../_shared/posthog-logger.ts";
import { createMetrics } from "../_shared/metrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENDPOINT_BASE = "https://eu.posthog.com/api/projects/97205/endpoints";

interface EndpointResponse {
  columns?: string[];
  results?: unknown[][];
}

/** Convert positional rows into objects using the returned columns array. */
function toObjects(payload: EndpointResponse): Record<string, unknown>[] {
  const columns = payload.columns ?? [];
  const results = payload.results ?? [];
  return results.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

async function runEndpoint(name: string, apiKey: string): Promise<EndpointResponse> {
  const res = await fetch(`${ENDPOINT_BASE}/${name}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PostHog endpoint "${name}" failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return (await res.json()) as EndpointResponse;
}

serve(async (req) => {
  const log = createLogger("live-stats");
  const metrics = createMetrics("hogshop-edge");
  const requestStartedAt = Date.now();
  let requestStatus: "ok" | "error" = "ok";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read-only PostHog personal API key scoped to endpoint:read on project 97205.
    const POSTHOG_ENDPOINTS_KEY = Deno.env.get("POSTHOG_ENDPOINTS_LIVE");
    if (!POSTHOG_ENDPOINTS_KEY) {
      requestStatus = "error";
      log.error("POSTHOG_ENDPOINTS_LIVE is not configured");
      await log.flush();
      return new Response(
        JSON.stringify({ error: "Live stats are not configured on the server." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    let trafficRaw: EndpointResponse;
    let funnelRaw: EndpointResponse;
    try {
      [trafficRaw, funnelRaw] = await Promise.all([
        runEndpoint("hogshop-live-traffic", apiKey),
        runEndpoint("hogshop-live-funnel", apiKey),
      ]);
    } catch (err) {
      requestStatus = "error";
      const message = err instanceof Error ? err.message : String(err);
      log.error("PostHog endpoint request failed", { message });
      await log.flush();
      return new Response(
        JSON.stringify({ error: "Could not load live stats from PostHog." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }

    const traffic = toObjects(trafficRaw);
    const funnel = toObjects(funnelRaw)[0] ?? null;

    log.info("Live stats fetched", {
      trafficRows: traffic.length,
      hasFunnel: Boolean(funnel),
    });
    await log.flush();

    return new Response(
      JSON.stringify({ traffic, funnel, generated_at: new Date().toISOString() }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
        status: 200,
      },
    );
  } catch (error) {
    requestStatus = "error";
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Live stats error", { message: errorMessage });
    await log.flush();
    return new Response(JSON.stringify({ error: "Could not load live stats." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  } finally {
    metrics.count("hogshop.edge.requests", 1, {
      attributes: { function: "live-stats", status: requestStatus },
    });
    metrics.histogram("hogshop.edge.duration", Date.now() - requestStartedAt, {
      unit: "ms",
      attributes: { function: "live-stats" },
    });
    await metrics.flush();
  }
});
