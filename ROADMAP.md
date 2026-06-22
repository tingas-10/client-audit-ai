# Client Audit AI — Roadmap

> **Status:** Draft v0.1
> **Purpose:** Phased delivery plan from documentation to a scalable product.
> **Related:** [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) · [`TECH_STACK.md`](./TECH_STACK.md)

---

## Guiding principles for sequencing
- Prove **credibility (sourcing + uncertainty)** before breadth.
- Get a **thin end-to-end slice** (URL → some real, sourced sections → readable output) working before completing all 13 sections.
- Never ship a path that can fabricate data — sourcing/confidence is built in from Phase 1, not bolted on later.

---

## Phase 0 — Documentation foundation ✅ (this PR)
**Goal:** Shared, senior, implementation-ready understanding of the product.
- Product spec, audit framework, tech stack, prompts, data model, roadmap, CLAUDE.md.
- **Exit criteria:** Docs reviewed and merged; team aligned on framework and rules.

---

## Phase 1 — MVP: thin end-to-end slice
**Goal:** URL in → a real, sourced, readable partial audit out.
- Next.js + TypeScript + Tailwind + shadcn/ui scaffold; Supabase project + schema + RLS; Vercel deploy.
- **URL ingestion + validation.**
- **Auto-detection** of brand, industry, business model, competitors (with confidence).
- **Evidence layer v1** — site fetch/parse + tech/tag detection, stored as citations.
- **Audit generation for a core subset** of sections: Executive Summary, Client Introduction, Business Model & Strategy, Digital Audit → Analytics & Tracking, and Final Scorecard (partial).
- **Sourcing + confidence rendered** in the UI; **Open Questions** section live.
- **Verification pass** (anti-hallucination) wired in.
- **Exit criteria:** A real company URL produces a trustworthy, sourced partial audit with zero fabricated numbers; uncertainty visibly marked.

**Risks:** data-source ToS/scope; LLM cost; detection accuracy.

---

## Phase 2 — Full framework coverage
**Goal:** All 13 sections generated with real signals.
- Complete remaining sections: Industry Context, Competitive Benchmark, Customer Journey, full Digital Audit (Paid Media, Owned Media, SEO, Social & Content, CRO), Brand & Creative.
- **Data-source integrations** expanded (SERP, SEO data, ads transparency, social) under confirmed ToS.
- Full **sourcing/confidence UI** and sources panel per section.
- **Scorecard** complete with weighting + rationale.
- **Exit criteria:** Full 13-section audit on arbitrary URLs, every researched claim sourced or marked Unverified.

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
- Final MVP data-source scope (legal/ToS).
- Scorecard default weights.
- Pricing/packaging.
- Audit generation latency target & streaming UX.
- Multi-language output (post-English).
