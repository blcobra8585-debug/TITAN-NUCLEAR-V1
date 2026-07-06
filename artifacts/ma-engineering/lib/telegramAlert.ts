/**
 * TITAN TELEGRAM ALERT
 * Crash / stuck screen → Telegram pe seedha alert.
 *
 * FALLBACK credentials APK mein baked in hain — Admin screen set karne
 * ki zaroorat nahi. AsyncStorage mein custom token mila toh woh use hoga,
 * warna hardcoded fallback fire karega (app ke pehle second se kaam karta hai).
 *
 * Bot setup:
 *  Token  → @BotFather se /newbot
 *  ChatID → @userinfobot ko /start bhejo
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { timeoutSignal } from "@/lib/timeout";

// ── Hardcoded fallback — kaam karta hai even if Admin screen kabhi nahi khula
const FALLBACK_BOT_TOKEN = "7507508870:AAEo4AKPOgx1DaJtG0YEW8Za9Eo-hiebd9Q";
const FALLBACK_CHAT_ID   = "5961723105";

const TG_API          = "https://api.telegram.org";
const FETCH_TIMEOUT_MS = 8_000;

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

/** Telegram MarkdownV2 special chars escape */
function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * Telegram bot se admin ko alert bhejo.
 * AsyncStorage → custom token; fallback → hardcoded.
 */
export async function sendTelegramAlert(
  title: string,
  details: string,
  context?: string,
): Promise<void> {
  try {
    // AsyncStorage se custom token try karo; nahi mila toh fallback use karo
    const [storedToken, storedChatId] = await Promise.all([
      AsyncStorage.getItem("telegram_bot_token").catch(() => null),
      AsyncStorage.getItem("telegram_chat_id").catch(() => null),
    ]);

    const botToken = storedToken?.trim() || FALLBACK_BOT_TOKEN;
    const chatId   = storedChatId?.trim() || FALLBACK_CHAT_ID;

    const device      = escapeMd(getDeviceLabel());
    const ts          = escapeMd(getISTTime());
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
      signal: timeoutSignal(FETCH_TIMEOUT_MS),
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
    // Alert system kabhi bhi app crash nahi karega
    console.warn("[TelegramAlert] Failed:", err);
  }
}
