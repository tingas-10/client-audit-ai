import type { EvidenceItem } from "@/lib/audit/types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * GTM container introspection (detection_method: gtm_container).
 *
 * Fetches the public gtm.js?id=GTM-XXXX and extracts container-configured tag
 * ids (e.g. Google Ads AW-, GA4 G-). This is what revealed the Google Ads tag
 * in the Phase 0.75 spike. It complements — never replaces — the runtime pass.
 *
 * IMPORTANT (anti-false-positive): gtm.js also contains GTM's generic library
 * template names (FLOODLIGHT, doubleclick, dc_, etc.). We extract only concrete
 * configured IDs (AW-…, G-…), never those generic library tokens.
 */
export async function collectGtmContainer(
  gtmId: string,
): Promise<EvidenceItem[]> {
  const url = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  const now = new Date().toISOString();
  const items: EvidenceItem[] = [];

  let js = "";
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) return items;
    js = await res.text();
  } catch {
    return items; // unreachable container → simply no container evidence
  }

  let counter = 0;
  const push = (
    observation: string,
    vendor: string,
    tagId: string,
  ): void => {
    counter += 1;
    items.push({
      refId: `ev_g${counter}`,
      observation,
      detectionMethod: "gtm_container",
      vendor,
      tagId,
      sourceUrl: url,
      rawSnippet: tagId,
      confidence: "high",
      capturedAt: now,
    });
  };

  // Concrete configured IDs only.
  for (const id of new Set(js.match(/AW-[0-9]{9,}/g) ?? [])) {
    push(`Google Ads tag configured in GTM container (${id})`, "google_ads", id);
  }
  for (const id of new Set(js.match(/\bG-[A-Z0-9]{8,12}\b/g) ?? [])) {
    push(`GA4 configured in GTM container (${id})`, "ga4", id);
  }

  return items;
}
