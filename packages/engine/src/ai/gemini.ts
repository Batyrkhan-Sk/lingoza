import {
  fetchWithTimeout,
  ProviderError,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from "./provider.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }[];
  error?: { message?: string; status?: string };
  promptFeedback?: { blockReason?: string };
}

/**
 * Google Gemini Flash — the primary provider.
 *
 * The model id is configuration, not a constant: point GEMINI_MODEL at
 * whichever Flash revision you want. The default is the `-latest` alias, which
 * keeps resolving as Google ships new Flash versions.
 */
export class GeminiProvider implements LlmProvider {
  readonly name = "gemini" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gemini-flash-latest",
    private readonly timeoutMs: number = 20_000,
  ) {}

  get available(): boolean {
    return this.apiKey.length > 0;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    if (!this.available) {
      throw new ProviderError("GEMINI_API_KEY is not set", "gemini");
    }

    const body = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: request.messages.map((message) => ({
        // Gemini names the assistant turn "model", not "assistant".
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 1024,
        ...(request.json ? { responseMimeType: "application/json" } : {}),
      },
      // The learner is practising a foreign language and will produce clumsy,
      // occasionally odd sentences. Default thresholds flag too much of that as
      // unsafe and would leave them staring at an empty tutor reply.
      safetySettings: [
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "HARM_CATEGORY_DANGEROUS_CONTENT",
      ].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" })),
    };

    const response = await fetchWithTimeout(
      `${BASE_URL}/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      },
      this.timeoutMs,
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new ProviderError(
        `Gemini responded ${response.status}: ${detail.slice(0, 300)}`,
        "gemini",
        response.status,
      );
    }

    const payload = (await response.json()) as GeminiResponse;

    if (payload.error) {
      throw new ProviderError(payload.error.message ?? "Gemini error", "gemini");
    }
    if (payload.promptFeedback?.blockReason) {
      throw new ProviderError(
        `Gemini blocked the prompt: ${payload.promptFeedback.blockReason}`,
        "gemini",
      );
    }

    const text = (payload.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new ProviderError("Gemini returned an empty response", "gemini");
    }

    return { text, provider: this.name };
  }
}
