import { z } from "zod";
import type { EvidenceItem, GeneratedSection } from "@/lib/audit/types";
import { generateJson, type LlmUsage } from "@/lib/llm/generate";
import { verifySection } from "@/lib/llm/verify";
import { SYSTEM_PROMPT } from "@/prompts/system";
import { analyticsTrackingUserPrompt } from "@/prompts/analyticsTracking";

const confidence = z.enum(["high", "medium", "low", "unverified"]);

const schema = z.object({
  summary: z.string(),
  findings: z
    .array(
      z.object({
        statement: z.string(),
        claimType: z.enum(["observed_fact", "inference", "assumption"]),
        confidence,
        evidenceRefIds: z.array(z.string()).default([]),
        basis: z.string().optional(),
      }),
    )
    .default([]),
  opportunities: z
    .array(z.object({ statement: z.string(), rationale: z.string(), confidence }))
    .default([]),
  risks: z
    .array(
      z.object({
        statement: z.string(),
        severity: z.enum(["low", "medium", "high"]).optional(),
        rationale: z.string(),
        confidence,
      }),
    )
    .default([]),
  openQuestions: z
    .array(
      z.object({
        question: z.string(),
        neededData: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      }),
    )
    .default([]),
  confidence,
});

/**
 * REAL section generator (the only one in PR1). Generates the Analytics &
 * Tracking section from collected evidence, then runs the verification gate.
 */
export async function generateAnalyticsTracking(args: {
  brand: string;
  evidence: EvidenceItem[];
  runtimeCaptured: boolean;
}): Promise<{ section: GeneratedSection; usage: LlmUsage }> {
  const { data, usage } = await generateJson({
    system: SYSTEM_PROMPT,
    user: analyticsTrackingUserPrompt(args.brand, args.evidence, args.runtimeCaptured),
    schema,
    maxTokens: 2500,
  });

  const draft: GeneratedSection = {
    sectionKey: "digital_audit_analytics_tracking",
    summary: data.summary,
    findings: data.findings,
    opportunities: data.opportunities,
    risks: data.risks,
    openQuestions: data.openQuestions,
    confidence: data.confidence,
    generated: true,
  };

  const verified = verifySection(draft, args.evidence);
  return { section: verified.section, usage };
}
