import "server-only";
import { z } from "zod";

/**
 * Server-side environment validation. Import only from server code
 * (route handlers, the orchestrator). Public values are also exposed to the
 * client via NEXT_PUBLIC_* and validated here for fail-fast safety.
 */
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-8"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  AUDIT_COST_BUDGET_USD: z.coerce.number().positive().default(2.0),
  AUDIT_COST_HARD_CAP_USD: z.coerce.number().positive().default(3.5),
  // Headless runtime network capture for Analytics & Tracking (Phase 1.1).
  ANALYTICS_RENDER_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  RENDER_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  // Optional local override for the Chromium executable (else uses system Chrome).
  PLAYWRIGHT_CHROMIUM_PATH: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }
  cached = parsed.data;
  return cached;
}
