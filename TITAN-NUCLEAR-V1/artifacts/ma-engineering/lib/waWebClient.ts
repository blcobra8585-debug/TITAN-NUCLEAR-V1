import AsyncStorage from "@react-native-async-storage/async-storage";
import { timeoutSignal } from "@/lib/timeout";

export type WAStatus = "disconnected" | "connecting" | "qr" | "connected";

export interface WAState {
  status: WAStatus;
  qr: string | null;
  connected: boolean;
}

async function getServerUrl(): Promise<string> {
  const url = await AsyncStorage.getItem("server_url");
  return (url ?? "").replace(/\/$/  , "");
}

/**
 * Returns headers for every request to the API server.
 * x-api-key must match API_INTERNAL_KEY on the server — configured in
 * Admin Panel under "Server API Key".
 */
async function getServerHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const apiKey = await AsyncStorage.getItem("server_api_key");
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
  if (apiKey?.trim()) headers["x-api-key"] = apiKey.trim();
  return headers;
}

export async function getWAStatus(): Promise<WAState> {
  const base = await getServerUrl();
  if (!base) return { status: "disconnected", qr: null, connected: false };
  try {
    const res = await fetch(`${base}/api/wa/status`, {
      headers: await getServerHeaders(),
      signal: timeoutSignal(8000),
    });
    const data = await res.json();
    return {
      status: data.status ?? "disconnected",
      qr: data.qr ?? null,
      connected: data.connected ?? false,
    };
  } catch {
    return { status: "disconnected", qr: null, connected: false };
  }
}

export async function startWAConnect(): Promise<WAState> {
  const base = await getServerUrl();
  if (!base) return { status: "disconnected", qr: null, connected: false };
  try {
    const res = await fetch(`${base}/api/wa/qr`, {
      headers: await getServerHeaders(),
      signal: timeoutSignal(15000),
    });
    const data = await res.json();
    return {
      status: data.status ?? "disconnected",
      qr: data.qr ?? null,
      connected: data.connected ?? false,
    };
  } catch {
    return { status: "disconnected", qr: null, connected: false };
  }
}

export async function disconnectWA(): Promise<void> {
  const base = await getServerUrl();
  if (!base) return;
  await fetch(`${base}/api/wa/disconnect`, {
    method: "POST",
    headers: await getServerHeaders(),
    signal: timeoutSignal(8000),
  }).catch(() => {});
}

export async function sendWAMsg(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const base = await getServerUrl();
  if (!base) return { success: false, error: "Server URL not configured in Admin Panel." };
  try {
    const res = await fetch(`${base}/api/wa/send`, {
      method: "POST",
      headers: await getServerHeaders(),
      body: JSON.stringify({ phone, message }),
      signal: timeoutSignal(10000),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
