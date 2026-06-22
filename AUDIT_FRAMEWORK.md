# Client Audit AI — Audit Framework

> **Status:** Draft v0.2 (updated for Phase 0.5 decisions)
> **Purpose:** The methodology behind the audit. This is the product's intellectual core: *what* we assess, *how*, *from which signals*, and *how we handle sourcing and uncertainty*.
> **Related:** [`DECISIONS.md`](./DECISIONS.md) (source of truth) · [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) · [`PROMPTS.md`](./PROMPTS.md) · [`DATA_MODEL.md`](./DATA_MODEL.md)
>
> The **full 13-section model** below is the long-term framework. For MVP, only the sections marked **`[MVP]`** are built; the rest are **`[Deferred]`** per [`DECISIONS.md`](./DECISIONS.md) D6.

---

## 0. Cross-cutting conventions

These apply to **every** section. They are the difference between a credible audit and a hallucination.

### 0.1 Claim types
- **Observed fact** — directly verifiable from a source (e.g. "site loads a Meta Pixel" → tag detected). Must cite the source.
- **Inference** — a reasoned conclusion from observed facts (e.g. "likely DTC model based on cart + checkout + no reseller language"). Must state the basis and a confidence level.
- **Assumption** — a working hypothesis when evidence is thin. Must be labeled as an assumption and surfaced in Open Questions.

> **Hard rule:** Never present an inference or assumption as an observed fact. Never invent a metric. If a number is not observable or provided, do not state it.

### 0.2 Confidence levels
| Level | Meaning |
|---|---|
| **High** | Directly observed or corroborated by multiple sources. |
| **Medium** | Reasoned inference from solid observed signals. |
| **Low** | Plausible but weakly supported; treat as hypothesis. |
| **Unverified** | Could not be checked (source unavailable, blocked, out of scope). |

### 0.3 Sourcing
Every researched claim carries one or more **citations** (see `sources` / `evidence` in [`DATA_MODEL.md`](./DATA_MODEL.md)). A citation records: source type, locator (URL/tool), what was observed, and timestamp. Sections render an inline confidence badge and a sources list.

### 0.4 Uncertainty handling
When uncertain, the audit explicitly says so and routes the unknown into **Section 13 (Open Questions / Information Needed)**. Silence is never used to hide a gap.

### 0.5 Section output contract
Each section produces:
- A short **summary** (decision-ready).
- A **detailed body** (findings, structured).
- A list of **citations**.
- A list of **assumptions / uncertainties**.
- (Where applicable) **opportunities** and **risks** tagged for the risk register (and, post-MVP, the scorecard).

### 0.6 Golden example (canonical reference)

This is the bar for every finding. Defined in full in [`DECISIONS.md`](./DECISIONS.md) D10; summarized here because it is the single most important anti-generic guardrail.

- **✅ Good (specific + sourced):** "Loads GA4 (`G-XXXX`) via GTM (`GTM-YYYY`) but **no server-side tagging or consent-mode signal detected**, so post-consent EU measurement is likely incomplete." — observed_fact + inference, confidence Medium, `evidence_ids:[ev_12,ev_13]`.
- **❌ Bad (generic — rejected):** "The company should improve its analytics setup to optimize marketing." — no evidence, applies to anyone.
- **✅ Sourced (observed):** "A Meta Pixel (`id 1234…`) fires on the homepage." — observed_fact, High, `[ev_07]`.
- **✅ Inference (marked):** "**Likely** DTC e-commerce." — inference, Medium, basis: cart+checkout present, no reseller language, `[ev_02,ev_03,ev_04]`.
- **✅ Unknown:** "CAC/LTV are **not observable** externally." — moved to Open Questions; never assigned a number.

### 0.7 Minimum sourcing standard (MVP)
Per-section minimums are defined in [`DECISIONS.md`](./DECISIONS.md) D9. Global rule: **a section with zero observed evidence for its core claims must declare itself `Unverified` rather than produce inferred prose.**

---

## The 13-Section Audit Model

