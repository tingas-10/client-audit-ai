import { z } from "zod";

/**
 * Tolerant enum schemas for LLM JSON output.
 *
 * Models frequently emit benign label variants (e.g. claimType "fact" instead of
 * "observed_fact", confidence "unknown" instead of "unverified"). The strict
 * enums used previously caused the ENTIRE audit to fail on a single such value.
 * These schemas normalize common synonyms and fall back to a safe value via
 * `.catch(...)` instead of throwing — so generation degrades gracefully and the
 * verification gate (which downgrades unsourced claims) still runs.
 */

const norm = (v: unknown): unknown =>
  typeof v === "string" ? v.trim().toLowerCase().replace(/[\s-]+/g, "_") : v;

export const confidenceEnum = z.preprocess((v) => {
  const n = norm(v);
  return n === "unknown" || n === "none" || n === "na" || n === "n_a" || n === "unsure"
    ? "unverified"
    : n;
}, z.enum(["high", "medium", "low", "unverified"]).catch("unverified"));

export const claimTypeEnum = z.preprocess((v) => {
  const n = norm(v);
  if (["fact", "observed", "observed_fact", "observation", "observed_facts"].includes(n as string))
    return "observed_fact";
  if (["inference", "inferred", "infer"].includes(n as string)) return "inference";
  if (["assumption", "assumed", "assume", "hypothesis"].includes(n as string))
    return "assumption";
  return n;
}, z.enum(["observed_fact", "inference", "assumption"]).catch("inference"));

export const relationshipEnum = z.preprocess((v) => {
  const n = norm(v);
  if (n === "direct") return "direct";
  if (n === "indirect" || n === "adjacent") return "indirect";
  if (n === "aspirational" || n === "aspiration") return "aspirational";
  return n;
}, z.enum(["direct", "indirect", "aspirational"]).catch("indirect"));

/** Optional severity: present-but-invalid is dropped; absent stays undefined. */
export const severityEnum = z.preprocess(
  (v) => (v == null ? v : norm(v)),
  z.enum(["low", "medium", "high"]).optional().catch(undefined),
);

/** Priority: missing or invalid → "medium". */
export const priorityEnum = z.preprocess(
  (v) => (v == null ? "medium" : norm(v)),
  z.enum(["low", "medium", "high"]).catch("medium"),
);
