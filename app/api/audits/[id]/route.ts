import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/audits/[id] — full audit detail (sections, findings, evidence, open questions). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseServiceClient();

  const { data: audit } = await db
    .from("audits")
    .select(
      "id, input_url, status, detection, total_cost_usd, total_tokens, organization_id, created_at, completed_at",
    )
    .eq("id", id)
    .single();
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await db
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", audit.organization_id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [sections, evidence, openQuestions, competitors, geography] =
    await Promise.all([
      db
        .from("audit_sections")
        .select("id, section_key, summary, confidence, content")
        .eq("audit_id", id),
      db
        .from("evidence")
        .select(
          "id, observation, detection_method, vendor, tag_id, source_url, confidence",
        )
        .eq("audit_id", id),
      db
        .from("open_questions")
        .select("id, question, needed_data, origin_section_key, priority")
        .eq("audit_id", id),
      db
        .from("competitors")
        .select("id, name, relationship, confidence")
        .eq("audit_id", id),
      db
        .from("detected_geography")
        .select("primary_markets, basis, confidence")
        .eq("audit_id", id)
        .maybeSingle(),
    ]);

  // Findings for each section.
  const sectionIds = (sections.data ?? []).map((s) => s.id);
  const { data: findings } = sectionIds.length
    ? await db
        .from("findings")
        .select("id, audit_section_id, statement, claim_type, confidence, basis")
        .in("audit_section_id", sectionIds)
    : { data: [] };

  return NextResponse.json({
    audit,
    sections: sections.data ?? [],
    findings: findings ?? [],
    evidence: evidence.data ?? [],
    openQuestions: openQuestions.data ?? [],
    competitors: competitors.data ?? [],
    geography: geography.data ?? null,
  });
}
