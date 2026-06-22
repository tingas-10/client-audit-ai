# Client Audit AI — Phase 0.75 Technical Spike Plan

> **Status:** Proposed — Phase 0.75 (pre-scaffold)
> **Purpose:** Validate the single riskiest assumption before we build the MVP: that we can take **one real public URL**, collect **enough observable evidence**, and generate **one specific, sourced, non-generic audit section** within acceptable **cost** and **latency**.
> **Related (source of truth):** [`DECISIONS.md`](./DECISIONS.md) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) · [`PROMPTS.md`](./PROMPTS.md) · [`DATA_MODEL.md`](./DATA_MODEL.md) · [`TECH_STACK.md`](./TECH_STACK.md) · [`ROADMAP.md`](./ROADMAP.md)
>
> This is a **throwaway, measurement-focused spike**, not MVP code. Nothing here needs to be production-quality; the goal is evidence and a go/no-go decision.

---

## 📦 Relationship to the full product (read first)

> **The final product remains: user enters any public brand/company URL → Client Audit AI automatically generates a full, exhaustive, source-backed client audit.** From that single URL the system auto-identifies the brand, what it sells, industry, business model, likely market/geography, and direct/indirect/aspirational competitors, collects observable evidence, and produces the complete audit — separating observed facts, inferences, assumptions, and unknowns, and asking extra questions only when truly necessary (see [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) §4).
>
> **This spike validates exactly ONE link of that automated pipeline** — the *evidence → sourced finding → verification* loop for a single section — so we can prove it works before building the rest.
>
> **The spike does NOT redefine the product as a manual, one-URL/one-section tool.** The manual steps here (see §7) exist only to measure the hypothesis cheaply; in the product they are **automated** (auto-detection, multi-section generation, the async pipeline, persistence, and UI). Auto-detection and full coverage are **assumed and deferred to Phase 1, not descoped.**

---

## 1. Spike objective

**Prove or disprove this hypothesis:**
> "From a single public URL, using only MVP-tier sources ([`DECISIONS.md`](./DECISIONS.md) D1 — the target's own site + tech/tag detection), we can collect enough observable evidence to generate **one** audit section that is **specific, sourced, and non-generic**, with **zero fabricated facts**, inside the latency (D2) and cost (D3) envelopes."

**What we are validating (in priority order):**
1. **The evidence loop works** — we can fetch a real site and extract structured, citable observations.
2. **The output is trustworthy** — every factual claim ties to an evidence item; uncertainty is marked; nothing is invented.
3. **The output is non-generic** — it passes the anti-generic rule ([`DECISIONS.md`](./DECISIONS.md) D11): every insight is evidence-backed, a sourced comparison, or a clearly marked inference.
4. **It's economical** — within the D2/D3 latency and cost targets.

**What this spike is explicitly NOT trying to prove:**
- Full 13-section coverage, the async pipeline, auth, UI, persistence, or multi-URL scale. Those are MVP concerns (Phase 1), deliberately out of scope here.

---

## 2. Test URL selection

We want a **public, easy-to-inspect, content-rich** site whose business model and tracking are observable from the homepage, with a clear conversion path — ideal for stressing evidence collection.

| Option | Why it's a good spike target | Watch-outs |
|---|---|---|
| **A. Allbirds** (`https://www.allbirds.com`) — DTC footwear/apparel | Clear DTC e-commerce model, strong messaging/claims, obvious CTAs & checkout path, typically rich analytics/pixel stack | JS-heavy storefront; some content client-rendered |
| **B. Notion** (`https://www.notion.com`) — B2B/B2C SaaS | Crisp value proposition, clear pricing/CTA, good for testing "business model" + "website" signals | Marketing site is heavily JS-rendered |
| **C. A mid-size regional brand site** (e.g. a local DTC brand) | Smaller/simpler DOM, less aggressive bot protection, easier to inspect manually | Less interesting tracking stack; may be thin on content |

### ✅ Recommended: **Option A — Allbirds (`https://www.allbirds.com`)**
**Why:** It's a well-known **DTC e-commerce** brand whose homepage exposes exactly the signals the spike needs to test — explicit value claims, visible CTAs and a real conversion/checkout path, linked social, and (typically) a meaningful analytics/marketing tag stack (GA4/GTM/Meta Pixel-class tags). That richness lets us genuinely stress evidence collection **and** the anti-generic quality bar. If bot protection or JS rendering blocks us, we fall back to **Option C** (a simpler site) to keep the spike about *audit logic*, not scraping heroics.

