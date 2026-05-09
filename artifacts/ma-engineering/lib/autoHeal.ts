/**
 * TITAN AUTO-HEAL SYSTEM
 * Automatically detects, reports, and recovers from errors
 * Reports crashes to Firebase, retries failed operations
 * Self-healing data sync
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { timeoutSignal } from "@/lib/timeout";

export interface ErrorReport {
  message: string;
  stack?: string;
  context: string;
  timestamp: number;
  appVersion: string;
  healed: boolean;
  healAction?: string;
}

const APP_VERSION = "3.2.0";
const MAX_RETRY = 3;
const RETRY_DELAY_MS = 2000;

// Report error to Firebase silently
async function reportError(error: ErrorReport): Promise<void> {
  try {
    await addDoc(collection(db, "error_logs"), {
      ...error,
      reportedAt: serverTimestamp(),
    });
  } catch {} // Never throw from error reporter
}

// Retry a function with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxAttempts = MAX_RETRY
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }
  // Report after all retries failed
  await reportError({
    message: lastError?.message ?? "Unknown error",
    stack: lastError?.stack,
    context,
    timestamp: Date.now(),
    appVersion: APP_VERSION,
    healed: false,
  });
  throw lastError;
}

// Safe Firebase sync — queue failed ops and retry
const pendingQueue: { fn: () => Promise<void>; context: string; attempts: number }[] = [];
let healTimer: ReturnType<typeof setInterval> | null = null;

export async function safeSyncToFirebase(
  fn: () => Promise<void>,
  context: string
): Promise<void> {
  try {
    await fn();
  } catch {
    pendingQueue.push({ fn, context, attempts: 0 });
    startHealLoop();
  }
}

function startHealLoop(): void {
  if (healTimer) return;
  healTimer = setInterval(async () => {
    if (pendingQueue.length === 0) {
      clearInterval(healTimer!);
      healTimer = null;
      return;
    }
    const item = pendingQueue[0];
    try {
      await item.fn();
      pendingQueue.shift(); // success — remove
    } catch {
      item.attempts++;
      if (item.attempts >= MAX_RETRY) {
        pendingQueue.shift(); // give up after max retries
        await reportError({
          message: `Sync failed after ${MAX_RETRY} attempts`,
          context: item.context,
          timestamp: Date.now(),
          appVersion: APP_VERSION,
          healed: false,
        });
      }
    }
  }, 5000);
}

// Crash reporter for ErrorBoundary
export async function reportCrash(error: Error, context: string): Promise<void> {
  try {
    await reportError({
      message: error.message,
      stack: error.stack?.slice(0, 500),
      context,
      timestamp: Date.now(),
      appVersion: APP_VERSION,
      healed: false,
    });
    // Save locally as backup
    const logs = JSON.parse((await AsyncStorage.getItem("crash_logs")) ?? "[]");
    logs.unshift({ message: error.message, context, ts: Date.now() });
    await AsyncStorage.setItem("crash_logs", JSON.stringify(logs.slice(0, 10)));
  } catch {}
}

// Network connectivity check
export async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch("https://www.google.com", {
      method: "HEAD",
      signal: timeoutSignal(5000),
    });
    return res.ok;
  } catch { return false; }
}

// Self-healing AsyncStorage — validate and clean corrupted keys
export async function healStorage(): Promise<void> {
  try {
    const keysToValidate = [
      "gemini_api_key", "elevenlabs_api_key", "indiamart_glid",
      "indiamart_key", "titan_mode", "last_lead_hunt",
    ];
    for (const key of keysToValidate) {
      const val = await AsyncStorage.getItem(key);
      if (val === "undefined" || val === "null") {
        await AsyncStorage.removeItem(key);
      }
    }
  } catch {}
}

// Auto-diagnose and fix common issues
export interface DiagnosticResult {
  issue: string;
  status: "ok" | "warning" | "error";
  fix?: string;
  fixed?: boolean;
}

export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Check Gemini API key
  const geminiKey = await AsyncStorage.getItem("gemini_api_key");
  if (!geminiKey || geminiKey.length < 10) {
    results.push({
      issue: "Gemini API Key missing",
      status: "warning",
      fix: "Admin Panel → Gemini API Key set karo",
    });
  } else {
    results.push({ issue: "Gemini API Key", status: "ok" });
  }

  // Check ElevenLabs key
  const elKey = await AsyncStorage.getItem("elevenlabs_api_key");
  results.push({
    issue: "ElevenLabs Voice Key",
    status: elKey ? "ok" : "warning",
    fix: elKey ? undefined : "Admin Panel → ElevenLabs key set karo (optional)",
  });

  // Check IndiaMART credentials
  const imGlid = await AsyncStorage.getItem("indiamart_glid");
  const imKey = await AsyncStorage.getItem("indiamart_key");
  results.push({
    issue: "IndiaMART GLID",
    status: imGlid ? "ok" : "warning",
    fix: imGlid ? undefined : "Leads Tab → IndiaMART setup karo",
  });
  results.push({
    issue: "IndiaMART Key",
    status: imKey ? "ok" : "warning",
    fix: imKey ? undefined : "Leads Tab → IndiaMART Key set karo",
  });

  // Check network
  const online = await isOnline();
  results.push({
    issue: "Internet Connection",
    status: online ? "ok" : "error",
    fix: online ? undefined : "Internet check karo",
  });

  // Storage health
  await healStorage();
  results.push({ issue: "Storage Health", status: "ok", fixed: true });

  return results;
}
