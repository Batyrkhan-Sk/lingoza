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

  /**
   * Send a message, falling back to plain text if Telegram rejects the markup.
   *
   * Much of what the bot sends is dynamic — article extracts, song titles,
   * learner-supplied text — and any of it can contain an unbalanced `*` or `_`
   * that makes Telegram reject the whole message. Escaping helps but cannot be
   * exhaustive, and a learner seeing nothing at all is far worse than a learner
   * seeing unformatted text, so a parse failure retries without formatting.
   */
  async sendMessage(options: SendOptions) {
    const payload = {
      chat_id: options.chatId,
      text: options.text,
      disable_web_page_preview: options.disablePreview ?? true,
      ...(options.keyboard ? { reply_markup: { inline_keyboard: options.keyboard } } : {}),
    };

    const sent = await this.call<{ message_id: number }>("sendMessage", {
      ...payload,
      parse_mode: options.parseMode ?? "Markdown",
    });
    if (sent) return sent;

    // Strip the markers as well as dropping parse_mode, so the reader does not
    // get a message full of stray asterisks and backslashes.
    return this.call<{ message_id: number }>("sendMessage", {
      ...payload,
      text: stripMarkdown(options.text),
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

  /**
   * Send audio by URL — Telegram fetches it from the publisher itself, so
   * preview clips and podcast episodes are never proxied through this server.
   */
  sendAudio(options: {
    chatId: string | number;
    audioUrl: string;
    caption?: string;
    title?: string;
    performer?: string;
    keyboard?: InlineKeyboard;
  }) {
    return this.call("sendAudio", {
      chat_id: options.chatId,
      audio: options.audioUrl,
      ...(options.caption ? { caption: options.caption, parse_mode: "Markdown" } : {}),
      ...(options.title ? { title: options.title } : {}),
      ...(options.performer ? { performer: options.performer } : {}),
      ...(options.keyboard ? { reply_markup: { inline_keyboard: options.keyboard } } : {}),
    });
  }

  /**
   * Send audio bytes as a voice note.
   *
   * Voice notes get inline playback, a waveform and Telegram's own speed
   * control — which is exactly what a learner wants when replaying a word.
   * That rendering requires OGG/Opus; anything else has to go as a file, so
   * the caller passes the format and this picks the right method.
   */
  async sendVoiceNote(options: {
    chatId: string | number;
    audio: Uint8Array;
    format: "ogg" | "wav";
    caption?: string;
    filename?: string;
    keyboard?: InlineKeyboard;
  }) {
    if (!this.configured) {
      console.warn("[telegram] sendVoice skipped — TELEGRAM_BOT_TOKEN is not set");
      return null;
    }

    const isVoice = options.format === "ogg";
    const method = isVoice ? "sendVoice" : "sendAudio";
    const field = isVoice ? "voice" : "audio";

    const form = new FormData();
    form.append("chat_id", String(options.chatId));
    if (options.caption) {
      form.append("caption", options.caption);
      form.append("parse_mode", "Markdown");
    }
    if (options.keyboard) {
      form.append("reply_markup", JSON.stringify({ inline_keyboard: options.keyboard }));
    }
    form.append(
      field,
      // Uint8Array is an ArrayBufferView, which Blob accepts directly.
      new Blob([options.audio], { type: isVoice ? "audio/ogg" : "audio/wav" }),
      options.filename ?? `pronunciation.${options.format}`,
    );

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as { ok: boolean; description?: string };
      if (!payload.ok) {
        console.error(`[telegram] ${method} failed: ${payload.description}`);
        return null;
      }
      return payload;
    } catch (error) {
      console.error(`[telegram] ${method} threw:`, error);
      return null;
    }
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
        { command: "vocabulary", description: "Your words, or /vocabulary <word> to look one up" },
        { command: "practice", description: "Grammar practice" },
        { command: "hook", description: "Memory hook for a word" },
        { command: "explain", description: "Break down a line of Spanish" },
        { command: "say", description: "Hear how something is pronounced" },
        { command: "media", description: "Real Spanish: films, music, articles" },
        { command: "song", description: "Break down a song you want to understand" },
        { command: "watch", description: "Films and cartoons in Spanish" },
        { command: "podcast", description: "Spanish podcasts to listen to" },
        { command: "speak", description: "Conversation with your AI tutor" },
        { command: "progress", description: "Your progress" },
        { command: "stats", description: "Detailed statistics" },
        { command: "remind", description: "Daily reminder times" },
      ],
    });
  }
}

export const telegram = new TelegramClient();

/** Remove markdown markers for the plain-text fallback. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\\([_*`\[\]])/g, "$1")
    .replace(/[*_`]/g, "");
}

/** Escape text that will be sent with Markdown parse mode. */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, "\\$1");
}

/** Render a progress bar for the chat, e.g. ████████░░ 78% */
export function progressBar(percent: number, width = 10): string {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)} ${Math.round(percent)}%`;
}
