# Client Audit AI — Data Model

> **Status:** Draft v0.1
> **Purpose:** The Supabase/Postgres data model. Sourcing and confidence are first-class in the schema.
> **Related:** [`TECH_STACK.md`](./TECH_STACK.md) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) · [`PROMPTS.md`](./PROMPTS.md)

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
audits 1───* competitors
audits 1───* sources
sources 1───* evidence
audit_sections *───* evidence     (via findings.evidence_ids)
audits 1───* scores
audits 1───* clarifying_questions
audits 1───* jobs
audits 1───* open_questions
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
| status | text | queued / detecting / awaiting_clarification / generating / verifying / completed / failed |
| detection | jsonb | brand/industry/model/competitors + confidence + evidence_ids |
| overall_score | numeric | weighted total (nullable) |
| created_by | uuid (fk → auth.users) | |
| created_at | timestamptz | |
| completed_at | timestamptz | |

### `audit_sections`
One row per section (and Digital Audit sub-area).
| field | type | notes |
|---|---|---|
| id | uuid (pk) | |
| audit_id | uuid (fk) | |
| section_key | text | e.g. `executive_summary`, `digital_audit.paid_media.media` |
| summary | text | |
| content | jsonb | findings[] per section contract (see [`PROMPTS.md`](./PROMPTS.md) §5.1) |
| confidence | text | High / Medium / Low / Unverified (section-level roll-up) |
| created_at | timestamptz | |

> `content.findings[]` each include: `statement`, `claim_type`, `confidence`, `evidence_ids[]`, `basis`. Opportunities/risks/assumptions also live here.

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

### `scores`
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
| step | text | detect / gather_evidence / generate / verify / score / synthesize |
| status | text | pending / running / done / failed |
| cost_usd | numeric | per-step cost tracking |
| started_at / finished_at | timestamptz | |
| error | text | nullable |

---

## 4. Row-Level Security (RLS)
- Enable RLS on every table with org-scoped data.
- Policy pattern: a row is accessible only if the requesting user has a `memberships` row for that `organization_id`.
- Service-role key (server/orchestrator only) bypasses RLS for the background pipeline; never exposed to the client.

---

## 5. Indexing notes (high-level)
- `companies(canonical_domain, organization_id)` — dedup & lookup.
- `audits(organization_id, status)` — dashboards.
- `audit_sections(audit_id, section_key)` — section fetch.
- `evidence(audit_id)`, `sources(audit_id)` — sourcing panels.
- `scores(audit_id)` — scorecard.

---

## 6. Notes
- All JSON shapes mirror the structured outputs in [`PROMPTS.md`](./PROMPTS.md) so the LLM contract and DB stay in sync.
- Concrete SQL migrations + RLS policies are written when Phase 1 implementation begins (see [`ROADMAP.md`](./ROADMAP.md)).
