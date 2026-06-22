import type { EvidenceItem } from "@/lib/audit/types";
import { classifyNetworkRequests, type CapturedRequest } from "@/lib/evidence/filter";

/**
 * Rendered/runtime network capture (detection_method: runtime_network).
 *
 * PHASE 1: STUB. We do NOT run a headless browser yet (no Playwright per scope).
 * This collector returns no runtime evidence, which correctly leaves
 * runtime-injected tags (GA4, Meta, TikTok, etc.) as UNKNOWN rather than absent
 * (PROMPTS.md Analytics & Tracking rules; SPIKE_RESULTS.md).
 *
 * PHASE 1.1: a real implementation will launch headless Chromium, capture
 * network requests, and pass them to `classifyNetworkRequests` (already real).
 * The interface and the downstream filtering are intentionally final here so
 * the swap is drop-in.
 */
export interface RenderedNetworkResult {
  /** true once a real headless capture has run. PR1: always false. */
  captured: boolean;
  evidence: EvidenceItem[];
}

export async function collectRenderedNetwork(
  _pageUrl: string,
): Promise<RenderedNetworkResult> {
  // No capture in PR1.
  const requests: CapturedRequest[] = [];
  return { captured: false, evidence: classifyNetworkRequests(requests) };
}
