import type { EvidenceItem } from "@/lib/audit/types";
import {
  VENDORS,
  CMP_VENDORS,
  CONSENT_MODE_PARAM_RE,
  isBrowserNoiseHost,
} from "@/lib/evidence/vendors";

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

  const add = (
    vendorKey: string,
    label: string,
    tagId: string | undefined,
    req: CapturedRequest,
  ): void => {
    const dedupeKey = `${vendorKey}:${tagId ?? hostOf(req.url)}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    counter += 1;
    items.push({
      refId: `ev_r${counter}`,
      observation: `${label} confirmed at runtime${tagId ? ` (${tagId})` : ""}`,
      detectionMethod: "runtime_network",
      vendor: vendorKey,
      tagId,
      sourceUrl: req.url,
      pageUrl: req.pageUrl,
      requestUrl: req.url,
      confidence: "high",
      capturedAt: now,
    });
  };

  const allVendors = [...VENDORS, ...CMP_VENDORS];

  for (const req of requests) {
    const host = hostOf(req.url);
    if (!host || isBrowserNoiseHost(host)) continue;

    // Vendor (analytics/ads/pixels/CMP) match by known host only.
    for (const vendor of allVendors) {
      if (!vendor.runtimeHosts) continue;
      const matchHost = vendor.runtimeHosts.some(
        (h) => host === h || host.endsWith(`.${h}`),
      );
      if (!matchHost) continue;
      add(vendor.key, vendor.label, vendor.idFromRequest?.(req.url), req);
      break;
    }

    // Google Consent Mode is a request PARAMETER (gcs/gcd), not a host. A GA/Ads
    // request carrying it confirms Consent Mode is active.
    const consent = req.url.match(CONSENT_MODE_PARAM_RE);
    if (consent) {
      add("consent_mode", "Google Consent Mode", consent[2], req);
    }
  }

  return items;
}
