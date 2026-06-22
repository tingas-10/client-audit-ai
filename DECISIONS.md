# Client Audit AI — Phase 0.5 Decisions (ADR)

> **Status:** Accepted — Phase 0.5
> **Purpose:** Resolve the product & technical decisions that were blocking a serious MVP. This file is the **source of truth**; other docs defer to it.
> **Related:** [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) · [`TECH_STACK.md`](./TECH_STACK.md) · [`ROADMAP.md`](./ROADMAP.md) · [`PROMPTS.md`](./PROMPTS.md) · [`DATA_MODEL.md`](./DATA_MODEL.md)

Each decision: **Context → Decision → Rationale → Consequences.** Where a decision overrides earlier docs, that is stated explicitly.

---

## D1 — MVP data-source scope

**Context:** Earlier docs leaned on "observable signals" but never said which sources are actually in scope, legal, or reliable. This was the #1 blocker.

**Decision — three tiers:**

### ✅ In MVP (public / accessible / ToS-safe — derived primarily from the target's own site)
- **Target site fetch & render** — HTML, rendered DOM, HTTP headers, response timing (respecting `robots.txt`).
- **Site structure & metadata** — `sitemap.xml`, `robots.txt`, `<title>`/meta, canonical tags, OpenGraph, Twitter cards, `schema.org`/JSON-LD structured data.
- **Tech / tag detection** — analytics & marketing tags detectable in page output/network (e.g. GA4, GTM, Meta Pixel, TikTok, LinkedIn Insight, Hotjar), framework/CMS/platform fingerprints, chat/WhatsApp/push widgets.
- **On-site conversion & lifecycle signals** — forms, CTAs, checkout/cart presence, newsletter/signup, cookie/consent banners.
- **Publicly linked social profiles** — the social URLs the site itself links to (existence + handles only; not scraped analytics).
- **Performance signals** — basic load/asset signals observable from the fetch (not full Lighthouse field data).

### 💳 Requires paid APIs / later integrations (NOT in MVP)
- SERP/keyword data and rankings (SERP API).
- Backlink / domain authority / organic-traffic estimates (Ahrefs, Semrush, SimilarWeb).
- Ad creatives & spend depth from ad-transparency libraries (treated as best-effort/manual later; not an MVP automated source).
- Social analytics (followers, engagement) via platform APIs.
- Web-search grounding for industry stats & case studies (V2 — see D8).

### 🚫 Explicitly excluded from MVP
- Any source requiring the **client's own account access** (GA4 property, ad accounts, CRM, CDP).
- Scraping behind authentication or paywalls.
- Purchased third-party datasets.
- Anything whose ToS prohibits automated access.

**Rationale:** The target's own site is the most defensible, most sourceable, lowest-legal-risk surface. It alone supports a credible, low-hallucination MVP. Everything requiring money or accounts is deferred so we can ship and prove the evidence loop first.

**Consequences:** MVP depth is bounded by what a single external crawl reveals — which is exactly why the MVP section set (D6) is chosen to match this surface, and why competitive/industry/paid sections are deferred.

---

## D2 — Audit latency target

**Context:** Spec said "reasonable time" — unmeasurable, and it drives the whole architecture.

**Decision:**
- **Ideal:** ≤ **90 seconds** end-to-end for the MVP section set.
- **Acceptable:** ≤ **4 minutes**.
- **Hard ceiling:** **6 minutes**, after which remaining sections are marked `Unverified` and the audit completes partially rather than hanging.
- **Always async/background:** any audit is treated as a background job from the start (we do **not** attempt inline completion). The UI never blocks on a single long request.
- **UX progress states:** `Queued → Detecting (brand/industry/model/competitors) → Gathering evidence → Generating sections (n/N) → Verifying → Scoring/Synthesis → Done`. Each completed section streams into the report as it finishes (progressive disclosure), so the user sees value before the full audit is done.

