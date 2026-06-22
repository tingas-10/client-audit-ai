import { getServerEnv } from "@/lib/env";

/**
 * Per-audit cost guardrails (DECISIONS.md D3).
 * - soft budget: log/flag, continue.
 * - hard cap: stop generation; remaining sections marked Unverified; complete partial.
 */
export class CostTracker {
  private spent = 0;
  private tokens = 0;
  readonly soft: number;
  readonly hard: number;

  constructor() {
    const env = getServerEnv();
    this.soft = env.AUDIT_COST_BUDGET_USD;
    this.hard = env.AUDIT_COST_HARD_CAP_USD;
  }

  add(costUsd: number, tokensIn: number, tokensOut: number): void {
    this.spent += costUsd;
    this.tokens += tokensIn + tokensOut;
  }

  get totalUsd(): number {
    return this.spent;
  }
  get totalTokens(): number {
    return this.tokens;
  }
  get overSoft(): boolean {
    return this.spent >= this.soft;
  }
  get overHard(): boolean {
    return this.spent >= this.hard;
  }
}
