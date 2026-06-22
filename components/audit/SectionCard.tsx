import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge, ClaimTypeBadge } from "@/components/audit/ConfidenceBadge";
import { SECTION_LABELS } from "@/lib/sections/labels";
import type { SectionKey } from "@/lib/audit/types";
import type { EvidenceView, FindingView, SectionView } from "@/lib/audit/view";

export function SectionCard({
  section,
  findings,
  evidence,
}: {
  section: SectionView;
  findings: FindingView[];
  evidence: EvidenceView[];
}) {
  const label =
    SECTION_LABELS[section.section_key as SectionKey] ?? section.section_key;
  const generated = section.content?.generated ?? false;
  const evidenceById = new Map(evidence.map((e) => [e.id, e]));

  return (
    <Card id={section.section_key}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{label}</CardTitle>
          <div className="flex items-center gap-2">
            {!generated && <Badge variant="muted">Locked — coming soon</Badge>}
            <ConfidenceBadge level={section.confidence} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {section.summary && (
          <p className="text-sm text-muted-foreground">{section.summary}</p>
        )}

        {!generated ? (
          <p className="text-sm text-muted-foreground">
            This section is not generated in this version. No findings are asserted.
          </p>
        ) : findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No findings could be sourced from observable evidence.
          </p>
        ) : (
          <ul className="space-y-4">
            {findings.map((f) => (
              <li key={f.id} className="rounded-md border p-3">
                <p className="text-sm">{f.statement}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ClaimTypeBadge claimType={f.claim_type} />
                  <ConfidenceBadge level={f.confidence} />
                </div>
                {f.basis && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Basis: {f.basis}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {generated && evidence.length > 0 && (
          <details className="rounded-md border bg-muted/40 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Sources ({evidence.length})
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {[...evidenceById.values()].map((e) => (
                <li key={e.id}>
                  <span className="font-mono">[{e.detection_method}]</span>{" "}
                  {e.observation}
                  {e.source_url && (
                    <>
                      {" — "}
                      <a
                        href={e.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
