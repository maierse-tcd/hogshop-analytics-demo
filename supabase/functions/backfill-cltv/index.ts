import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createLogger } from "../_shared/posthog-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One-shot backfill: aggregates historical purchase_completed events from
 * PostHog per customer email and overwrites customer_lifetime_value and
 * total_purchases via $set. After this runs, future purchases will continue
 * to increment via $add in track-success.
 *
 * Invoke with optional ?dry_run=1 to preview without writing.
 */
serve(async (req) => {
  const log = createLogger("backfill-cltv");
  log.info("Backfill invoked", { method: req.method, url: req.url });

  if (req.method === "OPTIONS") {
    await log.flush();
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "1";

    const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://ph.hogflix.dev";
    const POSTHOG_API_HOST = Deno.env.get("POSTHOG_API_HOST") || "https://eu.posthog.com";
    const PROJECT_ID = Deno.env.get("POSTHOG_PROJECT_ID");
    const PERSONAL_KEY = Deno.env.get("POSTHOG_PERSONAL_API_KEY");
    const PROJECT_KEY =
      Deno.env.get("POSTHOG_PROJECT_API_KEY") ||
      Deno.env.get("POSTHOG_KEY") ||
      "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

    if (!PROJECT_ID || !PERSONAL_KEY) {
      throw new Error("Missing POSTHOG_PROJECT_ID or POSTHOG_PERSONAL_API_KEY");
    }

    // HogQL: aggregate historical purchases per email.
    // Uses total_amount (dollars) which has been correct from day one.
    const hogql = `
      SELECT
        properties.customer_email AS email,
        sum(toFloat(properties.total_amount)) AS lifetime_value,
        count() AS total_purchases
      FROM events
      WHERE event = 'purchase_completed'
        AND properties.customer_email IS NOT NULL
        AND properties.customer_email != ''
      GROUP BY email
    `;

    log.info("Running HogQL aggregation", { project_id: PROJECT_ID });

    const queryRes = await fetch(
      `${POSTHOG_API_HOST}/api/projects/${PROJECT_ID}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PERSONAL_KEY}`,
        },
        body: JSON.stringify({
          query: { kind: "HogQLQuery", query: hogql },
        }),
      },
    );

    if (!queryRes.ok) {
      const text = await queryRes.text();
      log.error("HogQL query failed", { status: queryRes.status, body: text.substring(0, 500) });
      throw new Error(`HogQL query failed: ${queryRes.status}`);
    }

    const queryJson = await queryRes.json();
    const rows: Array<[string, number, number]> = queryJson.results || [];
    log.info("HogQL returned rows", { count: rows.length });

    const aggregates = rows.map(([email, lifetime_value, total_purchases]) => ({
      email,
      lifetime_value: Number(lifetime_value) || 0,
      total_purchases: Number(total_purchases) || 0,
    }));

    if (dryRun) {
      log.info("Dry run — not writing to PostHog", { sample: aggregates.slice(0, 5) });
      await log.flush();
      return new Response(
        JSON.stringify({ dry_run: true, person_count: aggregates.length, sample: aggregates.slice(0, 20) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Push corrected values via the public capture endpoint using $set.
    // Batched to avoid blowing up on huge result sets.
    let written = 0;
    let failed = 0;
    const BATCH = 25;

    for (let i = 0; i < aggregates.length; i += BATCH) {
      const slice = aggregates.slice(i, i + BATCH);
      const results = await Promise.all(
        slice.map((row) =>
          fetch(`${POSTHOG_HOST}/capture/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: PROJECT_KEY,
              event: "$set",
              distinct_id: row.email,
              properties: {
                $set: {
                  customer_lifetime_value: row.lifetime_value,
                  total_purchases: row.total_purchases,
                  cltv_backfilled_at: new Date().toISOString(),
                },
              },
            }),
          })
            .then((r) => (r.ok ? "ok" : `bad:${r.status}`))
            .catch((e) => `err:${String(e)}`),
        ),
      );
      results.forEach((r) => (r === "ok" ? written++ : failed++));
    }

    log.info("Backfill complete", { written, failed, total: aggregates.length });
    await log.flush();

    return new Response(
      JSON.stringify({
        ok: true,
        person_count: aggregates.length,
        written,
        failed,
        sample: aggregates.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Backfill error", { message });
    await log.flush();
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
