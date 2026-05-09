/**
 * TITAN SECURITY MODULE
 * PIN lock, session management, brute-force protection, data encryption
 * Keeps the app safe from unauthorized access
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";

const PIN_KEY = "titan_pin_hash";
const FAILED_ATTEMPTS_KEY = "titan_failed_attempts";
const LOCKOUT_UNTIL_KEY = "titan_lockout_until";
const LAST_ACTIVE_KEY = "titan_last_active";
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 min after 5 wrong PINs

// Simple but effective hash (no native deps needed)
function hashPin(pin: string): string {
  const salt = "MA_TITAN_SALT_2025";
  const str = pin + salt;
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0") + "_" + str.length.toString(36);
}

export async function setPIN(pin: string): Promise<void> {
  if (pin.length < 4) throw new Error("PIN must be at least 4 digits");
  const hashed = hashPin(pin);
  await AsyncStorage.setItem(PIN_KEY, hashed);
  await AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY);
  await AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY);
}

export async function hasPIN(): Promise<boolean> {
  const p = await AsyncStorage.getItem(PIN_KEY);
  return !!p;
}

export async function removePIN(): Promise<void> {
  await AsyncStorage.multiRemove([PIN_KEY, FAILED_ATTEMPTS_KEY, LOCKOUT_UNTIL_KEY]);
}

export interface PINVerifyResult {
  success: boolean;
  locked?: boolean;
  lockoutMinutes?: number;
  attemptsLeft?: number;
  error?: string;
}

export async function verifyPIN(pin: string): Promise<PINVerifyResult> {
  try {
    // Check lockout
    const lockoutUntil = await AsyncStorage.getItem(LOCKOUT_UNTIL_KEY);
    if (lockoutUntil) {
      const remaining = parseInt(lockoutUntil) - Date.now();
      if (remaining > 0) {
        return {
          success: false,
          locked: true,
          lockoutMinutes: Math.ceil(remaining / 60000),
          error: `App locked. ${Math.ceil(remaining / 60000)} min baad try karo.`,
        };
      }
      await AsyncStorage.removeItem(LOCKOUT_UNTIL_KEY);
      await AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY);
    }

    const stored = await AsyncStorage.getItem(PIN_KEY);
    if (!stored) return { success: true }; // No PIN set

    const hashed = hashPin(pin);
    if (hashed === stored) {
      await AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY);
      await updateLastActive();
      return { success: true };
    }

    // Wrong PIN — increment attempts
    const attemptsStr = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
    const attempts = parseInt(attemptsStr ?? "0") + 1;
    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      await AsyncStorage.setItem(LOCKOUT_UNTIL_KEY, lockUntil.toString());
      return {
        success: false,
        locked: true,
        lockoutMinutes: 30,
        error: `Zyada galat attempts! App 30 min ke liye lock ho gayi.`,
      };
    }

    return {
      success: false,
      attemptsLeft: MAX_ATTEMPTS - attempts,
      error: `Galat PIN! ${MAX_ATTEMPTS - attempts} attempts baaki hain.`,
    };
  } catch {
    return { success: false, error: "Security check failed" };
  }
}

export async function updateLastActive(): Promise<void> {
  await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
}

export async function isSessionExpired(): Promise<boolean> {
  try {
    const hasPinSet = await hasPIN();
    if (!hasPinSet) return false;
    const last = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
    if (!last) return true;
    return Date.now() - parseInt(last) > SESSION_TIMEOUT_MS;
  } catch { return false; }
}

function bytesToBase64(bytes: number[]): string {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i] ?? 0;
    const b2 = bytes[i + 1] ?? 0;
    const b3 = bytes[i + 2] ?? 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    out += base64Chars[(triplet >> 18) & 63];
    out += base64Chars[(triplet >> 12) & 63];
    out += i + 1 < bytes.length ? base64Chars[(triplet >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? base64Chars[triplet & 63] : "=";
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/[^A-Za-z0-9+/=]/g, "");
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup: Record<string, number> = {};
  for (let i = 0; i < base64Chars.length; i++) lookup[base64Chars[i]!] = i;

  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    const c1 = cleaned[i]!;
    const c2 = cleaned[i + 1]!;
    const c3 = cleaned[i + 2]!;
    const c4 = cleaned[i + 3]!;

    const n1 = lookup[c1] ?? 0;
    const n2 = lookup[c2] ?? 0;
    const n3 = c3 === "=" ? 0 : (lookup[c3] ?? 0);
    const n4 = c4 === "=" ? 0 : (lookup[c4] ?? 0);

    const triplet = (n1 << 18) | (n2 << 12) | (n3 << 6) | n4;
    bytes.push((triplet >> 16) & 255);
    if (c3 !== "=") bytes.push((triplet >> 8) & 255);
    if (c4 !== "=") bytes.push(triplet & 255);
  }
  return new Uint8Array(bytes);
}

// Encrypt sensitive value (simple XOR + base64 — enough for local storage)
export function encryptValue(value: string, key = "TITAN_LOCAL_KEY"): string {
  try {
    const keyBytes = Array.from(key).map(c => c.charCodeAt(0));
    const encrypted = Array.from(value).map((c, i) =>
      c.charCodeAt(0) ^ keyBytes[i % keyBytes.length]
    );
    return bytesToBase64(encrypted);
  } catch { return value; }
}

export function decryptValue(encrypted: string, key = "TITAN_LOCAL_KEY"): string {
  try {
    const keyBytes = Array.from(key).map(c => c.charCodeAt(0));
    const bytes = base64ToBytes(encrypted);
    return Array.from(bytes).map((b, i) =>
      String.fromCharCode(b ^ keyBytes[i % keyBytes.length])
    ).join("");
  } catch { return encrypted; }
}

export async function setSecureItem(storageKey: string, value: string): Promise<void> {
  await AsyncStorage.setItem(storageKey, encryptValue(value));
}

export async function getSecureItem(storageKey: string): Promise<string | null> {
  const val = await AsyncStorage.getItem(storageKey);
  if (!val) return null;
  return decryptValue(val);
}

// Setup AppState listener for auto-lock
let appStateSub: any = null;
export function setupAutoLock(onLock: () => void): () => void {
  let bgTime: number | null = null;

  const handleChange = async (state: AppStateStatus) => {
    if (state === "background" || state === "inactive") {
      bgTime = Date.now();
    } else if (state === "active" && bgTime) {
      const elapsed = Date.now() - bgTime;
      if (elapsed > SESSION_TIMEOUT_MS) {
        const hasPinSet = await hasPIN();
        if (hasPinSet) onLock();
      }
      bgTime = null;
    }
  };

  appStateSub = AppState.addEventListener("change", handleChange);
  return () => appStateSub?.remove();
}

export async function getSecurityStatus(): Promise<{
  pinEnabled: boolean;
  locked: boolean;
  lockoutMinutes: number;
  failedAttempts: number;
}> {
  const pinEnabled = await hasPIN();
  const lockoutUntil = await AsyncStorage.getItem(LOCKOUT_UNTIL_KEY);
  const lockoutMs = lockoutUntil ? Math.max(0, parseInt(lockoutUntil) - Date.now()) : 0;
  const attempts = parseInt((await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY)) ?? "0");
  return {
    pinEnabled,
    locked: lockoutMs > 0,
    lockoutMinutes: Math.ceil(lockoutMs / 60000),
    failedAttempts: attempts,
  };
}
