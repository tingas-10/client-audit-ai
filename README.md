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
npm run migrate
npm run dev                  # http://localhost:3000
```
Sign up at `/login`, then paste a URL on the home page.

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
