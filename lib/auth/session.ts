import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string | null;
}

/** Returns the authenticated user (RLS-bound), or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

/**
 * Single-tenant bootstrap: ensure the user has an organization + membership.
 * Uses the service client (org/membership inserts bypass RLS). Returns the
 * organization id. Multi-org management is a later phase (D5).
 */
export async function getOrCreateUserOrg(user: SessionUser): Promise<string> {
  const db = getSupabaseServiceClient();

  // 1) Return an existing membership if the user already has one.
  const existing = await db
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw bootstrapError("read membership", existing.error);
  if (existing.data?.organization_id) return existing.data.organization_id;

  // 2) Create the organization. This is a service-role write and must bypass
  //    RLS; if it fails with a permission error, the service-role key is wrong.
  const org = await db
    .from("organizations")
    .insert({ name: user.email ? `${user.email}'s workspace` : "Workspace" })
    .select("id")
    .single();
  if (org.error || !org.data) throw bootstrapError("create organization", org.error);
  const orgId = org.data.id;

  // 3) Create the membership. Handle the race where a concurrent request already
  //    created one (memberships has unique(organization_id, user_id)).
  const member = await db
    .from("memberships")
    .insert({ organization_id: orgId, user_id: user.id, role: "owner" });
  if (member.error) {
    const recheck = await db
      .from("memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (recheck.data?.organization_id) return recheck.data.organization_id;
    throw bootstrapError("create membership", member.error);
  }

  return orgId;
}

interface DbError {
  message?: string;
  code?: string;
  details?: string;
}

/**
 * Builds an actionable error that surfaces the real Postgres cause instead of an
 * opaque message. Permission/RLS failures (code 42501) almost always mean
 * SUPABASE_SERVICE_ROLE_KEY is missing or is not the service_role key, so the
 * privileged write is being blocked by RLS.
 */
function bootstrapError(step: string, err: DbError | null): Error {
  const base = `Failed to bootstrap organization (${step})`;
  if (!err) return new Error(base);
  const detail = `${err.message ?? "unknown error"}${err.code ? ` [${err.code}]` : ""}`;
  if (
    err.code === "42501" ||
    /row-level security|permission denied/i.test(err.message ?? "")
  ) {
    return new Error(
      `${base}: ${detail}. This usually means SUPABASE_SERVICE_ROLE_KEY is not the service_role key, so the write is blocked by RLS. Verify it in .env.local (Supabase → Project Settings → API → service_role secret).`,
    );
  }
  return new Error(`${base}: ${detail}`);
}
