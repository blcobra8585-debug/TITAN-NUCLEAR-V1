import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { logger } from "./logger";
import path from "path";
import os from "os";
import qrcode from "qrcode";

const AUTH_DIR = path.join(os.tmpdir(), "ma_titan_wa_auth");

export type WAStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WAState {
  status: WAStatus;
  qrDataUrl: string | null;
  sock: ReturnType<typeof makeWASocket> | null;
  chats: any[];
  messages: Record<string, any[]>;
}

const state: WAState = {
  status: "disconnected",
  qrDataUrl: null,
  sock: null,
  chats: [],
  messages: {},
};

export function getWAState() {
  return {
    status: state.status,
    qrDataUrl: state.qrDataUrl,
    connected: state.status === "connected",
    chats: state.chats,
  };
}

export async function initWAClient(): Promise<void> {
  if (state.status === "connected" || state.status === "connecting") return;
  state.status = "connecting";
  state.qrDataUrl = null;

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: authState,
      printQRInTerminal: false,
      logger: logger.child({ module: "baileys" }) as any,
    });

    state.sock = sock;

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state.status = "qr";
        state.qrDataUrl = await qrcode.toDataURL(qr);
        logger.info("WA QR generated");
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        state.status = "disconnected";
        state.sock = null;
        logger.info({ shouldReconnect }, "WA connection closed");
        if (shouldReconnect) {
          setTimeout(() => initWAClient(), 3000);
        }
      } else if (connection === "open") {
        state.status = "connected";
        state.qrDataUrl = null;
        logger.info("WA connected successfully");
      }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("chats.upsert", (chats) => {
      state.chats = [...chats, ...state.chats].slice(0, 50);
    });

    sock.ev.on("messages.upsert", ({ messages: msgs }) => {
      for (const msg of msgs) {
        const jid = msg.key.remoteJid ?? "";
        if (!state.messages[jid]) state.messages[jid] = [];
        state.messages[jid].unshift(msg);
        if (state.messages[jid].length > 100) state.messages[jid].pop();
      }
    });
  } catch (err) {
    logger.error({ err }, "WA init error");
    state.status = "disconnected";
  }
}

export async function sendWAMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!state.sock || state.status !== "connected") {
    return { success: false, error: "WhatsApp not connected. QR scan karo." };
  }
  try {
    const jid = phone.replace(/\D/g, "") + "@s.whatsapp.net";
    await state.sock.sendMessage(jid, { text: message });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function getMessages(phone: string) {
  const jid = phone.replace(/\D/g, "") + "@s.whatsapp.net";
  return state.messages[jid] ?? [];
}

export async function disconnectWA() {
  await state.sock?.logout();
  state.status = "disconnected";
  state.sock = null;
  state.qrDataUrl = null;
}
