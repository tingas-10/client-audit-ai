-- Client Audit AI — initial schema (Phase 1)
-- Mirrors DATA_MODEL.md. Single-tenant authenticated, org-aware, RLS from day one (DECISIONS.md D5).
-- Apply with: npm run migrate  (uses SUPABASE_DB_URL)

begin;

-- ----------------------------------------------------------------------------
-- Enums (DATA_MODEL.md §3b)
-- ----------------------------------------------------------------------------
create type confidence_level as enum ('high', 'medium', 'low', 'unverified');
create type claim_type as enum ('observed_fact', 'inference', 'assumption');
create type competitor_relationship as enum ('direct', 'indirect', 'aspirational');
create type detection_method as enum ('static_html', 'gtm_container', 'runtime_network', 'manual');
create type audit_status as enum (
  'queued', 'detecting', 'awaiting_clarification', 'generating',
  'verifying', 'completed', 'partial', 'failed'
);
create type job_step as enum ('detect', 'gather_evidence', 'generate', 'verify', 'score', 'synthesize');
create type job_status as enum ('pending', 'running', 'done', 'failed');
create type section_key as enum (
  -- MVP (D6)
  'client_introduction', 'business_model_strategy', 'digital_audit_website',
  'digital_audit_analytics_tracking', 'digital_audit_seo', 'executive_summary', 'open_questions',
  -- Deferred (Phase 2+)
  'industry_context', 'competitive_benchmark', 'customer_journey',
  'digital_audit_paid_media', 'digital_audit_social_content', 'digital_audit_cro',
  'brand_creative', 'growth_diagnosis', 'ai_readiness', 'risks_alerts', 'final_scorecard'
);

-- ----------------------------------------------------------------------------
-- Core tenancy
-- ----------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Domain
-- ----------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text,
  url text not null,
  canonical_domain text,
  industry text,
  business_model text,
  what_it_sells text,
  created_at timestamptz not null default now()
);
create index companies_org_domain_idx on companies (organization_id, canonical_domain);

create table audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  input_url text not null,
  status audit_status not null default 'queued',
  detection jsonb,
  version int not null default 1,
  supersedes_audit_id uuid references audits(id) on delete set null,
  total_cost_usd numeric not null default 0,
  total_tokens bigint not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index audits_org_status_idx on audits (organization_id, status);
create index audits_supersedes_idx on audits (supersedes_audit_id);

create table detected_geography (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  primary_markets text[] not null default '{}',
  basis text,
  confidence confidence_level not null default 'unverified',
  evidence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (audit_id)
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  type text not null,
  locator text,
  fetched_at timestamptz not null default now()
);
create index sources_audit_idx on sources (audit_id);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  audit_id uuid not null references audits(id) on delete cascade,
  observation text not null,
  detection_method detection_method not null,
  vendor text,
  tag_id text,
  source_url text,
  page_url text,
  request_url text,
  raw_evidence_snippet text,
  raw jsonb,
  confidence confidence_level not null default 'unverified',
  captured_at timestamptz not null default now()
);
create index evidence_audit_idx on evidence (audit_id);

create table audit_sections (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  section_key section_key not null,
  summary text,
  content jsonb,
  confidence confidence_level not null default 'unverified',
  created_at timestamptz not null default now(),
  unique (audit_id, section_key)
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  audit_section_id uuid not null references audit_sections(id) on delete cascade,
  statement text not null,
  claim_type claim_type not null,
  confidence confidence_level not null default 'unverified',
  basis text,
  created_at timestamptz not null default now()
);
create index findings_section_idx on findings (audit_section_id);

create table finding_evidence (
  finding_id uuid not null references findings(id) on delete cascade,
  evidence_id uuid not null references evidence(id) on delete cascade,
  primary key (finding_id, evidence_id)
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  name text not null,
  relationship competitor_relationship not null,
  confidence confidence_level not null default 'unverified',
  evidence_ids uuid[] not null default '{}'
);
create index competitors_audit_idx on competitors (audit_id);

create table clarifying_questions (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  question text not null,
  answer text,
  answered_at timestamptz
);

create table open_questions (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  question text not null,
  needed_data text,
  origin_section_key section_key,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high'))
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  step job_step not null,
  status job_status not null default 'pending',
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  cost_usd numeric not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  error text
);
create index jobs_audit_idx on jobs (audit_id);

-- scores: created for Phase 2 (no scorecard in MVP, D7)
create table scores (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  dimension text not null,
  score int check (score between 1 and 5),
  weight numeric,
  rationale text,
  confidence confidence_level not null default 'unverified'
);

-- ----------------------------------------------------------------------------
-- RLS (DECISIONS.md D5) — membership-based access; service role bypasses RLS.
-- ----------------------------------------------------------------------------
create or replace function is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function can_access_audit(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from audits a
    join memberships m on m.organization_id = a.organization_id
    where a.id = aid and m.user_id = auth.uid()
  );
$$;

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table companies enable row level security;
alter table audits enable row level security;
alter table detected_geography enable row level security;
alter table sources enable row level security;
alter table evidence enable row level security;
alter table audit_sections enable row level security;
alter table findings enable row level security;
alter table finding_evidence enable row level security;
alter table competitors enable row level security;
alter table clarifying_questions enable row level security;
alter table open_questions enable row level security;
alter table jobs enable row level security;
alter table scores enable row level security;

create policy org_read on organizations for select using (is_org_member(id));
create policy membership_self on memberships for select using (user_id = auth.uid());
create policy companies_member on companies for select using (is_org_member(organization_id));
create policy audits_member on audits for select using (is_org_member(organization_id));

-- Child tables: read access if the user can access the parent audit.
create policy detected_geo_member on detected_geography for select using (can_access_audit(audit_id));
create policy sources_member on sources for select using (can_access_audit(audit_id));
create policy evidence_member on evidence for select using (can_access_audit(audit_id));
create policy sections_member on audit_sections for select using (can_access_audit(audit_id));
create policy findings_member on findings for select using (
  can_access_audit((select s.audit_id from audit_sections s where s.id = audit_section_id))
);
create policy finding_evidence_member on finding_evidence for select using (
  exists (
    select 1 from findings f join audit_sections s on s.id = f.audit_section_id
    where f.id = finding_id and can_access_audit(s.audit_id)
  )
);
create policy competitors_member on competitors for select using (can_access_audit(audit_id));
create policy clarifying_member on clarifying_questions for select using (can_access_audit(audit_id));
create policy open_questions_member on open_questions for select using (can_access_audit(audit_id));
create policy jobs_member on jobs for select using (can_access_audit(audit_id));
create policy scores_member on scores for select using (can_access_audit(audit_id));

-- NOTE: writes (insert/update) go through the server orchestrator using the
-- service-role key, which bypasses RLS. No client-side write policies in PR1.

commit;
