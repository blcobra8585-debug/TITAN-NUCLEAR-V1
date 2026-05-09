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
  return (url ?? "").replace(/\/$/, "");
}

export async function getWAStatus(): Promise<WAState> {
  const base = await getServerUrl();
  if (!base) return { status: "disconnected", qr: null, connected: false };
  try {
    const res = await fetch(`${base}/api/wa/status`, { signal: timeoutSignal(8000) });
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
    const res = await fetch(`${base}/api/wa/qr`, { signal: timeoutSignal(15000) });
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
  await fetch(`${base}/api/wa/disconnect`, { method: "POST", signal: timeoutSignal(8000) }).catch(() => {});
}

export async function sendWAMsg(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const base = await getServerUrl();
  if (!base) return { success: false, error: "Server URL not configured in Admin Panel." };
  try {
    const res = await fetch(`${base}/api/wa/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
      signal: timeoutSignal(10000),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
