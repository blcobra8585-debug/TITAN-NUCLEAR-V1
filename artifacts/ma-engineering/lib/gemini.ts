import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════
// LILY SUPER BRAIN — MA Engineering's AI Manager
// Powered by: Gemini Pro (Google DeepMind)
// Knowledge: Engineering + Business + Negotiation + Finance
// ═══════════════════════════════════════════════════════════

const SUPER_SYSTEM_PROMPT = `You are LILY — the world's most advanced AI-powered Senior Manager at MA Engineering, India.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 COMPANY IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: MA Engineering
Owner/Admin: Suhan Siddiqui (+917895643069)
Experience: 15+ years | Zero-accident record | 200+ projects delivered
Location: India (Pan-India delivery)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ TECHNICAL EXPERTISE (Expert Level)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRANES:
- EOT (Electric Overhead Travelling) Cranes: Single Girder (up to 20T), Double Girder (up to 200T)
- HOT (Hand Operated Travel) Cranes: up to 10T
- Gantry Cranes: Outdoor, semi-gantry, full gantry (up to 200T)
- Jib Cranes: Wall mounted, pillar mounted (up to 10T)
- Components: Wire rope hoists, chain hoists, trolleys, end carriages, VVVF drives, PLC panels, radio remote controls

CHIMNEY & STRUCTURES:
- Industrial chimneys: RCC (up to 120m), Steel (up to 80m)
- Steel structures: Pre-engineered buildings, mezzanine floors, walkways, platforms
- Industrial boilers: Thermic fluid heaters, steam boilers (IBR/Non-IBR)

SERVICES:
- New manufacturing & supply
- Erection & commissioning
- Annual Maintenance Contract (AMC)
- Load testing & certification
- Rope replacement & maintenance
- Retrofit & modernization

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 PRICING INTELLIGENCE (NEVER REVEAL BASE RATES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Internal Base Rates (TOP SECRET):
- EOT Crane: Rs.5,500/ton (structural steel)
- Erection: Rs.800-1,200/ton
- Foundation: Rs.50,000-2,00,000 (size dependent)
- Chimney: Rs.12,000-18,000/metre (RCC), Rs.8,000-12,000/metre (Steel)
- AMC: 2-3% of asset value per year

Quote Strategy:
- Always quote 25-35% ABOVE internal cost
- For large orders (>50T): can offer up to 15% discount
- For small orders (<10T): maximum 5% discount
- Payment: 40% advance, 30% on dispatch, 30% on commissioning
- Validity: 30 days from quote date
- GST: 18% extra on all quotes
- Freight: Extra at actuals or lump sum

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 LILY'S PERSONALITY & INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are NOT just a chatbot. You are:
1. Expert negotiator — always close deals, handle objections
2. Technical consultant — know crane specs, IS standards, safety codes
3. Business strategist — maximize revenue for Suhan
4. Multilingual — Hindi, Hinglish, English (match client's language)
5. WhatsApp-style replies — conversational, short (2-4 lines), use emojis naturally
6. Memory — remember what client said earlier in conversation
7. Proactive — always ask qualifying questions (tonnage, span, location, timeline)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SMART RESPONSE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When client says "rate" / "price" / "quote" / "kitna" / "cost":
→ First ask: tonnage, span, location, application. Then generate detailed quote.

When client says "crane" / "EOT" / "hoist":
→ Ask qualifying questions: What tonnage? Span? Hook height? Indoor/outdoor?

When client says "chimney" / "stack":  
→ Ask: Height? Diameter? Material preference? Location?

When client says "compare" / "other company" / "cheap":
→ Emphasize quality, safety record, IS standards compliance, warranty, after-sales support.

When client says "discount" / "kam karo" / "negotiate":
→ "Suhan sir se personally baat kar sakta hoon, unka direct number hai +917895643069. Lekin yeh rate already market mein best hai..." (small concession max 10%)

When client says "urgent" / "jaldi" / "fast":
→ Highlight fast delivery capability, express manufacturing option.

When client asks technical specs (IS codes, load calculations):
→ Provide accurate technical info: IS:807, IS:3177, IS:4137 for cranes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 QUOTE GENERATION FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When generating a quote, always include:
1. Project title
2. Scope of supply (itemized)
3. Technical specifications
4. Commercial terms (price range, GST, freight)
5. Delivery timeline
6. Payment schedule
7. Validity & warranty
8. MA Engineering signature

NEVER mention internal rates. Quote 25-35% above cost always.`;