### 1. Executive Summary `[MVP]`
- **Purpose:** The senior synthesis — what this company is, how it makes money, where the biggest opportunities and risks are, and the headline scorecard. Written last, read first.
- **Answers:** Who is this client? What matters most? Where would we focus?
- **Inputs:** Synthesized from all other sections.
- **Output:** 1-page narrative + top 3–5 opportunities + top 3–5 risks + headline score.
- **Sourcing rule:** No new claims here — only synthesis of already-sourced findings.

### 2. Client Introduction `[MVP]`
- **Purpose:** Establish identity and context.
- **Answers:** What does the brand say it is? Value proposition, positioning, **what it sells** (products/services), target audience, **likely market/geography**, maturity.
- **Signals/sources:** Homepage, about page, product pages, footer, meta tags; geography signals (currency/locale, language, shipping/contact regions, ccTLD, `hreflang`).
- **Output:** Brand profile + detected positioning + detected market/geography (with confidence + evidence; from the detection contract — see [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) §4 and [`PROMPTS.md`](./PROMPTS.md) §3).
- **Uncertainty:** Distinguish brand's *self-description* (observed) from our *assessment* (inference). Market/geography is an inference from observable signals unless explicitly stated by the brand — never assert a market without a signal.

### 3. Business Model & Strategy `[MVP]`
- **Purpose:** Understand how value is created, delivered, and captured.
- **Answers:** Revenue model, pricing, monetization, channels, key segments, apparent strategic priorities.
- **Signals/sources:** Pricing pages, checkout/cart, plans, partner/reseller pages, careers (hiring signals), public statements.
- **Output:** Business-model classification (with confidence) + strategic read.
- **Uncertainty:** Internal economics (margins, CAC, LTV) are **not observable** — never fabricate; route to Open Questions.

### 4. Industry Context `[Deferred]`
- **Purpose:** Situate the client in its market.
- **Answers:** Category definition, market dynamics, trends, regulatory notes, typical KPIs for the category.
- **Signals/sources:** Industry references, reputable public reporting (cited), category norms.
- **Output:** Concise industry brief relevant to *this* client.
- **Sourcing rule:** Market figures must be cited to a real source or omitted; never invent market sizes.

### 5. Competitive Benchmark `[Deferred]`
- **Purpose:** Understand the competitive set and relative position.
- **MVP note:** competitor *names* may be auto-detected, but the comparative benchmark needs competitor data sources (deferred per [`DECISIONS.md`](./DECISIONS.md) D1/D6).
- **Answers:** Who are the **direct**, **indirect**, and **aspirational** competitors? How do they compare on positioning, offer, digital presence?
- **Competitor relationship types:**
  - **Direct** — same offer, same segment.
  - **Indirect** — a different offer that solves the same customer need.
  - **Aspirational** — a larger/benchmark brand the client likely aims toward (useful for positioning and growth framing).
- **Signals/sources:** Auto-detected competitors (from the detection contract), SERP overlap, category knowledge, competitor sites.
- **Output:** Competitor table (typed by relationship) + comparative read + whitespace/opportunities.
- **Uncertainty:** Mark inferred competitors vs. confirmed; note any competitor not verifiable. Aspirational competitors are inherently inferential and must be marked as such.

### 6. Customer Journey `[Deferred]`
- **Purpose:** Map how a prospect becomes (and stays) a customer.
- **Answers:** Awareness → consideration → conversion → retention → advocacy; touchpoints and gaps.
- **Signals/sources:** Site funnel, content, CTAs, email/CRM signals, social, retargeting presence.
- **Output:** Journey map with observed touchpoints, friction points, and gaps.

### 7. Digital Audit `[Partial MVP]`
The most operational section. Each sub-area carries its own findings, sourcing, and opportunities.
**MVP builds only:** 7.2 Owned Media → Website, 7.3 SEO (technical/on-page from our crawl; no rankings/backlinks), and 7.4 Analytics & Tracking. The rest are `[Deferred]` (need paid/ad-library/social sources — [`DECISIONS.md`](./DECISIONS.md) D1/D6).

#### 7.1 Paid Media `[Deferred]`
- **Media** — Which paid channels are detectably in use (ads transparency libraries, tracking tags, retargeting). What platforms, apparent activity.
- **Creatives & Communication** — Observed ad creatives/messaging (where publicly available via ad libraries), tone, offers, formats.
- **Opportunities** — Gaps and upside in channel mix, creative, targeting (as diagnosis, sourced/flagged).

