import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

const LAST_RUN_KEY = "last_recruit_run_ts";
const MIN_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const JOB_POSTS = [
  { title: "Crane Operator", skills: "Overhead crane, EOT crane, safety", location: "Pan India" },
  { title: "Rigger Helper", skills: "Lifting, rigging, site work", location: "Pan India" },
  { title: "Site Supervisor", skills: "Industrial erection, team management", location: "Pan India" },
  { title: "Chimney Erector", skills: "Industrial chimney, height work, welding", location: "Pan India" },
];

export async function getLastRecruitmentRun(): Promise<string> {
  try {
    const ts = await AsyncStorage.getItem(LAST_RUN_KEY);
    if (!ts) return "Never";
    return new Date(parseInt(ts, 10)).toLocaleString("en-IN");
  } catch { return "Unknown"; }
}

async function postJobToFirebase(job: typeof JOB_POSTS[0]): Promise<void> {
  try {
    const q = query(
      collection(db, "job_postings"),
      where("title", "==", job.title),
      where("status", "==", "active")
    );
    const existing = await getDocs(q);
    if (!existing.empty) return;
    await addDoc(collection(db, "job_postings"), {
      ...job, status: "active",
      company: "MA Engineering",
      postedAt: Timestamp.now(),
      applications: 0,
    });
  } catch { /* silent */ }
}

export async function startRecruitmentBot(): Promise<void> {
  try {
    const lastRun = await AsyncStorage.getItem(LAST_RUN_KEY).catch(() => null);
    if (lastRun && Date.now() - parseInt(lastRun, 10) < MIN_INTERVAL) return;
    await AsyncStorage.setItem(LAST_RUN_KEY, Date.now().toString()).catch(() => {});
    for (const job of JOB_POSTS) {
      await postJobToFirebase(job);
    }
  } catch { /* silent — don't crash app */ }
}
