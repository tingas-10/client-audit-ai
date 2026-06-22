# Client Audit AI — Phase 0.75 Spike Results

> **Status:** Complete — Phase 0.75 (de-risking spike)
> **Result:** ✅ **PASS** (strengthened by the rendered pass)
> **Related:** [`SPIKE_PLAN.md`](./SPIKE_PLAN.md) · [`DECISIONS.md`](./DECISIONS.md) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) · [`PROMPTS.md`](./PROMPTS.md) · [`DATA_MODEL.md`](./DATA_MODEL.md) · [`TECH_STACK.md`](./TECH_STACK.md)
>
> **Product vision is unchanged:** *user enters any public brand/company URL → Client Audit AI generates a full, exhaustive, source-backed audit automatically.* This spike validated **one link** of that automated pipeline; it does not narrow the product.

---

## 1. Spike summary

We tested whether, from a single public URL, we can collect observable evidence and generate **one specific, sourced, non-generic** audit section (Analytics & Tracking) with **zero fabricated facts**, within the latency ([`DECISIONS.md`](./DECISIONS.md) D2) and cost (D3) envelopes.

**Outcome:** The spike **passed**. We produced a confident, brand-specific Analytics & Tracking section backed by real, observed tag IDs. Critically, the spike also proved that **static HTML alone is insufficient — and actively misleading — for this section**: a static-only pass produced **two false negatives (Meta, TikTok) and one wrong inference (Consent Mode)**, all corrected by a headless/rendered network-capture pass. The required MVP architecture is now decided by evidence, not assumption.

---

## 2. Test URL

`https://www.gollo.com` — **Gollo**, a Costa Rica retail/e-commerce brand (parent group: Unicomer). Page title: *"Gollo Costa Rica: Compras con envió de 24 a 48 horas."* Public homepage only; no login, no account access.

---

## 3. Section tested

