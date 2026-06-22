import type { GeneratedSection, SectionKey } from "@/lib/audit/types";

/**
 * Placeholder generator for the six non-A&T MVP sections in PR1. Produces NO
 * real content — a locked, unverified section the UI renders as "coming in a
 * later iteration". This keeps PR1 focused (one real section) without faking
 * audit content.
 */
export function placeholderSection(sectionKey: SectionKey): GeneratedSection {
  return {
    sectionKey,
    summary:
      "This section is not generated yet. It will be implemented in a later iteration. No findings are asserted.",
    findings: [],
    opportunities: [],
    risks: [],
    openQuestions: [],
    confidence: "unverified",
    generated: false,
  };
}