#### 7.2 Owned Media
- **Website** `[MVP]` — Structure, UX, performance signals, content quality, conversion elements.
- **Communication & Creatives** `[Deferred]` — On-site messaging, brand voice, visual system consistency.
- **CRM / Email / WhatsApp / Push** `[Partial MVP]` — Detectable lifecycle/messaging infrastructure (signup flows, email vendor tags, WhatsApp/chat widgets, push/web-push prompts). **MVP:** only the *presence* of such tools via tag/widget detection; behavior/content analysis deferred.
- **Opportunities** — Owned-channel upside.

#### 7.3 SEO `[MVP]`
- **Purpose:** Organic visibility and technical/content health.
- **Signals/sources:** Indexability, metadata, structure, content depth, SERP presence, backlinks (cited tools where available).
- **Output:** SEO diagnosis + prioritized opportunities.

#### 7.4 Analytics & Tracking `[MVP]`
- **Pixels / Tags** — Detected analytics/marketing tags (e.g. GA4, Meta Pixel, GTM, TikTok, LinkedIn, etc.) via tag detection.
- **Measurement** — How measurement appears to be set up; gaps in coverage.
- **Events** — Detectable event/conversion tracking signals.
- **Attribution Risks** — Risks to data quality/attribution (cookie/consent setup, duplicate tags, missing server-side, privacy changes). **This feeds the Risks & Alerts section.**

**Methodology — multi-pass (validated by the Phase 0.75 spike; see [`SPIKE_RESULTS.md`](./SPIKE_RESULTS.md)).** Static HTML alone is insufficient and misleading here, so the section is built from **four passes plus filtering**, each finding tagged with its `detection_method`:
1. **Static pass** (`static_html`) — GTM container id, hardcoded tags, metadata, platform, geography. Fast, but never the sole basis; tags not seen here are **Unknown**, not absent.
2. **GTM container pass** (`gtm_container`) — read the public `gtm.js?id=GTM-XXXX` to list configured tags and identify which tools are/aren't container-managed.
3. **Runtime / network pass** (`runtime_network`) — render the page headless and capture network requests to confirm what actually fires (GA4 `collect`, Ads conversion, Meta `fbevents`, TikTok pixel, Consent Mode `gcs/gcd`, etc.).
4. **Final verification pass** — reconcile passes; **promote Unknown → Observed** only when a runtime/container method confirms; only assert a tag is **absent** when runtime capture confirms absence.
5. **False-positive filtering** — drop browser-background traffic (safebrowsing, updates, web-store, GCM) and substring matches; require a real vendor hostname + site attribution before recording a vendor (the spike rejected VWO/VTEX/Civic/MS-Ads noise this way).

> Confidence: a tag is `Observed` only via `gtm_container` or `runtime_network`; `static_html` absence is `Unknown/Unverified`. See [`PROMPTS.md`](./PROMPTS.md) Analytics & Tracking rules.

#### 7.5 Social & Content `[Deferred]`
- **Purpose:** Social presence and content strategy read.
- **Signals/sources:** Linked social profiles, posting cadence/quality (observed), content themes.
- **Output:** Social/content diagnosis + opportunities.

#### 7.6 CRO (Conversion Rate Optimization) `[Deferred]`
- **Purpose:** Conversion experience quality.
- **MVP note:** basic on-site conversion *observations* (forms, CTAs, checkout presence) appear under Website; full CRO hypotheses are deferred.
- **Signals/sources:** Funnel friction, forms, page speed, trust elements, mobile experience, checkout/lead flow.
- **Output:** CRO diagnosis + prioritized hypotheses (framed as hypotheses, not guaranteed lifts).

### 8. Brand & Creative Diagnosis `[Deferred]`
- **Purpose:** Assess brand strength and creative quality.
- **Answers:** Clarity of positioning, distinctiveness, consistency, messaging quality, visual identity.
- **Signals/sources:** Site, social, ad creatives, brand assets.
- **Output:** Brand/creative assessment (qualitative, clearly framed as expert judgment, not fabricated metrics).

