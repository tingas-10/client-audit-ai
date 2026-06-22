import Anthropic from "@anthropic-ai/sdk";
import { getServerEnv } from "@/lib/env";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (client) return client;
  const env = getServerEnv();
  client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export function getModel(): string {
  return getServerEnv().ANTHROPIC_MODEL;
}

/**
 * Rough cost estimate (USD) for Claude usage. Real prices live in the
 * claude-api reference; this is a guardrail estimate only (DECISIONS.md D3),
 * intentionally conservative. Update when wiring exact pricing.
 */
export function estimateCostUsd(tokensIn: number, tokensOut: number): number {
  const inPerM = 15; // USD per 1M input tokens (placeholder, conservative)
  const outPerM = 75; // USD per 1M output tokens (placeholder, conservative)
  return (tokensIn / 1_000_000) * inPerM + (tokensOut / 1_000_000) * outPerM;
}
