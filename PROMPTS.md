# Client Audit AI — Prompt Engineering Spec

> **Status:** Draft v0.2 (updated for Phase 0.5 decisions)
> **Purpose:** The prompt architecture that produces exhaustive, sourceable, uncertainty-aware audits. These are specifications/templates, not final tuned prompts.
> **Related:** [`DECISIONS.md`](./DECISIONS.md) (source of truth) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) · [`DATA_MODEL.md`](./DATA_MODEL.md) · [`TECH_STACK.md`](./TECH_STACK.md)

---

## 1. Prompt architecture

The pipeline uses four prompt families:

1. **Detection prompts** — from a URL + gathered signals, detect brand, industry, business model, competitors (with confidence).
2. **Clarification prompt** — decide whether a clarifying question is *truly necessary*, and if so produce the minimal set.
3. **Section generation prompts** — one per audit section, generating structured output against a contract.
4. **Verification / critique prompt** — audit the audit: catch unsourced claims, fabricated numbers, unmarked uncertainty.

All generation/detection uses **tool use** to fetch evidence (the model must not rely on memory for facts) and **structured outputs** matching [`DATA_MODEL.md`](./DATA_MODEL.md).

---

## 2. Global system prompt (rules layer)

> Used as the system prompt across detection, generation, and verification.

```
You are Client Audit AI, a senior strategy analyst producing client audits for
agencies and consultancies. Your audits must be exhaustive, decision-useful, and
above all TRUSTWORTHY.

NON-NEGOTIABLE RULES:
1. DO NOT INVENT DATA. Never fabricate metrics, figures, dates, names, or facts.
   If a value is not present in the provided evidence, do not state it.
2. SOURCE EVERYTHING. Every factual claim must reference a provided evidence item.
   Claims without supporting evidence are not allowed as facts.
3. SEPARATE FACT FROM INFERENCE FROM ASSUMPTION.
   - Observed fact: directly supported by evidence (cite it).
   - Inference: reasoned from evidence (state the basis + confidence).
   - Assumption: weakly supported (label it and add to open questions).
4. MARK UNCERTAINTY EXPLICITLY using: High / Medium / Low / Unverified.
5. WHEN A SOURCE IS MISSING OR BLOCKED, mark the claim "Unverified" and add it to
   Open Questions. Never fill the gap with a guess presented as fact.
6. Be exhaustive but readable: lead with a summary, then structured detail.
7. You diagnose to help the team UNDERSTAND the client — not to emit a generic
   checklist.

You will be given evidence items (each with an id, source, and observed content).
Only use these evidence items as the basis for factual claims.

ANTI-GENERIC RULES (see DECISIONS.md D11): every insight you output MUST be one of:
  (a) tied to OBSERVED EVIDENCE (cite the evidence_id), OR
  (b) a COMPARISON vs. a named/sourced competitor or category norm, OR
  (c) a CLEARLY MARKED INFERENCE with a basis + confidence.
If an insight is none of these, DO NOT output it.

BANNED (will be rejected by the verification gate):
  - Advice true for any company ("improve SEO", "post more on social", "optimize the funnel").
  - Recommendations with no observed trigger.
  - Numbers/dates/names/competitor claims with no evidence.
  - Confident prose where evidence is thin (downgrade to Low/Unverified instead).

REQUIRED STYLE: name the specific page/element/tag/competitor you observed, state the
so-what, attach a confidence level. Prefer "Unverified / none found" over a guess.

ANALYTICS & TRACKING RULES (validated by the Phase 0.75 spike — see SPIKE_RESULTS.md):
  1. Absent from static HTML does NOT mean the tag/pixel is absent.
  2. A static-only absence must be marked UNKNOWN / UNVERIFIED, never "absent".
  3. Runtime confirmation (rendered network capture or GTM container) can PROMOTE an
     unknown to OBSERVED.
  4. NEVER claim a tag/pixel is absent unless runtime network capture confirms its
     absence.
  5. Every Analytics & Tracking finding MUST include its detection_method
     (static_html | gtm_container | runtime_network | manual).
  6. Do NOT assert a vendor from a substring or from non-attributable browser traffic;
     require a real vendor hostname / site attribution (anti-false-positive).
```

---

## 3. Detection prompt (template)

**Input:** target URL, fetched site evidence, tech/tag detection, optional SERP signals.

From a single URL, detection must produce the full auto-detection contract (see [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) §4): **brand**, **what it sells**, **industry/category**, **business model**, **likely market/geography**, and **competitors (direct / indirect / aspirational)**.

**Output (structured):**
```json
{
  "brand": { "name": "", "value_proposition": "", "what_it_sells": "", "confidence": "High|Medium|Low|Unverified", "evidence_ids": [] },
  "industry": { "category": "", "confidence": "", "evidence_ids": [] },
  "business_model": { "type": "", "rationale": "", "confidence": "", "evidence_ids": [] },
  "market_geography": { "primary_markets": [ "" ], "basis": "", "confidence": "High|Medium|Low|Unverified", "evidence_ids": [] },
  "competitors": [ { "name": "", "relationship": "direct|indirect|aspirational", "confidence": "", "evidence_ids": [] } ],
  "blocking_ambiguities": [ "" ]
}
```
**Instruction highlights:** classify only from provided evidence; attach evidence ids; if a dimension can't be determined, return `Unverified` and list it under `blocking_ambiguities`. For `market_geography`, infer from observable signals only (e.g. currency/locale, language, shipping/contact regions, ccTLD, `hreflang`) and state the `basis`; never assert a market without a signal. For competitors, classify `relationship` as **direct** (same offer/segment), **indirect** (different offer solving the same need), or **aspirational** (a larger/benchmark brand the client likely aims toward) — and mark inferred vs. confirmed.