**Rationale:** A multi-section, multi-pass (generate + verify) LLM pipeline with a live crawl will not reliably finish in a few seconds. Designing async from day one avoids a rewrite.

**Consequences:** Requires the async mechanism in D4 and the `jobs` progress model in `DATA_MODEL.md`.

---

## D3 — Cost budget per audit

**Context:** `AUDIT_COST_BUDGET_USD` was named but never set.

**Decision — target per audit:**
| Component | Target | Notes |
|---|---|---|
| LLM (generation + verification) | **~ $0.80–$1.50** | Latest Claude; verification pass included |
| Retrieval / data fetch (MVP) | **~ $0.00–$0.25** | MVP crawl is mostly our own compute; near-zero external API cost |
| **Total target** | **≤ $2.00 / audit** | Soft budget |
| **Hard cap** | **$3.50 / audit** | Enforced guardrail |

**Guardrails:**
- Per-audit **token cap** and **max LLM-call count**; per-audit **max tool/fetch count**.
- `AUDIT_COST_BUDGET_USD` (soft) and `AUDIT_COST_HARD_CAP_USD` (hard) env vars; per-step `cost_usd` accumulated in `jobs` and rolled up to the audit (see D12).
- Evidence and detection results cached to avoid re-fetching/re-generating.

**If cost exceeds budget:**
- At **soft budget**: log a warning, continue, surface a cost note on the audit.
- At **hard cap**: **stop** further generation, mark remaining sections `Unverified`, complete the audit partially, and record the reason. Never silently continue spending.

**Rationale:** A trust product can't have unbounded cost; partial-but-honest beats expensive-and-runaway.

**Consequences:** Cost accounting becomes a first-class data-model concern (D12).

---

## D4 — Async execution decision

**Context:** Three options were listed and deferred. Vercel serverless time limits conflict with a multi-minute pipeline.

**Decision:** **Durable background jobs orchestrated by a step/workflow runner (e.g. Inngest or Trigger.dev) on Vercel, with all state persisted in Supabase.**

- API route handler **enqueues** an audit and returns immediately.
- The workflow runner executes the pipeline as **discrete, durable steps** (detect → gather → generate-section × N → verify → score → synthesize), each within serverless limits, with **automatic retries** and **observability**.
- Supabase (`audits`, `audit_sections`, `jobs`) is the single source of truth for progress; the UI polls/subscribes to it.

**Why this over the alternatives:**
- **Inline server execution** — ❌ blows past Vercel function time limits; bad UX.
- **Raw Vercel functions + cron** — ⚠️ workable but we'd hand-roll retries, step state, and timeout splitting.
- **Supabase Edge Functions** — ⚠️ also time-limited; not built for long multi-step orchestration.
- **Self-hosted queue/worker** — ⚠️ most control, most ops overhead; overkill for MVP.
- **Durable workflow runner** — ✅ purpose-built for "long pipeline on serverless," gives retries + step durability + observability with minimal infra, keeps us on the chosen Vercel+Supabase stack.

**Rationale:** Best ratio of robustness to setup effort for a fast-but-serious MVP.

**Consequences:** One managed dependency (the workflow runner). If we later want zero third-party orchestration, the step-based design ports cleanly to a self-hosted worker because state already lives in Supabase. Final vendor pick happens at implementation; the *pattern* (durable steps + Supabase state) is locked.

---

## D5 — Auth posture for Phase 1

**Context:** Spec implied multi-tenant + RLS; roadmap omitted auth entirely.

**Decision:** **Single-tenant, authenticated.**
- **Supabase Auth** required to use the app (no anonymous audits).
- **One organization** in MVP, but the schema stays **org-aware** (`organization_id` on org-scoped tables) and **RLS is enabled from day one**.
- Multi-org / agency multi-tenancy (invites, roles beyond basic) deferred to a later phase.

