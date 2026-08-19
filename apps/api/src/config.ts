import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Configuration, read once at startup.
 *
 * Loading .env by hand rather than pulling in dotenv: it is fifteen lines, and
 * a dependency that runs at import time in every process is not worth it.
 */
function loadDotEnv(): void {
  for (const file of [".env", ".env.local"]) {
    try {
      const contents = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of contents.split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (!match) continue;
        const [, key, rawValue] = match;
        if (!key || process.env[key] !== undefined) continue; // real env wins
        process.env[key] = (rawValue ?? "").replace(/^["']|["']$/g, "");
      }
    } catch {
      // Absent .env is normal in production, where real env vars are set.
    }
  }
}

loadDotEnv();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  publicApiUrl: process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,

  jwtSecret: process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me",

  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
    groqApiKey: process.env.GROQ_API_KEY ?? "",
    groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  },

  /** Disable outbound content sourcing (offline dev, CI). */
  sourcingEnabled: process.env.CONTENT_SOURCING !== "off",

  /**
   * Serve the built SPA from this process. On by default in production (one
   * container serves both), off in development where Vite serves it with HMR.
   */
  serveWeb: process.env.SERVE_WEB
    ? process.env.SERVE_WEB === "true"
    : process.env.NODE_ENV === "production",
  /** Where the built SPA lives, relative to the working directory. */
  webRoot: process.env.WEB_ROOT ?? "./public",

  isProduction: process.env.NODE_ENV === "production",
} as const;

export function assertProductionSecrets(): void {
  if (!config.isProduction) return;
  if (config.jwtSecret.startsWith("dev-only")) {
    throw new Error("JWT_SECRET must be set to a real secret in production.");
  }
}
