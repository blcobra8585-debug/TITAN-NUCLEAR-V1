import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateQuote(params: {
  client: string;
  project: string;
  tons: string;
}): Promise<string> {
  try {
    const apiKey = await AsyncStorage.getItem("gemini_api_key").catch(() => null);
    if (!apiKey) {
      return `MA Engineering Quote\n\nClient: ${params.client}\nProject: ${params.project}\nCapacity: ${params.tons} tons\n\nNote: Gemini API key set karein Admin Panel mein for AI-generated quotes.`;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `You are a professional industrial project estimator for MA Engineering, a crane and chimney construction company in India. Generate a detailed project quote for:
- Client: ${params.client}
- Project Type: ${params.project}
- Lifting Capacity: ${params.tons} tons

Include: scope of work, timeline (weeks), team size, safety measures, warranty. Keep it professional, concise, in Hinglish (Hindi + English mix). Format with sections.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    return `Quote generation failed: ${err?.message || "Unknown error"}.\n\nPlease check your Gemini API key in Admin Panel.`;
  }
}

export async function askLily(question: string): Promise<string> {
  try {
    const apiKey = await AsyncStorage.getItem("gemini_api_key").catch(() => null);
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
    return `Lily error: ${err?.message || "Please check your API key in Admin Panel."}`;
  }
}
