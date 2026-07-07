import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSecureItem } from "@/lib/security";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

export interface JobRole {
  role: string;
  exp: string;
  skills: string[];
}

export interface RecruitmentPlatform {
  name: string;
  icon: string;
  color: string;
}

export interface JobPost {
  role: string;
  exp: string;
  skills: string[];
  location: string;
  salary: string;
  postContent: string;
  createdAt: number;
  // saved in Firebase (kept optional to handle old docs)
  postedAt?: any;
  active?: boolean;
  applications?: number;
}

export const JOB_ROLES: JobRole[] = [
  { role: "Crane Operator", exp: "2+ yrs", skills: ["EOT/Overhead operation", "Safety", "Basic maintenance"] },
  { role: "Rigger / Helper", exp: "1+ yr", skills: ["Rigging", "Lifting tools", "Site work", "Safety"] },
  { role: "Site Supervisor", exp: "3+ yrs", skills: ["Industrial erection", "Team handling", "Safety compliance"] },
  { role: "Chimney Erector", exp: "2+ yrs", skills: ["Height work", "Welding", "Safety"] },
];

export const RECRUITMENT_PLATFORMS: RecruitmentPlatform[] = [
  { name: "LinkedIn", icon: "linkedin", color: "#0A66C2" },
  { name: "WhatsApp", icon: "message-circle", color: "#25D366" },
  { name: "Facebook", icon: "facebook", color: "#1877F2" },
  { name: "Instagram", icon: "instagram", color: "#E1306C" },
];

const LAST_RUN_KEY = "last_recruit_run_ts";
// UI text says 12 hours
const MIN_INTERVAL = 12 * 60 * 60 * 1000;

export async function getLastRecruitmentRun(): Promise<string> {
  try {
    const ts = await AsyncStorage.getItem(LAST_RUN_KEY);
    if (!ts) return "Kabhi nahi";
    return new Date(parseInt(ts, 10)).toLocaleString("en-IN");
  } catch {
    return "Unknown";
  }
}

export async function generateJobPost(roleData: JobRole, location: string): Promise<JobPost> {
  const salary = (await AsyncStorage.getItem("recruitment_salary").catch(() => null)) ?? "As per industry standards + PF/ESI";
  const cleanLocation = location?.trim() || "Pan India";

  // If Gemini key missing, fallback to a safe template (no crash)
  const apiKey = await getSecureItem("gemini_api_key").catch(() => null);
  if (!apiKey) {
    const postContent =
      `📢 *MA Engineering Hiring* 🔥\n\n` +
      `*Role:* ${roleData.role}\n` +
      `*Experience:* ${roleData.exp}\n` +
      `*Location:* ${cleanLocation}\n` +
      `*Skills:* ${roleData.skills.join(", ")}\n` +
      `*Salary:* ${salary}\n\n` +
      `Contact MA Engineering for details!\n` +
      `#Hiring #MAEngineering`;
    const now = Date.now();
    return { ...roleData, location: cleanLocation, salary, postContent, createdAt: now, postedAt: now, active: true, applications: 0 };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt =
    `You are a recruitment manager for MA Engineering (industrial cranes + chimneys company in India). ` +
    `Write ONE professional hiring post in Hinglish for WhatsApp/LinkedIn.\n\n` +
    `Role: ${roleData.role}\nExperience: ${roleData.exp}\nSkills: ${roleData.skills.join(", ")}\nLocation: ${cleanLocation}\nSalary/Benefits: ${salary}\n\n` +
    `Must include:\n- short hook line\n- bullet points for responsibilities + requirements\n- location + salary/benefits\n- CTA: "Contact MA Engineering for details! Apply via WhatsApp"\n- 5 relevant hashtags\n` +
    `Keep it crisp (max 1200 chars).`;

  const result = await model.generateContent(prompt);
  const postContent = result.response.text();
  const now = Date.now();
  return { ...roleData, location: cleanLocation, salary, postContent, createdAt: now, postedAt: now, active: true, applications: 0 };
}

export async function saveJobPostToFirebase(post: JobPost): Promise<string> {
  if (!db) throw new Error("Firebase not ready");
  const ref = await addDoc(collection(db, "job_postings"), {
    ...post,
    status: "active",
    company: "MA Engineering",
    postedAt: post.postedAt ?? Date.now(),
    active: post.active ?? true,
    applications: post.applications ?? 0,
  });
  return ref.id;
}

export async function getJobPostsFromFirebase(): Promise<(JobPost & { id: string })[]> {
  try {
    if (!db) return [];
    const q = query(collection(db, "job_postings"), orderBy("postedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any;
  } catch {
    return [];
  }
}

export async function startRecruitmentBot(): Promise<void> {
  try {
    const enabled = (await AsyncStorage.getItem("recruitment_bot_enabled").catch(() => null)) === "true";
    if (!enabled) return;

    const lastRun = await AsyncStorage.getItem(LAST_RUN_KEY).catch(() => null);
    if (lastRun && Date.now() - parseInt(lastRun, 10) < MIN_INTERVAL) return;
    await AsyncStorage.setItem(LAST_RUN_KEY, Date.now().toString()).catch(() => {});

    const location = (await AsyncStorage.getItem("recruitment_location").catch(() => null)) ?? "Pan India";
    let roles: string[] = [];
    try {
      roles = JSON.parse((await AsyncStorage.getItem("recruitment_active_roles")) ?? "[]");
    } catch {
      roles = [];
    }
    const selected = roles.length ? roles : [JOB_ROLES[0]!.role];

    // Generate a few posts per run to keep it light
    for (const roleName of selected.slice(0, 3)) {
      const roleData = JOB_ROLES.find((r) => r.role === roleName) ?? JOB_ROLES[0]!;
      const post = await generateJobPost(roleData, location);
      await saveJobPostToFirebase(post);
    }
  } catch {
    // silent — never crash app
  }
}

export function stopRecruitmentBot(): void {
  // Currently bot is "run-on-demand" (no background interval in app runtime).
  // Keeping this export to satisfy UI + avoid crashes.
}
