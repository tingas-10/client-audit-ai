import { z } from "zod";
import type { DetectionResult, EvidenceItem } from "@/lib/audit/types";
import { generateJson, type LlmUsage } from "@/lib/llm/generate";
import { confidenceEnum, relationshipEnum } from "@/lib/llm/enums";
import { SYSTEM_PROMPT } from "@/prompts/system";
import { detectionUserPrompt } from "@/prompts/detection";

// Tolerant enums (lib/llm/enums) — normalize benign model label variants instead
// of hard-failing the whole audit.
const confidence = confidenceEnum;
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
        relationship: relationshipEnum,
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