**Rationale:** It's an internal agency/consultancy product first, so we don't need full multi-tenancy on day one — but retrofitting auth and RLS later is painful and risky. Org-aware schema + RLS now = cheap; true multi-tenant features later = additive.

**Consequences:** Resolves the spec↔roadmap contradiction. Phase 1 explicitly includes auth.

---

## D6 — MVP section set

**Context:** Phase 1 named sections that depended on unbuilt sections (scorecard, competitors), creating incoherence.

**Decision — MVP includes exactly these, all derivable from the D1 (own-site) surface:**
1. **Client Introduction**
2. **Business Model & Strategy** (external read only; no internal economics)
3. **Digital Audit → Owned Media → Website**
4. **Digital Audit → Analytics & Tracking** (Pixels/Tags, Measurement, Events, Attribution Risks)
5. **Digital Audit → SEO** (technical/on-page from our crawl + public metadata; **no** rankings/backlinks — those need D1 paid tier)
6. **Executive Summary** (synthesis of the above only)
7. **Open Questions / Information Needed**

**Auto-detection still runs** (brand, industry, business model, competitors) and competitor *names* may be surfaced — but the full **Competitive Benchmark is deferred** (needs competitor data sources).

**Deferred to Phase 2+ (not in MVP):** Industry Context, Competitive Benchmark, Customer Journey, Paid Media, Owned Media → CRM/Email/WhatsApp/Push (beyond tag detection), Social & Content, CRO (beyond basic on-site notes), Brand & Creative Diagnosis, Growth Diagnosis, AI Readiness, Risks & Alerts (as a standalone consolidated section — attribution risks still appear inline in §4), Final Scorecard (see D7).

**Rationale:** Every MVP section is fully sourceable from one crawl → high credibility, low hallucination, self-contained. No section depends on a source or section we haven't built.

**Consequences:** The MVP is honestly scoped and shippable. Overrides `ROADMAP.md` Phase 1's earlier section list.

---

## D7 — Scorecard decision

**Context:** A "partial scorecard" would have to score dimensions whose sections don't exist → fabrication or all-Unverified.

**Decision:** **No numeric 1–5 scorecard in MVP.**
- Instead, each MVP section shows a **qualitative maturity read** + an **evidence-confidence indicator** (High/Medium/Low/Unverified) — honest and fully sourced.
- The **numeric weighted scorecard returns in Phase 2**, once **at least the dimensions it scores have real underlying sections** (target: ≥ 8 scorable dimensions before any total is shown).
- When it returns, each dimension needs explicit per-level (1–5) criteria and default weights (to be defined in `AUDIT_FRAMEWORK.md` at that time).

**Rationale:** A score implies measurement. Scoring un-built dimensions would violate the no-invented-data principle.

**Consequences:** Removes the Phase 1 "(partial)" scorecard. Confidence indicators carry the "at-a-glance" value in MVP.

---

## D8 — Growth-loop case studies decision

**Context:** "Real, cited same-industry growth-loop case studies" is the highest hallucination risk in the product and has no grounding mechanism in MVP.

**Decision:**
- **MVP:** the entire Growth Diagnosis section is **deferred** (not in D6 set). No case studies are generated.
- **When Growth ships (Phase 3):** it produces **"loop hypotheses"** tied to the client's *observed* model — clearly marked as hypotheses, not cited facts.
- **Real, cited same-industry case studies** are **only** produced with a proper **web-search/retrieval grounding** mechanism (a paid D1 source). Without grounding, the system returns **"none verified"** — it must never invent a case study.

**Rationale:** Eliminates the worst fabrication vector now; reintroduces it only with the infrastructure that makes it safe.

**Consequences:** `AUDIT_FRAMEWORK.md` §9 updated to reflect hypotheses-first + grounded-only case studies.

---

## D9 — Evidence & sourcing requirements (minimum standard)

**Context:** "Sourceability" was asserted but not made concrete per section.

