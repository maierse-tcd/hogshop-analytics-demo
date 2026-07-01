import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createLogger } from "../_shared/posthog-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One-shot reconciliation: derives each customer's true customer_lifecycle
 * from their real subscription_created/subscription_cancelled/purchase_completed
 * event history, then overwrites the person property AND re-associates the
 * person with the correct `customer_lifecycle` group. Fixes drift where
 * ~1000 profiles were mislabeled "Active Subscriber".
 *
 * Invoke with optional ?dry_run=1 to preview without writing.
 */
serve(async (req) => {
  const log = createLogger("backfill-lifecycle");
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
    // Public project key (matches src/lib/posthog.ts). The secret
    // POSTHOG_PROJECT_API_KEY holds a personal key which /capture/ rejects.
    const PROJECT_KEY = "phc_mCl11WvLPwmqyjG7FlivcsSbTfSEY1J3TWcEnnR0CJa";

    if (!PROJECT_ID || !PERSONAL_KEY) {
      throw new Error("Missing POSTHOG_PROJECT_ID or POSTHOG_PERSONAL_API_KEY");
    }

    // HogQL: derive lifecycle from real event history per email.
    const hogql = `
      SELECT
        distinct_id AS email,
        multiIf(
          maxIf(toUnixTimestamp(timestamp), event = 'subscription_created') > 0
            AND maxIf(toUnixTimestamp(timestamp), event = 'subscription_created') > maxIf(toUnixTimestamp(timestamp), event = 'subscription_cancelled'),
            'Active Subscriber',
          maxIf(toUnixTimestamp(timestamp), event = 'subscription_cancelled') > 0,
            'Churned Subscriber',
          countIf(event = 'purchase_completed' AND ifNull(toString(properties.backfilled), '') != 'true') > 0,
            'One-Time Buyer',
          'Prospect'
        ) AS lifecycle
      FROM events
      WHERE event IN ('subscription_created', 'subscription_cancelled', 'purchase_completed')
        AND distinct_id LIKE '%@%'
      GROUP BY distinct_id
      LIMIT 100000
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
    const rows: Array<[string, string]> = queryJson.results || [];
    log.info("HogQL returned rows", { count: rows.length });

    const customers = rows.map(([email, lifecycle]) => ({
      email,
      lifecycle: String(lifecycle),
    }));

    if (dryRun) {
      log.info("Dry run — not writing to PostHog", { sample: customers.slice(0, 5) });
      await log.flush();
      return new Response(
        JSON.stringify({
          dry_run: true,
          person_count: customers.length,
          sample: customers.slice(0, 20),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // 1) Refresh canonical customer_lifecycle group definitions.
    const GROUP_KEYS = [
      "Active Subscriber",
      "Churned Subscriber",
      "One-Time Buyer",
      "Prospect",
    ];
    await Promise.all(
      GROUP_KEYS.map(async (key) => {
        try {
          const r = await fetch(`${POSTHOG_HOST}/capture/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: PROJECT_KEY,
              event: "$groupidentify",
              distinct_id: "backfill-lifecycle",
              properties: {
                $group_type: "customer_lifecycle",
                $group_key: key,
                $group_set: {
                  name: key,
                  is_subscriber: key === "Active Subscriber",
                  churned: key === "Churned Subscriber",
                },
              },
            }),
          });
          if (!r.ok) {
            const text = await r.text();
            log.warn("groupidentify failed", { key, status: r.status, body: text.substring(0, 120) });
          }
        } catch (e) {
          log.warn("groupidentify threw", { key, error: String(e).substring(0, 120) });
        }
      }),
    );

    // 2) Per-customer reconciliation: single event fixes person property + group membership.
    let written = 0;
    let failed = 0;
    const failureSamples: string[] = [];
    const BATCH = 25;

    for (let i = 0; i < customers.length; i += BATCH) {
      const slice = customers.slice(i, i + BATCH);
      const results = await Promise.all(
        slice.map(async (row) => {
          try {
            const r = await fetch(`${POSTHOG_HOST}/capture/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                api_key: PROJECT_KEY,
                event: "lifecycle_reconciled",
                distinct_id: row.email,
                properties: {
                  $groups: { customer_lifecycle: row.lifecycle },
                  $set: {
                    customer_lifecycle: row.lifecycle,
                    subscription_active: row.lifecycle === "Active Subscriber",
                    subscription_cancelled: row.lifecycle === "Churned Subscriber",
                    lifecycle_reconciled_at: new Date().toISOString(),
                  },
                },
              }),
            });
            if (r.ok) return "ok";
            const text = await r.text();
            return `bad:${r.status}:${text.substring(0, 80)}`;
          } catch (e) {
            return `err:${String(e).substring(0, 80)}`;
          }
        }),
      );
      results.forEach((r) => {
        if (r === "ok") written++;
        else {
          failed++;
          if (failureSamples.length < 3) failureSamples.push(r);
        }
      });
    }

    log.info("Reconciliation complete", { written, failed, total: customers.length, failureSamples });
    await log.flush();

    return new Response(
      JSON.stringify({
        ok: true,
        person_count: customers.length,
        written,
        failed,
        sample: customers.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Reconciliation error", { message });
    await log.flush();
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
