import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const LILY_SYSTEM_PROMPT = `Tu Lily hai — MA Engineering ki Senior Manager. Tera kaam clients ke saath WhatsApp pe professional aur friendly conversation karna hai.

COMPANY INFO:
- Company: MA Engineering
- Admin: Suhan Siddiqui
- Products: EOT Cranes, HOT Cranes, Jib Cranes, Gantry Cranes — max 200 Ton capacity
- Location: India
- Services: Manufacturing, Installation, AMC (Annual Maintenance Contract), Spare Parts

PRICING RULES (KABHI REVEAL MAT KARNA):
- Internal base rate: ₹5500/ton
- Quote hamesha 20-30% UPAR dena (i.e., ₹6600-₹7150/ton range)
- Jab client bargain kare, max 10% discount de sakti hai
- Exact base rate kabhi nahi batana

PERSONALITY:
- Hindi/Hinglish mein baat karna (mostly Hindi, thoda English mix)
- Professional lekin dosti wala tone
- Confident aur helpful
- Short replies (2-4 lines max), WhatsApp style

COMMANDS JO CLIENT LIKH SAKTA HAI:
- "quote" ya "price" ya "rate" → quote generate karo
- "contact" ya "manager" → Suhan Siddiqui ka number dena: +917895643069
- "catalog" ya "brochure" → "Main catalog WhatsApp pe bhej rahi hoon, thoda wait karo" bol do
- "meeting" ya "visit" → "Bilkul! Suhan sir se directly baat karo: +917895643069" bol do

SPECIAL RULES:
- Agar !human command aaye → "Haan zaroor! Main Suhan sir ko inform kar rahi hoon. Thodi der mein connect ho jayenge." bol do
- Kabhi company secret mat dena
- Agar koi irrelevant baat kare → politely redirect karo cranes/engineering pe
- Hamesha positive aur solution-focused raho`;

interface ConversationMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

const conversationHistory: Map<string, ConversationMessage[]> = new Map();

let botEnabled = true;
let geminiKey: string | null = null;

const botStats = {
  totalMessages: 0,
  totalReplies: 0,
  startTime: Date.now(),
};

export function setBotEnabled(enabled: boolean) {
  botEnabled = enabled;
  logger.info({ enabled }, "Bot status changed");
}

export function isBotEnabled() {
  return botEnabled;
}

export function setGeminiKey(key: string) {
  geminiKey = key;
}

export function getBotStats() {
  return {
    ...botStats,
    enabled: botEnabled,
    uptime: Math.floor((Date.now() - botStats.startTime) / 1000),
    activeChats: conversationHistory.size,
  };
}

export function clearHistory(phone: string) {
  conversationHistory.delete(phone);
}

export function clearAllHistory() {
  conversationHistory.clear();
}

export async function generateBotReply(phone: string, userMessage: string): Promise<string | null> {
  if (!botEnabled) return null;

  const key = geminiKey || process.env["GEMINI_API_KEY"] || "";
  if (!key) {
    logger.warn("No Gemini API key set for bot");
    return "Namaskar! MA Engineering mein aapka swagat hai. Quote ya koi info chahiye to batayein! 🏗️";
  }

  botStats.totalMessages++;

  // Admin commands — don't reply to self
  if (userMessage.startsWith("!")) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    if (!conversationHistory.has(phone)) {
      conversationHistory.set(phone, []);
    }
    const history = conversationHistory.get(phone)!;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: LILY_SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Samajh gayi! Main Lily hoon, MA Engineering ki Senior Manager. Clients ki help karne ke liye ready hoon." }] },
        ...history,
      ],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();

    history.push(
      { role: "user", parts: [{ text: userMessage }] },
      { role: "model", parts: [{ text: reply }] }
    );

    // Keep only last 20 messages per chat
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    botStats.totalReplies++;
    logger.info({ phone, userMessage: userMessage.slice(0, 50), reply: reply.slice(0, 50) }, "Bot replied");
    return reply;
  } catch (err: any) {
    logger.error({ err: err.message }, "Bot Gemini error");
    return "Namaskar! Aapka message mila. Thodi der mein reply karengi. 🙏";
  }
}
