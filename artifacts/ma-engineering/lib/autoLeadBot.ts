import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db, firebaseReady } from "./firebase";

const LAST_HUNT_KEY = "last_lead_hunt_ts";
const MIN_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours minimum

export async function getLastHuntTime(): Promise<string> {
  try {
    const ts = await AsyncStorage.getItem(LAST_HUNT_KEY);
    if (!ts) return "Never";
    const d = new Date(parseInt(ts, 10));
    return d.toLocaleString("en-IN");
  } catch { return "Unknown"; }
}

async function fetchIndiaMART(query_str: string, glid: string, key: string): Promise<any[]> {
  // IndiaMART CRM API v2 — uses glid + key as auth params
  const url = `https://mapi.indiamart.com/wservce/enquiry/listing/v2?glusr_usr_guid=${glid}&app_version=33.0&key=${key}`;
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data?.RESPONSE?.LEADS ?? [];
}

async function saveLead(lead: any): Promise<void> {
  try {
    const phone = lead.SENDER_MOBILE || lead.SENDER_PHONE || "";
    const name = lead.SENDER_NAME || "Unknown";
    const message = lead.SUBJECT || lead.MESSAGE || "";
    const email = lead.SENDER_EMAIL || "";
    if (!phone && !name) return;
    const q = query(
      collection(db, "leads"),
      where("phone", "==", phone),
      where("source", "==", "indiamart")
    );
    const existing = await getDocs(q);
    if (!existing.empty) return;
    await addDoc(collection(db, "leads"), {
      name, phone, email, message,
      source: "indiamart",
      status: "new",
      createdAt: Timestamp.now(),
    });
  } catch { /* silent */ }
}

export async function startLeadHunting(): Promise<void> {
  try {
    // Guard: don't attempt Firestore writes during cold-start retry window
    if (!firebaseReady) return;

    const lastHunt = await AsyncStorage.getItem(LAST_HUNT_KEY).catch(() => null);
    if (lastHunt && Date.now() - parseInt(lastHunt, 10) < MIN_INTERVAL) return;

    // Fixed: read indiamart_glid + indiamart_key (matching Admin Panel keys)
    const glid = await AsyncStorage.getItem("indiamart_glid").catch(() => null);
    const key = await AsyncStorage.getItem("indiamart_key").catch(() => null);
    if (!glid || !key) return;

    // Mark hunt time BEFORE fetch so a crash/timeout doesn't re-fetch immediately
    await AsyncStorage.setItem(LAST_HUNT_KEY, Date.now().toString()).catch(() => {});

    const leads = await fetchIndiaMART("crane chimney", glid, key);
    for (const lead of leads.slice(0, 50)) {
      await saveLead(lead);
    }
  } catch { /* silent — don't crash app */ }
}