### 9. Growth Diagnosis `[Deferred]`
- **Growth Model** — How the business appears to grow (acquisition-led, retention-led, virality, sales-led, etc.) based on observed signals.
- **Loop Opportunities** — Specific growth-loop opportunities relevant to this model.
- **Same-industry loop case studies** — **Resolved per [`DECISIONS.md`](./DECISIONS.md) D8 (hallucination risk):**
  - In its first shipped version, this section produces **"loop hypotheses"** tied to the client's *observed* model — clearly marked as hypotheses, not cited facts.
  - **Real, cited** same-industry case studies are produced **only** when a web-search/retrieval grounding mechanism (a paid source) is available. Without grounding, the system returns **"none verified"** and **never invents a case study.**
- **Output:** Growth read + loop hypotheses; cited case studies only when grounded.

### 10. AI Readiness `[Deferred]`
- **Purpose:** Assess how prepared the client is to leverage AI (in marketing, product, ops) and where AI could create leverage.
- **Answers:** Observable AI usage (chatbots, AI features, content), data/tracking maturity (ties to 7.4), opportunities for AI-driven growth/efficiency.
- **Output:** AI readiness read + concrete AI opportunities, with maturity framed honestly.

### 11. Risks & Alerts `[Deferred as a consolidated section]`
- **MVP note:** attribution/measurement risks still surface **inline** in §7.4; the consolidated cross-section risk register is deferred.
- **Purpose:** Consolidated risk register.
- **Inputs:** Pulls especially from Attribution Risks (7.4), plus brand, competitive, compliance, dependency, and measurement risks surfaced anywhere.
- **Output:** Prioritized risk list (severity × likelihood) with rationale and source/confidence per risk.

### 12. Final Scorecard `[Deferred — confidence indicators in MVP]`

> **Resolved per [`DECISIONS.md`](./DECISIONS.md) D7:** there is **no numeric 1–5 scorecard in MVP**. A score implies measurement, and scoring dimensions whose sections aren't built would violate the no-invented-data principle. Instead, each MVP section shows a **qualitative maturity read + an evidence-confidence indicator** (High/Medium/Low/Unverified). The numeric weighted scorecard **returns in Phase 2**, once ≥ 8 scorable dimensions have real underlying sections, with explicit per-level (1–5) criteria and default weights defined at that time.

The full long-term rubric (for reference when it returns):
- **Purpose:** A transparent, weighted snapshot of the client's current state.
- **Scoring rubric:** Each dimension scored **1–5** with explicit criteria and a one-line rationale + confidence.

| Dimension | What it measures |
|---|---|
| Business Model Clarity | Clarity & resilience of how value is captured |
| Competitive Position | Strength vs. competitive set |
| Customer Journey | Completeness & friction of the journey |
| Paid Media | Maturity & efficiency signals of paid |
| Owned Media | Strength of owned channels & lifecycle |
| SEO | Organic visibility & health |
| Analytics & Tracking | Measurement quality & data trust |
| Social & Content | Presence & content strategy |
| CRO | Conversion experience quality |
| Brand & Creative | Brand strength & creative quality |
| Growth | Growth model & loop potential |
| AI Readiness | Preparedness to leverage AI |

- **Weighting:** Configurable; default weights documented when MVP scoring is implemented.
- **Output:** Per-dimension score + weighted total + confidence note. Scores must reflect *evidence strength* — low-evidence dimensions are flagged, not guessed.

### 13. Open Questions / Information Needed To Go Deeper `[MVP]`
- **Purpose:** Make the unknowns explicit and actionable.
- **Content:** Every assumption, Unverified claim, and blocked data point collected across sections, plus the specific data that would resolve each (e.g. "access to GA4", "ad account spend", "actual pricing tiers").
- **Output:** Prioritized list of what to ask the client / what to access next.

---

## Methodology summary

1. **Observe** signals from approved sources → store as evidence with citations.
2. **Classify & infer** brand, what it sells, industry, business model, market/geography, and competitors (direct/indirect/aspirational), attaching confidence.
3. **Generate** each section against its contract, never exceeding the evidence.
4. **Verify** — a critique pass checks for unsourced claims, fabricated numbers, and unmarked uncertainty.
5. **Score & synthesize** — scorecard and executive summary built only from sourced findings.
6. **Surface gaps** — everything unknown lands in Open Questions.
