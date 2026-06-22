# Client Audit AI — Roadmap

> **Status:** Draft v0.2 (updated for Phase 0.5 decisions)
> **Purpose:** Phased delivery plan from documentation to a scalable product.
> **Related:** [`DECISIONS.md`](./DECISIONS.md) (source of truth) · [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) · [`TECH_STACK.md`](./TECH_STACK.md)

---

## Guiding principles for sequencing
- Prove **credibility (sourcing + uncertainty)** before breadth.
- Get a **thin end-to-end slice** (URL → some real, sourced sections → readable output) working before completing all 13 sections.
- Never ship a path that can fabricate data — sourcing/confidence is built in from Phase 1, not bolted on later.

---

## Phase 0 — Documentation foundation ✅
- Product spec, audit framework, tech stack, prompts, data model, roadmap, CLAUDE.md. **Merged.**

## Phase 0.5 — Decisions ✅ (this PR)
**Goal:** Resolve the product/technical decisions blocking a serious MVP.
- [`DECISIONS.md`](./DECISIONS.md) (D1–D12) + reconciling updates across all docs.
- **Exit criteria:** Data-source scope, latency, cost, async mechanism, auth, MVP section set, scorecard, case-studies, sourcing standard, golden example, anti-generic prompt rules, and data-model tightening are all decided.

---

## Phase 0.75 — De-risking spike (recommended before scaffolding)
> **Scope note:** this spike validates only **one link** of the pipeline (evidence → sourced finding → verification for a single section). The MVP remains the full **URL-in → automated audit-out** product (auto-detection of brand/what-it-sells/industry/business-model/market-geography/competitors + full-coverage generation); the spike does not narrow that goal. See [`SPIKE_PLAN.md`](./SPIKE_PLAN.md).

**Goal:** Prove the evidence loop on **one real URL** before building infrastructure.
- Take one real URL → run **one** crawl + tech/tag detection → generate **one** section (e.g. Analytics & Tracking) with the generate+verify passes.
- **Measure:** can claims be genuinely sourced? latency? cost?
- **Exit criteria:** a sourced, specific, non-generic single section within the D2 latency / D3 cost envelope. If not, fix the approach before scaffolding.

---

## Phase 1 — MVP: thin end-to-end slice  🚧 in progress
> **PR1 scaffold landed:** Next.js/TS/Tailwind + Supabase schema/RLS + auth + the evidence→detection→generate→verify pipeline + sourced report UI. **Analytics & Tracking** is the only fully generated section; headless runtime capture (`renderedNetwork`) and the other six sections are the next increments (Phase 1.1+).

**Goal:** URL in → a real, sourced, readable audit of the **MVP section set** out.
- Next.js + TypeScript + Tailwind + shadcn/ui scaffold; Supabase project + schema + RLS; Vercel deploy.
- **Auth:** Supabase Auth, **single-tenant**, org-aware schema + RLS from day one (D5).
- **Async pipeline:** durable workflow runner + Supabase state (D4); streamed progress states (D2).
- **URL ingestion + validation.**
- **Auto-detection** of brand, industry, business model, competitors (with confidence). *(Full competitive benchmark deferred — D6.)*
- **Evidence layer v1** — MVP sources only: site fetch/render + metadata + tech/tag detection, stored as `evidence` with citations (D1).
- **Runtime tracking pipeline (REQUIRED for Analytics & Tracking)** — validated by the Phase 0.75 spike ([`SPIKE_RESULTS.md`](./SPIKE_RESULTS.md)): **static HTML fetch + GTM container introspection + headless/rendered browser check + runtime network capture + vendor-endpoint filtering + browser-noise filtering**. Static-only is insufficient for this section. Each evidence item records its `detection_method`; tags are confirmed only via runtime/container methods (see [`TECH_STACK.md`](./TECH_STACK.md) §3a).
- **Audit generation — exactly the MVP section set (D6):** Client Introduction, Business Model & Strategy, Website, Analytics & Tracking, SEO, Executive Summary, Open Questions.
- **No numeric scorecard** — per-section evidence-confidence indicators instead (D7).
- **Sourcing + confidence rendered** in the UI; **Open Questions** live.
- **Verification pass** (anti-hallucination, anti-generic) wired in as a gate.
- **Cost/latency guardrails** enforced (D2/D3).
- **Exit criteria:** A real company URL produces a trustworthy, sourced MVP audit with zero fabricated numbers; uncertainty visibly marked; within latency/cost envelope (or honest partial).

**Risks:** detection accuracy; crawl reliability/blocking; LLM cost; keeping output non-generic.

---

## Phase 2 — Broader coverage + scorecard returns
**Goal:** Expand beyond the own-site surface and reintroduce scoring honestly.
- Add sections that need new sources: Industry Context, Competitive Benchmark, Customer Journey, Paid Media, Social & Content, CRO, Brand & Creative.
- **Data-source integrations** expanded (SERP, SEO data, ads transparency, social) under confirmed ToS — moving items from D1's "paid/later" tier into scope.
- **Numeric scorecard returns (D7):** only once ≥ 8 scorable dimensions have real underlying sections; define per-level (1–5) criteria + default weights then.
- Full **sourcing/confidence UI** and sources panel per section.
- **Exit criteria:** Multi-section audit on arbitrary URLs with the scorecard live, every researched claim sourced or marked Unverified.

---

## Phase 3 — Strategic depth & differentiation
**Goal:** The insight that makes it "first-class".
- **Competitive benchmark** depth (comparative tables, whitespace).
- **Growth Diagnosis** — growth model, loop opportunities, and **sourced same-industry loop case studies**.
- **AI Readiness** assessment.
- **Risks & Alerts** consolidated register (incl. attribution risks).
- **Export & sharing** (PDF / Markdown / shareable link).
- **Exit criteria:** Audits read like senior consultant output and drive real client decisions.

---

## Phase 4 — Agency-grade scale & collaboration
**Goal:** Production-grade for teams.
- Multi-tenant agency features, roles/permissions, audit history & comparison, re-runs/deltas.
- Cost/perf hardening, caching, observability dashboards.
- Optional account integrations (e.g. GA4) to move from external-signal to verified-data audits.
- **Exit criteria:** Reliable, cost-controlled, multi-org product.

---

## Cross-phase backlog / open items
**Resolved in [`DECISIONS.md`](./DECISIONS.md):** ~~MVP data-source scope~~ (D1), ~~latency target & streaming UX~~ (D2), ~~async mechanism~~ (D4), ~~auth~~ (D5), ~~MVP section set~~ (D6), ~~scorecard timing~~ (D7), ~~case studies~~ (D8).

**Still open:**
- Scorecard default weights + per-level criteria (define when scorecard returns, Phase 2).
- Pricing/packaging.
- Workflow-runner vendor final pick (Inngest vs. Trigger.dev) — at implementation.
- Multi-language output (post-English).
