import * as cheerio from "cheerio";
import type { EvidenceItem } from "@/lib/audit/types";
import { VENDORS } from "@/lib/evidence/vendors";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface StaticFetchResult {
  url: string;
  finalUrl: string;
  status: number;
  html: string;
}

export async function fetchStatic(url: string): Promise<StaticFetchResult> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
    redirect: "follow",
  });
  const html = await res.text();
  return { url, finalUrl: res.url, status: res.status, html };
}

/**
 * Static HTML collector (detection_method: static_html).
 * Extracts tag signatures, metadata, platform, and geography signals.
 * NOTE: static absence of a tag is NOT recorded as "absent" — it is simply not
 * emitted, so downstream stays Unknown until a runtime/container method confirms
 * (PROMPTS.md Analytics & Tracking rules).
 */
export function collectStatic(fetched: StaticFetchResult): EvidenceItem[] {
  const { html, finalUrl } = fetched;
  const $ = cheerio.load(html);
  const now = new Date().toISOString();
  const items: EvidenceItem[] = [];

  // Counter is local to this call — ref ids are scoped per collection run and
  // never shared across requests/warm server instances.
  let counter = 0;
  const nextRef = () => `ev_s${(counter += 1)}`;

  const push = (
    observation: string,
    extra: Partial<EvidenceItem> = {},
  ): void => {
    items.push({
      refId: nextRef(),
      observation,
      detectionMethod: "static_html",
      sourceUrl: finalUrl,
      pageUrl: finalUrl,
      confidence: "high",
      capturedAt: now,
      ...extra,
    });
  };

  // --- Tag/pixel signatures present in static HTML ---
  for (const vendor of VENDORS) {
    if (!vendor.staticPatterns) continue;
    for (const pattern of vendor.staticPatterns) {
      const m = html.match(pattern);
      if (m) {
        const tagId = m[1] ?? m[0];
        push(`${vendor.label} detected in static HTML (${tagId})`, {
          vendor: vendor.key,
          tagId,
          rawSnippet: m[0].slice(0, 200),
        });
        break; // one hit per vendor is enough for evidence
      }
    }
  }

  // --- dataLayer presence ---
  if (/dataLayer/.test(html)) {
    const count = (html.match(/dataLayer/g) || []).length;
    push(`GTM dataLayer referenced (${count} occurrences)`, {
      vendor: "gtm",
      confidence: "medium",
    });
  }

  // --- Metadata ---
  const title = $("title").first().text().trim();
  if (title) push(`Page title: "${title}"`, { confidence: "high", rawSnippet: title });
  const desc = $('meta[name="description"]').attr("content");
  if (desc)
    push(`Meta description present`, { rawSnippet: desc.slice(0, 240) });

  // --- Platform hints ---
  const platformHints: Array<[RegExp, string]> = [
    [/mage\/|x-magento|Magento_[A-Za-z]+/, "Magento / Adobe Commerce"],
    [/cdn\.shopify\.com|Shopify\.theme/, "Shopify"],
    [/wp-content|wp-json/, "WordPress"],
    [/vtex/i, "VTEX"],
  ];
  for (const [re, label] of platformHints) {
    if (re.test(html)) {
      push(`Platform signal: ${label}`, { confidence: "medium" });
      break;
    }
  }

  // --- Geography signals ---
  const hreflangs = $("link[hreflang]")
    .map((_, el) => $(el).attr("hreflang"))
    .get()
    .filter((h): h is string => Boolean(h && h !== "x-default"));
  if (hreflangs.length) {
    push(`hreflang locales: ${[...new Set(hreflangs)].join(", ")}`, {
      confidence: "high",
      rawSnippet: hreflangs.join(","),
    });
  }
  const currency =
    html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/)?.[1] ||
    (/[₡]/.test(html) ? "CRC (₡ symbol)" : undefined);
  if (currency) push(`Currency signal: ${currency}`, { confidence: "medium" });

  return items;
}
