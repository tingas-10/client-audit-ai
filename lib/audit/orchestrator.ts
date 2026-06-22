import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { gatherEvidence } from "@/lib/evidence/registry";
import { detectFromEvidence } from "@/lib/detection/detect";
import { generateAnalyticsTracking } from "@/lib/sections/analyticsTracking";
import { placeholderSection } from "@/lib/sections/placeholder";
import { CostTracker } from "@/lib/cost/budget";
import {
  MVP_SECTION_KEYS,
  REAL_SECTION_KEY,
  type EvidenceItem,
  type GeneratedSection,
} from "@/lib/audit/types";

/**
 * Runs the full PR1 pipeline for one audit, writing all state to Supabase via
 * the service-role client (bypasses RLS). Steps: gather_evidence → detect →
 * generate (A&T real; others placeholder) → persist. Async/durable runner
 * (Inngest/Trigger.dev, D4) is a Phase 1.1 swap; here the route handler invokes
 * this once. Cost guardrails per D3.
 */
export async function runAudit(auditId: string): Promise<void> {
  const db = getSupabaseServiceClient();
  const cost = new CostTracker();

  const { data: audit, error } = await db
    .from("audits")
    .select("id, input_url")
    .eq("id", auditId)
    .single();
  if (error || !audit) throw new Error(`Audit ${auditId} not found`);

  try {
    await setStatus(db, auditId, "detecting");

    // --- gather_evidence ---
    await startJob(db, auditId, "gather_evidence");
    const gathered = await gatherEvidence(audit.input_url);
    const refToId = await persistEvidence(db, auditId, gathered.items);
    await finishJob(db, auditId, "gather_evidence");

    // --- detect ---
    await startJob(db, auditId, "detect");
    const { detection, usage: dUsage } = await detectFromEvidence(
      audit.input_url,
      gathered.items,
    );
    cost.add(dUsage.costUsd, dUsage.tokensIn, dUsage.tokensOut);
    await persistDetection(db, auditId, detection, refToId);
    await finishJob(db, auditId, "detect");

    // --- generate ---
    await setStatus(db, auditId, "generating");
    const brand = detection.brand?.name || audit.input_url;

    for (const sectionKey of MVP_SECTION_KEYS) {
      if (sectionKey === REAL_SECTION_KEY && !cost.overHard) {
        await startJob(db, auditId, "generate");
        const { section, usage } = await generateAnalyticsTracking({
          brand,
          evidence: gathered.items,
          runtimeCaptured: gathered.runtimeCaptured,
        });
        cost.add(usage.costUsd, usage.tokensIn, usage.tokensOut);
        await persistSection(db, auditId, section, refToId);
        await finishJob(db, auditId, "generate");
      } else {
        await persistSection(db, auditId, placeholderSection(sectionKey), refToId);
      }
    }

    // --- complete ---
    await db
      .from("audits")
      .update({
        status: cost.overHard ? "partial" : "completed",
        total_cost_usd: cost.totalUsd,
        total_tokens: cost.totalTokens,
        completed_at: new Date().toISOString(),
      })
      .eq("id", auditId);
  } catch (err) {
    await db.from("audits").update({ status: "failed" }).eq("id", auditId);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

type Db = SupabaseClient;

async function setStatus(db: Db, auditId: string, status: string) {
  await db.from("audits").update({ status }).eq("id", auditId);
}

async function startJob(db: Db, auditId: string, step: string) {
  await db.from("jobs").insert({
    audit_id: auditId,
    step,
    status: "running",
    started_at: new Date().toISOString(),
  });
}

async function finishJob(db: Db, auditId: string, step: string) {
  await db
    .from("jobs")
    .update({ status: "done", finished_at: new Date().toISOString() })
    .eq("audit_id", auditId)
    .eq("step", step)
    .eq("status", "running");
}

/** Inserts evidence + a single source row; returns refId -> db uuid map. */
async function persistEvidence(
  db: Db,
  auditId: string,
  items: EvidenceItem[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!items.length) return map;

  const { data: source } = await db
    .from("sources")
    .insert({ audit_id: auditId, type: "website", locator: items[0]?.sourceUrl })
    .select("id")
    .single();

  const rows = items.map((e) => ({
    audit_id: auditId,
    source_id: source?.id ?? null,
    observation: e.observation,
    detection_method: e.detectionMethod,
    vendor: e.vendor ?? null,
    tag_id: e.tagId ?? null,
    source_url: e.sourceUrl ?? null,
    page_url: e.pageUrl ?? null,
    request_url: e.requestUrl ?? null,
    raw_evidence_snippet: e.rawSnippet ?? null,
    confidence: e.confidence,
    captured_at: e.capturedAt,
  }));

  const { data: inserted } = await db.from("evidence").insert(rows).select("id");
  inserted?.forEach((row, i) => {
    const ref = items[i]?.refId;
    if (ref) map.set(ref, row.id);
  });
  return map;
}

async function persistDetection(
  db: Db,
  auditId: string,
  detection: Awaited<ReturnType<typeof detectFromEvidence>>["detection"],
  refToId: Map<string, string>,
) {
  await db
    .from("audits")
    .update({ detection })
    .eq("id", auditId);

  // Mirror key detected fields onto the company record for quick listing.
  const { data: auditRow } = await db
    .from("audits")
    .select("company_id")
    .eq("id", auditId)
    .single();
  if (auditRow?.company_id) {
    await db
      .from("companies")
      .update({
        name: detection.brand?.name ?? null,
        industry: detection.industry?.category ?? null,
        business_model: detection.businessModel?.type ?? null,
        what_it_sells: detection.brand?.whatItSells ?? null,
      })
      .eq("id", auditRow.company_id);
  }

  if (detection.marketGeography) {
    await db.from("detected_geography").insert({
      audit_id: auditId,
      primary_markets: detection.marketGeography.primaryMarkets ?? [],
      basis: detection.marketGeography.basis ?? null,
      confidence: detection.marketGeography.confidence,
      evidence_ids: mapRefs(detection.marketGeography.evidenceRefIds, refToId),
    });
  }

  if (detection.competitors?.length) {
    await db.from("competitors").insert(
      detection.competitors.map((c) => ({
        audit_id: auditId,
        name: c.name,
        relationship: c.relationship,
        confidence: c.confidence,
        evidence_ids: mapRefs(c.evidenceRefIds, refToId),
      })),
    );
  }
}

async function persistSection(
  db: Db,
  auditId: string,
  section: GeneratedSection,
  refToId: Map<string, string>,
) {
  const { data: sectionRow } = await db
    .from("audit_sections")
    .insert({
      audit_id: auditId,
      section_key: section.sectionKey,
      summary: section.summary,
      confidence: section.confidence,
      content: {
        opportunities: section.opportunities,
        risks: section.risks,
        generated: section.generated,
      },
    })
    .select("id")
    .single();

  if (!sectionRow) return;

  // Open questions
  if (section.openQuestions.length) {
    await db.from("open_questions").insert(
      section.openQuestions.map((q) => ({
        audit_id: auditId,
        question: q.question,
        needed_data: q.neededData ?? null,
        origin_section_key: section.sectionKey,
        priority: q.priority,
      })),
    );
  }

  // Findings + finding_evidence
  for (const f of section.findings) {
    const { data: findingRow } = await db
      .from("findings")
      .insert({
        audit_section_id: sectionRow.id,
        statement: f.statement,
        claim_type: f.claimType,
        confidence: f.confidence,
        basis: f.basis ?? null,
      })
      .select("id")
      .single();
    if (!findingRow) continue;

    const evidenceIds = mapRefs(f.evidenceRefIds, refToId);
    if (evidenceIds.length) {
      await db.from("finding_evidence").insert(
        evidenceIds.map((evidence_id) => ({
          finding_id: findingRow.id,
          evidence_id,
        })),
      );
    }
  }
}

function mapRefs(refs: string[], refToId: Map<string, string>): string[] {
  return refs.map((r) => refToId.get(r)).filter((x): x is string => Boolean(x));
}
