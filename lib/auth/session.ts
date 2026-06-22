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

  const { data: membership } = await db
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership?.organization_id) return membership.organization_id;

  const { data: org, error: orgErr } = await db
    .from("organizations")
    .insert({ name: user.email ? `${user.email}'s workspace` : "Workspace" })
    .select("id")
    .single();
  if (orgErr || !org) throw new Error("Failed to bootstrap organization");

  await db.from("memberships").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
  });

  return org.id;
}
