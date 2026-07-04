/**
 * TITAN AUTO-HEAL SYSTEM
 * Automatically detects, reports, and recovers from errors.
 * Crash reports go to Firebase Crashlytics (native) — visible in the
 * Firebase Console → Crashlytics dashboard with device info, OS version,
 * and full stack trace — plus a Firestore 'error_logs' backup.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
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
  /** Device metadata — sent to both Crashlytics and Firestore */
  os?: string;
  osVersion?: string | number;
}

const APP_VERSION = "3.2.0";
const MAX_RETRY = 3;
const RETRY_DELAY_MS = 2000;
const MAX_QUEUE_LENGTH = 50;

// ---------------------------------------------------------------------------
// Safe Crashlytics wrapper
// @react-native-firebase/crashlytics is a native module — it won't be
// available in Expo Go or web, so every call is wrapped in try/catch.
// ---------------------------------------------------------------------------
type CrashlyticsInstance = {
  recordError: (err: Error) => void;
  setAttributes: (attrs: Record<string, string>) => void;
  setUserId: (id: string) => void;
  log: (msg: string) => void;
};

let _crashlytics: CrashlyticsInstance | null = null;
let _clLoaded = false;

async function getCrashlytics(): Promise<CrashlyticsInstance | null> {
  if (_clLoaded) return _crashlytics;
  _clLoaded = true;
  try {
    // Dynamic import keeps it off the critical startup path so a missing
    // native module never blocks the splash screen.
    const mod = await import("@react-native-firebase/crashlytics");
    const instance = mod.default ? mod.default() : null;
    if (instance) {
      // Tag every session with app version + platform so Crashlytics
      // dashboard filters work without opening individual reports.
      instance.setAttributes({
        appVersion: APP_VERSION,
        platform: Platform.OS,
        osVersion: String(Platform.Version),
      });
      instance.setUserId("admin"); // single-user app
    }
    _crashlytics = instance;
  } catch {
    _crashlytics = null;
  }
  return _crashlytics;
}

