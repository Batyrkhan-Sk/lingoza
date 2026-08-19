import { fetchWithTimeout, type AiConfig } from "./provider.js";

/**
 * Speech synthesis.
 *
 * Used where a real recording does not exist — sentences, and words no native
 * speaker has contributed audio for. For single words a human recording is
 * preferred and tried first; see the pronunciation source in @lingoza/content.
 *
 * Gemini returns raw PCM rather than a container format, so `pcmToWav` below
 * wraps it into something playable. That is deliberate: writing a 44-byte WAV
 * header is trivial and dependency-free, whereas pulling in an audio library to
 * do the same thing would not be.
 */

/** Voices that read Spanish acceptably. Firm and clear beats expressive here. */
export const SPANISH_VOICES = {
  /** Neutral and clear — the default for vocabulary and examples. */
  clear: "Kore",
  /** Warmer, better suited to conversational lines. */
  warm: "Aoede",
  /** Lower and slower, useful when a learner asks to hear it again. */
  calm: "Charon",
} as const;

export type SpanishVoice = keyof typeof SPANISH_VOICES;

export interface SpeechRequest {
  text: string;
  voice?: SpanishVoice;
  /** Slow, deliberate delivery for a learner who missed it the first time. */
  slow?: boolean;
  /** "es-ES" | "es-419" — steers accent via the instruction. */
  dialect?: "es-ES" | "es-419";
}

export interface SpeechResult {
  /** PCM as returned by the model — signed 16-bit little-endian. */
  pcm: Uint8Array;
  sampleRate: number;
  provider: "gemini";
}

const TTS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Synthesise Spanish speech, or null when unavailable.
 *
 * The model must be *instructed* to speak rather than handed bare text — given
 * only a string it will try to answer it, and the API rejects the response for
 * containing text instead of audio.
 */
export async function synthesizeSpeech(
  config: AiConfig,
  request: SpeechRequest,
): Promise<SpeechResult | null> {
  const apiKey = config.geminiApiKey;
  if (!apiKey) return null;

  const { text, voice = "clear", slow = false, dialect = "es-ES" } = request;
  if (!text.trim()) return null;

  const model = config.ttsModel ?? "gemini-2.5-flash-preview-tts";
  const accent = dialect === "es-419" ? "Latin American Spanish" : "Spanish from Spain";
  const pace = slow
    ? "Speak slowly and deliberately, separating the words, as if helping a beginner hear each sound."
    : "Speak at a natural, unhurried pace.";

  const instruction = `Read the following aloud in ${accent}. ${pace} Read only the text itself, adding nothing:\n\n${text}`;

  try {
    const response = await fetchWithTimeout(
      `${TTS_ENDPOINT}/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instruction }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: SPANISH_VOICES[voice] } },
            },
          },
        }),
      },
      config.timeoutMs ?? 25_000,
    );

    if (!response.ok) {
      console.warn(`[tts] gemini responded ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
    };

    const inline = payload.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inline?.data) {
      console.warn("[tts] gemini returned no audio");
      return null;
    }

    return {
      pcm: Uint8Array.from(Buffer.from(inline.data, "base64")),
      sampleRate: parseSampleRate(inline.mimeType) ?? 24_000,
      provider: "gemini",
    };
  } catch (error) {
    console.warn("[tts] synthesis failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** The rate is announced in the mime type, e.g. `audio/L16;codec=pcm;rate=24000`. */
function parseSampleRate(mimeType: string | undefined): number | null {
  const match = mimeType?.match(/rate=(\d+)/);
  return match?.[1] ? Number(match[1]) : null;
}

/**
 * Wrap raw PCM in a WAV container.
 *
 * A WAV header is 44 bytes of well-documented fields, so this avoids an audio
 * dependency entirely. Mono 16-bit is what the model returns.
 */
export function pcmToWav(pcm: Uint8Array, sampleRate = 24_000, channels = 1): Uint8Array {
  const bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4); // total size minus the first 8 bytes
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM format chunk length
  header.writeUInt16LE(1, 20); // 1 = uncompressed PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Uint8Array.from(Buffer.concat([header, Buffer.from(pcm)]));
}
