import { Router } from "express";
import { getFirestore } from "../lib/firebaseAdmin";

const router = Router();

router.get("/quotes", async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("quotes").orderBy("timestamp", "desc").get();
    const quotes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ quotes });
  } catch (err) {
    req.log.error({ err }, "Failed to get quotes");
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

router.get("/revenue", async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("quotes").get();
    let total = 0;
    snap.docs.forEach((d) => { total += (d.data().quotedAmount as number) ?? 0; });
    res.json({ total, formatted: total >= 100000 ? `₹${(total / 100000).toFixed(2)}L` : `₹${total.toFixed(0)}` });
  } catch (err) {
    req.log.error({ err }, "Failed to get revenue");
    res.status(500).json({ error: "Failed to fetch revenue" });
  }
});

const VALID_QUOTE_STATUSES = new Set(["pending", "approved", "rejected"]);

router.patch("/quotes/:id/status", async (req, res) => {
  try {
    // Fix(M3): whitelist status values — unvalidated body lets any caller write
    // arbitrary strings (or nested objects) directly into Firestore.
    const { status } = req.body as { status: string };
    if (!status || !VALID_QUOTE_STATUSES.has(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${[...VALID_QUOTE_STATUSES].join(", ")}` });
      return;
    }
    const db = getFirestore();
    await db.collection("quotes").doc(req.params.id).update({ status });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update quote status");
    res.status(500).json({ error: "Failed to update quote" });
  }
});

router.get("/chat-history", async (req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("chat_history").orderBy("timestamp", "desc").limit(50).get();
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ messages });
  } catch (err) {
    req.log.error({ err }, "Failed to get chat history");
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

export default router;
