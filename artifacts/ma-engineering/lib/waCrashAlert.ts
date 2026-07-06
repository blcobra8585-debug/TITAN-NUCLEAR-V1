/**
 * TITAN WA CRASH ALERT
 * Koi bhi error ya stuck screen ho toh seedha admin ke WhatsApp pe bhejta hai.
 * Tokens AsyncStorage se read karta hai — agar set nahi hain toh silently skip.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const ADMIN_PHONE = "917895643069"; // Suhan Siddiqui
const WA_API_BASE = "https://graph.facebook.com/v18.0";

function getISTTime(): string {
  try {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return new Date().toISOString();
  }
}

function getDeviceLabel(): string {
  try {
    const consts = Platform.constants as any;
    const brand = consts?.Brand ?? consts?.Manufacturer ?? "";
    const model = consts?.Model ?? "";
    return `${brand} ${model} (${Platform.OS} ${Platform.Version})`.trim();
  } catch {
    return `${Platform.OS} ${Platform.Version}`;
  }
}

/**
 * Send a WhatsApp alert message to the admin phone.
 * @param title   Short title e.g. "App Stuck on Splash"
 * @param details Longer explanation / error message
 * @param context Optional context tag e.g. "globalErrorHandler"
 */
export async function sendWACrashAlert(
  title: string,
  details: string,
  context?: string
): Promise<void> {
  try {
    // Read tokens — set in Admin screen
    const [waToken, wabaId] = await Promise.all([
      AsyncStorage.getItem("wa_token"),
      AsyncStorage.getItem("waba_id"),
    ]);

    if (!waToken || !wabaId) {
      // Tokens not configured yet — can't send, log only
      console.warn("[WACrashAlert] Tokens not set — alert not sent:", title);
      return;
    }

    const device = getDeviceLabel();
    const ts = getISTTime();

    const body =
      `🚨 *MA TITAN ERROR ALERT*\n\n` +
      `⚠️ *${title}*\n\n` +
      `📋 *Details:*\n${details.slice(0, 600)}` +
      (context ? `\n\n📍 *Context:* \`${context}\`` : "") +
      `\n\n📱 *Device:* ${device}` +
      `\n🕐 *Time (IST):* ${ts}` +
      `\n\n_— Auto-reported by MA TITAN v3.2_`;

    const resp = await fetch(`${WA_API_BASE}/${wabaId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${waToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: ADMIN_PHONE,
        type: "text",
        text: { body, preview_url: false },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.warn("[WACrashAlert] WA API error:", resp.status, errText.slice(0, 100));
    }
  } catch (err) {
    // Never let the alert system crash the app
    console.warn("[WACrashAlert] Failed to send:", err);
  }
}

/**
 * Convenience: send a "splash screen stuck" alert with timing info.
 */
export async function sendSplashStuckAlert(stuckMs: number): Promise<void> {
  await sendWACrashAlert(
    "App Splash Screen Pe Atak Gaya",
    `App ${(stuckMs / 1000).toFixed(1)} seconds se splash screen pe atki hui hai aur tabs nahi khule.\n\n` +
      `Possible causes:\n` +
      `• Firebase init hang\n` +
      `• Reanimated crash\n` +
      `• Navigation error (router.replace failed)\n` +
      `• Font loading timeout`,
    "SplashScreen/timeout"
  );
}
