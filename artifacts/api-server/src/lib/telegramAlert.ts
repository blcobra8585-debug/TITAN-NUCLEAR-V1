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

// ── Reusable raw send (internal) ──────────────────────────────────────────────
async function tgSend(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const resp  = await fetch(`${TG_API}/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "MarkdownV2" }),
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      logger.warn({ status: resp.status, err: err.slice(0, 120) }, "Telegram send API error");
    }
  } catch (err) {
    logger.warn({ err }, "Telegram send failed");
  }
}

// ── New Lead Alert ────────────────────────────────────────────────────────────
export async function sendNewLeadAlert(lead: {
  name: string; phone: string; location?: string; product?: string; message: string; source: string;
}): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  const e = escapeMd;
  const text =
    `🆕 *NAYA LEAD — ${e(lead.source)}*\n\n` +
    `👤 *${e(lead.name)}*\n` +
    `📱 \`${e(lead.phone)}\`\n` +
    (lead.location ? `📍 ${e(lead.location)}\n` : "") +
    (lead.product  ? `🏗️ ${e(lead.product)}\n`  : "") +
    `\n💬 _${e(lead.message.slice(0, 200))}_\n\n` +
    `🕐 ${e(getISTTime())}\n_— MA TITAN Auto\\-Detected_`;
  await tgSend(text);
}

// ── Daily Digest ──────────────────────────────────────────────────────────────
export async function sendDailyDigest(stats: {
  totalLeads: number; newLeads: number; unreplied: number;
  totalQuotes: number; approvedQuotes: number; pendingQuotes: number;
  totalRevenue: number;
}): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  const e = escapeMd;
  const rev = stats.totalRevenue >= 10000000
    ? `₹${(stats.totalRevenue / 10000000).toFixed(1)}Cr`
    : stats.totalRevenue >= 100000
      ? `₹${(stats.totalRevenue / 100000).toFixed(1)}L`
      : `₹${(stats.totalRevenue / 1000).toFixed(0)}K`;
  const text =
    `📊 *MA TITAN — DAILY DIGEST*\n` +
    `_${e(getISTTime())}_\n\n` +
    `📥 *Leads*\n` +
    `  Total: *${stats.totalLeads}* \\| Aaj naye: *${stats.newLeads}* \\| Unreplied: *${stats.unreplied}*\n\n` +
    `📋 *Quotes*\n` +
    `  Total: *${stats.totalQuotes}* \\| ✅ Approved: *${stats.approvedQuotes}* \\| ⏳ Pending: *${stats.pendingQuotes}*\n\n` +
    `💰 *Pipeline Value*\n` +
    `  ${e(rev)}\n\n` +
    `_Subah 9 baje ka update — MA TITAN_`;
  await tgSend(text);
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
