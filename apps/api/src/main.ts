import { serve } from "@hono/node-server";
import { assertProductionSecrets, config } from "./config.js";
import { createApp } from "./http/app.js";
import { aiStatus } from "./services/ai.js";
import { prisma } from "./db.js";

assertProductionSecrets();

const app = createApp();

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  const ai = aiStatus();
  console.log(`\n  Lingoza API   http://localhost:${info.port}`);
  console.log(`  Web origin    ${config.webOrigin}`);
  console.log(
    `  AI            ${ai.enabled ? ai.providers.join(" → ") : "not configured (rule-based fallbacks in use)"}`,
  );
  console.log(
    `  Telegram      ${config.telegram.botToken ? "configured" : "not configured"}\n`,
  );
});

/** Close cleanly so SQLite is not left with an open write transaction. */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received, shutting down.`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
