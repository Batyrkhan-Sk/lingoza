import {
  fetchWithTimeout,
  ProviderError,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from "./provider.js";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GroqResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  error?: { message?: string; type?: string };
}

/**
 * Groq — the fallback provider, used whenever Gemini errors, rate-limits or
 * times out. Its API is OpenAI-compatible, so the mapping is a straight
 * translation of the same request shape.
 */
export class GroqProvider implements LlmProvider {
  readonly name = "groq" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "openai/gpt-oss-120b",
    private readonly timeoutMs: number = 20_000,
  ) {}

  get available(): boolean {
    return this.apiKey.length > 0;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    if (!this.available) {
      throw new ProviderError("GROQ_API_KEY is not set", "groq");
    }

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: request.system },
        ...request.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1024,
      ...(request.json ? { response_format: { type: "json_object" } } : {}),
    };

    const response = await fetchWithTimeout(
      ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      },
      this.timeoutMs,
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new ProviderError(
        `Groq responded ${response.status}: ${detail.slice(0, 300)}`,
        "groq",
        response.status,
      );
    }

    const payload = (await response.json()) as GroqResponse;

    if (payload.error) {
      throw new ProviderError(payload.error.message ?? "Groq error", "groq");
    }

    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new ProviderError("Groq returned an empty response", "groq");
    }

    return { text, provider: this.name };
  }
}
