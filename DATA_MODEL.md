# Client Audit AI — Data Model

> **Status:** Draft v0.2 (updated for Phase 0.5 decisions — D12)
> **Purpose:** The Supabase/Postgres data model. Sourcing and confidence are first-class in the schema.
> **Related:** [`DECISIONS.md`](./DECISIONS.md) (source of truth) · [`TECH_STACK.md`](./TECH_STACK.md) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) · [`PROMPTS.md`](./PROMPTS.md)

> **Phase 0.5 tightening (D12) applied below:** findings promoted to a real table with a `finding_evidence` join (sourcing enforced by FK, not JSON); enums/check constraints on status/claim_type/confidence; audit versioning; cost/token accounting; canonical flat `snake_case` section keys.

---

## 1. Design principles
- **Sourceability is structural:** claims link to evidence; evidence links to sources. You can trace any statement to its origin.
- **Confidence is stored, not implied:** every finding carries a confidence level.
- **Multi-tenant from day one:** data is scoped to organizations; RLS enforces isolation.
- **Auditable & re-runnable:** audits, sections, and scores are versioned/timestamped.

---

## 2. Entity overview (ER)

```
organizations 1───* memberships *───1 users
organizations 1───* audits
companies 1───* audits            (a company can be audited multiple times)
audits 1───* audit_sections
audit_sections 1───* findings                 (D12: findings are a real table)
findings *───* evidence  (via finding_evidence join — D12: FK-enforced sourcing)
audits 1───* competitors
audits 1───* sources
sources 1───* evidence
audits 1───* scores               (Phase 2 — no scorecard in MVP, D7)
audits 1───* clarifying_questions
audits 1───* jobs
audits 1───* open_questions
audits 0..1───1 audits            (self-ref: supersedes_audit_id — D12 versioning)
```

---

## 3. Core entities

### `organizations`
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| name | text | |
| created_at | timestamptz | |

### `users`
Managed by Supabase Auth (`auth.users`); app profile mirror as needed.

### `memberships`
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| organization_id | uuid (fk) | |
| user_id | uuid (fk → auth.users) | |
| role | text | owner / admin / member |

### `companies`
The audited brand/company (deduplicated by canonical domain).
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| organization_id | uuid (fk) | |
| name | text | detected; nullable until detection |
| url | text | input URL |
| canonical_domain | text | normalized |
| industry | text | detected (confidence in detection field) |
| business_model | text | detected |
| created_at | timestamptz | |

### `audits`
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| organization_id | uuid (fk) | |
| company_id | uuid (fk) | |
| input_url | text | primary input |
| status | audit_status (enum) | `queued / detecting / awaiting_clarification / generating / verifying / completed / partial / failed` (D12 enum; `partial` = stopped at a ceiling per D2/D3) |
| detection | jsonb | brand/industry/model/competitors + confidence + evidence_ids |
| version | int | **D12** — audit version (default 1) |
| supersedes_audit_id | uuid (fk → audits, nullable) | **D12** — links a re-run to the prior audit (deltas) |
| total_cost_usd | numeric | **D12** — rolled up from `jobs` for budget enforcement (D3) |
| total_tokens | bigint | **D12** — rolled up from `jobs` |
| overall_score | numeric | nullable; **null in MVP** (no scorecard — D7), populated Phase 2 |
| created_by | uuid (fk → auth.users) | |
| created_at | timestamptz | |
| completed_at | timestamptz | |

### `audit_sections`
One row per section (and Digital Audit sub-area).
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| audit_id | uuid (fk) | |
| section_key | section_key (enum) | **D12** — canonical flat `snake_case` from the fixed list (see §3b) |
| summary | text | |
| content | jsonb | opportunities/risks/assumptions + section meta (findings now live in `findings`) |
| confidence | confidence_level (enum) | `high / medium / low / unverified` (section-level roll-up) |
| created_at | timestamptz | |

### `findings` (D12 — promoted to a real table)
Each atomic claim in a section. Sourcing is enforced via the `finding_evidence` join, not JSON.
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| audit_section_id | uuid (fk → audit_sections) | |
| statement | text | the claim |
| claim_type | claim_type (enum) | `observed_fact / inference / assumption` |
| confidence | confidence_level (enum) | `high / medium / low / unverified` |
| basis | text | required for inference/assumption (the reasoning) |
| created_at | timestamptz | |

### `finding_evidence` (D12 — join, FK-enforced sourcing)
| field | type | notes |
|---|---|---|
| finding_id | uuid (fk → findings) | |
| evidence_id | uuid (fk → evidence) | |
| (pk) | (finding_id, evidence_id) | |

