/**
 * Vendor signatures for tag/pixel detection.
 *
 * - `staticPatterns` match against raw HTML (detection_method: static_html).
 * - `runtimeHosts` + `idFromRequest` classify runtime network requests
 *   (detection_method: runtime_network) — used by the filter once real
 *   headless capture lands in Phase 1.1.
 *
 * This central list also powers anti-false-positive filtering: a vendor is only
 * recorded from a real host / attributed request, never from a loose substring
 * (SPIKE_RESULTS.md lesson).
 */

export interface VendorSignature {
  key: string;
  label: string;
  /** Regexes over raw HTML; first capture group (if any) is the tag id. */
  staticPatterns?: RegExp[];
  /** Hostnames that indicate this vendor in runtime network requests. */
  runtimeHosts?: string[];
  /** Extract a tag id from a runtime request URL, if present. */
  idFromRequest?: (url: string) => string | undefined;
}

export const VENDORS: VendorSignature[] = [
  {
    key: "gtm",
    label: "Google Tag Manager",
    staticPatterns: [/GTM-[A-Z0-9]+/],
    runtimeHosts: ["googletagmanager.com"],
    idFromRequest: (u) => u.match(/[?&]id=(GTM-[A-Z0-9]+)/)?.[1],
  },
  {
    key: "ga4",
    label: "Google Analytics 4",
    staticPatterns: [/gtag\/js\?id=(G-[A-Z0-9]{6,})/, /\b(G-[A-Z0-9]{8,12})\b/],
    runtimeHosts: ["google-analytics.com", "analytics.google.com"],
    idFromRequest: (u) => u.match(/[?&]tid=(G-[A-Z0-9]+)/)?.[1],
  },
  {
    key: "google_ads",
    label: "Google Ads",
    staticPatterns: [/\b(AW-[0-9]{9,})\b/],
    runtimeHosts: ["googleadservices.com", "googleads.g.doubleclick.net"],
    idFromRequest: (u) => u.match(/(AW-[0-9]+|conversion\/[0-9]+)/)?.[1],
  },
  {
    key: "meta_pixel",
    label: "Meta Pixel",
    staticPatterns: [/fbq\('init',\s*'([0-9]{10,16})'/],
    runtimeHosts: ["connect.facebook.net", "facebook.com/tr"],
    idFromRequest: (u) => u.match(/\/signals\/config\/([0-9]{10,16})/)?.[1],
  },
  {
    key: "tiktok_pixel",
    label: "TikTok Pixel",
    staticPatterns: [/sdkid=([A-Z0-9]+)/],
    runtimeHosts: ["analytics.tiktok.com"],
    idFromRequest: (u) => u.match(/[?&]sdkid=([A-Z0-9]+)/)?.[1],
  },
  {
    key: "linkedin",
    label: "LinkedIn Insight Tag",
    staticPatterns: [/_linkedin_partner_id\s*=\s*"?([0-9]+)"?/],
    runtimeHosts: ["px.ads.linkedin.com", "snap.licdn.com"],
  },
  {
    key: "hotjar",
    label: "Hotjar",
    staticPatterns: [/hjid:\s*([0-9]+)/],
    runtimeHosts: ["static.hotjar.com", "script.hotjar.com"],
  },
  {
    key: "clarity",
    label: "Microsoft Clarity",
    staticPatterns: [/"clarity",\s*"script",\s*"([a-z0-9]+)"/],
    runtimeHosts: ["clarity.ms"],
  },
];

/**
 * Hosts that are the browser's own background traffic — never the audited site.
 * Used to drop net-log noise (SPIKE_RESULTS.md §7).
 */
export const BROWSER_NOISE_HOSTS = [
  "safebrowsing.google.com",
  "update.googleapis.com",
  "clients2.google.com",
  "clients6.google.com",
  "chromewebstore.google.com",
  "chromereporting-pa.googleapis.com",
  "play.google.com",
  "android.clients.google.com",
  "content-autofill.googleapis.com",
  "optimizationguide-pa.googleapis.com",
  "accounts.google.com",
  "gstatic.com",
];

export function isBrowserNoiseHost(host: string): boolean {
  return BROWSER_NOISE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}
