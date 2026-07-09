import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { logger } from "./logger";
import { generateBotReply, isBotEnabled } from "./lilyBot";
import { sendTelegramAlert } from "./telegramAlert";
import path from "path";
import os from "os";
import qrcode from "qrcode";

// Fix(B): Use a persistent directory inside the project so the session
// survives server restarts and container recycling.  os.tmpdir() is
// commonly wiped on restart — that was the root cause of "QR every time".
const AUTH_DIR = path.join(process.cwd(), "wa_auth");

export type WAStatus = "disconnected" | "connecting" | "qr" | "connected";

interface WAState {
  status: WAStatus;
  qrDataUrl: string | null;
  sock: ReturnType<typeof makeWASocket> | null;
  chats: any[];
  messages: Record<string, any[]>;
  botReplies: { phone: string; userMsg: string; botMsg: string; time: number }[];
}

// Fix(M1): keep a handle on the pending reconnect timer so we can cancel it
// before scheduling a new one — prevents stacked concurrent sockets.
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const state: WAState = {
  status: "disconnected",
  qrDataUrl: null,
  sock: null,
  chats: [],
  messages: {},
  botReplies: [],
};

export function getWAState() {
  return {
    status: state.status,
    qrDataUrl: state.qrDataUrl,
    connected: state.status === "connected",
    chats: state.chats,
  };
}

export function getBotReplies() {
  return state.botReplies.slice(0, 50);
}

async function handleIncomingMessage(msg: any) {
  try {
    const jid = msg.key.remoteJid ?? "";
    const isGroup = jid.endsWith("@g.us");
    const fromMe = msg.key.fromMe;

    // Don't reply to own messages or groups
    if (fromMe || isGroup) return;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      "";

    if (!text.trim()) return;

    const phone = jid.replace("@s.whatsapp.net", "");
    logger.info({ phone, text: text.slice(0, 80) }, "Incoming WA message");

    if (!isBotEnabled()) return;

    // Fix(A): Check rate limit BEFORE marking phone as known — otherwise every
    // inbound message is instantly whitelisted and the limiter is always bypassed.
    if (!isFirstContactAllowed(phone)) return;

    // Mark as known only after passing the rate-limit gate, so subsequent
    // messages from this contact are not throttled again.
    knownPhones.add(phone);

    // Fix(A): Randomized 2-6 second delay before every reply — a consistent
    // instant-reply pattern is one of WhatsApp's strongest spam signals.
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 4000));

    if (!state.sock || state.status !== "connected") return;

    // Typing indicator
    await state.sock.sendPresenceUpdate("composing", jid);
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1500));

    const reply = await generateBotReply(phone, text);
    if (!reply) return;

    await state.sock.sendPresenceUpdate("paused", jid);
    await state.sock.sendMessage(jid, { text: reply });

    state.botReplies.unshift({
      phone,
      userMsg: text.slice(0, 100),
      botMsg: reply.slice(0, 200),
      time: Date.now(),
    });

    if (state.botReplies.length > 100) state.botReplies.pop();

    logger.info({ phone, reply: reply.slice(0, 80) }, "Bot reply sent");
  } catch (err: any) {
    logger.error({ err: err.message }, "Error handling incoming message");
  }
}

// Fix(A): Rate-limit first-contact messages — messaging many strangers in a
// short window is the pattern WhatsApp flags hardest.
const firstContactLog: { phone: string; ts: number }[] = [];
const FIRST_CONTACT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const FIRST_CONTACT_MAX = 5; // max new numbers per hour

// Track known phones (anyone we've seen a message FROM is not "first contact")
const knownPhones = new Set<string>();

function isFirstContactAllowed(phone: string): boolean {
  if (knownPhones.has(phone)) return true; // returning contact, no restriction
  const now = Date.now();
  // Prune old entries outside the window
  const recent = firstContactLog.filter(e => now - e.ts < FIRST_CONTACT_WINDOW_MS);
  firstContactLog.splice(0, firstContactLog.length, ...recent);
  if (recent.length >= FIRST_CONTACT_MAX) {
    logger.warn({ phone, count: recent.length }, "First-contact rate limit hit — queued");
    return false;
  }
  firstContactLog.push({ phone, ts: now });
  return true;
}

let initInProgress = false;

export async function initWAClient(): Promise<void> {
  // Fix #7: guard against overlapping initWAClient() calls (rapid reconnect
  // cycles on a flaky network) which would otherwise create multiple live
  // sockets each registering their own listeners.
  if (state.status === "connected" || state.status === "connecting" || initInProgress) return;
  initInProgress = true;
  state.status = "connecting";
  state.qrDataUrl = null;

  try {
    // Remove listeners from any previous socket before replacing it —
    // otherwise rapid reconnects leak listeners, causing duplicate bot
    // replies / duplicate WhatsApp messages sent to real clients.
    if (state.sock) {
      try {
        state.sock.ev.removeAllListeners("connection.update");
        state.sock.ev.removeAllListeners("creds.update");
        state.sock.ev.removeAllListeners("chats.upsert");
        state.sock.ev.removeAllListeners("messages.upsert");
      } catch {}
      state.sock = null;
    }

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
          // Fix(M1): clear any pending reconnect before scheduling a new one
          if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
          reconnectTimer = setTimeout(() => { reconnectTimer = null; initWAClient(); }, 3000);
        }
      } else if (connection === "open") {
        state.status = "connected";
        state.qrDataUrl = null;
        logger.info("WA connected — Lily Bot ready!");
      }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("chats.upsert", (chats) => {
      state.chats = [...chats, ...state.chats].slice(0, 50);
    });

    sock.ev.on("messages.upsert", async ({ messages: msgs, type }) => {
      for (const msg of msgs) {
        const jid = msg.key.remoteJid ?? "";
        if (!state.messages[jid]) state.messages[jid] = [];
        state.messages[jid].unshift(msg);
        if (state.messages[jid].length > 100) state.messages[jid].pop();

        // Handle bot auto-reply for new messages
        if (type === "notify") {
          handleIncomingMessage(msg);
        }
      }
    });
  } catch (err) {
    logger.error({ err }, "WA init error");
    state.status = "disconnected";
    sendTelegramAlert(
      "📵 WhatsApp Init Failed",
      err instanceof Error ? err.message : String(err),
      "waWeb/initConnection",
    ).catch(() => {});
  } finally {
    initInProgress = false;
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

export async function requestPairingCode(phoneNumber: string): Promise<{ code: string | null; error?: string }> {
  const phone = phoneNumber.replace(/[^0-9]/g, "");
  if (!phone || phone.length < 10) {
    return { code: null, error: "Valid phone number with country code chahiye (e.g. 919876543210)" };
  }
  // Start WA client if not already running
  if (state.status === "disconnected") {
    initWAClient().catch(() => {});
    // Wait for socket to initialize (up to 8s)
    for (let i = 0; i < 16; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (state.sock && (state.status === "connecting" || state.status === "qr")) break;
    }
  }
  if (!state.sock) {
    return { code: null, error: "WhatsApp socket initialize nahi hua. Dobara try karo." };
  }
  try {
    const code = await (state.sock as any).requestPairingCode(phone);
    logger.info({ phone }, "Pairing code requested");
    return { code: String(code) };
  } catch (err: any) {
    logger.error({ err: err.message }, "Pairing code request failed");
    return { code: null, error: err.message ?? "Pairing code fetch failed" };
  }
}
