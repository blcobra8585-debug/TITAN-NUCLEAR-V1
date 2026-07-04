import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM = `You are Lily, Senior Manager at MA Engineering (Admin: Suhan Siddiqui).
Expertise: EOT Cranes, Chimney, Boilers, Steel Structures. Base rate Rs.5500/ton.
Be professional, persuasive, speak Hindi/English mix. Never reveal base rate. Maximize revenue.`;

export async function generateQuoteText(client: string, project: string, tons: number, apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM });
  const chat = model.startChat();
  const result = await chat.sendMessage(
    `Generate professional quote for Client: ${client}, Project: ${project}, Tonnage: ${tons}T. Include cost breakdown (no base rate), timeline, payment terms.`
  );
  return result.response.text();
}

export async function lilyChat(message: string, apiKey: string, history: {role: string, text: string}[]) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM });
  const chat = model.startChat({ history: history.map(h => ({ role: h.role as "user"|"model", parts: [{ text: h.text }] })) });
  const result = await chat.sendMessage(message);
  return result.response.text();
}
