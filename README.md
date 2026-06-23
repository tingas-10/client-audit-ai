# Client Audit AI

Enter any public brand/company URL → Client Audit AI detects the brand, market,
industry, business model, and competitors, collects observable evidence, and
generates a source-backed audit.

This repo is **Phase 1 (MVP scaffold)**. See the docs for the full picture:
[`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) · [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) ·
[`DECISIONS.md`](./DECISIONS.md) · [`TECH_STACK.md`](./TECH_STACK.md) ·
[`DATA_MODEL.md`](./DATA_MODEL.md) · [`PROMPTS.md`](./PROMPTS.md) ·
[`ROADMAP.md`](./ROADMAP.md) · [`SPIKE_RESULTS.md`](./SPIKE_RESULTS.md) · [`CLAUDE.md`](./CLAUDE.md)

## Stack
Next.js (App Router) · TypeScript · Tailwind · shadcn/ui-style components ·
Supabase (Postgres + Auth + RLS) · Anthropic Claude · Vercel-ready.

## Getting started
```bash
npm install
cp .env.example .env.local   # fill Supabase + Anthropic values
# apply the schema (set SUPABASE_DB_URL first):
npm run migrate              # runs db/migrations/*.sql in order (0001 then 0002)
npm run dev                  # http://localhost:3000
```
Sign up at `/login`, then paste a URL on the home page.

> If you applied the schema via the Supabase **SQL Editor** instead of `npm run migrate`,
> run **both** files in order: `db/migrations/0001_init.sql` then
> `db/migrations/0002_grants.sql`. `0002` grants table privileges to the Supabase
> API roles — without it, audit creation fails with `42501 permission denied for table`.

## What's real vs. stubbed in PR1
- **Real:** auth (single-tenant + RLS), URL → audit → async job, evidence layer
  (static HTML fetch + GTM container introspection + filtering), full auto-detection,
  **Analytics & Tracking** generation + verification gate, sourced report UI with
  confidence indicators.
- **Stubbed / next:** headless runtime network capture (`lib/evidence/collectors/renderedNetwork.ts`),
  the other six MVP sections (locked placeholders), durable workflow runner, export/sharing.
- No numeric scorecard in the MVP (confidence indicators instead).

## Scripts
`dev` · `build` · `start` · `lint` · `typecheck` · `format` · `migrate`
