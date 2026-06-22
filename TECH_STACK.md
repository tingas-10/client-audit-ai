# Client Audit AI — Tech Stack & Architecture

> **Status:** Draft v0.2 (updated for Phase 0.5 decisions)
> **Purpose:** How we'll build the MVP. Implementation-ready, but no app code yet.
> **Related:** [`DECISIONS.md`](./DECISIONS.md) (source of truth) · [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) · [`DATA_MODEL.md`](./DATA_MODEL.md) · [`ROADMAP.md`](./ROADMAP.md)

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

**MVP source scope is now LOCKED — see [`DECISIONS.md`](./DECISIONS.md) D1.** Summary:

| Tier | Sources |
|---|---|
| ✅ **In MVP** | Target site fetch/render (HTML, DOM, headers, robots/sitemap), metadata (OG/JSON-LD/schema.org), tech/tag detection (GA4, GTM, pixels, widgets, CMS/platform), on-site conversion/lifecycle signals, publicly linked social URLs, basic performance signals |
| 💳 **Paid / later** | SERP & rankings, backlinks/authority/traffic estimates (Ahrefs/Semrush/SimilarWeb), ad-library creative/spend depth, social analytics APIs, web-search grounding for stats & case studies |
| 🚫 **Excluded MVP** | Anything needing the client's own account access (GA4, ad accounts, CRM/CDP), scraping behind auth/paywall, purchased datasets, ToS-prohibited automated access |

**Compliance rules (still binding):** respect `robots.txt`/ToS, rate-limit our crawl, store provenance, mark blocked/unavailable sources as `Unverified`.

---

## 4. LLM orchestration

- **Models:** Anthropic Claude, latest models (see project `claude-api` reference). Default to the most capable current model for generation/critique; a faster model may be used for cheap detection/classification steps.
- **Structured outputs:** Sections generated against typed schemas matching [`DATA_MODEL.md`](./DATA_MODEL.md) (claims, confidence, citations).
- **Tool use:** The model calls tools to fetch evidence rather than recalling facts from memory; this enforces sourceability.
- **Verification pass:** A dedicated critique step checks every section for unsourced claims, fabricated numbers, and unmarked uncertainty before it is persisted.
- **Cost controls:** Per-audit token/cost budget (**≤ $2.00 soft, $3.50 hard cap** — [`DECISIONS.md`](./DECISIONS.md) D3), caching of evidence, per-audit max LLM-call and max tool/fetch counts. At hard cap: stop generation, mark remaining sections `Unverified`, complete partially. Per-step cost is tracked in `jobs` and rolled up to the audit (see [`DATA_MODEL.md`](./DATA_MODEL.md) D12 changes).

---

## 5. Jobs, queueing & scheduling

**DECIDED — see [`DECISIONS.md`](./DECISIONS.md) D4:** Audits run as **durable background jobs orchestrated by a step/workflow runner (Inngest or Trigger.dev) on Vercel, with all state in Supabase.**

- API route handler **enqueues** and returns immediately; the runner executes **discrete durable steps** (detect → gather → generate-section × N → verify → score → synthesize), each within serverless time limits, with **retries** and **observability**.
- Supabase (`audits`, `audit_sections`, `jobs`) is the single source of truth for progress; the UI polls/subscribes.
- **Latency envelope (D2):** ideal ≤ 90s, acceptable ≤ 4m, **hard ceiling 6m** → remaining sections marked `Unverified`, audit completes partially.
- **Graceful degradation:** a failing/blocked data source marks affected claims `Unverified`; the audit still completes.
- The step-based design ports to a self-hosted worker later because state already lives in Supabase (vendor lock-in is low).

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

# Workflow runner (D4) — one of:
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
# (or Trigger.dev equivalents)

# Data sources — NOTE: MVP uses our own crawl (no paid keys required).
# The below are PAID/LATER (D1), not needed for MVP:
# SERP_API_KEY=
# SEO_DATA_API_KEY=

# App
APP_BASE_URL=
AUDIT_COST_BUDGET_USD=2.00          # soft per-audit guardrail (D3)
AUDIT_COST_HARD_CAP_USD=3.50        # hard cap → stop + mark Unverified (D3)
```

> Secrets are configured in Vercel/Supabase, never committed.

---

## 8. Repo conventions (for when code lands)

- TypeScript strict mode; shared types for audit/section/evidence contracts.
- `app/` (routes), `components/` (shadcn-based UI), `lib/` (LLM, data sources, orchestration), `db/` (migrations/schema), `prompts/` (mirrors [`PROMPTS.md`](./PROMPTS.md)).
- Migrations checked into the repo; RLS policies versioned.
- See [`CLAUDE.md`](./CLAUDE.md) for the rules future contributors (human or AI) must follow.
