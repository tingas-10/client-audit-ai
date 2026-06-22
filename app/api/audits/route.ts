import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, getOrCreateUserOrg } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createSchema = z.object({ url: z.string().url() });

function canonicalDomain(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** POST /api/audits — create an audit for a URL and return its id. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
  }

  const orgId = await getOrCreateUserOrg(user);
  const db = getSupabaseServiceClient();

  const { data: company, error: companyErr } = await db
    .from("companies")
    .insert({
      organization_id: orgId,
      url: parsed.data.url,
      canonical_domain: canonicalDomain(parsed.data.url),
    })
    .select("id")
    .single();
  if (companyErr || !company) {
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }

  const { data: audit, error: auditErr } = await db
    .from("audits")
    .insert({
      organization_id: orgId,
      company_id: company.id,
      input_url: parsed.data.url,
      status: "queued",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (auditErr || !audit) {
    return NextResponse.json({ error: "Failed to create audit" }, { status: 500 });
  }

  return NextResponse.json({ id: audit.id }, { status: 201 });
}

/** GET /api/audits — list the org's audits (RLS-scoped). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseServiceClient();
  const orgId = await getOrCreateUserOrg(user);
  const { data } = await db
    .from("audits")
    .select("id, input_url, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ audits: data ?? [] });
}
