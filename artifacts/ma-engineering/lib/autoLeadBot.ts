/**
 * AUTO LEAD BOT — Server-independent
 * Calls IndiaMART directly from mobile
 * Saves leads directly to Firebase Firestore
 * Runs every 3 hours automatically
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveLeadToFirebase, FirebaseLead } from "./firebaseService";

const HUNT_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
let huntTimer: ReturnType<typeof setInterval> | null = null;

export async function startLeadHunting(_serverUrl?: string): Promise<void> {
  if (huntTimer) return;
  await runLeadHunt();
  huntTimer = setInterval(() => runLeadHunt(), HUNT_INTERVAL_MS);
}

export function stopLeadHunting(): void {
  if (huntTimer) { clearInterval(huntTimer); huntTimer = null; }
}

async function runLeadHunt(): Promise<void> {
  try {
    const glid = await AsyncStorage.getItem("indiamart_glid");
    const key = await AsyncStorage.getItem("indiamart_key");
    if (!glid || !key) return;

    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
        .toString().padStart(2, "0")}-${d.getFullYear()} 00:00:00`;

    const url =
      `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?` +
      `glusr_crm_key=${encodeURIComponent(key)}` +
      `&glusr_crm_glid=${encodeURIComponent(glid)}` +
      `&glusr_crm_start_time=${encodeURIComponent(fmt(start))}` +
      `&glusr_crm_end_time=${encodeURIComponent(fmt(now))}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const data = await res.json() as any;
    const inquiries = data.RESPONSE?.STATUS === 1 ? (data.RESPONSE?.RESULTS ?? []) : [];

    for (const inq of inquiries) {
      const lead: FirebaseLead = {
        id: `im_${inq.UNIQUE_QUERY_ID ?? Date.now()}`,
        source: "IndiaMART",
        name: inq.SENDER_NAME ?? "Unknown",
        phone: inq.SENDER_MOBILE ?? inq.SENDER_PHONE ?? "",
        email: inq.SENDER_EMAIL ?? "",
        message: inq.QUERY_MESSAGE ?? inq.SUBJECT ?? "Product inquiry",
        product: inq.QUERY_PRODUCT_NAME ?? "",
        location: inq.SENDER_CITY ?? "",
        timestamp: new Date(inq.QUERY_TIME ?? Date.now()).getTime(),
        replied: false,
      };
      await saveLeadToFirebase(lead).catch(() => {});
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
  } catch { return "Unknown"; }
}

export async function getTodayLeadCount(): Promise<number> {
  try {
    const { getLeadStatsFromFirebase } = await import("./firebaseService");
    const stats = await getLeadStatsFromFirebase();
    return stats.today;
  } catch { return 0; }
}
