# PostHog Distributed Tracing — Feasibility Assessment for HogShop

## What PostHog actually offers

PostHog Distributed Tracing (currently **alpha**) is a generic **OTLP/HTTP receiver**. Key facts from the docs:

- **Endpoint:** `<host>/i/v1/traces` — for us that's `https://ph.hogflix.dev/i/v1/traces` (same reverse-proxy host already used by `posthog-logger.ts` for `/i/v1/logs`).
- **Auth:** `Authorization: Bearer <project_token>` — the **public** project token (`POSTHOG_PROJECT_API_KEY` server-side, `VITE_PUBLIC_POSTHOG_KEY` client-side). Not a personal API key.
- **Protocol:** standard OTLP HTTP. Docs prefer `http/protobuf` (`@opentelemetry/exporter-trace-otlp-proto`), but `http/json` works too.
- **No PostHog SDK** required — any OTel client works. Spans become a tree via `trace_id` / `span_id` / `parent_span_id`.
- **Distinct from `/i/v0/ai/otel`** — that one is LLM-only. We'd still keep our existing `$ai_generation` / `$ai_trace` events; this is general application tracing.
- **Same project** as session replays, errors, logs, analytics → traces show up alongside the rest of HogShop's data.

## Can we implement it here? Yes — with caveats

| Surface | Verdict | Notes |
|---|---|---|
| **Supabase Edge Functions (Deno)** | ✅ Clean fit | We already POST OTLP logs to `/i/v1/logs` via a hand-rolled exporter (`_shared/posthog-logger.ts`). Doing the same for `/i/v1/traces` is ~80 lines. Either reuse that pattern (no npm deps, fast cold start) or use `npm:@opentelemetry/sdk-trace-base` — both work in Deno. Reuses existing `POSTHOG_PROJECT_API_KEY` secret. |
| **Browser (React + Vite)** | ✅ Works | `@opentelemetry/sdk-trace-web` + `@opentelemetry/exporter-trace-otlp-proto` + auto-instrumentations. Cost: ~45–55 KB gzipped. Uses `VITE_PUBLIC_POSTHOG_KEY` (already public). |
| **Distributed (browser → edge)** | ✅ Works | Propagate W3C `traceparent` header; needs `traceparent` added to `Access-Control-Allow-Headers` on each edge function. |
| **Bots** (`playwright-hedgehog-bots`) | ✅ Trivial later | Node OTel SDK; can emit "bot session" traces if useful for the demo. |
| **Metrics** | ⛔ Skip | PostHog tracing covers traces only; no first-class OTel metrics. |

### Honest caveats

1. **Alpha product** — docs explicitly warn the endpoint may change.
2. **PostHog's trace UI is tuned for LLM/app traces, not full APM** (no flamegraph polish like Honeycomb). Fine for a demo app.
3. **Overlap with existing instrumentation** — `posthog-js` already auto-captures pageviews, clicks, network. OTel traces are additive and most useful for **cross-boundary flows** (browser → edge → Stripe/Gemini), not for replacing analytics events.
4. **Bundle cost on the client** — non-trivial for a marketing-style site. Worth it for showcase value, less worth it as silent infra.

## Recommended implementation (POC-first, demo-optimized)

Given HogShop is a PostHog showcase app, the highest-value slice is **one end-to-end distributed trace** that visibly demonstrates the product, then expand. Concretely:

### Phase 1 — POC: AI chat as a single distributed trace

```text
browser:  chat.send_message
   └─ HTTP POST /functions/v1/ai-chat  (traceparent propagated)
         └─ edge: ai-chat.handle_request
               ├─ edge: ai-chat.gemini_call   (gen_ai.* attributes)
               └─ edge: ai-chat.flush_logs
```

Files:
- **Add** `src/lib/otel.ts` — minimal browser tracer (web SDK, batch exporter → `https://ph.hogflix.dev/i/v1/traces`, `Authorization: Bearer ${VITE_PUBLIC_POSTHOG_KEY}`, `service.name=hogshop-web`, helpers `getTracer()` / `withSpan()`).
- **Add** `supabase/functions/_shared/otel.ts` — hand-rolled OTLP/JSON exporter (mirrors `posthog-logger.ts`), with `startSpan`, `withSpan`, `extractTraceContext(req)`, `flush()`. No npm deps → preserves edge cold-start.
- **Modify** `src/main.tsx` — call `initOtel()` once after `initPostHog`.
- **Modify** `src/hooks/useAIChat.ts` — wrap `sendMessage` in `withSpan('chat.send_message', …)`, inject `traceparent` into the outgoing `fetch`. Existing `$ai_generation` / `$ai_trace` events stay untouched.
- **Modify** `supabase/functions/ai-chat/index.ts` — `extractTraceContext(req)`, wrap handler + Gemini fetch in spans, add `traceparent` to `Access-Control-Allow-Headers`, flush before returning.

Secrets/config: zero new secrets, zero `config.toml` changes.

### Phase 2 — Extend coverage (after Phase 1 looks good in PostHog)

Add the same `_shared/otel.ts` wrapping to `create-checkout`, `track-success`, `cancel-subscription`, `posthog-identity-hash`. Browser side: instrument the checkout button click and `RouteTracker` navigations so checkout becomes a distributed trace from CTA click through Stripe call. Cross-link with logs by stamping the active `trace_id` onto every `posthog-logger` entry so logs and traces correlate in the PostHog UI.

### Phase 3 — Optional polish

- Bot scripts emit a "bot session" trace per persona run (great for the demo dashboard).
- A small "Tracing demo" toggle gated by a `promo-tracing-demo` feature flag, surfacing a `trace_id` in the UI as a debug breadcrumb.

## Risks / things I'd want to verify in Phase 1

- Confirm OTLP/JSON is accepted at `/i/v1/traces` (docs lean on protobuf; JSON is simpler in Deno without npm).
- Confirm `ph.hogflix.dev` reverse proxy forwards `/i/v1/traces` (it forwards `/i/v1/logs`, so very likely — but worth one curl).
- Tracing exports must fail silently — never break chat/checkout if PostHog OTLP returns 4xx/5xx.
- CORS: `traceparent` must be added to `Access-Control-Allow-Headers` on every instrumented edge function.

## Decisions I'd like before building

1. **Start with Phase 1 only** (AI chat POC), or go straight to Phase 1 + Phase 2 (all edge functions)?
2. **Edge tracer**: hand-rolled OTLP/JSON (no deps, mirrors `posthog-logger.ts`) — recommended — or pull in `@opentelemetry/sdk-trace-base` via `npm:` for full SDK fidelity?
3. **Browser exporter**: `http/protobuf` (matches docs, slightly larger) or `http/json` (smaller, simpler)?

My defaults if you don't pick: **Phase 1**, **hand-rolled edge tracer**, **`http/json` in the browser**.
