import { Router } from "express";
import { initWAClient, getWAState, sendWAMessage, getMessages, disconnectWA, getBotReplies, requestPairingCode } from "../lib/waWeb";

const router = Router();

router.get("/qr", async (req, res) => {
  await initWAClient();
  const s = getWAState();
  if (s.status === "qr" && s.qrDataUrl) {
    res.json({ qr: s.qrDataUrl, status: "qr" });
  } else if (s.status === "connected") {
    res.json({ connected: true, status: "connected" });
  } else {
    res.json({ status: s.status, qr: null });
  }
});

router.get("/status", (_req, res) => {
  const s = getWAState();
  res.json({ connected: s.status === "connected", status: s.status, qr: s.qrDataUrl });
});

router.post("/pairing-code", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ success: false, error: "phone number required" });
    return;
  }
  const cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.length < 10) {
    res.status(400).json({ success: false, error: "Valid phone number with country code chahiye (e.g. 919876543210)" });
    return;
  }
  const result = await requestPairingCode(cleaned);
  if (result.code) {
    res.json({ success: true, code: result.code });
  } else {
    // User-fixable errors (wrong phone, not ready) → 400; real server faults → 500
    const isUserError = result.error && (
      result.error.includes("Socket") ||
      result.error.includes("phone") ||
      result.error.includes("initialize")
    );
    res.status(isUserError ? 400 : 500).json({ success: false, error: result.error });
  }
});

router.post("/send", async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    res.status(400).json({ success: false, error: "phone and message required" });
    return;
  }
  const result = await sendWAMessage(phone, message);
  res.json(result);
});

router.get("/chats", (_req, res) => {
  const s = getWAState();
  res.json({ chats: s.chats });
});

router.get("/messages/:phone", (req, res) => {
  const msgs = getMessages(req.params.phone);
  res.json({ messages: msgs });
});

router.post("/disconnect", async (_req, res) => {
  await disconnectWA();
  res.json({ success: true });
});

router.get("/bot-replies", (_req, res) => {
  res.json({ replies: getBotReplies() });
});

export default router;
