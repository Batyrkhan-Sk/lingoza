import { config } from "../config.js";

/**
 * A minimal Telegram Bot API client.
 *
 * The bot uses inline keyboards for nearly everything (§17), so the surface it
 * needs is small: send a message, edit one in place when a button is pressed,
 * and answer the callback so the client stops showing a spinner.
 */

export interface InlineButton {
  text: string;
  /** Callback payload, max 64 bytes — keep it short. */
  callback_data?: string;
  url?: string;
}

export type InlineKeyboard = InlineButton[][];

interface SendOptions {
  chatId: string | number;
  text: string;
  keyboard?: InlineKeyboard;
  /** Telegram's flavour of markdown. */
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
  disablePreview?: boolean;
}

export class TelegramClient {
  constructor(private readonly token = config.telegram.botToken) {}

  get configured(): boolean {
    return this.token.length > 0;
  }

  private async call<T>(method: string, body: unknown): Promise<T | null> {
    if (!this.configured) {
      console.warn(`[telegram] ${method} skipped — TELEGRAM_BOT_TOKEN is not set`);
      return null;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };
      if (!payload.ok) {
        console.error(`[telegram] ${method} failed: ${payload.description}`);
        return null;
      }
      return payload.result ?? null;
    } catch (error) {
      // A Telegram outage must never fail the learner's request — the progress
      // write has already happened by the time we get here.
      console.error(`[telegram] ${method} threw:`, error);
      return null;
    }
  }

  sendMessage(options: SendOptions) {
    return this.call<{ message_id: number }>("sendMessage", {
      chat_id: options.chatId,
      text: options.text,
      parse_mode: options.parseMode ?? "Markdown",
      disable_web_page_preview: options.disablePreview ?? true,
      ...(options.keyboard ? { reply_markup: { inline_keyboard: options.keyboard } } : {}),
    });
  }

  /** Replace the message the button was attached to, so chats stay tidy. */
  editMessage(options: SendOptions & { messageId: number }) {
    return this.call("editMessageText", {
      chat_id: options.chatId,
      message_id: options.messageId,
      text: options.text,
      parse_mode: options.parseMode ?? "Markdown",
      disable_web_page_preview: true,
      ...(options.keyboard ? { reply_markup: { inline_keyboard: options.keyboard } } : {}),
    });
  }

  answerCallback(callbackId: string, text?: string) {
    return this.call("answerCallbackQuery", {
      callback_query_id: callbackId,
      ...(text ? { text } : {}),
    });
  }

  setWebhook(url: string, secretToken: string) {
    return this.call("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
    });
  }

  setCommands() {
    return this.call("setMyCommands", {
      commands: [
        { command: "start", description: "Start learning Spanish" },
        { command: "register", description: "Create or link your account" },
        { command: "daily", description: "Today's personalised session" },
        { command: "lesson", description: "Continue your current lesson" },
        { command: "review", description: "Review words that are due" },
        { command: "vocabulary", description: "Browse your vocabulary" },
        { command: "practice", description: "Grammar practice" },
        { command: "hook", description: "Memory hook for a word" },
        { command: "speak", description: "Conversation with your AI tutor" },
        { command: "progress", description: "Your progress" },
        { command: "stats", description: "Detailed statistics" },
      ],
    });
  }
}

export const telegram = new TelegramClient();

/** Escape text that will be sent with Markdown parse mode. */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, "\\$1");
}

/** Render a progress bar for the chat, e.g. ████████░░ 78% */
export function progressBar(percent: number, width = 10): string {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)} ${Math.round(percent)}%`;
}