**Analytics & Tracking** (`digital_audit_analytics_tracking`) — chosen because it is the most objectively verifiable MVP section (tags either fire or they don't), making it the cleanest test of sourcing discipline and the anti-generic bar.

---

## 4. Static HTML findings

**Method:** single public `GET` of the homepage HTML (HTTP 200, 515,667 bytes), then static signal extraction.

**Observed in static HTML:**
- **Google Tag Manager** — container `GTM-TH5RG9H2` (noscript iframe `…/ns.html?id=GTM-TH5RG9H2`).
- **Hotjar** — `_hjSettings={hjid:2894156,hjsv:6}` + `static.hotjar.com` loader.
- **Microsoft Clarity** — init `(window, document, "clarity", "script", "m49esoi0rj")`.
- **GTM `dataLayer`** — referenced 24×.
- **Platform** — Magento / Adobe Commerce (`mage/` ×110, `x-magento` ×34, `Magento_*` modules).
- **Market signal** — `hreflang="es-cr"`, currency `CRC` / `₡` → Costa Rica.

**Not observable in static HTML (correctly marked Unknown, not "absent"):**
- No GA4 `G-` ID and no `gtag(` present.
- No Meta Pixel / TikTok / LinkedIn / Google Ads tags in markup (the `facebook.com` reference was a social link, no `fbq`/`fbevents.js`).
- No `gtag('consent', …)` and no recognized CMP vendor.

**Static-only conclusion:** a GTM-centric stack with two session-replay tools (Hotjar + Clarity) is confirmed, but core web analytics and paid-media pixels are injected at runtime via GTM and **cannot be confirmed from static HTML**.

---

## 5. Runtime / headless rendered findings

**Method (three dependency-free, public techniques):**
1. **GTM container introspection** — fetched the public `googletagmanager.com/gtm.js?id=GTM-TH5RG9H2` to read configured tags.
2. **Headless render + network capture** — Chrome headless (pre-installed) with Chromium's built-in **net-log** (`--log-net-log --net-log-capture-mode=Everything`) and `--virtual-time-budget=20000` so GTM/JS fully executed; captured every runtime request.
3. **Hostname verification pass** — confirmed each candidate vendor's real hostname and (where possible) `domain=www.gollo.com` attribution, to filter out the browser's own background traffic and substring false positives.

**GTM container (`gtm.js`) revealed:** a configured **Google Ads** tag `AW-745683998`, **29 Custom HTML tags**, and **no GA4 `G-` ID** in the container. Hotjar/Clarity were **absent** from the container (confirming they're hardcoded in the site template). The container's consent-mode strings are GTM's standard library plumbing and were **not** treated as proof of configuration.

**Headless render (net-log) — site-attributed runtime requests:**
- **GA4** — `gtag/js?id=G-KHZNC1Q6K0`; `google-analytics.com/g/collect` with `tid=G-KHZNC1Q6K0` (16) and `tid=G-Y87KE79C94` (4). Live events: `page_view`, `view_item`, `detail_page_view`, `user_engagement`.
- **Google Ads** — `gtag/js?id=AW-745683998`; `googleadservices.com/pagead/conversion/745683998`; `googleads.g.doubleclick.net` (remarketing).
- **Meta Pixel** — `connect.facebook.net/en_US/fbevents.js`; `/signals/config/1137902637924441` and `/signals/config/1233525926812009`, both with `domain=www.gollo.com`.
- **TikTok Pixel** — `analytics.tiktok.com/i18n/pixel/events.js?sdkid=CRQAL4RC77U6OCTM2MG0&lib=ttq`; `/api/v2/pixel/act`.
- **Hotjar** — `static.hotjar.com` (42 requests).
- **Microsoft Clarity** — `b/c/w/s/g/a.clarity.ms` (300+ requests).
- **Google Consent Mode v2** — GA/Ads requests carry `gcs=G111` (granted, 29), `gcs=G100` (denied, 7), and `gcd=…`.
- **Salesforce** — `unicomer.my.salesforce.com`, `unicomer.my.salesforce-scrt.com` (Service Cloud / chat).

> **Net-log caveat handled:** net-log captures *all* browser traffic (safebrowsing, component updates, web-store, GCM, etc.). Those were excluded; only page-attributable requests were counted.

---

## 6. Tags and pixels confirmed

| Vendor | ID(s) | How confirmed |
|---|---|---|
| Google Tag Manager | `GTM-TH5RG9H2` | static + runtime |
| GA4 (two properties) | `G-KHZNC1Q6K0`, `G-Y87KE79C94` | runtime (collect + events) |
| Google Ads | `AW-745683998` (+ DoubleClick remarketing) | gtm container + runtime |
| Meta Pixel (two) | `1137902637924441`, `1233525926812009` | runtime (domain-attributed) |
| TikTok Pixel | sdkid `CRQAL4RC77U6OCTM2MG0` | runtime |
| Hotjar | `2894156` | static + runtime |
| Microsoft Clarity | `m49esoi0rj` | static + runtime |
| Google Consent Mode v2 | `gcs`/`gcd` signals | runtime |
| Salesforce (Service Cloud/chat) | `unicomer.my.salesforce(-scrt).com` | runtime |

---

## 7. Tags and pixels NOT confirmed

- **Confirmed absent at runtime:** LinkedIn Insight Tag (`px.ads.linkedin.com` / `snap.licdn.com` — none); Microsoft Ads UET (`bat.bing.com` — none).
- **No third-party CMP vendor detected** (Cookiebot / OneTrust / Didomi / Usercentrics / Civic — none), *despite* Consent Mode being active → implies a custom or default-granted consent setup; exact banner/UX needs a visual/interaction check.
- **Not externally verifiable:** server-side tagging (sGTM) or Meta CAPI alongside the browser pixel; whether the two GA4 properties are prod/test or brand/roll-up; true conversion dedup/accuracy; whether `gcs=G111` dominance means consent isn't actually enforced.
- **False positives rejected during verification** (important MVP lesson): VWO and VTEX (substring noise, no real host), Civic CMP (no host), Microsoft Ads (only ambiguous `c.bing.com`, not the UET host), and generic `google.com` / `play.google.com` / `chromewebstore` / `safebrowsing` (Chrome's own traffic).

---

## 8. Static-only false negatives

The headline finding. Static-only was wrong in three places:

| Static-only said | Reality (rendered) | Type of error |
|---|---|---|
| GA4 "not confirmable" | **GA4 confirmed** — two properties + live events | resolved Unknown → Confirmed |
| "No Meta Pixel in HTML" | **Meta Pixel confirmed** (two pixels) | **false negative** |
| "No TikTok Pixel in HTML" | **TikTok Pixel confirmed** | **false negative** |
| "No Google Ads in HTML" | **Google Ads confirmed** (+ remarketing) | **false negative** |
| "No Consent Mode / CMP" | **Consent Mode v2 active**; no CMP vendor | wrong inference (half corrected) |

**Discipline note:** the static pass's rule of marking observed-absence as **Unknown** (never "absent") was correct — it prevented these from becoming asserted falsehoods. The rendered pass is what promotes Unknown → Confirmed.

---

## 9. Final updated Analytics & Tracking section

**Summary.** Gollo runs a comprehensive, GTM-orchestrated (`GTM-TH5RG9H2`) measurement stack on Magento/Adobe Commerce: **dual GA4** (`G-KHZNC1Q6K0`, `G-Y87KE79C94`) with e-commerce events; **Google Ads** (`AW-745683998`) with DoubleClick remarketing; **two Meta Pixels**; a **TikTok Pixel**; plus **two overlapping session-replay tools** (Hotjar `2894156` + Clarity `m49esoi0rj`). **Google Consent Mode v2 is active** (`gcs`/`gcd`) but **no third-party CMP vendor is detectable**, and consent appears largely default-granted. **No LinkedIn or Microsoft Ads** tags fire. A **Salesforce** Service Cloud/chat layer is present.

**Findings**

- **F1 — GTM is the tag-management backbone (`GTM-TH5RG9H2`).** Observed · High · static + runtime. *Why it matters:* most tags inject at runtime via GTM, so any static-only audit under-counts the stack; governance hinges on this one container.
- **F2 — Dual GA4 (`G-KHZNC1Q6K0`, `G-Y87KE79C94`) with e-commerce events.** Observed (runtime) · High. *Why:* two properties raise a data-governance question (prod/test? brand/roll-up?) and risk divergent reporting.
- **F3 — Google Ads (`AW-745683998`) with remarketing.** Observed (runtime) · High. *Why:* active paid-search/remarketing measurement; conversion accuracy depends on the consent/measurement setup.
- **F4 — Two Meta Pixels (`1137902637924441`, `1233525926812009`).** Observed (runtime) · High. *Why:* dual pixels can mean duplicate events / attribution noise unless deliberately scoped.
- **F5 — TikTok Pixel (`CRQAL4RC77U6OCTM2MG0`).** Observed (runtime) · High. *Why:* confirms multi-platform paid social investment; worth verifying event quality/dedup.
- **F6 — Redundant session-replay: Hotjar (`2894156`) + Clarity (`m49esoi0rj`).** Observed · High. *Why:* duplicated capability, doubled privacy surface and page weight.
- **F7 — Consent Mode v2 active, but no detectable CMP; consent appears default-granted.** Inference from observed signals (`gcs`/`gcd` present; no CMP vendor) · Medium. *Why:* privacy/compliance exposure and uncertain post-consent signal quality, especially with two replay tools running.
- **F8 — Salesforce Service Cloud/chat layer present.** Observed (runtime) · Medium. *Why:* a CRM/support touchpoint relevant to lifecycle/measurement, worth mapping.

**Attribution risks (inline, per [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) §7.4):** runtime-injection blind spot (static audit incomplete); dual GA4 reporting divergence; duplicate Meta pixels; Consent-Mode-without-visible-CMP / default-granted consent risk.

**Open questions (routed to Section 13):** Are the two GA4 properties intentional (and which is canonical)? Are the two Meta pixels deduplicated? Is server-side tagging / Meta CAPI in use? Is there an actual consent banner, and does it gate tags? What is the full dataLayer event schema?

**Anti-generic check ✅:** every finding names a real, observed artifact (actual container/property/pixel IDs) or is an explicitly marked inference. Nothing here could have been written about an arbitrary brand.

---

## 10. Evidence collected

| id | observation | method | source | type |
|---|---|---|---|---|
| ev_01 | GTM `GTM-TH5RG9H2` (noscript iframe) | static_html | `https://www.gollo.com/` | observed |
| ev_02 | Hotjar `hjid:2894156, hjsv:6` | static_html + runtime | `https://www.gollo.com/`, `static.hotjar.com` | observed |
| ev_03 | Clarity project `m49esoi0rj` | static_html + runtime | `https://www.gollo.com/`, `*.clarity.ms` | observed |
| ev_04 | `dataLayer` referenced 24× | static_html | `https://www.gollo.com/` | observed |
| ev_05 | Platform Magento/Adobe Commerce | static_html | `https://www.gollo.com/` | observed |
| ev_06 | Market = Costa Rica (`hreflang es-cr`, `CRC`, `₡`) | static_html | `https://www.gollo.com/` | observed |
| ev_07 | Google Ads `AW-745683998` (configured) | gtm_container | `googletagmanager.com/gtm.js?id=GTM-TH5RG9H2` | observed |
| ev_08 | GA4 `G-KHZNC1Q6K0` + `G-Y87KE79C94` (collect + events) | runtime_network | `google-analytics.com/g/collect` | observed |
| ev_09 | Meta pixels `1137902637924441`, `1233525926812009` | runtime_network | `connect.facebook.net/signals/config/…?domain=www.gollo.com` | observed |
| ev_10 | TikTok pixel sdkid `CRQAL4RC77U6OCTM2MG0` | runtime_network | `analytics.tiktok.com/i18n/pixel/events.js` | observed |
| ev_11 | Google Ads conversion/remarketing | runtime_network | `googleadservices.com/pagead/conversion/745683998`, `googleads.g.doubleclick.net` | observed |
| ev_12 | Consent Mode v2 `gcs=G111/G100`, `gcd=…` | runtime_network | GA/Ads collect requests | observed |
| ev_13 | Salesforce Service Cloud/chat | runtime_network | `unicomer.my.salesforce(-scrt).com` | observed |
| ev_14 | LinkedIn / MS Ads UET absent | runtime_network | (no `px.ads.linkedin.com` / `snap.licdn.com` / `bat.bing.com`) | observed-absence |

*Collected 2026-06-22 (UTC). Each evidence item carries source + method; all spike artifacts were temporary and were deleted after analysis.*

---

## 11. Pass / fail result

**✅ PASS — strengthened.** Criteria from [`SPIKE_PLAN.md`](./SPIKE_PLAN.md) §6 met: ≥ 5 sourced findings (8 observed-fact findings with real IDs), **0 fabricated facts**, **0 generic statements** surviving, 100% labeled, within D2 latency (render + capture ≈ 5–9s; static fetch ≈ 1s) and far under the D3 cost target (local compute ≈ $0; one section generate+verify well under $0.05). A senior-reviewer specificity check passes — the section is unmistakably about Gollo.

---

## 12. Architecture implications

- **Static HTML is insufficient — and actively misleading — for Analytics & Tracking.** It produced two false negatives and one wrong inference. **A headless render + network capture is required** for this section. This is now evidence-based, not hypothetical.
- **Network capture must be filtered.** Raw net-log includes browser background traffic and substring traps; the evidence layer needs an **allowlist of known vendor endpoints + ID-pattern extraction + site-attribution checks** (`domain=` / first-party correlation).
- **GTM container introspection is a valuable third evidence method** — the public `gtm.js` revealed the Google Ads tag and confirmed Hotjar/Clarity are *not* container-managed. It complements (does not replace) the rendered pass.
- **Three evidence methods, used together:** `static_html` (fast, cheap — metadata/CMS/geography), `gtm_container` (configured tags), `runtime_network` (what actually fires). Confidence is highest where methods agree.

---

## 13. Required MVP pipeline changes

1. **Add a rendered-fetch + network-capture step** to the evidence layer for Analytics & Tracking (and any section dependent on runtime tags).
2. **Add GTM container introspection** as a complementary evidence source.
3. **Add a vendor allowlist + ID-extraction + attribution filter** to convert raw captured requests into clean evidence (and to suppress browser-noise / substring false positives).
4. **Two-tier confidence flow:** static observed-absence stays **Unknown**; the rendered pass promotes Unknown → Confirmed. Make this explicit in the pipeline.
5. Keep all of the above within the durable-step async model ([`DECISIONS.md`](./DECISIONS.md) D4); render is the slowest step but fits D2 comfortably.

---

## 14. Data model implications

The MVP should store, per evidence item / finding:
- **detection method** — `static_html | gtm_container | runtime_network`
- **vendor** — e.g. `ga4`, `google_ads`, `meta_pixel`, `tiktok_pixel`, `hotjar`, `clarity`, `consent_mode`, `salesforce`
- **tag ID** — e.g. `G-KHZNC1Q6K0`, `AW-745683998`, `1137902637924441`
- **evidence source** — the source URL / request locator
- **confidence** — `high | medium | low | unverified`
- **timestamp** — capture time (provenance)

This extends the existing `evidence` / `findings` model ([`DATA_MODEL.md`](./DATA_MODEL.md) D12) with `detection_method`, `vendor`, and `tag_id`. (No schema changes are made in this PR — recorded here as a recommendation.)

---

## 15. Prompt implications

- Reinforce the rule **"absent from static HTML ≠ confirmed absent → Unknown"**; only a runtime/container method may promote a tag to Confirmed.
- Require findings to cite the **detection method** and **tag ID** when available (drives specificity, kills generic output).
- Add an **anti-false-positive instruction**: do not assert a vendor from a substring or from non-attributable browser traffic; require a real hostname / site attribution.
- These refine [`PROMPTS.md`](./PROMPTS.md) (D11 anti-generic rules); no prompt files are changed in this PR.

---

## 16. Final recommendation before scaffolding

**The spike passed — proceed toward the MVP, with the evidence layer designed around the proven approach.** Before/at the start of scaffolding:
1. Adopt **rendered fetch + filtered network capture + GTM container introspection** as the evidence layer for Analytics & Tracking.
2. Extend the data model with **detection_method / vendor / tag_id** (plus existing evidence source, confidence, timestamp).
3. Keep the **two-tier confidence** and **anti-false-positive** rules in the prompts/verification gate.

**The product vision is unchanged: URL-in → full, automated, source-backed audit-out.** This spike validated the riskiest link of that pipeline on a real URL; the remaining work is to build the automated pipeline around it.

> Suggested follow-up (separate PR, optional): fold §12–§15 into [`TECH_STACK.md`](./TECH_STACK.md), [`DATA_MODEL.md`](./DATA_MODEL.md), and [`PROMPTS.md`](./PROMPTS.md). Not included here to keep this PR to results only.
