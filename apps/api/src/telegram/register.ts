/**
 * Register the webhook with Telegram.
 *
 *   npm run telegram:register --workspace @lingoza/api
 *
 * PUBLIC_API_URL must be an HTTPS URL Telegram can reach — in development that
 * means a tunnel (ngrok, cloudflared) rather than localhost.
 */
import { config } from "../config.js";
import { telegram } from "./client.js";

async function main(): Promise<void> {
  if (!config.telegram.botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set. Create a bot with @BotFather first.");
    process.exit(1);
  }

  const url = `${config.publicApiUrl.replace(/\/$/, "")}/api/telegram/webhook`;

  if (!url.startsWith("https://")) {
    console.error(`Telegram requires HTTPS. PUBLIC_API_URL is currently "${config.publicApiUrl}".`);
    console.error("Start a tunnel (e.g. `cloudflared tunnel --url http://localhost:4000`) and set PUBLIC_API_URL to it.");
    process.exit(1);
  }

  const webhook = await telegram.setWebhook(url, config.telegram.webhookSecret);
  const commands = await telegram.setCommands();

  console.log(webhook ? `✅ Webhook registered: ${url}` : "❌ Failed to register webhook");
  console.log(commands ? "✅ Bot commands published" : "❌ Failed to publish commands");
}

void main();
