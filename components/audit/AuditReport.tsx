"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/audit/ConfidenceBadge";
import { SectionCard } from "@/components/audit/SectionCard";
import { OpenQuestions } from "@/components/audit/OpenQuestions";
import { MVP_SECTION_KEYS } from "@/lib/audit/types";
import type { AuditView } from "@/lib/audit/view";

const RUNNING_STATES = ["queued", "detecting", "generating", "verifying"];

export function AuditReport({ auditId }: { auditId: string }) {
  const [data, setData] = useState<AuditView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRun = useRef(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch(`/api/audits/${auditId}`, { cache: "no-store" });
      if (!res.ok) {
        if (active) setError("Could not load audit");
        return null;
      }
      const json: AuditView = await res.json();
      if (active) setData(json);
      return json;
    }

    async function tick() {
      const json = await load();
      if (!json) return;
      // Kick off the run once if still queued.
      if (json.audit.status === "queued" && !startedRun.current) {
        startedRun.current = true;
        fetch(`/api/audits/${auditId}/run`, { method: "POST" }).catch(() => {});
      }
      if (active && RUNNING_STATES.includes(json.audit.status)) {
        setTimeout(tick, 2500);
      }
    }

    tick();
    return () => {
      active = false;
    };
  }, [auditId]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const { audit, sections, findings, evidence, openQuestions, competitors, geography } =
    data;
  const running = RUNNING_STATES.includes(audit.status);
  const orderedSections = MVP_SECTION_KEYS.map((key) =>
    sections.find((s) => s.section_key === key),
  ).filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="break-all text-base">{audit.input_url}</CardTitle>
            <Badge variant={running ? "warning" : audit.status === "failed" ? "destructive" : "success"}>
              {audit.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {running && (
            <p className="text-muted-foreground">
              Working… detecting brand, gathering evidence, and generating the audit.
              This page updates automatically.
            </p>
          )}
          {geography && (
            <p>
              <span className="text-muted-foreground">Market / geography: </span>
              {geography.primary_markets.join(", ") || "—"}{" "}
              <ConfidenceBadge level={geography.confidence} />
            </p>
          )}
          {competitors.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Competitors:</span>
              {competitors.map((c) => (
                <Badge key={c.id} variant="secondary">
                  {c.name} · {c.relationship}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {orderedSections.map((s) => (
        <SectionCard
          key={s.id}
          section={s}
          findings={findings.filter((f) => f.audit_section_id === s.id)}
          evidence={evidence}
        />
      ))}

      <OpenQuestions questions={openQuestions} />

      <p className="text-xs text-muted-foreground">
        No numeric scorecard in this version. Section confidence indicators are
        shown instead. Analytics &amp; Tracking is the only fully generated section;
        others are locked placeholders.
      </p>
    </div>
  );
}
