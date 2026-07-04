/**
 * TITAN AUTO-HEAL SYSTEM
 * Automatically detects, reports, and recovers from errors.
 * Crash reports go to Firestore (error_logs collection) — visible in
 * Firebase Console with device info, OS version, and full stack trace.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
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
  // Device metadata
  os?: string;
  osVersion?: string | number;
  deviceBrand?: string;
  deviceModel?: string;
  rnVersion?: string;
}

const APP_VERSION = "3.2.0";
const MAX_RETRY = 3;
const RETRY_DELAY_MS = 2000;
const MAX_QUEUE_LENGTH = 50;

// ---------------------------------------------------------------------------
// Collect device info once (sync, no native module needed)
// ---------------------------------------------------------------------------
function getDeviceInfo(): Pick<ErrorReport, "os" | "osVersion" | "deviceBrand" | "deviceModel" | "rnVersion"> {
  try {
    const consts = Platform.constants as any;
    return {
      os: Platform.OS,
      osVersion: Platform.Version,
      deviceBrand: consts?.Brand ?? consts?.Manufacturer ?? "unknown",
      deviceModel: consts?.Model ?? "unknown",
      rnVersion: consts?.reactNativeVersion
        ? [consts.reactNativeVersion.major, consts.reactNativeVersion.minor, consts.reactNativeVersion.patch].join(".")
        : "unknown",
    };
  } catch {
    return { os: Platform.OS, osVersion: Platform.Version };
  }
}

// ---------------------------------------------------------------------------
// Internal: send one error report to Firestore (visible in Firebase Console
// → Firestore → error_logs collection, filterable by os/context/appVersion)
// ---------------------------------------------------------------------------
async function reportError(error: ErrorReport): Promise<void> {
  try {
    const device = getDeviceInfo();
    await addDoc(collection(db, "error_logs"), {
      ...error,
      ...device,
      expoVersion: Constants.expoVersion ?? null,
      reportedAt: serverTimestamp(),
    });
  } catch {} // Never let the reporter itself crash the app
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
    // Fix #5: cap the queue so a persistently failing sync can't grow
    // unbounded and leak memory — drop the oldest pending item to make room.
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
      pendingQueue.shift(); // success — remove
    } catch {
      item.attempts++;
      // Fix #5: guard against attempts somehow starting at/above MAX_RETRY
      if (item.attempts >= MAX_RETRY) {
        pendingQueue.shift(); // give up after max retries
        await reportError({
          message: "Sync failed after " + String(MAX_RETRY) + " attempts",
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
// Sends to Firestore error_logs with device info + full stack trace.
// Visible in: Firebase Console → Firestore → error_logs
// ---------------------------------------------------------------------------
export async function reportCrash(error: Error, context: string): Promise<void> {
  try {
    const device = getDeviceInfo();
    await reportError({
      message: error.message,
      stack: error.stack?.slice(0, 2000),
      context,
      timestamp: Date.now(),
      appVersion: APP_VERSION,
      healed: false,
      ...device,
    });
    // Local backup — last 10 crashes stored on device
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
    results.push({
      issue: "Gemini API Key missing",
      status: "warning",
      fix: "Admin Panel → Gemini API Key set karo",
    });
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

  // Crash reporter status
  const { os, osVersion, deviceBrand, deviceModel } = getDeviceInfo();
  results.push({
    issue: "Crash Reporter",
    status: "ok",
    fix: "Firebase Console → Firestore → error_logs mein dikhega",
  });

  results.push({
    issue: "Device Info",
    status: "ok",
    fix: [deviceBrand, deviceModel, os, String(osVersion)].filter(Boolean).join(" | "),
  });

  const online = await isOnline();
  results.push({
    issue: "Internet Connection",
    status: online ? "ok" : "error",
    fix: online ? undefined : "Internet check karo",
  });

  await healStorage();
  results.push({ issue: "Storage Health", status: "ok", fixed: true });

  return results;
}
