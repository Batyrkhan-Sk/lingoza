import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pcmToWav, synthesizeSpeech, type SpanishVoice } from "@lingoza/engine";
import { PronunciationSource, type NativeRecording } from "@lingoza/content";
import { config } from "../config.js";

/**
 * Pronunciation audio.
 *
 * Two sources, in order of pedagogical value:
 *
 *  1. **A real native speaker**, where one exists. Lingua Libre volunteers have
 *     recorded thousands of Spanish words, and a human carries the stress and
 *     vowel quality a learner is trying to imitate. It also lets us say *who*
 *     said it and where they are from.
 *  2. **Synthesis**, for sentences and for words nobody has recorded.
 *
 * Everything is cached on disk by content hash. Synthesis costs money per call
 * and takes a second or two, and the same fifty words get requested constantly,
 * so re-generating them would be both slow and wasteful.
 */

const pronunciation = new PronunciationSource({ timeoutMs: 6000 });

/** Cached under the OS temp dir; regenerating a lost file costs one API call. */
const CACHE_DIR = join(process.env.AUDIO_CACHE_DIR ?? "/tmp", "lingoza-audio");

export interface SpeechAudio {
  data: Uint8Array;
  /** "ogg" plays as a Telegram voice note; "wav" has to be sent as a file. */
  format: "ogg" | "wav";
  mime: string;
  /** Where it came from, so the learner can be told. */
  origin: "native" | "synthesis";
  /** Attribution and speaker detail, when a human recorded it. */
  credit: string | null;
  region: string | null;
}

export interface SpeechOptions {
  /** Slow, deliberate delivery. */
  slow?: boolean;
  voice?: SpanishVoice;
  dialect?: "es-ES" | "es-419";
  /** Skip the native lookup — useful when the learner wants it slowed down. */
  forceSynthesis?: boolean;
}

/**
 * Get audio for a word or sentence.
 *
 * Returns null only when synthesis is unconfigured *and* no recording exists,
 * which the caller should report rather than fail silently.
 */
export async function getSpeech(
  text: string,
  options: SpeechOptions = {},
): Promise<SpeechAudio | null> {
  const clean = text.trim();
  if (!clean || clean.length > 600) return null;

  const key = cacheKey(clean, options);
  const cached = await readCache(key);
  if (cached) return cached;

  const isSingleWord = clean.split(/\s+/).length === 1;

  // A real speaker beats a synthesiser for a single word — but not when the
  // learner has asked for it slowed down, which a recording cannot do.
  if (isSingleWord && !options.slow && !options.forceSynthesis) {
    const recording = await pronunciation.find(clean);
    if (recording) {
      const audio = await fromNativeRecording(recording);
      if (audio) {
        await writeCache(key, audio);
        return audio;
      }
    }
  }

  const synthesised = await synthesizeSpeech(
    { geminiApiKey: config.ai.geminiApiKey, ttsModel: config.ai.ttsModel },
    { text: clean, slow: options.slow, voice: options.voice, dialect: options.dialect },
  );
  if (!synthesised) return null;

  const wav = pcmToWav(synthesised.pcm, synthesised.sampleRate);
  const ogg = await toOpus(wav);

  const audio: SpeechAudio = ogg
    ? { data: ogg, format: "ogg", mime: "audio/ogg", origin: "synthesis", credit: null, region: null }
    : { data: wav, format: "wav", mime: "audio/wav", origin: "synthesis", credit: null, region: null };

  await writeCache(key, audio);
  return audio;
}

/** Download a Commons recording and convert it for playback. */
async function fromNativeRecording(recording: NativeRecording): Promise<SpeechAudio | null> {
  try {
    const response = await fetch(recording.audioUrl, {
      headers: { "User-Agent": "Lingoza/0.1 (Spanish learning platform; educational use)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const original = new Uint8Array(await response.arrayBuffer());
    const converted = await toOpus(original);

    const credit = recording.region
      ? `Recorded by ${recording.speaker} (${recording.region}) · Wikimedia Commons`
      : `Recorded by ${recording.speaker} · Wikimedia Commons`;

    return converted
      ? { data: converted, format: "ogg", mime: "audio/ogg", origin: "native", credit, region: recording.region }
      : { data: original, format: "wav", mime: recording.mime, origin: "native", credit, region: recording.region };
  } catch {
    return null;
  }
}

/**
 * Convert audio to OGG/Opus with ffmpeg, or null when ffmpeg is unavailable.
 *
 * Telegram will only render a *voice note* — inline playback, waveform, speed
 * control — for OGG/Opus. Anything else arrives as a file attachment, which is
 * a much worse way to hear a word. ffmpeg is installed in the container for
 * this; locally it may be missing, and the WAV fallback still plays.
 */
async function toOpus(input: Uint8Array): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    let ffmpeg;
    try {
      ffmpeg = spawn("ffmpeg", [
        "-hide_banner", "-loglevel", "error",
        "-i", "pipe:0",
        "-c:a", "libopus",
        "-b:a", "32k",       // speech, not music — 32k is transparent enough
        "-ar", "48000",      // Opus resamples to 48k regardless
        "-ac", "1",
        "-f", "ogg",
        "pipe:1",
      ]);
    } catch {
      resolve(null);
      return;
    }

    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.on("error", () => resolve(null)); // ffmpeg not installed
    ffmpeg.on("close", (code) => {
      resolve(code === 0 && chunks.length > 0 ? Uint8Array.from(Buffer.concat(chunks)) : null);
    });

    ffmpeg.stdin.on("error", () => resolve(null));
    ffmpeg.stdin.end(Buffer.from(input));
  });
}

// ─── Cache ───────────────────────────────────────────────────────────────────

function cacheKey(text: string, options: SpeechOptions): string {
  const hash = createHash("sha256")
    .update(`${text}|${options.slow ? "slow" : "normal"}|${options.voice ?? "clear"}|${options.dialect ?? "es-ES"}`)
    .digest("hex")
    .slice(0, 32);
  return hash;
}

async function readCache(key: string): Promise<SpeechAudio | null> {
  for (const format of ["ogg", "wav"] as const) {
    try {
      const data = await readFile(join(CACHE_DIR, `${key}.${format}`));
      const meta = await readFile(join(CACHE_DIR, `${key}.json`), "utf8").catch(() => null);
      const parsed = meta ? (JSON.parse(meta) as { origin?: string; credit?: string; region?: string }) : {};
      return {
        data: Uint8Array.from(data),
        format,
        mime: format === "ogg" ? "audio/ogg" : "audio/wav",
        origin: parsed.origin === "native" ? "native" : "synthesis",
        credit: parsed.credit ?? null,
        region: parsed.region ?? null,
      };
    } catch {
      // try the next format
    }
  }
  return null;
}

async function writeCache(key: string, audio: SpeechAudio): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(join(CACHE_DIR, `${key}.${audio.format}`), audio.data);
    await writeFile(
      join(CACHE_DIR, `${key}.json`),
      JSON.stringify({ origin: audio.origin, credit: audio.credit, region: audio.region }),
    );
  } catch {
    // A cache that cannot be written is a performance problem, not a failure.
  }
}

/** Whether pronunciation audio can be produced at all. */
export function speechAvailable(): boolean {
  // Native recordings need no key, so audio is possible even without Gemini —
  // just limited to single words that somebody has recorded.
  return true;
}

export function synthesisAvailable(): boolean {
  return config.ai.geminiApiKey.length > 0;
}
