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

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getWhatsAppConfig();
    if (!config?.serverUrl) {
      const url = `whatsapp://send?phone=${phone.replace(/\D/g, "")}&text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(url).catch(() => false);
      if (canOpen) {
        await Linking.openURL(url);
        return { success: true };
      }
      return { success: false, error: "WhatsApp installed nahi hai" };
    }
    const resp = await fetch(`${config.serverUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.token}` },
      body: JSON.stringify({ phone, message }),
    });
    if (resp.ok) return { success: true };
    return { success: false, error: `Server error: ${resp.status}` };
  } catch (e: any) {
    try {
      const url = `whatsapp://send?phone=${phone.replace(/\D/g, "")}&text=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
      return { success: true };
    } catch {
      return { success: false, error: e?.message ?? "WhatsApp send failed" };
    }
  }
}

export function buildQuoteMessage(
  clientOrParams: string | { client: string; project: string; tons: string; cost: number },
  projectArg?: string,
  quoteTextArg?: string
): string {
  if (typeof clientOrParams === "string") {
    return `🏗️ *MA Engineering — Project Quote*

Namaste ${clientOrParams}!

Aapke *${projectArg}* project ke liye:

${quoteTextArg}

Koi sawaal ho to call karein:
📞 MA Engineering Team

_Powered by TITAN AI_`;
  }
  const { client, project, tons, cost } = clientOrParams;
  return `🏗️ *MA Engineering — Project Quote*

Namaste ${client}!

Aapke *${project}* project ke liye quote:
- Capacity: ${tons} tons
- Estimated Cost: ₹${cost.toLocaleString("en-IN")}

Koi sawaal ho to call karein:
📞 MA Engineering Team

_Powered by TITAN AI_`;
}
