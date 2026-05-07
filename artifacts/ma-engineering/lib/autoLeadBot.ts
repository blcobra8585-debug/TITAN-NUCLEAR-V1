import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

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

async function fetchIndiaMART(query_str: string, token: string): Promise<any[]> {
  const url = `https://mapi.indiamart.com/wservce/enquiry/listing/v2?glusr_usr_guid=${token}&app_version=33.0`;
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
    const lastHunt = await AsyncStorage.getItem(LAST_HUNT_KEY).catch(() => null);
    if (lastHunt && Date.now() - parseInt(lastHunt, 10) < MIN_INTERVAL) return;

    const token = await AsyncStorage.getItem("indiamart_token").catch(() => null);
    if (!token) return;

    await AsyncStorage.setItem(LAST_HUNT_KEY, Date.now().toString()).catch(() => {});

    const leads = await fetchIndiaMART("crane chimney", token);
    for (const lead of leads.slice(0, 50)) {
      await saveLead(lead);
    }
  } catch { /* silent — don't crash app */ }
}