// ---------------------------------------------------------------------------
// Internal: send one error report to Crashlytics + Firestore
// ---------------------------------------------------------------------------
async function reportError(error: ErrorReport): Promise<void> {
  const os = Platform.OS;
  const osVersion = Platform.Version;

  // 1. Crashlytics — appears in Firebase Console → Crashlytics as a
  //    non-fatal with device model, OS, app version, and full stack.
  try {
    const cl = await getCrashlytics();
    if (cl) {
      cl.setAttributes({
        context: error.context.slice(0, 128),
        appVersion: error.appVersion,
        healed: String(error.healed),
        os,
        osVersion: String(osVersion),
        ...(error.healAction ? { healAction: error.healAction } : {}),
      });
      const err = new Error(error.message);
      if (error.stack) err.stack = error.stack;
      cl.recordError(err);
    }
  } catch {} // Never let the reporter itself crash

  // 2. Firestore — keeps a searchable history in error_logs collection
  try {
    await addDoc(collection(db, "error_logs"), {
      ...error,
      os,
      osVersion,
      reportedAt: serverTimestamp(),
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// Public: retry wrapper with exponential back-off
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Public: safe Firebase sync — queue and retry failed operations
// ---------------------------------------------------------------------------
const pendingQueue: { fn: () => Promise<void>; context: string; attempts: number }[] = [];
let healTimer: ReturnType<typeof setInterval> | null = null;

export async function safeSyncToFirebase(
  fn: () => Promise<void>,
  context: string
): Promise<void> {
  try {
    await fn();
  } catch {
    // Cap the queue so a persistently failing sync never grows unbounded
    if (pendingQueue.length >= MAX_QUEUE_LENGTH) {
      const dropped = pendingQueue.shift();
      if (dropped) {
        await reportError({
          message: "Sync queue full — dropped oldest pending item",
          context: dropped.context,
          timestamp: Date.now(),
          appVersion: APP_VERSION,
          healed: false,
        });
      }
    }
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
    if (!item) {
      clearInterval(healTimer!);
      healTimer = null;
      return;
    }
    try {
      await item.fn();
      pendingQueue.shift();
    } catch {
      item.attempts++;
      if (item.attempts >= MAX_RETRY) {
        pendingQueue.shift();
        await reportError({
          message: "Sync failed after " + MAX_RETRY + " attempts",
          context: item.context,
          timestamp: Date.now(),
          appVersion: APP_VERSION,
          healed: false,
        });
      }
    }
  }, 5000);
}

// ---------------------------------------------------------------------------
// Public: crash reporter — called from ErrorBoundary and safeRun
// Sends to Crashlytics (native dashboard) + Firestore + local backup.
// ---------------------------------------------------------------------------
export async function reportCrash(error: Error, context: string): Promise<void> {
  try {
    // Crashlytics gets the real Error object so it shows a proper
    // symbolicated stack trace, grouped by crash signature.
    const cl = await getCrashlytics();
    if (cl) {
      cl.log("[TITAN] crash in: " + context.slice(0, 128));
      cl.setAttributes({
        context: context.slice(0, 128),
        appVersion: APP_VERSION,
        platform: Platform.OS,
        osVersion: String(Platform.Version),
      });
      cl.recordError(error);
    }
  } catch {}

  // Firestore + local backup (keeps working even if Crashlytics is offline)
  try {
    await reportError({
      message: error.message,
      stack: error.stack?.slice(0, 500),
      context,
      timestamp: Date.now(),
      appVersion: APP_VERSION,
      healed: false,
    });
    const logs = JSON.parse((await AsyncStorage.getItem("crash_logs")) ?? "[]");
    logs.unshift({
      message: error.message,
      context,
      os: Platform.OS,
      osVersion: Platform.Version,
      ts: Date.now(),
    });
    await AsyncStorage.setItem("crash_logs", JSON.stringify(logs.slice(0, 10)));
  } catch {}
}

// ---------------------------------------------------------------------------
// Network check
// ---------------------------------------------------------------------------
export async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch("https://www.google.com", {
      method: "HEAD",
      signal: timeoutSignal(5000),
    });
    return res.ok;
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Storage healer — cleans corrupted AsyncStorage keys
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Auto-diagnostics
// ---------------------------------------------------------------------------
export interface DiagnosticResult {
  issue: string;
  status: "ok" | "warning" | "error";
  fix?: string;
  fixed?: boolean;
}

export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  const geminiKey = await AsyncStorage.getItem("gemini_api_key");
  if (!geminiKey || geminiKey.length < 10) {
    results.push({ issue: "Gemini API Key missing", status: "warning", fix: "Admin Panel → Gemini API Key set karo" });
  } else {
    results.push({ issue: "Gemini API Key", status: "ok" });
  }

  const elKey = await AsyncStorage.getItem("elevenlabs_api_key");
  results.push({
    issue: "ElevenLabs Voice Key",
    status: elKey ? "ok" : "warning",
    fix: elKey ? undefined : "Admin Panel → ElevenLabs key set karo (optional)",
  });

  const imGlid = await AsyncStorage.getItem("indiamart_glid");
  const imKey = await AsyncStorage.getItem("indiamart_key");
  results.push({ issue: "IndiaMART GLID", status: imGlid ? "ok" : "warning", fix: imGlid ? undefined : "Leads Tab → IndiaMART setup karo" });
  results.push({ issue: "IndiaMART Key", status: imKey ? "ok" : "warning", fix: imKey ? undefined : "Leads Tab → IndiaMART Key set karo" });

  // Crashlytics status
  const cl = await getCrashlytics();
  results.push({
    issue: "Firebase Crashlytics",
    status: cl ? "ok" : "warning",
    fix: cl ? undefined : "Native module not available — crash reports go to Firestore only",
  });

  const online = await isOnline();
  results.push({ issue: "Internet Connection", status: online ? "ok" : "error", fix: online ? undefined : "Internet check karo" });

  await healStorage();
  results.push({ issue: "Storage Health", status: "ok", fixed: true });

  return results;
}
