/**
 * ╔══════════════════════════════════════════════════╗
 * ║        TITAN MULTI-AI NEURAL ENGINE v3.1         ║
 * ║  Gemini + ChatGPT + Claude + Groq + Mistral +    ║
 * ║  DeepSeek + Llama + Cohere + Perplexity + More   ║
 * ╚══════════════════════════════════════════════════╝
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { timeoutSignal } from "@/lib/timeout";

export type AIModel =
  | "titan"
  | "gemini-2.5-pro"
  | "gemini-2.0-flash"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "gpt-3.5-turbo"
  | "claude-3-5-sonnet"
  | "claude-3-haiku"
  | "claude-3-opus"
  | "deepseek-chat"
  | "deepseek-coder"
  | "groq-llama-3.3-70b"
  | "groq-mixtral-8x7b"
  | "groq-gemma2-9b"
  | "mistral-large"
  | "mistral-small"
  | "cohere-command-r-plus"
  | "perplexity-sonar"
  | "perplexity-sonar-pro";

export interface AIModelInfo {
  id: AIModel;
  name: string;
  provider: string;
  icon: string;
  color: string;
  desc: string;
  apiKeyField: string;
  speed: "fast" | "medium" | "slow";
  free?: boolean;
}

export const ALL_AI_MODELS: AIModelInfo[] = [
  // ── TITAN ──────────────────────────────────
  { id: "titan", name: "TITAN ⚡", provider: "Multi-AI", icon: "⚡", color: "#00B4FF", desc: "All AIs combined — Maximum intelligence", apiKeyField: "any", speed: "medium" },

  // ── GOOGLE GEMINI ──────────────────────────
  { id: "gemini-2.5-pro",   name: "Gemini 2.5 Pro",   provider: "Google", icon: "🔮", color: "#8B5CF6", desc: "Google DeepMind — Latest & most powerful", apiKeyField: "gemini_api_key", speed: "slow" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash",  provider: "Google", icon: "⚡", color: "#06B6D4", desc: "Ultra-fast experimental Gemini 2.0", apiKeyField: "gemini_api_key", speed: "fast" },
  { id: "gemini-1.5-pro",   name: "Gemini 1.5 Pro",   provider: "Google", icon: "🌟", color: "#7C3AED", desc: "1M context window — deep analysis", apiKeyField: "gemini_api_key", speed: "medium" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash",  provider: "Google", icon: "🚀", color: "#0EA5E9", desc: "Fast & smart — daily tasks", apiKeyField: "gemini_api_key", speed: "fast" },

  // ── OPENAI ─────────────────────────────────
  { id: "gpt-4o",       name: "GPT-4o",       provider: "OpenAI", icon: "🤖", color: "#74AA9C", desc: "OpenAI flagship — best reasoning", apiKeyField: "openai_api_key", speed: "medium" },
  { id: "gpt-4o-mini",  name: "GPT-4o Mini",  provider: "OpenAI", icon: "⚡", color: "#6EE7B7", desc: "Fast + smart — great for quick tasks", apiKeyField: "openai_api_key", speed: "fast" },
  { id: "gpt-4-turbo",  name: "GPT-4 Turbo",  provider: "OpenAI", icon: "🔥", color: "#34D399", desc: "GPT-4 Turbo — 128K context", apiKeyField: "openai_api_key", speed: "slow" },
  { id: "gpt-3.5-turbo",name: "GPT-3.5",      provider: "OpenAI", icon: "💡", color: "#A3A3A3", desc: "Classic reliable ChatGPT", apiKeyField: "openai_api_key", speed: "fast" },

  // ── ANTHROPIC CLAUDE ───────────────────────
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", icon: "🎭", color: "#D97757", desc: "Anthropic's smartest — code & analysis", apiKeyField: "anthropic_api_key", speed: "medium" },
  { id: "claude-3-haiku",    name: "Claude 3 Haiku",    provider: "Anthropic", icon: "⚡", color: "#F59E0B", desc: "Fastest Claude — near-instant responses", apiKeyField: "anthropic_api_key", speed: "fast" },
  { id: "claude-3-opus",     name: "Claude 3 Opus",     provider: "Anthropic", icon: "👑", color: "#EF4444", desc: "Most powerful Claude — complex tasks", apiKeyField: "anthropic_api_key", speed: "slow" },

  // ── DEEPSEEK ───────────────────────────────
  { id: "deepseek-chat",  name: "DeepSeek Chat",  provider: "DeepSeek", icon: "🧠", color: "#4F46E5", desc: "Chinese AI powerhouse — GPT-4 level", apiKeyField: "deepseek_api_key", speed: "medium" },
  { id: "deepseek-coder", name: "DeepSeek Coder", provider: "DeepSeek", icon: "💻", color: "#6366F1", desc: "Best for code & technical tasks", apiKeyField: "deepseek_api_key", speed: "medium" },

  // ── GROQ (Free & Ultra-fast) ───────────────
  { id: "groq-llama-3.3-70b", name: "Llama 3.3 70B",   provider: "Groq", icon: "🦙", color: "#F97316", desc: "Meta's Llama — 500+ tokens/sec on Groq!", apiKeyField: "groq_api_key", speed: "fast", free: true },
  { id: "groq-mixtral-8x7b",  name: "Mixtral 8x7B",    provider: "Groq", icon: "🌀", color: "#EC4899", desc: "Mistral MoE — blazing fast on Groq", apiKeyField: "groq_api_key", speed: "fast", free: true },
  { id: "groq-gemma2-9b",     name: "Gemma 2 9B",      provider: "Groq", icon: "💎", color: "#84CC16", desc: "Google Gemma on Groq — free & fast", apiKeyField: "groq_api_key", speed: "fast", free: true },

  // ── MISTRAL ────────────────────────────────
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral", icon: "🌊", color: "#FF7000", desc: "Mistral's flagship — European AI", apiKeyField: "mistral_api_key", speed: "medium" },
  { id: "mistral-small", name: "Mistral Small", provider: "Mistral", icon: "⚡", color: "#FFA040", desc: "Fast Mistral — cost-effective", apiKeyField: "mistral_api_key", speed: "fast" },

  // ── COHERE ─────────────────────────────────
  { id: "cohere-command-r-plus", name: "Command R+", provider: "Cohere", icon: "🎯", color: "#39C5BB", desc: "Cohere RAG specialist — enterprise AI", apiKeyField: "cohere_api_key", speed: "medium" },

  // ── PERPLEXITY (Web-connected) ─────────────
  { id: "perplexity-sonar",     name: "Sonar",      provider: "Perplexity", icon: "🔍", color: "#20B2AA", desc: "Live web search + AI — real-time answers", apiKeyField: "perplexity_api_key", speed: "medium" },
  { id: "perplexity-sonar-pro", name: "Sonar Pro",  provider: "Perplexity", icon: "🌐", color: "#00CED1", desc: "Pro web-search AI — deep research", apiKeyField: "perplexity_api_key", speed: "slow" },
];

const MA_SYSTEM_PROMPT = `Tu TITAN hai — MA Engineering ka Multi-AI Senior Manager.
Tu ek elite hacker-type AI assistant hai jo sab kuch jaanta hai.

🏢 MA Engineering | 15+ years | EOT Cranes upto 200T | Industrial Chimneys | Steel Structures | Boilers
👤 Admin: Suhan Siddiqui | +917895643069 | Pan India | Zero-accident record | 200+ projects

Personality: Hinglish (Hindi+English mix) | WhatsApp-style short powerful replies | Expert negotiator
Secret base: Rs.5500/ton — always quote 25-35% upar. Never reveal base rate.
Payment: 40% advance → 30% dispatch → 30% commissioning. GST 18% extra.
When asked "!human": Reply "Suhan sir ko inform kar diya 🙏 +917895643069"`;

// ─── GEMINI ───────────────────────────────────────────
const GEMINI_API_MAP: Record<string, string> = {
  "gemini-2.5-pro":   "gemini-2.5-pro-preview-03-25",
  "gemini-2.0-flash": "gemini-2.0-flash-exp",
  "gemini-1.5-pro":   "gemini-1.5-pro",
  "gemini-1.5-flash": "gemini-1.5-flash",
};

const geminiSessions: Partial<Record<string, ChatSession>> = {};
let geminiKeyCache = "";

async function askGemini(message: string, modelId: AIModel): Promise<string> {
  try {
    const key = await AsyncStorage.getItem("gemini_api_key");
    if (!key) return "⚙️ Gemini API key chahiye — Admin Panel mein set karo!";
    const apiModel = GEMINI_API_MAP[modelId] ?? "gemini-1.5-pro";
    if (geminiKeyCache !== key) { Object.keys(geminiSessions).forEach(k => delete (geminiSessions as any)[k]); geminiKeyCache = key; }
    if (!geminiSessions[modelId]) {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: apiModel, systemInstruction: MA_SYSTEM_PROMPT, generationConfig: { temperature: 0.85, topP: 0.95, maxOutputTokens: 1500 } });
      geminiSessions[modelId] = model.startChat();
    }
    const result = await geminiSessions[modelId]!.sendMessage(message);
    return result.response.text();
  } catch (e: any) {
    delete geminiSessions[modelId];
    if (e.message?.includes("quota")) return "⏳ Gemini quota limit — 1 min baad try karo.";
    if (e.message?.includes("API_KEY") || e.message?.includes("API key")) return "🔑 Gemini API key galat hai.";
    if (e.message?.includes("not found") || e.message?.includes("404")) {
      delete GEMINI_API_MAP[modelId]; return "⚠️ Model abhi available nahi. Gemini 1.5 Pro try karo.";
    }
    return `❌ Gemini error: ${e.message?.slice(0, 80)}`;
  }
}

// ─── OPENAI ───────────────────────────────────────────
const GPT_API_MAP: Record<string, string> = {
  "gpt-4o": "gpt-4o", "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4-turbo": "gpt-4-turbo", "gpt-3.5-turbo": "gpt-3.5-turbo",
};
const gptHistory: { role: "user" | "assistant" | "system"; content: string }[] = [
  { role: "system", content: MA_SYSTEM_PROMPT },
];

async function askOpenAI(message: string, modelId: AIModel): Promise<string> {
  try {
    const key = await AsyncStorage.getItem("openai_api_key");
    if (!key) return "⚙️ OpenAI API key chahiye — Admin Panel mein set karo!";
    gptHistory.push({ role: "user", content: message });
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: GPT_API_MAP[modelId] ?? "gpt-4o", messages: gptHistory.slice(-20), temperature: 0.85, max_tokens: 1500 }),
      signal: timeoutSignal(30000),
    });
    if (!res.ok) {
      if (res.status === 401) return "🔑 OpenAI key invalid — check karo!";
      if (res.status === 429) return "⏳ OpenAI rate limit — baad mein try karo.";
      return `❌ GPT error ${res.status}`;
    }
    const data = await res.json() as any;
    const reply = data.choices?.[0]?.message?.content ?? "";
    gptHistory.push({ role: "assistant", content: reply });
    return reply;
  } catch (e: any) { return `❌ GPT error: ${e.message?.slice(0, 80)}`; }
}

// ─── CLAUDE (Anthropic) ───────────────────────────────
const CLAUDE_MAP: Record<string, string> = {
  "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
  "claude-3-haiku": "claude-3-haiku-20240307",
  "claude-3-opus": "claude-3-opus-20240229",
};
const claudeHistory: { role: "user" | "assistant"; content: string }[] = [];

async function askClaude(message: string, modelId: AIModel): Promise<string> {
  try {
    const key = await AsyncStorage.getItem("anthropic_api_key");
    if (!key) return "⚙️ Anthropic API key chahiye — Admin Panel mein set karo!";
    claudeHistory.push({ role: "user", content: message });
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: CLAUDE_MAP[modelId] ?? "claude-3-5-sonnet-20241022", max_tokens: 1500, system: MA_SYSTEM_PROMPT, messages: claudeHistory.slice(-20) }),
      signal: timeoutSignal(30000),
    });
    if (!res.ok) {
      if (res.status === 401) return "🔑 Anthropic key invalid!";
      if (res.status === 429) return "⏳ Claude rate limit — baad mein try karo.";
      return `❌ Claude error ${res.status}`;
    }
    const data = await res.json() as any;
    const reply = data.content?.[0]?.text ?? "";
    claudeHistory.push({ role: "assistant", content: reply });
    return reply;
  } catch (e: any) { return `❌ Claude error: ${e.message?.slice(0, 80)}`; }
}

// ─── GROQ (Ultra-fast) ────────────────────────────────
const GROQ_MAP: Record<string, string> = {
  "groq-llama-3.3-70b": "llama-3.3-70b-versatile",
  "groq-mixtral-8x7b":  "mixtral-8x7b-32768",
  "groq-gemma2-9b":     "gemma2-9b-it",
};
const groqHistory: { role: "user" | "assistant" | "system"; content: string }[] = [
  { role: "system", content: MA_SYSTEM_PROMPT },
];

async function askGroq(message: string, modelId: AIModel): Promise<string> {
  try {
    const key = await AsyncStorage.getItem("groq_api_key");
    if (!key) return "⚙️ Groq API key chahiye (free at console.groq.com) — Admin Panel mein set karo!";
    groqHistory.push({ role: "user", content: message });
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: GROQ_MAP[modelId] ?? "llama-3.3-70b-versatile", messages: groqHistory.slice(-20), temperature: 0.85, max_tokens: 1500 }),
      signal: timeoutSignal(20000),
    });
    if (!res.ok) {
      if (res.status === 401) return "🔑 Groq key invalid!";
      return `❌ Groq error ${res.status}`;
    }
    const data = await res.json() as any;
    const reply = data.choices?.[0]?.message?.content ?? "";
    groqHistory.push({ role: "assistant", content: reply });
    return reply;
  } catch (e: any) { return `❌ Groq error: ${e.message?.slice(0, 80)}`; }
}

// ─── DEEPSEEK ─────────────────────────────────────────
const deepseekHistory: { role: "user" | "assistant" | "system"; content: string }[] = [
  { role: "system", content: MA_SYSTEM_PROMPT },
];

async function askDeepSeek(message: string, modelId: AIModel): Promise<string> {
  try {
    const key = await AsyncStorage.getItem("deepseek_api_key");
    if (!key) return "⚙️ DeepSeek API key chahiye — Admin Panel mein set karo!";
    deepseekHistory.push({ role: "user", content: message });
    const model = modelId === "deepseek-coder" ? "deepseek-coder" : "deepseek-chat";
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: deepseekHistory.slice(-20), temperature: 0.85, max_tokens: 1500 }),
      signal: timeoutSignal(30000),
    });
    if (!res.ok) return `❌ DeepSeek error ${res.status}`;
    const data = await res.json() as any;
    const reply = data.choices?.[0]?.message?.content ?? "";
    deepseekHistory.push({ role: "assistant", content: reply });
    return reply;
  } catch (e: any) { return `❌ DeepSeek error: ${e.message?.slice(0, 80)}`; }
}

// ─── MISTRAL ──────────────────────────────────────────
const mistralHistory: { role: "user" | "assistant" | "system"; content: string }[] = [
  { role: "system", content: MA_SYSTEM_PROMPT },
];

async function askMistral(message: string, modelId: AIModel): Promise<string> {
  try {
    const key = await AsyncStorage.getItem("mistral_api_key");
    if (!key) return "⚙️ Mistral API key chahiye — Admin Panel mein set karo!";
    mistralHistory.push({ role: "user", content: message });
    const model = modelId === "mistral-large" ? "mistral-large-latest" : "mistral-small-latest";
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: mistralHistory.slice(-20), temperature: 0.85, max_tokens: 1500 }),
      signal: timeoutSignal(30000),
    });
    if (!res.ok) return `❌ Mistral error ${res.status}`;
    const data = await res.json() as any;
    const reply = data.choices?.[0]?.message?.content ?? "";
    mistralHistory.push({ role: "assistant", content: reply });
    return reply;
  } catch (e: any) { return `❌ Mistral error: ${e.message?.slice(0, 80)}`; }
}

// ─── COHERE ───────────────────────────────────────────
async function askCohere(message: string): Promise<string> {
  try {
    const key = await AsyncStorage.getItem("cohere_api_key");
    if (!key) return "⚙️ Cohere API key chahiye — Admin Panel mein set karo!";
    const res = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "command-r-plus-08-2024", messages: [{ role: "user", content: `${MA_SYSTEM_PROMPT}\n\nUser: ${message}` }] }),
      signal: timeoutSignal(30000),
    });
    if (!res.ok) return `❌ Cohere error ${res.status}`;
    const data = await res.json() as any;
    return data.message?.content?.[0]?.text ?? data.text ?? "";
  } catch (e: any) { return `❌ Cohere error: ${e.message?.slice(0, 80)}`; }
}

// ─── PERPLEXITY ───────────────────────────────────────
async function askPerplexity(message: string, modelId: AIModel): Promise<string> {
  try {
    const key = await AsyncStorage.getItem("perplexity_api_key");
    if (!key) return "⚙️ Perplexity API key chahiye — Admin Panel mein set karo!";
    const model = modelId === "perplexity-sonar-pro" ? "sonar-pro" : "sonar";
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: MA_SYSTEM_PROMPT }, { role: "user", content: message }], max_tokens: 1500 }),
      signal: timeoutSignal(30000),
    });
    if (!res.ok) return `❌ Perplexity error ${res.status}`;
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content ?? "";
  } catch (e: any) { return `❌ Perplexity error: ${e.message?.slice(0, 80)}`; }
}

// ─── TITAN COMBINED ───────────────────────────────────
async function askTitan(message: string): Promise<string> {
  const checks = await Promise.all([
    AsyncStorage.getItem("gemini_api_key"),
    AsyncStorage.getItem("openai_api_key"),
    AsyncStorage.getItem("anthropic_api_key"),
    AsyncStorage.getItem("groq_api_key"),
    AsyncStorage.getItem("deepseek_api_key"),
  ]);
  const [gemini, openai, anthropic, groq, deepseek] = checks;
  if (gemini) return askGemini(message, "gemini-1.5-pro");
  if (openai) return askOpenAI(message, "gpt-4o");
  if (anthropic) return askClaude(message, "claude-3-5-sonnet");
  if (groq) return askGroq(message, "groq-llama-3.3-70b");
  if (deepseek) return askDeepSeek(message, "deepseek-chat");
  return "⚙️ Koi bhi AI key set nahi hai! Admin Panel → API Keys mein koi bhi ek key set karo. Groq bilkul FREE hai! → console.groq.com";
}

// ─── MAIN ROUTER ──────────────────────────────────────
export async function askAI(message: string, model: AIModel = "titan"): Promise<string> {
  if (model === "titan") return askTitan(message);
  if (model.startsWith("gemini")) return askGemini(message, model);
  if (model.startsWith("gpt")) return askOpenAI(message, model);
  if (model.startsWith("claude")) return askClaude(message, model);
  if (model.startsWith("groq")) return askGroq(message, model);
  if (model.startsWith("deepseek")) return askDeepSeek(message, model);
  if (model.startsWith("mistral")) return askMistral(message, model);
  if (model === "cohere-command-r-plus") return askCohere(message);
  if (model.startsWith("perplexity")) return askPerplexity(message, model);
  return askTitan(message);
}

export function resetAllAIChats(): void {
  Object.keys(geminiSessions).forEach(k => delete (geminiSessions as any)[k]);
  geminiKeyCache = "";
  gptHistory.splice(1);
  claudeHistory.splice(0);
  groqHistory.splice(1);
  deepseekHistory.splice(1);
  mistralHistory.splice(1);
}

export async function getAvailableModels(): Promise<AIModelInfo[]> {
  const keys = await AsyncStorage.multiGet([
    "gemini_api_key", "openai_api_key", "anthropic_api_key",
    "groq_api_key", "deepseek_api_key", "mistral_api_key",
    "cohere_api_key", "perplexity_api_key",
  ]);
  const keyMap: Record<string, boolean> = {};
  keys.forEach(([k, v]) => { keyMap[k] = !!v; });

  return ALL_AI_MODELS.filter(m => {
    if (m.id === "titan") return Object.values(keyMap).some(Boolean);
    return keyMap[m.apiKeyField] || m.free;
  });
}

// (AIModelInfo is already exported above)
