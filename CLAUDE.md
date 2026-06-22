# CLAUDE.md — Guidance for Claude Code (and future contributors)

> Read this first. It tells you what this project is, the rules you must never break, and where to find detail.

## What this is
**Client Audit AI** is a web app that turns a single company/brand **URL** into an exhaustive, sourceable strategic audit, built for agencies and consultancies to deeply understand a client before working with them. It is **not** a generic "to-do list" grader.

## Read these, in order
1. [`DECISIONS.md`](./DECISIONS.md) — **source of truth** for locked product/technical decisions (Phase 0.5). Read this first; it overrides earlier docs where they conflict.
2. [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) — vision, users, flow, requirements.
3. [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) — the 13-section methodology + sourcing/confidence conventions (the product's core).
4. [`TECH_STACK.md`](./TECH_STACK.md) — architecture & stack.
5. [`DATA_MODEL.md`](./DATA_MODEL.md) — Supabase schema.
6. [`PROMPTS.md`](./PROMPTS.md) — prompt architecture & anti-hallucination patterns.
7. [`ROADMAP.md`](./ROADMAP.md) — phased delivery.

## Locked decisions (Phase 0.5 — see [`DECISIONS.md`](./DECISIONS.md))
- **MVP data = the target's own site** (HTML/DOM, metadata, tech/tag detection). Paid SEO/SERP/ads & web-search are deferred; account-access & login-walled scraping are excluded.
- **Always async**; ideal ≤90s, acceptable ≤4m, 6m hard ceiling with honest partial completion.
- **≤ $2.00/audit** soft budget, **$3.50** hard cap → stop + mark Unverified at the cap.
- **Durable background jobs** (workflow runner) with **Supabase** as state of truth.
- **Single-tenant authenticated** (Supabase Auth), org-aware schema + **RLS from day one**.
- **MVP sections:** Client Introduction, Business Model & Strategy, Website, Analytics & Tracking, SEO, Executive Summary, Open Questions. Everything else deferred.
- **No numeric scorecard in MVP** (confidence indicators instead); returns Phase 2.
- **Growth/case studies deferred**; later = loop *hypotheses*; cited case studies only with web-search grounding.
- **Anti-generic rule:** every insight must be evidence-backed, a sourced comparison, or a clearly marked inference — never generic advice.
- **Analytics & Tracking must never rely only on static HTML** (Phase 0.75 spike — [`SPIKE_RESULTS.md`](./SPIKE_RESULTS.md)). It requires static fetch **+ GTM container introspection + headless/rendered runtime network capture**, with vendor-endpoint and browser-noise filtering. Static absence = `Unknown/Unverified`, never "absent"; tags are confirmed only via runtime/container methods. Every such finding records its `detection_method`.

## Non-negotiable rules (these define the product)
1. **Do not invent data.** Never fabricate metrics, numbers, names, or dates.
2. **Sourceability.** Every researched claim must trace to a stored source/evidence record.
3. **Mark uncertainty explicitly** — High / Medium / Low / Unverified. Separate observed fact from inference from assumption.
4. **URL-first.** The product works from a URL as the main input.
5. **Auto-detect** brand, industry, business model, and competitors. **Ask clarifying questions only when truly necessary.**
6. **Exhaustive but readable.** Depth with structure and progressive disclosure.
7. **Prefer "Unverified / none found" over a guess.** Every unknown goes to Open Questions (Section 13).

## Stack (Phase 1 scaffold is live)
Next.js (App Router) · TypeScript · Tailwind · shadcn/ui-style components · Supabase (Postgres + Auth + RLS) · Vercel · Anthropic Claude (latest models) for detection/generation/verification.

## Running the app (Phase 1)
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill Supabase + Anthropic values.
3. Apply the schema: set `SUPABASE_DB_URL`, then `npm run migrate` (runs `db/migrations/0001_init.sql`).
4. `npm run dev` → http://localhost:3000 · sign up at `/login` · paste a URL.
5. `npm run build` / `npm run typecheck` / `npm run lint` for checks.

**Pipeline:** `lib/audit/orchestrator.ts` runs detect → gather_evidence → generate → persist. Evidence collectors live in `lib/evidence/collectors/`: static HTML, GTM container, and (Phase 1.1) **real headless `renderedNetwork`** capture via `playwright-core` + `@sparticuz/chromium`, gated by `ANALYTICS_RENDER_ENABLED`. If render is disabled or fails, it degrades gracefully — runtime-only tags stay `Unknown/Unverified`, **never reported as absent**. Only `digital_audit_analytics_tracking` generates real content; other sections are locked placeholders. No numeric scorecard (D7).

## When you build (future)
- Keep the LLM structured-output schemas in sync with [`DATA_MODEL.md`](./DATA_MODEL.md) and [`PROMPTS.md`](./PROMPTS.md).
- Always wire the **verification/critique pass** as a gate before persisting any generated section.
- Respect data-source ToS/robots; mark blocked sources as Unverified.
- Enable RLS on all org-scoped tables; never ship the service-role key to the client.
- Keep secrets out of the repo.
- TypeScript strict; suggested layout: `app/`, `components/`, `lib/`, `db/`, `prompts/`.

## Current state
Phase 1 (in progress) — the MVP scaffold is live: auth, Supabase schema + RLS, the evidence/detection/generation pipeline, and a sourced report UI. Only Analytics & Tracking is fully generated; headless runtime capture and the other six sections come next. Decisions remain locked in [`DECISIONS.md`](./DECISIONS.md); see [`ROADMAP.md`](./ROADMAP.md).
