/**
 * TITAN RECRUITMENT BOT
 * Gemini-powered auto job posting on all industrial platforms
 * Posts every 12 hours: IndiaMART, WhatsApp groups, JustDial, TradeIndia
 * Firebase sync for tracking applications
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebase";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { sendToLily } from "./gemini";

export interface JobPost {
  id?: string;
  role: string;
  skills: string[];
  location: string;
  experience: string;
  salary: string;
  postContent: string;
  platform: string;
  postedAt: number;
  applications: number;
  active: boolean;
  whatsappSent: boolean;
}

export interface RecruitmentPlatform {
  name: string;
  icon: string;
  color: string;
  type: "api" | "whatsapp" | "share";
  active: boolean;
}

export const RECRUITMENT_PLATFORMS: RecruitmentPlatform[] = [
  { name: "WhatsApp Groups", icon: "message-circle", color: "#25D366", type: "whatsapp", active: true },
  { name: "IndiaMART Jobs", icon: "briefcase", color: "#1B75BB", type: "share", active: true },
  { name: "TradeIndia", icon: "globe", color: "#E8341B", type: "share", active: true },
  { name: "JustDial", icon: "phone", color: "#FF6B00", type: "share", active: true },
  { name: "NaukriGulf", icon: "user", color: "#4A90E2", type: "share", active: true },
  { name: "Telegram Groups", icon: "send", color: "#0088CC", type: "share", active: true },
];

export const JOB_ROLES = [
  { role: "Crane Operator", skills: ["EOT Crane", "Gantry Crane", "Wire Rope Hoist", "Safe Load Indicator"], exp: "2-5 years" },
  { role: "Rigger / Slinger", skills: ["Rigging", "Sling Hitches", "Load Calculation", "Safety Protocol"], exp: "1-3 years" },
  { role: "Erection Supervisor", skills: ["Steel Structure Erection", "Site Management", "QC", "Drawings Reading"], exp: "5-10 years" },
  { role: "Welder (MIG/TIG)", skills: ["MIG Welding", "TIG Welding", "SMAW", "Structural Steel"], exp: "2-5 years" },
  { role: "Electrical Engineer", skills: ["PLC Programming", "VVVF Drives", "Control Panels", "Electrical Wiring"], exp: "3-7 years" },
  { role: "Safety Officer", skills: ["HSE", "Risk Assessment", "PTW System", "Incident Investigation"], exp: "3-6 years" },
  { role: "Site Engineer (Civil)", skills: ["Foundation Design", "RCC", "AutoCAD", "Site Supervision"], exp: "2-5 years" },
  { role: "Chimney Erection Specialist", skills: ["RCC Chimney", "Steel Chimney", "High-rise Work", "Industrial Chimneys"], exp: "3-7 years" },
];

const HUNT_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
let recruitTimer: ReturnType<typeof setInterval> | null = null;

export async function startRecruitmentBot(): Promise<void> {
  if (recruitTimer) return;
  const enabled = await AsyncStorage.getItem("recruitment_bot_enabled");
  if (enabled !== "true") return;
  await runRecruitmentCycle();
  recruitTimer = setInterval(() => runRecruitmentCycle(), HUNT_INTERVAL_MS);
}

export function stopRecruitmentBot(): void {
  if (recruitTimer) { clearInterval(recruitTimer); recruitTimer = null; }
}

async function runRecruitmentCycle(): Promise<void> {
  try {
    const activeRoles = await AsyncStorage.getItem("recruitment_active_roles");
    const roles: string[] = activeRoles ? JSON.parse(activeRoles) : [JOB_ROLES[0].role];

    for (const roleName of roles.slice(0, 3)) {
      const roleData = JOB_ROLES.find(r => r.role === roleName) ?? JOB_ROLES[0];
      const post = await generateJobPost(roleData);
      if (post) {
        await saveJobPostToFirebase(post);
      }
    }
    await AsyncStorage.setItem("last_recruitment_run", Date.now().toString());
  } catch {}
}

export async function generateJobPost(
  roleData: typeof JOB_ROLES[0],
  customLocation?: string
): Promise<JobPost | null> {
  try {
    const location = customLocation ?? (await AsyncStorage.getItem("recruitment_location")) ?? "Pan India";
    const salary = await AsyncStorage.getItem("recruitment_salary") ?? "As per industry standards + incentives";

    const prompt = `You are MA Engineering HR Manager. Generate a WhatsApp job posting for:

Role: ${roleData.role}
Company: MA Engineering (15+ years, 200+ projects, EOT Cranes & Industrial structures)
Location: ${location}
Experience: ${roleData.exp}
Key Skills: ${roleData.skills.join(", ")}
Salary: ${salary}

Write in Hinglish (Hindi + English mix). Format:
- Start with "🔥 HIRING ALERT! 🔥"
- Company intro (1 line)
- Role & requirements
- Benefits (PF, ESI, food, accommodation for site jobs)
- How to apply: WhatsApp +917895643069
- End with hashtags: #Hiring #CraneOperator #MAEngineering #Jobs #Industrial

Keep it under 200 words. WhatsApp-friendly format with emojis.`;

    const content = await sendToLily(prompt);

    return {
      role: roleData.role,
      skills: roleData.skills,
      location,
      experience: roleData.exp,
      salary,
      postContent: content,
      platform: "Auto-Generated",
      postedAt: Date.now(),
      applications: 0,
      active: true,
      whatsappSent: false,
    };
  } catch {
    return null;
  }
}

export async function saveJobPostToFirebase(post: JobPost): Promise<string> {
  const ref = await addDoc(collection(db, "job_posts"), {
    ...post,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getJobPostsFromFirebase(): Promise<(JobPost & { id: string })[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "job_posts"), orderBy("postedAt", "desc"), limit(20))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPost & { id: string }));
  } catch { return []; }
}

export async function updateJobPostApplications(id: string, count: number): Promise<void> {
  await updateDoc(doc(db, "job_posts", id), { applications: count });
}

export async function getLastRecruitmentRun(): Promise<string> {
  try {
    const last = await AsyncStorage.getItem("last_recruitment_run");
    if (!last) return "Kabhi nahi";
    const diff = Date.now() - parseInt(last);
    if (diff < 60000) return "Abhi";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min pehle`;
    return `${Math.floor(diff / 3600000)} ghante pehle`;
  } catch { return "Unknown"; }
}

export async function generateMultiPlatformPost(post: JobPost): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  results["WhatsApp"] = post.postContent;

  try {
    const linkedIn = await sendToLily(
      `Rewrite this job post for LinkedIn (professional English, under 150 words):\n\n${post.postContent}`
    );
    results["LinkedIn"] = linkedIn;
  } catch {}

  try {
    const shortPost = await sendToLily(
      `Make a very short 2-line SMS/Telegram version of this job post:\n\n${post.postContent}`
    );
    results["Telegram/SMS"] = shortPost;
  } catch {}

  return results;
}
