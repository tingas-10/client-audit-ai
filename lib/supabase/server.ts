import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

/**
 * Request-scoped Supabase client bound to the user's auth cookies (RLS applies).
 * Use in Server Components and route handlers for reads on behalf of the user.
 */
export async function getSupabaseServerClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component without a mutable cookie store; safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS. SERVER ONLY — never import into client
 * code. Used by the orchestrator to write audit/evidence/findings rows.
 */
export function getSupabaseServiceClient() {
  const env = getServerEnv();
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