> **Note:** We must respect `robots.txt` / ToS for whichever URL is chosen (see §8). If the recommended target disallows automated fetching of the needed paths, switch to a permissible target before proceeding.

---

## 3. Section to test

### ✅ Recommended: **Analytics & Tracking** (`digital_audit_analytics_tracking`)

**Why this section best validates the spike's goals:**
- It is **the most objectively verifiable** MVP section — tags/pixels either *are* or *are not* present in the page output. That makes "observed fact vs. fabrication" unambiguous and gives us the cleanest read on whether our sourcing discipline holds.
- It naturally exercises **observed facts** (tag `G-XXXX` detected), **inferences** (no server-side/consent-mode signal → likely measurement gap), and **unknowns** (true conversion accuracy not observable externally) — so it tests all three claim types from [`DECISIONS.md`](./DECISIONS.md) D9 in one section.
- It is the **hardest to fake convincingly** and the **easiest to grade**, which is exactly what we want from a de-risking spike. The matching golden example in [`DECISIONS.md`](./DECISIONS.md) D10 / [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) §0.6 is from this section.

**Considered but not chosen first:**
- *Client Introduction* — easy, but mostly restates the brand's self-description; weak test of sourcing rigor.
- *Website / Owned Media* — good, but more subjective; better as the **second** section once the loop is proven.
- *Brand & Creative Diagnosis* — highly subjective/qualitative; worst choice for proving anti-hallucination discipline.

> If Analytics & Tracking yields too few observable signals on the chosen URL, run a **second pass on Website / Owned Media** as a backup section.

---

## 4. Evidence collection scope

Collect **only** from the target's own site (MVP tier, D1). Every item is stored as a structured **evidence record** mirroring [`DATA_MODEL.md`](./DATA_MODEL.md) (`sources` → `evidence`), each with a **source URL** and **capture timestamp**.