**Decision — definitions (binding):**
- **Observed evidence:** a fact directly present in a fetched source, captured as an `evidence` record (e.g. "GA4 tag `G-XXXX` present in page output"). Requires a citation. → `claim_type: observed_fact`.
- **Inference:** a conclusion reasoned from one or more observed evidence records (e.g. "likely DTC: cart + checkout + no reseller language"). Must list the supporting `evidence_ids` and a `basis`, and carry confidence ≤ High only if multiple strong signals agree. → `claim_type: inference`.
- **Unknown / Unverified:** not present in any fetched source, or the source was blocked/out-of-scope. Must **not** be asserted; goes to Open Questions. → `claim_type: assumption` (if a working hypothesis) or omitted with an Open Question.

**Minimum source requirements per MVP section:**
| Section | Minimum standard |
|---|---|
| Client Introduction | ≥ 2 observed evidence items (e.g. homepage + about/product). Self-description quoted as the brand's claim, not ours. |
| Business Model & Strategy | ≥ 2 observed signals for the model classification; internal economics **forbidden** (always Open Question). |
| Website (Owned) | Every finding tied to an observed page/element/performance signal. |
| Analytics & Tracking | Every tag/measurement claim tied to a detected tag/network evidence item. Attribution risks must each reference an observed signal. |
| SEO | Every claim tied to crawl/metadata evidence; no ranking/backlink claims in MVP (no source). |
| Executive Summary | **No new facts** — only synthesis of already-sourced findings above. |
| Open Questions | Every Unverified/assumption from the sections above must land here with the data that would resolve it. |

**Global rule:** a section with **zero** observed evidence for its core claims must declare itself **Unverified** rather than produce inferred prose.

**Rationale:** Turns the sourcing principle into something the prompts and the verification gate can enforce mechanically.

**Consequences:** Drives the `findings`-table change in D12 and the prompt contracts.

---

## D10 — Golden example (worked, canonical)

**Context:** No example existed, so "good" was undefined. This is the single highest-leverage anti-generic fix.

**Decision:** Adopt the following as the canonical reference (also embedded in `AUDIT_FRAMEWORK.md` and used as few-shot in `PROMPTS.md`). *(Illustrative shapes; the brand is fictional.)*

**✅ Good finding (specific, sourced):**
> "The site loads Google Analytics 4 (`G-XXXX`) via Google Tag Manager (`GTM-YYYY`) but **no server-side tagging or consent-mode signal was detected**, so post-consent measurement is likely incomplete on EU traffic." — `claim_type: observed_fact` (tags) + `inference` (measurement gap), confidence **Medium**, `evidence_ids: [ev_12, ev_13]`.

**❌ Bad / generic finding (would be rejected):**
> "The company should improve its analytics setup and make sure it is tracking conversions properly to optimize marketing performance." — No evidence, no specificity, applies to any company. **Rejected by the verification gate.**

**✅ Properly sourced (observed) claim:**
> "A Meta Pixel (`id 1234…`) fires on the homepage." — `observed_fact`, confidence **High**, `evidence_ids: [ev_07]`.

**✅ Inferred claim (clearly marked):**
> "The business is **likely** DTC e-commerce." — `inference`, confidence **Medium**, basis: "cart + checkout flow present; product pages with add-to-cart; no reseller/distributor language", `evidence_ids: [ev_02, ev_03, ev_04]`.

**✅ Unknown / unverified claim:**
> "Customer acquisition cost and LTV are **not observable** from external signals." — moved to Open Questions: *needed_data: "client GA4 + ad-account access"*. Never assigned a number.

**Consequences:** This example is referenced, not duplicated divergently, across docs.

---

## D11 — Prompt quality rules (anti-generic)

**Context:** Prompts prevented fabrication but not blandness.

**Decision — every insight must be one of:**
1. tied to **observed evidence** (cite the `evidence_id`), **or**
2. a **comparison** (vs. a competitor, vs. a category norm — and the comparator must itself be sourced/named), **or**
3. a **clearly marked inference** with basis + confidence.

