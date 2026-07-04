import { Router } from "express";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { logger } from "../lib/logger";

const router = Router();

const SETTINGS_FILE = join(process.cwd(), ".wa-settings.enc");
const SALT = "ma-titan-settings-salt-v1";

/**
 * Returns the AES-256 key derived from API_SECRET_KEY.
 *
 * Throws — never falls back — if the env var is missing. A hardcoded
 * fallback defeats the purpose of encryption: anyone who reads the source
 * code already knows the key. A loudly-broken server is safer than a
 * silently-insecure one.
 */
function getKey(): Buffer {
  const secret = process.env["API_SECRET_KEY"];
  if (!secret) {
    throw new Error(
      "API_SECRET_KEY environment variable is not set. " +
        "Cannot encrypt or decrypt settings. " +
        "Set it in your deployment environment before starting the server."
    );
  }
  return scryptSync(secret, SALT, 32);
}

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const key = getKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

function decrypt(data: string): string {
  const [ivHex, tagHex, encHex] = data.split(":");
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex!, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex!, "hex"));
  return decipher.update(Buffer.from(encHex!, "hex")) + decipher.final("utf8");
}

function loadSettings(): Record<string, string> {
  try {
    if (!existsSync(SETTINGS_FILE)) return {};
    const raw = readFileSync(SETTINGS_FILE, "utf8").trim();
    if (!raw) return {};
    return JSON.parse(decrypt(raw));
  } catch (err) {
    logger.error({ err }, "Failed to load settings — API_SECRET_KEY mismatch or corrupt file?");
    return {};
  }
}

function saveSettings(settings: Record<string, string>): void {
  writeFileSync(SETTINGS_FILE, encrypt(JSON.stringify(settings)), "utf8");
}

router.get("/settings", (_req, res) => {
  try {
    const settings = loadSettings();
    res.json({
      wa_token_set: !!settings["wa_token"],
      waba_id: settings["waba_id"] ?? "",
      gemini_key_set: !!settings["gemini_key"],
    });
  } catch {
    res.status(503).json({ error: "Settings unavailable — check API_SECRET_KEY on server" });
  }
});

router.post("/settings", (req, res) => {
  try {
    const { wa_token, waba_id, gemini_key } = req.body as Record<string, string>;
    const current = loadSettings();
    if (wa_token) current["wa_token"] = wa_token;
    if (waba_id !== undefined) current["waba_id"] = waba_id;
    if (gemini_key) current["gemini_key"] = gemini_key;
    saveSettings(current);
    res.json({ success: true });
  } catch {
    res.status(503).json({ error: "Cannot save settings — check API_SECRET_KEY on server" });
  }
});

router.post("/settings/send-wa", async (req, res) => {
  let settings: Record<string, string>;
  try {
    settings = loadSettings();
  } catch {
    res.status(503).json({ success: false, error: "Settings unavailable — check API_SECRET_KEY on server" });
    return;
  }

  const { phone, message } = req.body as { phone: string; message: string };
  const token = settings["wa_token"];
  const wabaId = settings["waba_id"];

  if (!token || !wabaId) {
    res.status(400).json({ success: false, error: "WA token or WABA ID not configured on server" });
    return;
  }

  const clean = phone.replace(/\D/g, "");
  try {
    const resp = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: clean, type: "text", text: { body: message } }),
    });
    const data = await resp.json() as { messages?: unknown; error?: { message: string } };
    if (resp.ok && data.messages) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: data.error?.message ?? "Failed" });
    }
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Network error" });
  }
});

// NOTE: GET /settings/gemini-key intentionally removed — no callers, pure exposure risk.

export default router;
