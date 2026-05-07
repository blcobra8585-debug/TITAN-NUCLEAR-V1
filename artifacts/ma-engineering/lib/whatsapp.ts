import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";

export interface WhatsAppConfig {
  serverUrl: string;
  token: string;
  wabaId: string;
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  try {
    const [serverUrl, token, wabaId] = await Promise.all([
      AsyncStorage.getItem("server_url"),
      AsyncStorage.getItem("wa_token"),
      AsyncStorage.getItem("waba_id"),
    ]);
    if (!serverUrl && !token) return null;
    return { serverUrl: serverUrl ?? "", token: token ?? "", wabaId: wabaId ?? "" };
  } catch {
    return null;
  }
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  try {
    const config = await getWhatsAppConfig();
    if (!config?.serverUrl) {
      // Fallback: open WhatsApp directly
      const url = `whatsapp://send?phone=${phone.replace(/\D/g, "")}&text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(url).catch(() => false);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    }
    const resp = await fetch(`${config.serverUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.token}` },
      body: JSON.stringify({ phone, message }),
    });
    return resp.ok;
  } catch {
    // Try direct WhatsApp as fallback
    try {
      const url = `whatsapp://send?phone=${phone.replace(/\D/g, "")}&text=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export function buildQuoteMessage(params: {
  client: string;
  project: string;
  tons: string;
  cost: number;
}): string {
  return `🏗️ *MA Engineering — Project Quote*

Namaste ${params.client}!

Aapke *${params.project}* project ke liye quote:
- Capacity: ${params.tons} tons
- Estimated Cost: ₹${params.cost.toLocaleString("en-IN")}

Koi sawaal ho to call karein:
📞 MA Engineering Team

_Powered by TITAN AI_`;
}
