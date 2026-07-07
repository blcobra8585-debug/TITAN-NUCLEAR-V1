import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSecureItem } from "@/lib/security";
import { Linking } from "react-native";

export interface WhatsAppConfig {
  serverUrl: string;
  token: string;
  wabaId: string;
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  try {
    const [serverUrl, token, wabaId] = await Promise.all([
      AsyncStorage.getItem("server_url"),             // plain — not sensitive
      getSecureItem("wa_token").catch(() => null),    // encrypted
      getSecureItem("waba_id").catch(() => null),     // encrypted
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
    const resp = await fetch(`${config.serverUrl}/api/wa/send`, {
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

export type QuoteLanguage = "hi" | "en";

/**
 * Multi-language variant of the quote message. "hi" keeps the existing
 * Hinglish tone used everywhere else in the app; "en" sends a fully
 * professional English version for clients who prefer it.
 */
export function buildQuoteMessageLang(
  params: { client: string; project: string; tons: string | number; cost: number },
  lang: QuoteLanguage = "hi"
): string {
  const { client, project, tons, cost } = params;
  if (lang === "en") {
    return `🏗️ *MA Engineering — Project Quote*

Dear ${client},

Thank you for considering MA Engineering for your *${project}* project.

- Lifting Capacity: ${tons} tons
- Estimated Cost: ₹${cost.toLocaleString("en-IN")}

Please feel free to reach out with any questions.

📞 MA Engineering Team
_Powered by TITAN AI_`;
  }
  return buildQuoteMessage({ client, project, tons: String(tons), cost });
}

export function buildInvoiceMessage(params: {
  client: string;
  project: string;
  invoiceNumber: string;
  amount: number;
  amountPaid?: number;
  lang?: QuoteLanguage;
}): string {
  const { client, project, invoiceNumber, amount, amountPaid = 0, lang = "hi" } = params;
  const balance = Math.max(amount - amountPaid, 0);
  if (lang === "en") {
    return `🧾 *MA Engineering — Invoice #${invoiceNumber}*

Dear ${client},
Project: *${project}*

Total Amount: ₹${amount.toLocaleString("en-IN")}
Paid: ₹${amountPaid.toLocaleString("en-IN")}
Balance Due: ₹${balance.toLocaleString("en-IN")}

Thank you for your business!
📞 MA Engineering Team`;
  }
  return `🧾 *MA Engineering — Invoice #${invoiceNumber}*

Namaste ${client}!
Project: *${project}*

Total Amount: ₹${amount.toLocaleString("en-IN")}
Paid: ₹${amountPaid.toLocaleString("en-IN")}
Balance Due: ₹${balance.toLocaleString("en-IN")}

Dhanyawaad aapke business ke liye!
📞 MA Engineering Team`;
}
