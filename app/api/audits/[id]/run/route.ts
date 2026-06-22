import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { runAudit } from "@/lib/audit/orchestrator";

// The pipeline makes LLM calls; allow a longer execution window on Vercel.
export const maxDuration = 300;

/**
 * POST /api/audits/[id]/run — execute the pipeline for an audit.
 * PR1: runs the whole pipeline in one invocation. Phase 1.1 swaps in a durable
 * step runner (Inngest/Trigger.dev, D4) without changing the orchestrator API.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseServiceClient();

  // Authorize: the audit must belong to a user's org.
  const { data: audit } = await db
    .from("audits")
    .select("id, status, organization_id")
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

  if (audit.status !== "queued") {
    return NextResponse.json({ status: audit.status, alreadyRunning: true });
  }

  try {
    await runAudit(id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit run failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
