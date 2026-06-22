/**
 * Shared domain types for the audit pipeline. These mirror the DB enums in
 * db/migrations/0001_init.sql and the contracts in PROMPTS.md / DATA_MODEL.md.
 */

export type ConfidenceLevel = "high" | "medium" | "low" | "unverified";
export type ClaimType = "observed_fact" | "inference" | "assumption";
export type CompetitorRelationship = "direct" | "indirect" | "aspirational";
export type DetectionMethod =
  | "static_html"
  | "gtm_container"
  | "runtime_network"
  | "manual";

export type SectionKey =
  | "client_introduction"
  | "business_model_strategy"
  | "digital_audit_website"
  | "digital_audit_analytics_tracking"
  | "digital_audit_seo"
  | "executive_summary"
  | "open_questions";

/** The MVP section set (DECISIONS.md D6). Only one generates real content in PR1. */
export const MVP_SECTION_KEYS: SectionKey[] = [
  "client_introduction",
  "business_model_strategy",
  "digital_audit_website",
  "digital_audit_analytics_tracking",
  "digital_audit_seo",
  "executive_summary",
  "open_questions",
];

/** The single section that generates real content in PR1. */
export const REAL_SECTION_KEY: SectionKey = "digital_audit_analytics_tracking";

export interface EvidenceItem {
  /** Local id used to cross-reference within a single audit run before persistence. */
  refId: string;
  observation: string;
  detectionMethod: DetectionMethod;
  vendor?: string;
  tagId?: string;
  sourceUrl?: string;
  pageUrl?: string;
  requestUrl?: string;
  rawSnippet?: string;
  confidence: ConfidenceLevel;
  capturedAt: string; // ISO timestamp
}

export interface Finding {
  statement: string;
  claimType: ClaimType;
  confidence: ConfidenceLevel;
  /** refIds of supporting evidence (required for observed_fact). */
  evidenceRefIds: string[];
  /** Reasoning, required for inference/assumption. */
  basis?: string;
}

export interface OpportunityOrRisk {
  statement: string;
  rationale: string;
  confidence: ConfidenceLevel;
  severity?: "low" | "medium" | "high";
}

export interface OpenQuestion {
  question: string;
  neededData?: string;
  priority: "low" | "medium" | "high";
}

export interface GeneratedSection {
  sectionKey: SectionKey;
  summary: string;
  findings: Finding[];
  opportunities: OpportunityOrRisk[];
  risks: OpportunityOrRisk[];
  openQuestions: OpenQuestion[];
  confidence: ConfidenceLevel;
  /** Whether this section produced real, sourced content (PR1: only A&T). */
  generated: boolean;
}

export interface DetectionResult {
  brand: { name: string; valueProposition?: string; whatItSells?: string; confidence: ConfidenceLevel; evidenceRefIds: string[] };
  industry: { category: string; confidence: ConfidenceLevel; evidenceRefIds: string[] };
  businessModel: { type: string; rationale?: string; confidence: ConfidenceLevel; evidenceRefIds: string[] };
  marketGeography: { primaryMarkets: string[]; basis?: string; confidence: ConfidenceLevel; evidenceRefIds: string[] };
  competitors: Array<{ name: string; relationship: CompetitorRelationship; confidence: ConfidenceLevel; evidenceRefIds: string[] }>;
  blockingAmbiguities: string[];
}
