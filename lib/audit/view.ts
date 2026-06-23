import type { ConfidenceLevel } from "@/lib/audit/types";

/** Shapes returned by GET /api/audits/[id], consumed by the report UI. */
export interface AuditView {
  audit: {
    id: string;
    input_url: string;
    status: string;
    detection: unknown;
    total_cost_usd: number;
    total_tokens: number;
    created_at: string;
    completed_at: string | null;
  };
  sections: SectionView[];
  findings: FindingView[];
  evidence: EvidenceView[];
  openQuestions: OpenQuestionView[];
  competitors: CompetitorView[];
  geography: GeographyView | null;
  failure: { step: string; error: string | null } | null;
}

export interface SectionView {
  id: string;
  section_key: string;
  summary: string | null;
  confidence: ConfidenceLevel;
  content: { generated?: boolean; opportunities?: unknown[]; risks?: unknown[] } | null;
}

export interface FindingView {
  id: string;
  audit_section_id: string;
  statement: string;
  claim_type: string;
  confidence: ConfidenceLevel;
  basis: string | null;
}

export interface EvidenceView {
  id: string;
  observation: string;
  detection_method: string;
  vendor: string | null;
  tag_id: string | null;
  source_url: string | null;
  confidence: ConfidenceLevel;
}

export interface OpenQuestionView {
  id: string;
  question: string;
  needed_data: string | null;
  origin_section_key: string | null;
  priority: string;
}

export interface CompetitorView {
  id: string;
  name: string;
  relationship: string;
  confidence: ConfidenceLevel;
}

export interface GeographyView {
  primary_markets: string[];
  basis: string | null;
  confidence: ConfidenceLevel;
}
