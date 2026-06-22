# Client Audit AI — Product Specification

> **Status:** Draft v0.2 (updated for Phase 0.5 decisions)
> **Owner:** Product
> **Related docs:** [`DECISIONS.md`](./DECISIONS.md) (source of truth) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) · [`TECH_STACK.md`](./TECH_STACK.md) · [`ROADMAP.md`](./ROADMAP.md) · [`PROMPTS.md`](./PROMPTS.md) · [`DATA_MODEL.md`](./DATA_MODEL.md)
>
> **Note:** Where this spec and [`DECISIONS.md`](./DECISIONS.md) conflict, `DECISIONS.md` wins.

---

## 1. Vision & Positioning

**Client Audit AI turns a single URL into a first-class, sourceable client audit.**

It is built for the moment **before** an agency or consultancy starts working with a client — the pitch, the onboarding, the strategy kickoff — when the team needs to deeply understand a business fast and with credibility.

This is **not** a "here is your to-do list" tool. Generic audit tools tell you *what to do* ("improve your SEO", "run more ads"). Client Audit AI exists to make a strategist *understand the client*: its business model, strategy, digital ecosystem, competitors, opportunities, and risks — at the level of insight a senior consultant would produce after a week of research, delivered in minutes and backed by sources.

**Positioning statement:**
> For agencies and consultancies who need to understand a prospect or client deeply and quickly, Client Audit AI is an audit engine that transforms a company URL into an exhaustive, sourceable strategic audit — unlike generic SEO/marketing graders that only output checklists.

---

## 2. Problem & Target Users

### The problem
Understanding a new client is slow, manual, and inconsistent. Analysts stitch together the company's website, ad libraries, SEO tools, social profiles, and competitor research by hand. The output quality depends on who did it, how much time they had, and how senior they are. Knowledge is rarely sourced, rarely structured, and rarely reusable.

### Primary users
- **Agencies** (growth, performance, brand, full-service) preparing pitches or onboarding new accounts.
- **Consultancies** (strategy, digital transformation) running discovery.
- **In-house growth / strategy teams** auditing themselves or competitors.

### Jobs to be done
- "Help me understand this company deeply before our first meeting."
- "Show me where the opportunities and risks are, with evidence I can trust."
- "Give me a credible, structured artifact I can share internally or with the client."

---

## 3. Core Value Proposition

**URL in → exhaustive, sourceable, easy-to-read strategic audit out.**

| Generic graders | Client Audit AI |
|---|---|
| Tell you *what to do* | Help you *understand the client* |
| Single dimension (SEO, ads) | 13-section holistic audit |
| Unsourced scores | Every claim sourced or marked uncertain |
| Static checklist | Strategy, competitors, growth loops, risks, opportunities |
| One-size output | Auto-detected industry & business-model context |

---

## 4. Primary Input & Core Flow

### Primary input
**A single URL** (a brand or company website). This is the main and required input. Everything else is auto-detected or asked only when truly necessary.

### Core flow
1. **Input** — User pastes a company/brand URL.
2. **Auto-detection** — From the single URL, the system automatically detects the full contract below (each with a confidence level and supporting evidence):
   - **Brand / company identity** (name, tagline, value proposition)
   - **What it sells** (products/services offered)
   - **Industry / category**
   - **Business model** (e.g. DTC e-commerce, B2B SaaS, marketplace, services, retail)
   - **Likely market / geography** (primary markets, inferred from observable signals — currency/locale, language, shipping/contact regions, ccTLD, `hreflang`)
   - **Competitors** — **direct** (same offer/segment), **indirect** (different offer, same need), and **aspirational** (larger benchmark brands the client likely aims toward)
3. **Targeted clarification (only when necessary)** — If a critical ambiguity blocks a high-quality audit (e.g. the URL serves multiple brands, or the business model is genuinely unclear), the system asks a **minimal** set of clarifying questions. If confidence is sufficient, it asks nothing and proceeds.
4. **Research & evidence gathering** — The system collects observable signals (site content, tech/tags, ads transparency, SERP presence, social, etc.), attaching a **source** to each.
5. **Audit generation** — The 13-section audit (see [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md)) is generated, with confidence levels and citations.
6. **Output** — An exhaustive but readable audit, a final scorecard, and an explicit "Open Questions / Information Needed" section.

---

## 5. Key Product Principles (non-negotiable)

These map directly to the build rules and prompt rules.

1. **Do not invent data.** The system never fabricates metrics, figures, or facts. If a number is not observable or provided, it is not asserted.
2. **Sourceability.** Every researched claim must be traceable to a source (URL, tool, observed signal). Sources are stored and shown.
3. **Explicit uncertainty.** When the system is inferring rather than observing, it labels the claim with a confidence level (High / Medium / Low / Unverified) and states the assumption.
4. **URL-first.** The product works from a URL as the main input; additional inputs are optional.
5. **Auto-detection by default.** Brand, industry, business model, and competitors are detected automatically.
6. **Ask only when necessary.** Clarifying questions are a fallback for blocking ambiguity, not a default step.
7. **Exhaustive but readable.** Depth without wall-of-text fatigue: summaries, scannable structure, progressive disclosure.
8. **Decision-useful.** The output exists to help a strategist understand and act, not to produce a generic checklist.

