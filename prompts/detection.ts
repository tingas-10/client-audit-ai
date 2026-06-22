import type { EvidenceItem } from "@/lib/audit/types";

/** Detection prompt (PROMPTS.md §3). Full auto-detection contract. */
export function detectionUserPrompt(
  url: string,
  evidence: EvidenceItem[],
): string {
  return `Target URL: ${url}

From the EVIDENCE below, detect the full contract: brand (name, value proposition,
what it sells), industry/category, business model, likely market/geography, and
competitors (relationship: direct | indirect | aspirational).

Rules:
- Classify ONLY from the provided evidence; attach supporting evidenceRefIds.
- For market_geography, infer from observable signals (currency/locale, language,
  hreflang, shipping/contact regions) and state the basis; never assert a market
  without a signal.
- Internal economics (CAC/LTV/margins) are NOT observable — do not state them.
- If a dimension cannot be determined, use confidence "unverified" and add it to
  blockingAmbiguities.
- Competitors may be inferred from category knowledge but must be marked with the
  appropriate confidence; aspirational competitors are inherently inferential.

EVIDENCE (JSON):
${JSON.stringify(evidence.map(slim), null, 2)}

Respond with JSON matching:
{
  "brand": { "name": "", "valueProposition": "", "whatItSells": "", "confidence": "high|medium|low|unverified", "evidenceRefIds": [] },
  "industry": { "category": "", "confidence": "", "evidenceRefIds": [] },
  "businessModel": { "type": "", "rationale": "", "confidence": "", "evidenceRefIds": [] },
  "marketGeography": { "primaryMarkets": [], "basis": "", "confidence": "", "evidenceRefIds": [] },
  "competitors": [ { "name": "", "relationship": "direct|indirect|aspirational", "confidence": "", "evidenceRefIds": [] } ],
  "blockingAmbiguities": []
}`;
}

function slim(e: EvidenceItem) {
  return {
    refId: e.refId,
    observation: e.observation,
    detectionMethod: e.detectionMethod,
    vendor: e.vendor,
    tagId: e.tagId,
    sourceUrl: e.sourceUrl,
  };
}