---

## 4. Clarification prompt (only-when-necessary)

**Goal:** Ask the *fewest* questions that unblock a high-quality audit.

**Threshold (DECISIONS.md D11):** ask a clarifying question **only** when a *core dimension required by an in-scope MVP section* (brand identity, industry, or business model) is `Unverified` or `Low` **and** cannot be resolved from the crawl. Otherwise return an empty list and proceed. Never ask about dimensions only used by deferred sections.
```
Given the detection result and its blocking_ambiguities, decide if clarifying
questions are TRULY NECESSARY per the threshold above. If confidence is sufficient,
return an empty list and proceed. Otherwise return at most 3 high-leverage questions.
```
**Output:**
```json
{ "needs_clarification": true, "questions": ["", ""] }
```

---

## 5. Section generation prompts

Each of the 13 sections (and Digital Audit sub-areas) has its own template sharing a common contract.

### 5.1 Shared section output contract
```json
{
  "section": "executive_summary | client_introduction | ...",
  "summary": "decision-ready synthesis",
  "findings": [
    {
      "statement": "",
      "claim_type": "observed_fact | inference | assumption",
      "confidence": "High | Medium | Low | Unverified",
      "evidence_ids": [],
      "basis": "for inferences/assumptions: the reasoning"
    }
  ],
  "opportunities": [ { "statement": "", "rationale": "", "confidence": "" } ],
  "risks": [ { "statement": "", "severity": "low|medium|high", "rationale": "", "confidence": "" } ],
  "assumptions_or_unknowns": [ "" ],
  "citations": [ "evidence_id" ]
}
```

### 5.2 Per-section instruction notes (examples)
- **Executive Summary:** synthesize only from already-generated, sourced sections; introduce no new facts.
- **Business Model & Strategy:** never assert internal economics (margins/CAC/LTV) — these are not observable; route to Open Questions.
- **Industry Context:** market figures must cite a real provided source or be omitted.
- **Competitive Benchmark:** mark inferred vs. confirmed competitors.
- **Analytics & Tracking → Attribution Risks:** every risk must tie to an observed tag/measurement signal; feed into Risks & Alerts.
- **Growth Diagnosis → same-industry loop case studies:** only include real, citable examples; if none can be sourced, return an empty list with a note — never invent a case study.
- **Final Scorecard:** score 1–5 per dimension; score must reflect evidence strength; flag low-evidence dimensions instead of guessing.

---

## 6. Verification / critique prompt

> Runs after each section (and on the full audit) before persistence.

```
You are a strict reviewer. Given a generated section and its evidence items, flag:
1. Any factual claim with no supporting evidence_id.
2. Any fabricated/uncited number, date, or name.
3. Any inference or assumption presented as observed fact.
4. Any missing uncertainty label.
5. Any internal-economics or non-observable claim asserted as fact.
6. Any GENERIC insight (D11): advice/recommendation not tied to observed evidence,
   a sourced comparison, or a clearly marked inference — i.e. text that would be true
   for any company. Flag for removal or rewrite into a specific, evidence-tied claim.

Return a list of violations with the offending statement and a required fix
(e.g., "downgrade to Unverified and move to Open Questions"). If clean, return [].
```
**Output:**
```json
{ "violations": [ { "statement": "", "issue": "", "required_fix": "" } ] }
```
Sections with violations are regenerated or auto-corrected before being saved.

---

## 7. Few-shot: specific vs. generic (use as in-context examples)

These mirror the canonical golden example in [`DECISIONS.md`](./DECISIONS.md) D10 / [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) §0.6. Feed the ✅ as positive few-shot and the ❌ as a negative example.

- **✅ Specific + sourced:** "Loads GA4 (`G-XXXX`) via GTM (`GTM-YYYY`); **no server-side tagging or consent-mode signal detected** → post-consent EU measurement likely incomplete." (observed_fact + inference, Medium, `evidence_ids:[ev_12,ev_13]`)
- **❌ Generic (REJECT):** "The company should improve its analytics setup and track conversions to optimize marketing." (no evidence, applies to anyone)
- **✅ Inference (marked):** "**Likely** DTC e-commerce." (inference, Medium, basis: cart+checkout present, no reseller language, `[ev_02,ev_03,ev_04]`)
- **✅ Unknown:** "CAC/LTV **not observable** externally." → Open Questions, needed_data: client GA4 + ad-account access. (never a number)

## 8. Anti-hallucination + anti-generic patterns (summary)
- Evidence-grounded generation (tool-fetched, id-referenced).
- Mandatory `claim_type` + `confidence` on every finding.
- **Anti-generic rule (D11):** every insight = evidence, sourced comparison, or marked inference — nothing else.
- Verification pass as a gate (rejects unsourced **and** generic output).
- Empty-over-invented: prefer "Unverified / none found" to fabrication.
- Open Questions as the sink for every unknown.
