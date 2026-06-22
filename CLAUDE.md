# CLAUDE.md — Guidance for Claude Code (and future contributors)

> Read this first. It tells you what this project is, the rules you must never break, and where to find detail.

## What this is
**Client Audit AI** is a web app that turns a single company/brand **URL** into an exhaustive, sourceable strategic audit, built for agencies and consultancies to deeply understand a client before working with them. It is **not** a generic "to-do list" grader.

## Read these, in order
1. [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) — vision, users, flow, requirements.
2. [`AUDIT_FRAMEWORK.md`](./AUDIT_FRAMEWORK.md) — the 13-section methodology + sourcing/confidence conventions (the product's core).
3. [`TECH_STACK.md`](./TECH_STACK.md) — architecture & stack.
4. [`DATA_MODEL.md`](./DATA_MODEL.md) — Supabase schema.
5. [`PROMPTS.md`](./PROMPTS.md) — prompt architecture & anti-hallucination patterns.
6. [`ROADMAP.md`](./ROADMAP.md) — phased delivery.

## Non-negotiable rules (these define the product)
1. **Do not invent data.** Never fabricate metrics, numbers, names, or dates.
2. **Sourceability.** Every researched claim must trace to a stored source/evidence record.
3. **Mark uncertainty explicitly** — High / Medium / Low / Unverified. Separate observed fact from inference from assumption.
4. **URL-first.** The product works from a URL as the main input.
5. **Auto-detect** brand, industry, business model, and competitors. **Ask clarifying questions only when truly necessary.**
6. **Exhaustive but readable.** Depth with structure and progressive disclosure.
7. **Prefer "Unverified / none found" over a guess.** Every unknown goes to Open Questions (Section 13).

## Intended stack (no app code yet)
Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Postgres + Auth + Storage + RLS) · Vercel · Anthropic Claude (latest models) for detection/generation/verification.

## When you build (future)
- Keep the LLM structured-output schemas in sync with [`DATA_MODEL.md`](./DATA_MODEL.md) and [`PROMPTS.md`](./PROMPTS.md).
- Always wire the **verification/critique pass** as a gate before persisting any generated section.
- Respect data-source ToS/robots; mark blocked sources as Unverified.
- Enable RLS on all org-scoped tables; never ship the service-role key to the client.
- Keep secrets out of the repo.
- TypeScript strict; suggested layout: `app/`, `components/`, `lib/`, `db/`, `prompts/`.

## Current state
Phase 0 — documentation only. No application code yet. See [`ROADMAP.md`](./ROADMAP.md) for what comes next.
