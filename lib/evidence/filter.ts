import type { EvidenceItem } from "@/lib/audit/types";
import { VENDORS, isBrowserNoiseHost } from "@/lib/evidence/vendors";

export interface CapturedRequest {
  url: string;
  /** The page that initiated/owns this request, if known (for site attribution). */
  pageUrl?: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/**
 * Convert raw captured network requests into clean runtime evidence.
 *
 * Real, used by `renderedNetwork` (Phase 1.1). Implements the spike's filtering:
 *  - drop the browser's own background traffic (isBrowserNoiseHost),
 *  - match only known vendor hosts (no loose substrings),
 *  - extract concrete tag ids where possible.
 *
 * This is what prevents the VWO/VTEX/Civic/MS-Ads false positives seen in the
 * Phase 0.75 spike (SPIKE_RESULTS.md §7).
 */
export function classifyNetworkRequests(
  requests: CapturedRequest[],
): EvidenceItem[] {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const items: EvidenceItem[] = [];
  let counter = 0;

  for (const req of requests) {
    const host = hostOf(req.url);
    if (!host || isBrowserNoiseHost(host)) continue;

    for (const vendor of VENDORS) {
      if (!vendor.runtimeHosts) continue;
      const matchHost = vendor.runtimeHosts.some(
        (h) => host === h || host.endsWith(`.${h}`) || req.url.includes(h),
      );
      if (!matchHost) continue;

      const tagId = vendor.idFromRequest?.(req.url);
      const dedupeKey = `${vendor.key}:${tagId ?? host}`;
      if (seen.has(dedupeKey)) break;
      seen.add(dedupeKey);

      counter += 1;
      items.push({
        refId: `ev_r${counter}`,
        observation: `${vendor.label} fired at runtime${tagId ? ` (${tagId})` : ""}`,
        detectionMethod: "runtime_network",
        vendor: vendor.key,
        tagId,
        sourceUrl: req.url,
        pageUrl: req.pageUrl,
        requestUrl: req.url,
        confidence: "high",
        capturedAt: now,
      });
      break;
    }
  }

  return items;
}
