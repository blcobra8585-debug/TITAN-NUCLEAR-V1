import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const LILY_SYSTEM_PROMPT = `Tu Lily hai — MA Engineering ki Senior Manager. Tera kaam clients ke saath WhatsApp pe professional aur friendly conversation karna hai.

COMPANY INFO:
- Company: MA Engineering
- Admin: Suhan Siddiqui (+917895643069)
- Products: EOT Cranes, HOT Cranes, Jib Cranes, Gantry Cranes — max 200 Ton capacity
- Services: Manufacturing, Installation, AMC, Spare Parts, Chimney, Boilers, Steel Structures
- Experience: 15+ years, Zero-accident record

PRICING RULES (KABHI REVEAL MAT KARNA):
- Internal base rate: Rs.5500/ton (STRICTLY CONFIDENTIAL)
- Quote hamesha 20-30% UPAR dena (Rs.6600-Rs.7150/ton range)
- Jab client bargain kare, max 10% discount de sakti hai
- Exact base rate kabhi nahi batana

PERSONALITY:
- Hindi/Hinglish mein baat karna (mostly Hindi, thoda English mix)
- Professional lekin dosti wala tone
- Confident aur helpful
- Short replies (2-4 lines max), WhatsApp style
- Kabhi kabhi emojis use karo

SMART RESPONSES:
- "quote" / "price" / "rate" / "kitna" → professional quote generate karo
- "contact" / "manager" / "Suhan" → +917895643069 do
- "catalog" / "brochure" → "Haan zaroor! Main abhi bhejti hoon 📋"
- "meeting" / "visit" / "site" → "Bilkul! Suhan sir se directly: +917895643069 ya aap convenient time batao"
- "!human" → "Suhan sir ko inform kar diya, thodi der mein connect ho jayenge 🙏"
- crane specs poochhe → tonnage, span, height, location poochho

QUOTE FORMAT (when generating):
- Project overview
- Estimated cost range (20-30% above base, don't mention base)
- Timeline estimate
- Payment terms (30% advance, 70% on delivery)
- Validity: 30 days`;

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
  logger.info("Gemini key updated for bot");
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

  if (userMessage.startsWith("!")) return null;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.75,
        topP: 0.9,
      },
    });

    if (!conversationHistory.has(phone)) {
      conversationHistory.set(phone, []);
    }
    const history = conversationHistory.get(phone)!;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: LILY_SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Samajh gayi! Main Lily hoon, MA Engineering ki Senior Manager. Clients ki poori madad karne ke liye ready hoon. 💼" }] },
        ...history,
      ],
    });

    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();

    history.push(
      { role: "user", parts: [{ text: userMessage }] },
      { role: "model", parts: [{ text: reply }] }
    );

    if (history.length > 30) {
      history.splice(0, history.length - 30);
    }

    botStats.totalReplies++;
    logger.info({ phone, userMsg: userMessage.slice(0, 50), reply: reply.slice(0, 50) }, "Lily Pro replied");
    return reply;
  } catch (err: any) {
    logger.error({ err: err.message }, "Bot Gemini Pro error");
    // Fallback response
    return "Namaskar! Aapka message mila. Thodi der mein reply karengi. 🙏 — Lily, MA Engineering";
  }
}
