import type { EvidenceItem } from "@/lib/audit/types";

/** Analytics & Tracking section prompt (PROMPTS.md §5 + A&T rules). */
export function analyticsTrackingUserPrompt(
  brand: string,
  evidence: EvidenceItem[],
  runtimeCaptured: boolean,
): string {
  return `Generate the "Analytics & Tracking" audit section for: ${brand}.

You are given evidence collected via detection methods: static_html, gtm_container,
and runtime_network. ${
    runtimeCaptured
      ? "Runtime network capture WAS performed."
      : "Runtime network capture was NOT performed in this run — so any tag that would only appear at runtime (e.g. GA4/Meta/TikTok fired via GTM) must be treated as UNKNOWN/UNVERIFIED, never as absent."
  }

Requirements:
- Every observed_fact must cite evidenceRefIds that exist in the evidence below.
- Reflect each finding's detection_method (static_html / gtm_container / runtime_network).
- Cover: tag management (GTM), web analytics (GA4), paid-media pixels (Google Ads,
  Meta, TikTok, LinkedIn), session/heatmap tools (Hotjar, Clarity), consent/CMP, and
  attribution risks — but ONLY assert what the evidence supports.
- Do NOT claim any tag is absent unless runtime capture confirmed its absence.
- Be specific to ${brand}; no generic advice.

EVIDENCE (JSON):
${JSON.stringify(evidence.map(slim), null, 2)}

Respond with JSON matching:
{
  "summary": "",
  "findings": [
    { "statement": "", "claimType": "observed_fact|inference|assumption", "confidence": "high|medium|low|unverified", "evidenceRefIds": [], "basis": "" }
  ],
  "opportunities": [ { "statement": "", "rationale": "", "confidence": "" } ],
  "risks": [ { "statement": "", "severity": "low|medium|high", "rationale": "", "confidence": "" } ],
  "openQuestions": [ { "question": "", "neededData": "", "priority": "low|medium|high" } ],
  "confidence": "high|medium|low|unverified"
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
