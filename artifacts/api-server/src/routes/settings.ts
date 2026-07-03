import { Router } from "express";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const router = Router();

const SETTINGS_FILE = join(process.cwd(), ".wa-settings.enc");
const SALT = "ma-titan-settings-salt-v1";

function getKey(): Buffer {
  const secret = process.env["API_SECRET_KEY"] ?? "ma-titan-default-key-change-me";
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
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex")) + decipher.final("utf8");
}

function loadSettings(): Record<string, string> {
  try {
    if (!existsSync(SETTINGS_FILE)) return {};
    const raw = readFileSync(SETTINGS_FILE, "utf8").trim();
    if (!raw) return {};
    return JSON.parse(decrypt(raw));
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, string>): void {
  writeFileSync(SETTINGS_FILE, encrypt(JSON.stringify(settings)), "utf8");
}

router.get("/settings", (_req, res) => {
  const settings = loadSettings();
  res.json({
    wa_token_set: !!settings["wa_token"],
    waba_id: settings["waba_id"] ?? "",
    gemini_key_set: !!settings["gemini_key"],
  });
});

router.post("/settings", (req, res) => {
  const { wa_token, waba_id, gemini_key } = req.body as Record<string, string>;
  const current = loadSettings();
  if (wa_token) current["wa_token"] = wa_token;
  if (waba_id !== undefined) current["waba_id"] = waba_id;
  if (gemini_key) current["gemini_key"] = gemini_key;
  saveSettings(current);
  res.json({ success: true });
});

router.post("/settings/send-wa", async (req, res) => {
  const { phone, message } = req.body as { phone: string; message: string };
  const settings = loadSettings();
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

router.get("/settings/gemini-key", (_req, res) => {
  const settings = loadSettings();
  const key = settings["gemini_key"];
  if (!key) {
    res.status(404).json({ success: false, error: "Gemini key not configured" });
    return;
  }
  res.json({ success: true, key });
});

export default router;
