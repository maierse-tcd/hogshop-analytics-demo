// Computes HMAC-SHA256 of a distinct_id using the PostHog personal API key.
// Used to enable PostHog's Support product (verified identity).
// Docs: https://posthog.com/docs/support

import { createTracer, parseTraceparent, SpanKind } from "../_shared/otel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, traceparent",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const incoming = parseTraceparent(req.headers.get("traceparent"));
  const tracer = createTracer("hogshop-edge", incoming);

  try {
    return await tracer.withSpan(
      "posthog-identity-hash.handle_request",
      async (rootSpan) => {
        rootSpan.setAttributes({
          "http.method": req.method,
          "http.route": "/functions/v1/posthog-identity-hash",
          "trace.distributed": incoming !== null,
        });

        const { distinct_id } = await req.json();

        if (!distinct_id || typeof distinct_id !== "string") {
          rootSpan.setAttribute("error.kind", "invalid_distinct_id");
          return new Response(
            JSON.stringify({ error: "distinct_id (string) is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const secret = Deno.env.get("POSTHOG_PERSONAL_API_KEY");
        if (!secret) {
          rootSpan.setAttribute("error.kind", "missing_secret");
          return new Response(
            JSON.stringify({ error: "POSTHOG_PERSONAL_API_KEY is not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const identity_hash = await tracer.withSpan(
          "crypto.hmac_sha256",
          async (span) => {
            span.setAttributes({ "crypto.algorithm": "HMAC-SHA256" });
            const enc = new TextEncoder();
            const key = await crypto.subtle.importKey(
              "raw",
              enc.encode(secret),
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"],
            );
            const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(distinct_id));
            return Array.from(new Uint8Array(sigBuf))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
          },
        );

        return new Response(JSON.stringify({ identity_hash }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      },
      { kind: SpanKind.SERVER },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("posthog-identity-hash error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await tracer.flush();
  }
});
