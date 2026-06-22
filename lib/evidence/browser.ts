import "server-only";
import type { Browser } from "playwright-core";
import { getServerEnv } from "@/lib/env";

/**
 * Environment-aware headless Chromium launcher.
 *
 * - Vercel / Lambda (serverless): use @sparticuz/chromium's bundled binary.
 * - Local dev: use the system Chrome (channel "chrome") or PLAYWRIGHT_CHROMIUM_PATH.
 *
 * Kept server-only — never importable from client code.
 */
const isServerless =
  Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

export async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright-core");

  if (isServerless) {
    const sparticuz = (await import("@sparticuz/chromium")).default;
    return chromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
    });
  }

  const override = getServerEnv().PLAYWRIGHT_CHROMIUM_PATH;
  return chromium.launch({
    headless: true,
    ...(override ? { executablePath: override } : { channel: "chrome" }),
  });
}
