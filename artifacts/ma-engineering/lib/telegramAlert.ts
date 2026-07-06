/**
 * TITAN TELEGRAM ALERT
 * Koi bhi crash / stuck screen → Telegram bot se admin ko seedha message.
 * Admin screen mein "Telegram Bot Token" aur "Telegram Chat ID" set karo.
 *
 * Bot kaise banao:
 *  1. Telegram mein @BotFather ko /newbot bhejo
 *  2. Token milega → Admin screen → "Telegram Bot Token"
 *  3. Apna Chat ID chahiye → @userinfobot ko /start bhejo → ID milegi
 *     Admin screen → "Telegram Chat ID"
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TG_API = "https://api.telegram.org";

function getISTTime(): string {
  try {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return new Date().toISOString();
  }
}

function getDeviceLabel(): string {
  try {
    const c = Platform.constants as any;
    const brand = c?.Brand ?? c?.Manufacturer ?? "";
    const model = c?.Model ?? "";
    return `${brand} ${model} (${Platform.OS} ${Platform.Version})`.trim();
  } catch {
    return `${Platform.OS} ${Platform.Version}`;
  }
}

/**
 * Telegram mein MarkdownV2 ke liye special chars escape karna padta hai.
 */
function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * Telegram bot ke zariye admin ko crash/error alert bhejo.
 * @param title   Short heading e.g. "App Crash: fatal-js-error"
 * @param details Error message / stack / description
 * @param context Optional tag e.g. "SplashScreen/timeout"
 */
export async function sendTelegramAlert(
  title: string,
  details: string,
  context?: string
): Promise<void> {
  try {
    const [botToken, chatId] = await Promise.all([
      AsyncStorage.getItem("telegram_bot_token"),
      AsyncStorage.getItem("telegram_chat_id"),
    ]);

    if (!botToken || !chatId) {
      console.warn("[TelegramAlert] Token/ChatID not set — alert skipped:", title);
      return;
    }

    const device  = escapeMd(getDeviceLabel());
    const ts      = escapeMd(getISTTime());
    const safeTitle   = escapeMd(title);
    const safeDetails = escapeMd(details.slice(0, 800));
    const safeCtx     = context ? escapeMd(context) : null;

    const text =
      `🚨 *MA TITAN ALERT*\n\n` +
      `⚠️ *${safeTitle}*\n\n` +
      `📋 *Details:*\n\`\`\`\n${safeDetails}\n\`\`\`` +
      (safeCtx ? `\n\n📍 *Context:* \`${safeCtx}\`` : "") +
      `\n\n📱 *Device:* ${device}` +
      `\n🕐 *Time \\(IST\\):* ${ts}` +
      `\n\n_— Auto\\-reported by MA TITAN v3\\.2_`;

    const resp = await fetch(`${TG_API}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.warn("[TelegramAlert] API error:", resp.status, errText.slice(0, 120));
    }
  } catch (err) {
    // Alert system should never crash the app
    console.warn("[TelegramAlert] Failed:", err);
  }
}
