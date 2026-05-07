import AsyncStorage from "@react-native-async-storage/async-storage";

export async function sendWhatsAppMessage(
  toPhone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const waToken = await AsyncStorage.getItem("wa_token");
  const wabaId = await AsyncStorage.getItem("waba_id");

  if (!waToken || !wabaId) {
    return { success: false, error: "WhatsApp token ya WABA ID set nahi hai. Admin Panel check karo." };
  }

  const phone = toPhone.replace(/\D/g, "");
  if (phone.length < 10) {
    return { success: false, error: "Valid phone number daalein (country code ke saath, jaise 917895643069)" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${wabaId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await res.json();

    if (res.ok && data.messages) {
      return { success: true };
    }
    return {
      success: false,
      error: data.error?.message ?? "WhatsApp send failed",
    };
  } catch (e: any) {
    return { success: false, error: e.message ?? "Network error" };
  }
}

export function buildQuoteMessage(
  clientName: string,
  projectType: string,
  quoteText: string
): string {
  return `🏗️ *MA ENGINEERING — Professional Quote*\n\nClient: *${clientName}*\nProject: *${projectType}*\n\n${quoteText}\n\n---\n*MA Engineering* | 15+ Years Experience | Zero-Accident Record\n📞 +917895643069`;
}