> **Invariant (enforced in app + checks):** any finding with `claim_type = observed_fact` MUST have ≥ 1 `finding_evidence` row. This makes "every observed claim is sourced" a structural guarantee, not a convention.

### `sources`
A place/tool we got information from.
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| audit_id | uuid (fk) | |
| type | text | website / tech_detection / serp / ads_transparency / seo_api / social / other |
| locator | text | URL or tool reference |
| fetched_at | timestamptz | |

### `evidence`
A specific observed signal, used to back claims.
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| source_id | uuid (fk) | |
| audit_id | uuid (fk) | denormalized for query convenience |
| observation | text | what was observed (e.g. "Meta Pixel tag present") |
| raw | jsonb | structured detail / snippet |
| captured_at | timestamptz | |

> Findings reference `evidence.id` values in `audit_sections.content.findings[].evidence_ids`. This is the sourcing backbone.

### `competitors`
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| audit_id | uuid (fk) | |
| name | text | |
| relationship | text | direct / adjacent |
| confidence | text | |
| evidence_ids | uuid[] | |

### `scores` *(Phase 2 — not used in MVP per D7)*
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| audit_id | uuid (fk) | |
| dimension | text | e.g. `seo`, `paid_media`, `brand_creative` (see scorecard) |
| score | int | 1–5 |
| weight | numeric | |
| rationale | text | |
| confidence | text | |

### `clarifying_questions`
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| audit_id | uuid (fk) | |
| question | text | |
| answer | text | nullable until answered |
| answered_at | timestamptz | |

### `open_questions`
Section 13 sink — explicit unknowns and what would resolve them.
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| audit_id | uuid (fk) | |
| question | text | the unknown |
| needed_data | text | what would resolve it (e.g. "GA4 access") |
| origin_section_key | text | where it surfaced |
| priority | text | low / medium / high |

### `jobs`
Background-pipeline progress.
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| audit_id | uuid (fk) | |
| step | job_step (enum) | `detect / gather_evidence / generate / verify / score / synthesize` |
| status | job_status (enum) | `pending / running / done / failed` |
| tokens_in | bigint | **D12** — per-step input tokens |
| tokens_out | bigint | **D12** — per-step output tokens |
| cost_usd | numeric | per-step cost (rolls up to `audits.total_cost_usd`) |
| started_at / finished_at | timestamptz | |
| error | text | nullable |

---

## 3b. Canonical section keys & enums (D12)

**Section keys** — flat `snake_case`, fixed list (the dotted form is dropped so the LLM contract in [`PROMPTS.md`](./PROMPTS.md) and the DB are identical). MVP keys (D6):
```
client_introduction
business_model_strategy
digital_audit_website
digital_audit_analytics_tracking
digital_audit_seo
executive_summary
open_questions
```
Deferred keys (Phase 2+), same convention: `industry_context`, `competitive_benchmark`, `customer_journey`, `digital_audit_paid_media`, `digital_audit_social_content`, `digital_audit_cro`, `brand_creative`, `growth_diagnosis`, `ai_readiness`, `risks_alerts`, `final_scorecard`.

**Enums / check constraints** (Postgres enums or `CHECK`):
- `confidence_level`: `high | medium | low | unverified`
- `claim_type`: `observed_fact | inference | assumption`
- `audit_status`, `job_step`, `job_status`, `section_key`, `competitors.relationship` (`direct | adjacent`)

## 4. Row-Level Security (RLS)
- Enable RLS on every table with org-scoped data.
- Policy pattern: a row is accessible only if the requesting user has a `memberships` row for that `organization_id`.
- Service-role key (server/orchestrator only) bypasses RLS for the background pipeline; never exposed to the client.

---

## 5. Indexing notes (high-level)
- `companies(canonical_domain, organization_id)` — dedup & lookup.
- `audits(organization_id, status)` — dashboards.
- `audit_sections(audit_id, section_key)` — section fetch.
- `findings(audit_section_id)` and `finding_evidence(finding_id)` — sourcing panels (D12).
- `evidence(audit_id)`, `sources(audit_id)` — evidence lookup.
- `audits(supersedes_audit_id)` — version chains (D12).
- `scores(audit_id)` — scorecard (Phase 2 only).

---

## 6. Notes
- Findings now persist in the `findings` table; the structured output in [`PROMPTS.md`](./PROMPTS.md) §5.1 maps `findings[]` → `findings` rows and `evidence_ids[]` → `finding_evidence` rows. Keep section keys identical to §3b.
- Section `content` jsonb now holds only opportunities/risks/assumptions + meta (not the findings themselves).
- Concrete SQL migrations + RLS policies + enums are written when Phase 1 implementation begins (see [`ROADMAP.md`](./ROADMAP.md)), following D12.
