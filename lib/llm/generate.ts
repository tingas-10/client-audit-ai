import type { z } from "zod";
import { getAnthropic, getModel, estimateCostUsd } from "@/lib/llm/client";

export interface LlmUsage {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface LlmJsonResult<T> {
  data: T;
  usage: LlmUsage;
}

/**
 * Calls Claude with a system prompt + user prompt and parses a single JSON
 * object from the response, validated against a zod schema. Evidence-grounded
 * generation is enforced by the prompts (PROMPTS.md), not here.
 */
export async function generateJson<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<LlmJsonResult<T>> {
  const anthropic = getAnthropic();
  const res = await anthropic.messages.create({
    model: getModel(),
    max_tokens: opts.maxTokens ?? 2048,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  // If the model hit the token ceiling, the JSON is truncated. Fail with a
  // clear, actionable message instead of a misleading "Unbalanced JSON" from the
  // downstream parser.
  if (res.stop_reason === "max_tokens") {
    throw new Error(
      "Model response was truncated at the token limit (increase maxTokens for this call).",
    );
  }

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  const json = extractJson(text);
  const parsed = opts.schema.parse(json);

  const tokensIn = res.usage?.input_tokens ?? 0;
  const tokensOut = res.usage?.output_tokens ?? 0;

  return {
    data: parsed,
    usage: { tokensIn, tokensOut, costUsd: estimateCostUsd(tokensIn, tokensOut) },
  };
}

/** Extracts the first JSON object/array from a model response (tolerant of fences). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  // Find the matching closing bracket by scanning. We must skip braces that
  // appear INSIDE string literals (e.g. a finding mentioning "dataLayer.push({…})"),
  // otherwise the depth count breaks and we'd wrongly report "Unbalanced JSON".
  const opener = candidate[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === opener) depth++;
    else if (ch === closer) {
      depth--;
      if (depth === 0) {
        return JSON.parse(candidate.slice(start, i + 1));
      }
    }
  }
  throw new Error("Unbalanced JSON in model response");
}
