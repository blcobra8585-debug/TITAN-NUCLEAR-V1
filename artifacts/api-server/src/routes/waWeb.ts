import { Router } from "express";
import { initWAClient, getWAState, sendWAMessage, getMessages, disconnectWA } from "../lib/waWeb";

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

export default router;