**Collect from the homepage (and at most 1–2 obvious linked pages, e.g. a product or pricing page):**
- **Homepage content** — main visible copy, headings, hero section.
- **Navigation / header / footer** — nav links, footer links (incl. legal, contact, social).
- **Metadata** — `<title>`, meta description, canonical, OpenGraph/Twitter tags, `schema.org`/JSON-LD, `robots.txt`, `sitemap.xml` presence.
- **Visible CTAs** — primary/secondary calls to action (text + destination).
- **Visible claims** — explicit value/benefit/marketing claims made on the page (quoted verbatim as the brand's claim).
- **Visible brand messaging** — tagline, positioning statements, tone.
- **Visible conversion paths** — cart/checkout, signup/newsletter, lead forms, contact, demo/booking.
- **Detected tags / pixels (if technically possible)** — analytics/marketing tags observable in HTML/network/`dataLayer` (e.g. GA4, GTM, Meta Pixel, TikTok, LinkedIn Insight, Hotjar), plus consent/cookie banner presence.
- **Source URLs** — the exact URL each observation came from.
- **Timestamp of collection** — ISO timestamp per evidence item (for provenance/auditability).

**Each evidence record (spike shape):**
```json
{
  "id": "ev_01",
  "source_url": "https://www.allbirds.com/",
  "type": "tech_detection | metadata | content | cta | claim | conversion_path | social_link",
  "observation": "GA4 tag G-XXXX present via GTM container GTM-YYYY",
  "raw": { "snippet": "…", "selector_or_location": "…" },
  "captured_at": "2026-06-22T13:00:00Z"
}
```

**Out of scope for the spike:** SERP/rankings, backlinks, traffic estimates, ad libraries, social analytics, anything requiring account access (all deferred/excluded per D1).

---

## 5. Output expected from the spike

A single generated section that conforms to the section output contract in [`PROMPTS.md`](./PROMPTS.md) §5.1 and the conventions in [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) §0. Concretely:

- **Section title** — "Analytics & Tracking".
- **Summary** — a short, decision-ready synthesis (no new facts beyond the findings).
- **Findings** — each with:
  - `statement` (specific, names the tag/element/page observed)
  - `claim_type` — `observed_fact | inference | assumption`
  - `confidence` — `high | medium | low | unverified`
  - `evidence_ids` — references to §4 evidence (required for every `observed_fact`)
  - `basis` — reasoning, required for `inference`/`assumption`
- **Evidence per finding** — explicit mapping so any claim is traceable to a source URL + timestamp.
- **Observed vs. inferred vs. unknown** — clearly separated; unknowns never asserted as fact.
- **Open questions** — what we couldn't observe and the data that would resolve it (e.g. "true conversion accuracy → needs client GA4 access").
- **Anti-generic quality check** — a short reviewer note confirming each insight is evidence-backed / a sourced comparison / a marked inference, and listing any rejected generic statements.

**Illustrative good vs. bad (from D10):**
- ✅ "Loads GA4 (`G-XXXX`) via GTM (`GTM-YYYY`); no server-side tagging or consent-mode signal detected → post-consent EU measurement likely incomplete." (observed_fact + inference, Medium, `[ev_12, ev_13]`)
- ❌ "The company should improve its analytics setup to optimize marketing." (generic — must be rejected)

---

## 6. Success criteria (pass / fail)

The spike **PASSES** only if **all** of these hold:

| Criterion | Threshold |
|---|---|
| **Minimum sourced findings** | ≥ **5** findings, each tied to ≥ 1 evidence item with a source URL + timestamp |
| **Maximum unsupported claims** | **0** fabricated facts (numbers/names/dates with no evidence). **0** generic statements surviving the quality check |
| **Observed/inferred labeling** | **100%** of findings carry a correct `claim_type` + `confidence`; every unknown is in Open Questions, not asserted |
| **Acceptable latency** | End-to-end (fetch + generate + verify) within **D2**: ideal ≤ 90s, acceptable ≤ 4m |
| **Acceptable estimated cost** | Within **D3**: ≤ **$2.00** target per run (LLM + any retrieval), well under the $3.50 hard cap |
| **Minimum quality standard** | A senior reviewer judges the section **decision-useful and specific to this brand** — i.e. it could not have been written about a random other company |

**Stop / redesign triggers** (if any occur, pause and rethink the approach before MVP):
- We **cannot reliably fetch** the needed content (hard bot-blocking) on multiple permissible targets.
- The model **fabricates** facts despite the evidence-grounding + verification gate.
- Output is **sourced but generic** and we can't push it to specific with prompt rules.
- Cost or latency is **far** outside D2/D3 (e.g. >2× the acceptable bound) with no clear path down.

---

## 7. Manual vs. automated steps

| Step | Spike (manual / lightweight) | MVP (must be automated — Phase 1) |
|---|---|---|
| URL fetch | Manual fetch / a throwaway script / browser "view source" + network panel | Robust fetch + render service, retries, robots/ToS handling |
| Tag/pixel detection | Manual inspection of HTML/network/`dataLayer`, or a one-off detector | Automated tech/tag detection in the evidence layer |
| Evidence structuring | Hand-assemble the evidence JSON (§4 shape) | Auto-generated `sources`/`evidence` rows ([`DATA_MODEL.md`](./DATA_MODEL.md)) |
| Section generation | Single Claude call using the [`PROMPTS.md`](./PROMPTS.md) system + section prompt | Orchestrated generate step in the durable pipeline (D4) |
| Verification | Run the critique prompt once; reviewer eyeballs it | Verification pass as an automated gate before persistence |
| Cost/latency measurement | Manual stopwatch + token/cost note | `jobs` token/cost accounting rolled up to the audit (D12) |
| Storage | A local JSON/markdown file | Supabase persistence with RLS (D5) |

**Principle:** in the spike, automate **nothing** that isn't needed to measure the hypothesis. The only thing that must be "real" is the **evidence → sourced finding → verification** loop.

---

## 8. Risks and constraints

- **Scraping limitations** — rate limits, bot protection (e.g. Cloudflare), or `robots.txt` disallow. *Mitigation:* pick a permissible target; respect robots/ToS; fall back to Option C.
- **Blocked pages** — login walls, geo-blocks, interstitials. *Mitigation:* stick to public homepage + obvious public pages.
- **JS-rendered content** — key content/tags injected client-side and absent from raw HTML. *Mitigation:* use a rendering fetch (headless) for the spike if raw HTML is thin; note this as an MVP requirement.
- **Privacy & ToS constraints** — only collect public, non-personal data; honor ToS; store provenance. No account-access sources (D1 exclusions).
- **Hallucination risk** — the core risk. *Mitigation:* evidence-grounded generation + mandatory `evidence_ids` + verification gate ([`PROMPTS.md`](./PROMPTS.md)).
- **Generic-output risk** — sourced-but-bland prose. *Mitigation:* anti-generic rules (D11) + the quality check in §5/§6.
- **Incomplete observable data** — some truths (CAC, true conversion rates, internal setup) are simply not observable externally. *Mitigation:* route to Open Questions; never fabricate (D9).

---

## 9. Spike execution checklist

1. **Confirm target** — verify `robots.txt`/ToS for the chosen URL (Allbirds, else fallback). Record the decision.
2. **Fetch** — retrieve the homepage (raw HTML; if content/tags are JS-injected, use a rendered fetch). Save the response + timestamp.
3. **Fetch 1–2 linked pages** if needed (e.g. product/pricing) for conversion-path/tag signals.
4. **Extract evidence** — assemble the §4 evidence records (content, nav, metadata, CTAs, claims, messaging, conversion paths, detected tags), each with `source_url` + `captured_at`.
5. **Detect tags/pixels** — inspect HTML/network/`dataLayer`; record each detected tag as an `observed_fact` evidence item (or note "none detected").
6. **Generate the section** — run the [`PROMPTS.md`](./PROMPTS.md) global system prompt + Analytics & Tracking section prompt against the evidence; produce the §5 structured output.
7. **Verify** — run the critique/verification prompt; fix or downgrade any flagged claims (unsourced, generic, mislabeled).
8. **Measure** — record wall-clock latency and estimated token/$ cost for the run.
9. **Grade against §6** — check every pass/fail criterion; have a senior reviewer judge specificity/usefulness.
10. **Record results** — write up findings, metrics, and any stop/redesign triggers hit.
11. **Decide** — apply §10 (pass / partial / fail) and capture MVP implications (§11).

---

## 10. Decision after spike

- **✅ PASS** (all §6 criteria met): proceed to **Phase 1 MVP scaffolding**. The evidence→sourced-finding→verification loop is validated; lock the proven prompt + evidence shape and build the pipeline/UI around it.
- **🟡 PARTIAL** (loop works but one bound missed — e.g. quality good but cost/latency high, or fetch needs rendering): proceed **with targeted fixes first** — adjust the slow/expensive step, add rendered fetch, or tighten prompts — then re-run the failing criterion before scaffolding. Do **not** expand scope until the gap is closed.
- **❌ FAIL** (a stop/redesign trigger hit — can't fetch, fabricates, or stays generic): **do not scaffold.** Redesign the riskiest part (sourcing strategy, grounding, or prompt approach) and re-run the spike. It's far cheaper to iterate here than in a built MVP.

---

## 11. Future MVP implications

The spike's results directly shape Phase 1:

- **Architecture** — confirms whether a simple fetch suffices or a **rendered (headless) fetch** is mandatory; validates that the generate+verify step fits within serverless step limits (informs the durable-pipeline design, D4).
- **Data model** — validates the `sources` → `evidence` → `findings` → `finding_evidence` shape ([`DATA_MODEL.md`](./DATA_MODEL.md) D12); surfaces any missing evidence fields (e.g. render-mode, selector) before migrations are written.
- **Prompts** — produces a **proven, locked** system + section prompt and a real few-shot example; confirms the anti-generic rules and verification gate actually work on live data ([`PROMPTS.md`](./PROMPTS.md), D11).
- **Async pipeline** — real latency per step tells us how to split steps and set timeouts/retries in the workflow runner (D4) and whether per-section streaming is needed to hit the D2 UX target.
- **Evidence storage** — confirms the volume/shape of evidence per section, informing storage, caching, and provenance needs.
- **UI requirements** — the §5 output defines what the report view must render: findings with inline confidence badges, a per-finding sources panel, observed/inferred/unknown separation, and the Open Questions list.

> **Outcome of this spike = the green light (or not) for Phase 1.** No application code is written until the loop is proven on at least one real URL.
