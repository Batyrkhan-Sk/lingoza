import { GeminiProvider } from "./gemini.js";
import { GroqProvider } from "./groq.js";
import {
  extractJson,
  type AiConfig,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type ProviderName,
} from "./provider.js";

/**
 * The provider chain.
 *
 * Requests go to Gemini Flash first and fall through to Groq on any failure.
 * Failures are logged with the provider name so an outage is visible in the
 * API logs rather than silently degrading everyone's tutor to canned text.
 */
export class AiClient {
  private readonly providers: LlmProvider[];

  constructor(config: AiConfig = {}) {
    const timeout = config.timeoutMs ?? 20_000;
    this.providers = [
      new GeminiProvider(config.geminiApiKey ?? "", config.geminiModel ?? "gemini-flash-latest", timeout),
      new GroqProvider(config.groqApiKey ?? "", config.groqModel ?? "llama-3.3-70b-versatile", timeout),
    ].filter((p) => p.available);
  }

  /** True when at least one real provider is configured. */
  get enabled(): boolean {
    return this.providers.length > 0;
  }

  get providerNames(): ProviderName[] {
    return this.providers.map((p) => p.name);
  }

  /**
   * Complete a request, trying each provider in turn.
   * Returns null when every provider fails — callers then use their
   * rule-based fallback rather than showing the learner an error.
   */
  async complete(request: LlmRequest): Promise<LlmResponse | null> {
    const failures: string[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.complete(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${provider.name}: ${message}`);
        console.warn(`[ai] ${provider.name} failed, falling through — ${message}`);
      }
    }

    if (failures.length > 0) {
      console.error(`[ai] all providers failed — ${failures.join(" | ")}`);
    }
    return null;
  }

  /** Complete and parse as JSON; null if the call or the parse fails. */
  async json<T>(request: Omit<LlmRequest, "json">): Promise<{ data: T; provider: ProviderName } | null> {
    const response = await this.complete({ ...request, json: true });
    if (!response) return null;

    const data = extractJson<T>(response.text);
    if (data === null) {
      console.warn(`[ai] ${response.provider} returned unparseable JSON`);
      return null;
    }
    return { data, provider: response.provider };
  }
}

/** Build a client from environment variables. */
export function aiClientFromEnv(env: Record<string, string | undefined> = process.env): AiClient {
  return new AiClient({
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL,
    groqApiKey: env.GROQ_API_KEY,
    groqModel: env.GROQ_MODEL,
    timeoutMs: env.AI_TIMEOUT_MS ? Number(env.AI_TIMEOUT_MS) : undefined,
  });
}
