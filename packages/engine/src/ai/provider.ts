/**
 * The AI provider seam.
 *
 * One interface, three implementations, tried in order: Gemini Flash → Groq →
 * deterministic rules. Nothing above this file knows which one answered, so
 * the tutor, the writing grader and the speech evaluator all keep working with
 * no API keys configured at all — degraded, but never broken.
 *
 * Both providers are called over plain `fetch` rather than through their SDKs.
 * The request shapes are small and stable, and this keeps the engine free of
 * heavy dependencies it would otherwise drag into every interface.
 */

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider for strict JSON. Both backends support this natively. */
  json?: boolean;
}

export interface LlmResponse {
  text: string;
  provider: ProviderName;
}

export type ProviderName = "gemini" | "groq" | "rules";

export interface LlmProvider {
  readonly name: ProviderName;
  readonly available: boolean;
  complete(request: LlmRequest): Promise<LlmResponse>;
}

export interface AiConfig {
  geminiApiKey?: string;
  geminiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  /** Model used for speech synthesis; separate from the chat model. */
  ttsModel?: string;
  /** Per-request timeout in ms before falling through to the next provider. */
  timeoutMs?: number;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderName,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Abort helper — a hung provider must not hang the learner's lesson. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pull a JSON object out of a model response.
 *
 * Even in JSON mode models occasionally wrap output in prose or a fenced code
 * block, and a parse failure here would surface to the learner as a broken
 * exercise — so this is tolerant by design.
 */
export function extractJson<T>(text: string): T | null {
  const trimmed = text.trim();

  const candidates: string[] = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    candidates.push(trimmed.slice(firstBracket, lastBracket + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try the next candidate
    }
  }
  return null;
}