---

## 6. Functional Requirements

### FR-1 — URL ingestion & validation
Accept a URL, normalize it, validate reachability, and capture the canonical site.

### FR-2 — Auto-detection engine
Detect brand identity, what it sells, industry, business model, likely market/geography, and a competitor set (direct / indirect / aspirational) from observable signals. Output detection results **with confidence levels** and supporting evidence.

### FR-3 — Clarifying-question engine (conditional)
Trigger questions only when a confidence threshold for a critical dimension is not met. Keep them minimal and high-leverage.

### FR-4 — Evidence & research layer
Collect observable signals from approved sources and persist them as **evidence records with citations** (see [`DATA_MODEL.md`](./DATA_MODEL.md)).

### FR-5 — Audit generation
Generate all 13 sections per [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md). Each claim carries a source and/or confidence label.

### FR-6 — Scorecard
Produce a final scorecard scoring the client across defined dimensions with a transparent rubric.

### FR-7 — Open questions
Always produce a "what we'd need to go deeper" section listing the unknowns and the data that would resolve them.

### FR-8 — Persistence & retrieval
Save audits, sections, sources, and scores so they can be revisited, re-run, and compared.

### FR-9 — Export & sharing
Export the audit (PDF/Markdown/shareable link) for internal use or client delivery.

---

## 6b. Definition of Done for an audit (MVP)

An MVP audit is **complete and acceptable** when:
- All **in-scope MVP sections** (see [`DECISIONS.md`](./DECISIONS.md) D6) are present: Client Introduction, Business Model & Strategy, Website, Analytics & Tracking, SEO, Executive Summary, Open Questions.
- Every **core claim** in each section is either backed by an `evidence` record or explicitly marked `Unverified` (per the minimum sourcing standard in `DECISIONS.md` D9).
- The audit contains **zero fabricated numbers, names, or dates** (enforced by the verification gate).
- Every `Unverified`/assumption lands in **Open Questions** with the data that would resolve it.
- It completed within the **latency** envelope (D2) and **cost** budget (D3), or completed **partially and honestly** (remaining sections marked `Unverified`) if a ceiling was hit.
- Each section carries an **evidence-confidence indicator** (no numeric scorecard in MVP — D7).

## 7. Non-Functional Requirements

> Concrete targets are set in [`DECISIONS.md`](./DECISIONS.md): latency (D2), cost (D3), async execution (D4), auth/RLS (D5).

- **Trustworthiness / auditability** — every claim is inspectable down to its source; this is a core feature, not a nice-to-have.
- **Performance** — full audit generation should complete in a reasonable, communicated time (async with progress, not a frozen spinner).
- **Cost control** — LLM and data-source usage must be budgeted and observable per audit.
- **Privacy & compliance** — respect site ToS and robots where applicable; store only what we are allowed to; document data provenance.
- **Reliability** — partial failures (one data source down) degrade gracefully and are marked as "Unverified", never silently faked.
- **Security** — auth-gated, per-organization data isolation (RLS).

---

## 8. Output Format & UX

- **Report view** — the 13 sections with a sticky table of contents and progressive disclosure (summary → detail).
- **Executive summary first** — the most senior, decision-ready synthesis at the top.
- **Confidence & sources visible** — inline confidence badges and a sources panel per claim/section.
- **Scorecard** — a visual, weighted scorecard with per-dimension scores and rationale.
- **Open questions** — clearly separated, actionable list of unknowns.
- **Export** — clean PDF / Markdown / shareable link.

---

## 9. Out of Scope (MVP)

- Direct integrations into client ad/analytics accounts (audit is based on *observable* external signals in MVP).
- Automated execution of recommendations (we diagnose; we don't run campaigns).
- Multi-language audit output (English first).
- White-label / advanced agency multi-tenant features (later phase).

---

## 10. Success Metrics

- **Audit credibility** — % of claims with an attached source; reviewer-rated trustworthiness.
- **Time-to-understanding** — time from URL to a usable audit vs. manual baseline.
- **Adoption** — audits generated per organization; re-runs and exports.
- **Decision impact** — qualitative: "did this change how we approached the client?"
- **Auto-detection accuracy** — % of audits requiring zero clarifying questions; detection precision on brand/industry/model.

---

## 11. Open Product Questions

**Resolved in [`DECISIONS.md`](./DECISIONS.md):**
- ~~Which data sources are in scope for MVP?~~ → D1 (target's own site + tech/tag detection).
- ~~Depth vs. speed trade-off for the first audit?~~ → D2 (always async, streamed) + D6 (self-contained MVP section set).
- ~~Auth posture?~~ → D5 (single-tenant authenticated, RLS from day one).

**Still open (product, not build-blocking):**
- Pricing/packaging (per-audit credits vs. seats).
- Multi-language audit output (English first).
- When to add optional client-account integrations (e.g. GA4) to move from external-signal to verified-data audits.
