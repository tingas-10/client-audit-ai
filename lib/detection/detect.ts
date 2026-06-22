import { z } from "zod";
import type { DetectionResult, EvidenceItem } from "@/lib/audit/types";
import { generateJson, type LlmUsage } from "@/lib/llm/generate";
import { SYSTEM_PROMPT } from "@/prompts/system";
import { detectionUserPrompt } from "@/prompts/detection";

const confidence = z.enum(["high", "medium", "low", "unverified"]);
const refIds = z.array(z.string()).default([]);

const schema = z.object({
  brand: z.object({
    name: z.string(),
    valueProposition: z.string().optional(),
    whatItSells: z.string().optional(),
    confidence,
    evidenceRefIds: refIds,
  }),
  industry: z.object({ category: z.string(), confidence, evidenceRefIds: refIds }),
  businessModel: z.object({
    type: z.string(),
    rationale: z.string().optional(),
    confidence,
    evidenceRefIds: refIds,
  }),
  marketGeography: z.object({
    primaryMarkets: z.array(z.string()).default([]),
    basis: z.string().optional(),
    confidence,
    evidenceRefIds: refIds,
  }),
  competitors: z
    .array(
      z.object({
        name: z.string(),
        relationship: z.enum(["direct", "indirect", "aspirational"]),
        confidence,
        evidenceRefIds: refIds,
      }),
    )
    .default([]),
  blockingAmbiguities: z.array(z.string()).default([]),
});

export async function detectFromEvidence(
  url: string,
  evidence: EvidenceItem[],
): Promise<{ detection: DetectionResult; usage: LlmUsage }> {
  const { data, usage } = await generateJson({
    system: SYSTEM_PROMPT,
    user: detectionUserPrompt(url, evidence),
    schema,
    maxTokens: 1500,
  });
  return { detection: data, usage };
}
