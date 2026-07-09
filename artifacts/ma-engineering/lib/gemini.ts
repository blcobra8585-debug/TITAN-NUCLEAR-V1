import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSecureItem } from "@/lib/security";

export async function generateQuote(
  clientOrParams: string | { client: string; project: string; tons: string | number },
  projectArg?: string,
  tonsArg?: number | string
): Promise<string> {
  const client = typeof clientOrParams === "string" ? clientOrParams : clientOrParams.client;
  const project = typeof clientOrParams === "string" ? (projectArg ?? "") : clientOrParams.project;
  const tons = typeof clientOrParams === "string" ? String(tonsArg ?? "") : String(clientOrParams.tons);
  try {
    const apiKey = await getSecureItem("gemini_api_key").catch(() => null);
    if (!apiKey) {
      return `MA Engineering Quote\n\nClient: ${client}\nProject: ${project}\nCapacity: ${tons} tons\n\nNote: Gemini API key set karein Admin Panel mein for AI-generated quotes.`;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are a professional industrial project estimator for MA Engineering, a crane and chimney construction company in India. Generate a detailed project quote for:
- Client: ${client}
- Project Type: ${project}
- Lifting Capacity: ${tons} tons

Include: scope of work, timeline (weeks), team size, safety measures, warranty. Keep it professional, concise, in Hinglish (Hindi + English mix). Format with sections.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    // Fix(C): Throw a user-friendly error so the caller (QuoteScreen) shows
    // an Alert instead of storing the raw error string as a quote — which
    // would expose the API JSON blob and still show the "Send via WhatsApp" button.
    throw new Error("Quote generate nahi ho paya, thodi der baad try karein.");
  }
}

export async function askLily(question: string): Promise<string> {
  try {
    const apiKey = await getSecureItem("gemini_api_key").catch(() => null);
    if (!apiKey) {
      return "Admin Panel mein Gemini API key set karo phir Lily kaam karegi! Settings → Admin → AI Keys";
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are Lily, the AI assistant for MA Engineering — an industrial crane & chimney company. You speak in Hinglish (mix of Hindi and English). You help with: crane installation, chimney construction, industrial projects, site management, client queries, revenue tracking, lead generation.

User asked: ${question}

Reply helpfully in Hinglish, max 3 sentences.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    // Fix(C): Return a user-friendly message — never expose raw API errors.
    return "Lily abhi available nahi hai. Thodi der baad dobara try karein.";
  }
}

export const sendToLily = askLily;

export async function generateFollowUp(params: {
  client: string;
  project: string;
  daysSinceQuote: number;
  status: string;
}): Promise<string> {
  const { client, project, daysSinceQuote, status } = params;
  try {
    const apiKey = await getSecureItem("gemini_api_key").catch(() => null);
    if (!apiKey) {
      return `Namaste ${client}! Aapke *${project}* project ke quote ke baare mein follow-up — kya aap decide kar paaye? Koi sawaal ho to bataiye, hum madad ke liye ready hain!`;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are Lily, sales manager at MA Engineering (crane & chimney construction, India). Write a short, warm WhatsApp follow-up message in Hinglish for a client:
- Client: ${client}
- Project: ${project}
- Quote status: ${status}
- Days since quote sent: ${daysSinceQuote}

Keep it under 4 lines, friendly but professional, gently nudge toward a decision without being pushy. No markdown headers.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    return `Namaste ${client}! Aapke *${project}* project quote ka follow-up — koi update ho to bataiye.`;
  }
}

export async function generateNegotiationReply(params: {
  client: string;
  project: string;
  quotedAmount: number;
  clientOffer: string;
}): Promise<string> {
  const { client, project, quotedAmount, clientOffer } = params;
  try {
    const apiKey = await getSecureItem("gemini_api_key").catch(() => null);
    if (!apiKey) {
      return `Namaste ${client}, aapka offer note kar liya hai. Hum ${project} project ke liye best possible rate dene ki koshish karenge — thodi der mein confirm karte hain. Admin Panel mein Gemini key add karein AI-negotiation ke liye.`;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are Lily, a skilled sales negotiator for MA Engineering (crane & chimney construction, India). A client is negotiating price:
- Client: ${client}
- Project: ${project}
- Our quoted amount: ₹${quotedAmount.toLocaleString("en-IN")}
- Client said: "${clientOffer}"

Write a short, polite Hinglish WhatsApp reply that holds firm on value while offering a small reasonable concession (max 5-8%) or a value-add (like free maintenance visit) instead of a big discount. Under 5 lines. No markdown headers.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    return `Namaste ${client}, aapka offer note kar liya hai. Hum best possible rate ke saath jald hi confirm karenge.`;
  }
}
