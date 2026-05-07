/**
 * AUTO LEAD BOT
 * Automatically hunts for clients every few hours
 * Sources: IndiaMART, Manual, WhatsApp inquiries
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const HUNT_INTERVAL_MS = 3 * 60 * 60 * 1000; // every 3 hours
let huntTimer: ReturnType<typeof setInterval> | null = null;

export interface LeadHuntResult {
  found: number;
  source: string;
  error?: string;
}

export async function startLeadHunting(serverUrl: string): Promise<void> {
  if (!serverUrl || huntTimer) return;

  // Run immediately first time
  await runLeadHunt(serverUrl);

  // Then schedule every 3 hours
  huntTimer = setInterval(() => runLeadHunt(serverUrl), HUNT_INTERVAL_MS);
}

export function stopLeadHunting(): void {
  if (huntTimer) {
    clearInterval(huntTimer);
    huntTimer = null;
  }
}

async function runLeadHunt(serverUrl: string): Promise<void> {
  try {
    const glid = await AsyncStorage.getItem("indiamart_glid");
    const key = await AsyncStorage.getItem("indiamart_key");

    if (glid && key) {
      await fetch(
        `${serverUrl}/api/leads/indiamart?glid=${encodeURIComponent(glid)}&key=${encodeURIComponent(key)}`,
        { signal: AbortSignal.timeout(20000) }
      );
    }

    await AsyncStorage.setItem("last_lead_hunt", Date.now().toString());
  } catch {}
}

export async function getLastHuntTime(): Promise<string> {
  try {
    const last = await AsyncStorage.getItem("last_lead_hunt");
    if (!last) return "Kabhi nahi";
    const diff = Date.now() - parseInt(last);
    if (diff < 60000) return "Abhi";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min pehle`;
    return `${Math.floor(diff / 3600000)} ghante pehle`;
  } catch {
    return "Unknown";
  }
}

export async function getTodayLeadCount(serverUrl: string): Promise<number> {
  try {
    const res = await fetch(`${serverUrl}/api/leads/stats`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return data.today ?? 0;
  } catch {
    return 0;
  }
}
