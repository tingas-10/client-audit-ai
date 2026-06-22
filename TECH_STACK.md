# Client Audit AI — Tech Stack & Architecture

> **Status:** Draft v0.1
> **Purpose:** How we'll build the MVP. Implementation-ready, but no app code yet.
> **Related:** [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) · [`DATA_MODEL.md`](./DATA_MODEL.md) · [`ROADMAP.md`](./ROADMAP.md)

---

## 1. Chosen stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router)** | SSR/RSC, route handlers for APIs, great Vercel fit |
| Language | **TypeScript** | Type safety across UI, API, and data contracts |
| Styling | **Tailwind CSS** | Fast, consistent utility styling |
| UI components | **shadcn/ui** | Accessible, composable, ownable component primitives |
| Backend / DB | **Supabase** (Postgres + Auth + Storage + RLS) | Managed Postgres, row-level security, auth, file storage |
| Hosting | **Vercel** | First-class Next.js deploys, edge/serverless functions, cron |
| LLM | **Anthropic Claude (latest models)** | Audit generation, detection, critique; structured outputs + tool use |

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js (Vercel)                                            │
│  ┌───────────────┐   ┌──────────────────────────────────┐   │
│  │ App Router UI │   │ Route Handlers / Server Actions  │   │
│  │ (RSC + shadcn)│   │  - start audit                   │   │
│  └───────┬───────┘   │  - get audit status/results      │   │
│          │           │  - answer clarifying questions   │   │
│          │           └───────────────┬──────────────────┘   │
└──────────┼───────────────────────────┼──────────────────────┘
           │                           │
           ▼                           ▼
   ┌───────────────┐         ┌──────────────────────┐
   │   Supabase    │◄────────│  Audit Orchestrator   │
   │ Postgres+Auth │         │  (background jobs)    │
   │ Storage + RLS │         └──────┬─────────┬──────┘
   └───────────────┘                │         │
                                    ▼         ▼
                        ┌──────────────┐  ┌──────────────────┐
                        │ Research /   │  │  LLM layer        │
                        │ Data sources │  │  (Claude)         │
                        │ (evidence)   │  │  detect/gen/verify│
                        └──────────────┘  └──────────────────┘
```

### Components
- **UI (App Router + RSC + shadcn/ui)** — input, progress, report view, scorecard, sources panel, export.
- **API (Route Handlers / Server Actions)** — start/poll audits, submit clarifying answers, fetch results.
- **Audit Orchestrator (background jobs)** — long-running pipeline: detect → gather evidence → generate sections → verify → score → synthesize. Async, with progress persisted to Supabase. Triggered via queue/cron or a job runner (see §5).
- **Research / Data-source layer** — collects observable signals; every signal stored as an evidence record with a citation.
- **LLM layer** — Claude calls for detection, per-section generation, and a critique/verification pass; uses structured outputs and tool use (see [`PROMPTS.md`](./PROMPTS.md)).

---

## 3. External data sources (sourceability + legality)

> **Principle:** Every external signal must be (a) lawful to access, (b) compliant with the source's ToS/robots, and (c) stored with a citation. **No invented data.** When a source is blocked or unavailable, the related claim is marked **Unverified** (see [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) §0).

Candidate source categories (final MVP scope to be confirmed against ToS/legal):
- **Site content** — fetch & parse the target site (respecting robots/ToS).
- **Tech/tag detection** — identify analytics/marketing tags, frameworks, platforms from page output.
- **SERP / search presence** — organic visibility signals via a compliant SERP/API provider.
- **Ads transparency** — publicly available ad libraries (e.g. platform ad transparency centers) for creatives/activity.
- **SEO data** — backlink/keyword/visibility via a licensed SEO data API.
- **Social** — publicly available social profile signals via compliant APIs.

**Open items flagged for legal/product review (do not assume resolved):**
- Which providers are licensed and ToS-compliant for MVP.
- Scraping policy and rate/robots handling.
- Data retention limits per source.

---

## 4. LLM orchestration

- **Models:** Anthropic Claude, latest models (see project `claude-api` reference). Default to the most capable current model for generation/critique; a faster model may be used for cheap detection/classification steps.
- **Structured outputs:** Sections generated against typed schemas matching [`DATA_MODEL.md`](./DATA_MODEL.md) (claims, confidence, citations).
- **Tool use:** The model calls tools to fetch evidence rather than recalling facts from memory; this enforces sourceability.
- **Verification pass:** A dedicated critique step checks every section for unsourced claims, fabricated numbers, and unmarked uncertainty before it is persisted.
- **Cost controls:** Per-audit token/cost budget, caching of evidence, and step-level limits (see §6).

---

## 5. Jobs, queueing & scheduling

- Audits are **asynchronous**. The orchestrator runs as background work with progress written to Supabase (`jobs` / `audit` status).
- Options (decide in Phase 1): Vercel background functions + cron, a queue (e.g. Supabase queue / external queue), or a dedicated worker. Chosen approach documented when MVP is implemented.
- Graceful degradation: a failing data source marks affected claims Unverified; the audit still completes.

---

## 6. Cross-cutting concerns

- **Auth:** Supabase Auth; organizations + members; per-org data isolation via **RLS**.
- **Storage:** Supabase Storage for exported reports and captured artifacts (e.g. screenshots), with provenance.
- **Caching:** Cache evidence and detection results to reduce cost and re-fetching.
- **Observability:** Structured logs, per-step timing, per-audit cost tracking, error tracking.
- **Security:** Secrets in environment/secret manager; no secrets in repo; least-privilege keys.
- **Privacy/compliance:** Respect source ToS; document data provenance; configurable retention.

---

## 7. Environment variables (outline — names indicative)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only

# LLM
ANTHROPIC_API_KEY=

# Data sources (subset, depending on MVP scope)
SERP_API_KEY=
SEO_DATA_API_KEY=
TECH_DETECTION_API_KEY=

# App
APP_BASE_URL=
AUDIT_COST_BUDGET_USD=              # per-audit guardrail
```

> Secrets are configured in Vercel/Supabase, never committed.

---

## 8. Repo conventions (for when code lands)

- TypeScript strict mode; shared types for audit/section/evidence contracts.
- `app/` (routes), `components/` (shadcn-based UI), `lib/` (LLM, data sources, orchestration), `db/` (migrations/schema), `prompts/` (mirrors [`PROMPTS.md`](./PROMPTS.md)).
- Migrations checked into the repo; RLS policies versioned.
- See [`CLAUDE.md`](./CLAUDE.md) for the rules future contributors (human or AI) must follow.