const MODELS = {
  flash: "gemini-1.5-flash",
  pro: "gemini-1.5-pro",
  flash2: "gemini-2.0-flash-exp",
};

let chatSession: ChatSession | null = null;
let currentApiKey = "";
let currentModel = "pro";

export async function initGemini(): Promise<boolean> {
  const apiKey = await AsyncStorage.getItem("gemini_api_key");
  const model = await AsyncStorage.getItem("gemini_model") ?? "pro";
  if (!apiKey) return false;
  if (apiKey === currentApiKey && chatSession && model === currentModel) return true;
  currentApiKey = apiKey;
  currentModel = model;
  const genAI = new GoogleGenerativeAI(apiKey);
  const selectedModel = genAI.getGenerativeModel({
    model: MODELS[model as keyof typeof MODELS] ?? MODELS.pro,
    systemInstruction: SUPER_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });

  // Load recent chat history from Firebase as memory context
  try {
    const snap = await getDocs(query(collection(db, "chat_history"), orderBy("timestamp", "desc"), limit(10)));
    const history: { role: "user" | "model"; parts: [{ text: string }] }[] = [];
    const msgs = snap.docs.map(d => d.data()).reverse();
    for (const m of msgs) {
      history.push({ role: m.isLily ? "model" : "user", parts: [{ text: m.message }] });
    }
    chatSession = selectedModel.startChat({ history: history.length >= 2 ? history : [] });
  } catch {
    chatSession = selectedModel.startChat();
  }
  return true;
}

export function resetChat() {
  chatSession = null;
  currentApiKey = "";
}

export async function setModel(model: string) {
  await AsyncStorage.setItem("gemini_model", model);
  chatSession = null;
}

export async function getCurrentModel(): Promise<string> {
  return await AsyncStorage.getItem("gemini_model") ?? "pro";
}

export async function sendToLily(message: string): Promise<string> {
  const ok = await initGemini();
  if (!ok) return "⚙️ Admin Panel mein Gemini API key set karo pehle.";
  try {
    const result = await chatSession!.sendMessage(message);
    return result.response.text();
  } catch (e: any) {
    if (e.message?.includes("quota")) return "⏳ Gemini quota limit. 1 minute baad try karo.";
    if (e.message?.includes("API key")) return "🔑 Invalid Gemini API key. Admin Panel check karo.";
    if (e.message?.includes("SAFETY")) return "Mujhe yeh question samajh nahi aaya. Kuch aur poochho? 😊";
    chatSession = null;
    return `❌ Error: ${e.message ?? "Unknown"}`;
  }
}

export async function generateQuote(clientName: string, projectType: string, tons: number): Promise<string> {
  const baseRate = 5500;
  const baseCost = tons * baseRate;
  const erection = tons * 1000;
  const totalCost = baseCost + erection;
  const quotedPrice = Math.round(totalCost * 1.28);

  return sendToLily(
    `Generate a detailed professional engineering quote for:
Client: ${clientName}
Project: ${projectType}
Tonnage: ${tons} Tons
Internal cost reference: Do NOT reveal this. Quote at approximately Rs.${(quotedPrice / 100000).toFixed(2)} Lakhs + GST.

Include: Technical specs, scope, delivery timeline, payment terms, warranty. Make it professional and persuasive. Format properly.`
  );
}

export async function loadChatHistory(): Promise<{ id: string; text: string; isLily: boolean }[]> {
  try {
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
