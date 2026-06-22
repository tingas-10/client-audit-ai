import type { EvidenceItem, GeneratedSection } from "@/lib/audit/types";

export interface Violation {
  statement: string;
  issue: string;
}

export interface VerificationResult {
  ok: boolean;
  violations: Violation[];
  /** A corrected copy with offending findings downgraded/removed. */
  section: GeneratedSection;
}

/**
 * Deterministic verification gate (PROMPTS.md §6, D11). Runs locally (no extra
 * LLM call) and enforces the hard rules:
 *  - observed_fact must reference >= 1 evidence item that exists,
 *  - generic statements are flagged,
 *  - findings missing a confidence label are flagged.
 *
 * Offending observed_facts are downgraded to `unverified` rather than dropped,
 * so nothing is silently fabricated.
 */
const GENERIC_PATTERNS: RegExp[] = [
  /\bimprove (your |the )?(seo|analytics|tracking|marketing|funnel)\b/i,
  /\bshould (improve|optimi[sz]e|consider|make sure)\b/i,
  /\bpost more\b/i,
  /\bbest practices?\b/i,
];

export function verifySection(
  section: GeneratedSection,
  evidence: EvidenceItem[],
): VerificationResult {
  const evidenceIds = new Set(evidence.map((e) => e.refId));
  const violations: Violation[] = [];

  const findings = section.findings.map((f) => {
    const issues: string[] = [];

    if (f.claimType === "observed_fact") {
      const hasEvidence =
        f.evidenceRefIds.length > 0 &&
        f.evidenceRefIds.every((id) => evidenceIds.has(id));
      if (!hasEvidence) {
        issues.push("observed_fact without valid supporting evidence");
      }
    }

    if (GENERIC_PATTERNS.some((re) => re.test(f.statement))) {
      issues.push("generic statement (could apply to any brand)");
    }

    if (!f.confidence) {
      issues.push("missing confidence label");
    }

    if (issues.length) {
      for (const issue of issues)
        violations.push({ statement: f.statement, issue });
      // Downgrade rather than fabricate-through.
      return { ...f, claimType: "inference" as const, confidence: "unverified" as const };
    }
    return f;
  });

  return {
    ok: violations.length === 0,
    violations,
    section: { ...section, findings },
  };
}