**Banned output patterns** (auto-rejected by the verification gate):
- Advice that would be true for any company ("improve SEO", "post more on social", "optimize your funnel").
- Recommendations with no observed trigger.
- Numbers, dates, names, or competitor claims with no evidence.
- Confident prose where evidence is thin (must downgrade to Low/Unverified).

**Required style:** name the specific page/element/tag/competitor observed; state the *so-what*; attach confidence. See `PROMPTS.md` for the rules block + a negative example.

**Consequences:** `PROMPTS.md` updated with these rules, a generic-vs-specific example, and a defined clarifying-question threshold (ask only when a *core* dimension for an in-scope section is `Unverified`/`Low` and unresolvable from the crawl; otherwise proceed).

---

## D12 — Data model tightening (before implementation)

**Context:** Sourcing wasn't enforceable, enums were free-text, no versioning, no cost rollup, inconsistent section keys.

**Decisions:**
1. **findings ↔ evidence as real relations.** Promote findings to a first-class **`findings` table** with a real FK to `audit_sections`, and a join table **`finding_evidence` (finding_id → evidence_id)** so "every claim is sourced" is enforceable by the database, not just JSON convention.
2. **Enums / check constraints.** Constrain `claim_type` (`observed_fact|inference|assumption`), `confidence` (`high|medium|low|unverified`), `audit.status`, `jobs.step`, `jobs.status`, `competitors.relationship` via Postgres enums or `CHECK` constraints.
3. **Audit versioning.** Add `audits.version` (int) and `audits.supersedes_audit_id` (nullable FK) so re-runs link to prior audits and deltas are possible.
4. **Cost / token accounting.** Add per-step `tokens_in`/`tokens_out`/`cost_usd` on `jobs`, and rolled-up `audits.total_cost_usd` / `audits.total_tokens` for budget enforcement (D3).
5. **Canonical section keys.** Use **flat `snake_case`** keys from a fixed list; nested Digital Audit areas use prefixed flat keys (e.g. `digital_audit_analytics_tracking`, `digital_audit_website`, `digital_audit_seo`). The dotted form is dropped to keep the LLM contract and DB identical. The canonical list lives in `DATA_MODEL.md`.

**Rationale:** Makes the trust guarantees structural and prevents LLM-contract/DB drift.

**Consequences:** `DATA_MODEL.md` updated; migrations in Phase 1 follow this shape.

---

## Decision summary (quick reference)

| # | Decision |
|---|---|
| D1 | MVP sources = target's own site + tech/tag detection; paid SEO/SERP/ads & web-search deferred; account-access & scraping-behind-login excluded |
| D2 | Always async; ideal ≤90s, acceptable ≤4m, hard ceiling 6m with partial completion; streamed progress states |
| D3 | ≤ $2.00/audit soft, $3.50 hard cap; stop + mark Unverified at hard cap |
| D4 | Durable background jobs via a workflow runner (Inngest/Trigger.dev) + Supabase state |
| D5 | Single-tenant authenticated (Supabase Auth), org-aware schema + RLS from day one |
| D6 | MVP = Client Intro, Business Model, Website, Analytics & Tracking, SEO, Exec Summary, Open Questions |
| D7 | No numeric scorecard in MVP (confidence indicators instead); returns in Phase 2 |
| D8 | Growth deferred; later = loop hypotheses; cited case studies only with web-search grounding |
| D9 | Per-section minimum sourcing standard; zero-evidence section → Unverified |
| D10 | Canonical golden example (good vs. generic vs. sourced vs. inferred vs. unknown) |
| D11 | Anti-generic prompt rules: evidence, comparison, or marked inference — nothing else |
| D12 | findings table + finding_evidence FK, enums/checks, versioning, cost accounting, flat section keys |
