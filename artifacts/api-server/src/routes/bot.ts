import { Router } from "express";
import { setBotEnabled, isBotEnabled, getBotStats, setGeminiKey, clearHistory, clearAllHistory } from "../lib/lilyBot";

const router = Router();

router.get("/status", (_req, res) => {
  res.json(getBotStats());
});

router.post("/enable", (req, res) => {
  setBotEnabled(true);
  res.json({ success: true, enabled: true, message: "Lily Bot ON kar di gayi!" });
});

router.post("/disable", (req, res) => {
  setBotEnabled(false);
  res.json({ success: true, enabled: false, message: "Lily Bot OFF kar di gayi!" });
});

router.post("/config", (req, res) => {
  const { geminiKey } = req.body as { geminiKey?: string };
  if (geminiKey) {
    setGeminiKey(geminiKey);
    res.json({ success: true, message: "Gemini key set kar di gayi!" });
  } else {
    res.status(400).json({ success: false, error: "geminiKey required" });
  }
});

router.post("/clear/:phone", (req, res) => {
  clearHistory(req.params.phone);
  res.json({ success: true, message: "Chat history clear ho gayi!" });
});

router.post("/clear-all", (_req, res) => {
  clearAllHistory();
  res.json({ success: true, message: "Sab chat history clear ho gayi!" });
});

router.get("/toggle", (_req, res) => {
  const current = isBotEnabled();
  setBotEnabled(!current);
  res.json({ success: true, enabled: !current });
});

export default router;
