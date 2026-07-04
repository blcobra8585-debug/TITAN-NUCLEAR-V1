// Fix(H5): version extracted as a constant — update here when Meta deprecates v18.0.
const WA_API_VERSION = "v18.0";

export async function sendWAMessage(phone: string, message: string, token: string, wabaId: string) {
  let clean = phone.replace(/\D/g, "");
  // Fix(L2): auto-prefix country code 91 for bare 10-digit Indian numbers.
  if (clean.length === 10) clean = "91" + clean;
  const res = await fetch(`https://graph.facebook.com/${WA_API_VERSION}/${wabaId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: clean, type: "text", text: { body: message } }),
  });
  const data = await res.json();
  if (res.ok && data.messages) return { success: true };
  return { success: false, error: data.error?.message ?? "Failed" };
}

export const TEMPLATES = {
  greeting: (name: string) =>
    `Namaskar *${name}* ji! 🙏\n\nMain Lily hoon, MA Engineering ki Senior Manager. Kya aap crane erection, chimney ya boiler project ke baare mein discuss karna chahte hain?\n\n*MA Engineering* | 15+ Years Experience`,
  followUp: (name: string) =>
    `Namaskar *${name}* ji,\n\nHumara quote bheja tha aapko. Koi sawal ho toh please bataiye — hum aapki poori madad karne ke liye taiyaar hain.\n\n*Lily | MA Engineering* 📞 +917895643069`,
  payment: (name: string, amount: string) =>
    `Namaskar *${name}* ji,\n\n*₹${amount}* ki payment reminder hai. Kripya confirmation den.\n\nDhanyawad!\n*MA Engineering*`,
  quote: (name: string, project: string, amount: string) =>
    `🏗️ *MA ENGINEERING — Professional Quote*\n\nClient: *${name}*\nProject: *${project}*\nEstimated Value: *${amount}*\n\nDetailed quote attached. Please review aur feedback den.\n\n*Lily | Senior Manager*\n📞 +917895643069\n✅ 15+ Years | Zero-Accident Record`,
};
