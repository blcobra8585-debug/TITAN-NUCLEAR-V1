/**
 * TITAN SERVER — Telegram Alert
 * Server-side errors seedha admin ke Telegram pe bhejta hai.
 * Env vars → TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (Replit Secrets).
 * Hardcoded fallback bhi hai taaki server deploy hote hi kaam kare.
 */
import { logger } from "./logger";

// Bug fix: Hardcoded fallback tokens removed — they were committed to a public
// GitHub repo, letting anyone send/read messages via this bot.
// Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Replit Secrets.
const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"] ?? "";
const CHAT_ID   = process.env["TELEGRAM_CHAT_ID"] ?? "";
const TG_API    = "https://api.telegram.org";
const TIMEOUT_MS = 8_000;

function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

function getISTTime(): string {
  try {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return new Date().toISOString();
  }
}

export async function sendTelegramAlert(
  title: string,
  details: string,
  context?: string,
): Promise<void> {
  // If tokens not configured, skip silently — don't crash callers
  if (!BOT_TOKEN || !CHAT_ID) {
    logger.warn({ title }, "Telegram alert skipped — TELEGRAM_BOT_TOKEN/CHAT_ID not set");
    return;
  }
  try {
    const safeTitle   = escapeMd(title);
    const safeDetails = escapeMd(details.slice(0, 800));
    const safeCtx     = context ? escapeMd(context) : null;
    const ts          = escapeMd(getISTTime());

    const text =
      `🖥️ *MA TITAN SERVER ALERT*\n\n` +
      `⚠️ *${safeTitle}*\n\n` +
      `📋 *Details:*\n\`\`\`\n${safeDetails}\n\`\`\`` +
      (safeCtx ? `\n\n📍 *Context:* \`${safeCtx}\`` : "") +
      `\n🕐 *Time \\(IST\\):* ${ts}` +
      `\n\n_— MA TITAN API Server_`;

    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    const resp = await fetch(`${TG_API}/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "MarkdownV2",
      }),
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      logger.warn({ status: resp.status, err: err.slice(0, 120) }, "Telegram alert API error");
    }
  } catch (err) {
    logger.warn({ err }, "Telegram alert send failed");
  }
}
