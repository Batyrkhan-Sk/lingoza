import { AiClient } from "@lingoza/engine";
import { ContentSources } from "@lingoza/content";
import { config } from "../config.js";

/**
 * Shared singletons for the outbound integrations.
 *
 * One AI client (Gemini → Groq → rules) and one content-sourcing facade for
 * the whole process, so caches are shared across requests rather than rebuilt
 * per call.
 */
export const ai = new AiClient({
  geminiApiKey: config.ai.geminiApiKey,
  geminiModel: config.ai.geminiModel,
  groqApiKey: config.ai.groqApiKey,
  groqModel: config.ai.groqModel,
});

export const sources = new ContentSources({ enabled: config.sourcingEnabled });

export function aiStatus() {
  return {
    enabled: ai.enabled,
    providers: ai.providerNames,
    /** True when no provider is configured and rule-based fallbacks are in use. */
    degraded: !ai.enabled,
  };
}
