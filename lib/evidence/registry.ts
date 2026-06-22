import type { EvidenceItem } from "@/lib/audit/types";
import { fetchStatic, collectStatic } from "@/lib/evidence/collectors/staticHtml";
import { collectGtmContainer } from "@/lib/evidence/collectors/gtmContainer";
import { collectRenderedNetwork } from "@/lib/evidence/collectors/renderedNetwork";

export interface GatheredEvidence {
  pageUrl: string;
  gtmId?: string;
  /** true once a real headless capture has run (PR1: false). */
  runtimeCaptured: boolean;
  items: EvidenceItem[];
}

/**
 * Runs the evidence collectors in order (static → GTM container → runtime) and
 * returns the combined, deduplicated evidence. Each item is tagged with its
 * detection_method (DATA_MODEL.md; SPIKE_RESULTS.md learnings).
 */
export async function gatherEvidence(url: string): Promise<GatheredEvidence> {
  const fetched = await fetchStatic(url);
  const staticItems = collectStatic(fetched);

  const gtmId = staticItems.find((i) => i.vendor === "gtm" && i.tagId?.startsWith("GTM-"))
    ?.tagId;

  const gtmItems = gtmId ? await collectGtmContainer(gtmId) : [];

  const rendered = await collectRenderedNetwork(fetched.finalUrl);

  return {
    pageUrl: fetched.finalUrl,
    gtmId,
    runtimeCaptured: rendered.captured,
    items: [...staticItems, ...gtmItems, ...rendered.evidence],
  };
}
