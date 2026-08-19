import { Hono } from "hono";
import { config } from "../config.js";
import { handleUpdate, type TelegramUpdate } from "./bot.js";

export const telegramRoutes = new Hono();

/**
 * The Telegram webhook.
 *
 * Telegram retries any update it does not get a prompt 200 for, which would
 * process the same button press twice. So the response is returned immediately
 * and the update is handled after — the learner sees the reply as a new
 * message either way, and a slow AI turn can never cause a duplicate.
 */
telegramRoutes.post("/webhook", async (c) => {
  const secret = c.req.header("X-Telegram-Bot-Api-Secret-Token");

  if (config.telegram.webhookSecret && secret !== config.telegram.webhookSecret) {
    // Anyone can find the webhook URL; the secret is what proves it is Telegram.
    return c.json({ error: "forbidden" }, 403);
  }

  const update = await c.req.json<TelegramUpdate>().catch(() => null);
  if (!update) return c.json({ ok: true });

  void handleUpdate(update).catch((error) => {
    console.error("[telegram] unhandled:", error);
  });

  return c.json({ ok: true });
});

telegramRoutes.get("/health", (c) =>
  c.json({
    configured: Boolean(config.telegram.botToken),
    webhookSecured: Boolean(config.telegram.webhookSecret),
  }),
);
