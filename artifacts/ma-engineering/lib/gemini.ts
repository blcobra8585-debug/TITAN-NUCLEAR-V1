import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ═══════════════════════════════════════════════════════
// LILY SUPER BRAIN — MA Engineering AI Senior Manager
// Powered by Gemini Pro (Google DeepMind)
// ═══════════════════════════════════════════════════════

const SUPER_SYSTEM_PROMPT = `Tu LILY hai — MA Engineering ki AI-powered Senior Manager. Tu duniya ki sabse advanced engineering sales AI hai.

━━━━━━━━━━━━━━━━━━━━━━━
🏢 COMPANY
━━━━━━━━━━━━━━━━━━━━━━━
Company: MA Engineering
Admin: Suhan Siddiqui (+917895643069)
Experience: 15+ years | Zero-accident record | 200+ projects
Location: India (Pan-India delivery & service)

━━━━━━━━━━━━━━━━━━━━━━━
🏗️ PRODUCTS & EXPERTISE
━━━━━━━━━━━━━━━━━━━━━━━
CRANES (up to 200 Ton):
- EOT Cranes: Single Girder (upto 20T), Double Girder (upto 200T)
- Gantry Cranes: Full/Semi-gantry (upto 200T)
- Jib Cranes: Wall/Pillar mounted (upto 10T)
- HOT Cranes: Hand operated (upto 10T)
- Components: Wire rope hoists, VVVF drives, PLC panels, remote controls

OTHER SERVICES:
- Industrial Chimneys (RCC upto 120m, Steel upto 80m)
- Steel Structures, Mezzanine floors, Platforms
- Industrial Boilers (IBR/Non-IBR)
- AMC (Annual Maintenance Contracts)
- Load testing, rope replacement, modernization

TECHNICAL STANDARDS: IS:807, IS:3177, IS:4137

━━━━━━━━━━━━━━━━━━━━━━━
💰 PRICING (KABHI BASE RATE MAT BATANA)
━━━━━━━━━━━━━━━━━━━━━━━
Internal base (SECRET): Rs.5500/ton
Quote rate: 25-35% upar = Rs.6875-7425/ton range
Erection: Rs.800-1200/ton extra
Foundation: Rs.50,000-2,00,000
Chimney: Rs.12,000-18,000/metre (RCC)
AMC: 2-3% of asset value/year
GST: 18% extra on all quotes
Payment: 40% advance, 30% dispatch, 30% commissioning
Discount max: large orders 15%, small orders 5%
Validity: 30 days

━━━━━━━━━━━━━━━━━━━━━━━
🧠 PERSONALITY
━━━━━━━━━━━━━━━━━━━━━━━
- Hindi/Hinglish mein baat karo (client ki language match karo)
- WhatsApp style: short 2-4 line replies, natural emojis
- Expert negotiator: objection handle karo, deal close karo
- Always ask qualifying questions: tonnage? span? location? application?
- Jab client "sasta" maange: quality, safety, warranty emphasize karo
- Jab urgent ho: express delivery option mention karo
- "!human" command aaye: "Suhan sir ko inform kar diya 🙏 +917895643069"

━━━━━━━━━━━━━━━━━━━━━━━
📋 QUOTE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━
Quote mein hamesha include karo:
1. Project overview & scope
2. Technical specs
3. Price range (25-35% above internal, GST extra)
4. Delivery timeline
5. Payment schedule
6. Warranty & after-sales
7. MA Engineering signature`;

const MODELS: Record<string, string> = {
  flash: "gemini-1.5-flash",
  pro: "gemini-1.5-pro",
  flash2: "gemini-2.0-flash-exp",
};

let chatSession: ChatSession | null = null;
let currentApiKey = "";
let currentModel = "pro";

export async function initGemini(): Promise<boolean> {
  try {
    const apiKey = await AsyncStorage.getItem("gemini_api_key");
    const model = (await AsyncStorage.getItem("gemini_model")) ?? "pro";
    if (!apiKey || !apiKey.trim()) return false;
    if (apiKey === currentApiKey && chatSession && model === currentModel) return true;
    currentApiKey = apiKey;
    currentModel = model;
    const genAI = new GoogleGenerativeAI(apiKey);
    const selectedModel = genAI.getGenerativeModel({
      model: MODELS[model] ?? MODELS.pro,
      systemInstruction: SUPER_SYSTEM_PROMPT,
      generationConfig: { temperature: 0.8, topP: 0.95, maxOutputTokens: 1024 },
    });
    chatSession = selectedModel.startChat();
    return true;
  } catch {
    return false;
  }
}

export function resetChat() {
  chatSession = null;
  currentApiKey = "";
}

export async function setModel(model: string) {
  await AsyncStorage.setItem("gemini_model", model);
  chatSession = null;
  currentApiKey = "";
}

export async function getCurrentModel(): Promise<string> {
  return (await AsyncStorage.getItem("gemini_model")) ?? "pro";
}

export async function sendToLily(message: string): Promise<string> {
  try {
    const ok = await initGemini();
    if (!ok) return "⚙️ Pehle Admin Panel mein Gemini API key set karo.";
    const result = await chatSession!.sendMessage(message);
    return result.response.text();
  } catch (e: any) {
    chatSession = null;
    if (e.message?.includes("quota")) return "⏳ Gemini quota limit. 1 minute baad try karo.";
    if (e.message?.includes("API key") || e.message?.includes("API_KEY")) return "🔑 Gemini API key galat hai. Admin Panel check karo.";
    if (e.message?.includes("SAFETY")) return "Yeh question handle nahi kar sakti. Kuch aur poochho 😊";
    return "❌ Error hua. Dobara try karo.";
  }
}

export async function generateQuote(clientName: string, projectType: string, tons: number): Promise<string> {
  try {
    const baseCost = tons * 5500;
    const quotedPrice = Math.round(baseCost * 1.28);
    return await sendToLily(
      `Generate professional quote:
Client: ${clientName}
Project: ${projectType}
Tonnage: ${tons}T
Target price: ~Rs.${(quotedPrice / 100000).toFixed(2)} Lakhs + 18% GST
Include: specs, scope, delivery, payment terms, warranty. Professional format.`
    );
  } catch {
    return "Quote generate nahi hua. Dobara try karo.";
  }
}

export async function loadChatHistory(): Promise<{ id: string; text: string; isLily: boolean }[]> {
  try {
    // Lazy import Firebase to avoid crash on startup
    const { db } = await import("./firebase");
    const { collection, getDocs, query, orderBy, limit } = await import("firebase/firestore");
    const snap = await getDocs(query(collection(db, "chat_history"), orderBy("timestamp", "desc"), limit(20)));
    return snap.docs.reverse().map(d => ({
      id: d.id,
      text: d.data().message ?? "",
      isLily: d.data().isLily ?? false,
    }));
  } catch {
    return [];
  }
}
