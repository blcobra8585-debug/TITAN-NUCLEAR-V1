export async function sendWAMessage(phone: string, message: string, token: string, wabaId: string) {
  const clean = phone.replace(/\D/g, "");
  const res = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/messages`, {
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
