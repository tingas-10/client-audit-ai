import { Badge } from "@/components/ui/badge";
import type { ConfidenceLevel } from "@/lib/audit/types";

const MAP: Record<ConfidenceLevel, { label: string; variant: "success" | "warning" | "muted" | "secondary" }> = {
  high: { label: "High confidence", variant: "success" },
  medium: { label: "Medium confidence", variant: "secondary" },
  low: { label: "Low confidence", variant: "warning" },
  unverified: { label: "Unverified", variant: "muted" },
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const m = MAP[level] ?? MAP.unverified;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

const CLAIM_MAP: Record<string, { label: string; variant: "outline" | "muted" }> = {
  observed_fact: { label: "Observed", variant: "outline" },
  inference: { label: "Inferred", variant: "outline" },
  assumption: { label: "Assumption", variant: "muted" },
};

export function ClaimTypeBadge({ claimType }: { claimType: string }) {
  const m = CLAIM_MAP[claimType] ?? CLAIM_MAP.assumption;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
