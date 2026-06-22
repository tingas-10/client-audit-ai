import "server-only";
import type { EvidenceItem } from "@/lib/audit/types";
import { classifyNetworkRequests, type CapturedRequest } from "@/lib/evidence/filter";
import { getServerEnv } from "@/lib/env";
import { launchBrowser } from "@/lib/evidence/browser";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * Rendered/runtime network capture (detection_method: runtime_network).
 *
 * Launches headless Chromium, loads the page so GTM/JS fully execute, captures
 * every network request, and classifies them into vendor evidence via the
 * (already real) filter — confirming runtime-injected tags (GA4, Meta, TikTok,
 * Ads, Consent Mode, CMP, etc.) that static HTML cannot see (SPIKE_RESULTS.md).
 *
 * GRACEFUL FALLBACK (DECISIONS.md / scope): if disabled or anything fails, we
 * return `captured: false` so runtime-only tags stay Unknown/Unverified and are
 * NEVER reported as absent. `captured: true` is the ONLY signal that authorises
 * the section to assert a tag is absent.
 */
export interface RenderedNetworkResult {
  captured: boolean;
  evidence: EvidenceItem[];
}

export async function collectRenderedNetwork(
  pageUrl: string,
): Promise<RenderedNetworkResult> {
  const env = getServerEnv();
  if (!env.ANALYTICS_RENDER_ENABLED) {
    return { captured: false, evidence: [] };
  }

  const requests: CapturedRequest[] = [];
  let captured = false;
  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;

  try {
    browser = await launchBrowser();
    const context = await browser.newContext({ userAgent: UA });
    const page = await context.newPage();
    page.on("request", (req) => {
      requests.push({ url: req.url(), pageUrl });
    });

    // domcontentloaded + a settle window: analytics beacons keep the network
    // busy, so "networkidle" would often time out. We let tags fire, then stop.
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: env.RENDER_TIMEOUT_MS,
    });
    await page.waitForTimeout(Math.min(6000, env.RENDER_TIMEOUT_MS));
    captured = true;
  } catch {
    // Navigation/launch failure → degrade gracefully. We do NOT mark captured.
    captured = false;
  } finally {
    await browser?.close().catch(() => {});
  }

  return { captured, evidence: classifyNetworkRequests(requests) };
}
