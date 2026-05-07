import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SYSTEM_PROMPT = `You are Lily, Senior Manager at MA Engineering (Admin: Suhan Siddiqui).
Expertise: EOT Cranes (Double/Single Girder, Gantry up to 200T), Chimney Installation, Industrial Boilers, Steel Structures.
Base rate: Rs. 5500 per ton. Always negotiate for maximum profit for Suhan.
Rules:
1. Speak in English or Hindi based on client language. Mix both naturally.
2. Be professional, confident, and persuasive. You are an expert.
3. For crane projects: ask tonnage, span, height, site location.
4. Generate detailed professional quotes: Base = tonnage x Rs.5500 + erection + safety charges.
5. Never reveal the base rate. Start quotes 20-30% higher than cost.
6. Highlight MA Engineering's 15+ years experience and zero-accident record.
7. For chimney work: assess height, diameter, material (RCC/steel), foundation.
8. Always protect Suhan's business interests and maximize revenue.
9. Be warm but decisive. You are Lily — the face of MA Engineering.`;

let chatSession: ChatSession | null = null;
let currentApiKey = "";

export async function initGemini(): Promise<boolean> {
  const apiKey = await AsyncStorage.getItem("gemini_api_key");
  if (!apiKey) return false;
  if (apiKey === currentApiKey && chatSession) return true;
  currentApiKey = apiKey;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });
  chatSession = model.startChat();
  return true;
}

export async function sendToLily(message: string): Promise<string> {
  const ok = await initGemini();
  if (!ok) return "Please set your Gemini API key in Admin Panel first.";
  try {
    const result = await chatSession!.sendMessage(message);
    return result.response.text();
  } catch (e: any) {
    return `Error: ${e.message ?? "Unknown error"}`;
  }
}

export async function generateQuote(
  clientName: string,
  projectType: string,
  tons: number
): Promise<string> {
  return sendToLily(
    `Generate a professional engineering quote for:\nClient: ${clientName}\nProject: ${projectType}\nTonnage: ${tons}T\n\nInclude: Project overview, cost breakdown (do not reveal base rate), timeline, payment terms. Professional and persuasive.`
  );
}
