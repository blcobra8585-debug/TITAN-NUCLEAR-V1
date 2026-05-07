import { Router, Request, Response } from "express";
import { logger } from "../lib/logger";
import { generateBotReply } from "../lib/lilyBot";

const router = Router();

// ═══════════════════════════════════════════════════
// AUTO LEAD GENERATION — IndiaMART + B2B Platforms
// ═══════════════════════════════════════════════════

interface Lead {
  id: string;
  source: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  product?: string;
  location?: string;
  timestamp: number;
  replied: boolean;
  replyText?: string;
}

const leadsStore: Lead[] = [];

// ── IndiaMART Lead Fetch ──────────────────────────
router.get("/indiamart", async (req: Request, res: Response) => {
  const { glid, key } = req.query as Record<string, string>;
  if (!glid || !key) {
    return res.json({ success: false, error: "IndiaMART GLID and Key required" });
  }
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      `${d.getDate().toString().padStart(2,"0")}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getFullYear()} 00:00:00`;

    const url = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${key}&glusr_crm_glid=${glid}&glusr_crm_start_time=${encodeURIComponent(fmt(start))}&glusr_crm_end_time=${encodeURIComponent(fmt(now))}`;
    const apiRes = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const data = await apiRes.json() as any;
    const inquiries = data.RESPONSE?.STATUS === 1 ? (data.RESPONSE?.RESULTS ?? []) : [];

    const newLeads: Lead[] = inquiries.map((inq: any) => ({
      id: `im_${inq.UNIQUE_QUERY_ID ?? Date.now()}`,
      source: "IndiaMART",
      name: inq.SENDER_NAME ?? "Unknown",
      phone: inq.SENDER_MOBILE ?? inq.SENDER_PHONE ?? "",
      email: inq.SENDER_EMAIL ?? "",
      message: inq.QUERY_MESSAGE ?? inq.SUBJECT ?? "Product inquiry",
      product: inq.QUERY_PRODUCT_NAME ?? "",
      location: inq.SENDER_CITY ?? "",
      timestamp: new Date(inq.QUERY_TIME ?? Date.now()).getTime(),
      replied: false,
    }));

    // Add new leads to store
    for (const lead of newLeads) {
      if (!leadsStore.find(l => l.id === lead.id)) {
        leadsStore.unshift(lead);
      }
    }
    logger.info({ count: newLeads.length }, "IndiaMART leads fetched");
    res.json({ success: true, leads: newLeads, total: leadsStore.length });
  } catch (err: any) {
    logger.error({ err: err.message }, "IndiaMART fetch error");
    res.json({ success: false, error: err.message });
  }
});

// ── Manual Lead Add ───────────────────────────────
router.post("/add", async (req: Request, res: Response) => {
  const { name, phone, message, source = "Manual", product, location, email } = req.body;
  if (!name || !phone) return res.json({ success: false, error: "Name and phone required" });
  const lead: Lead = {
    id: `manual_${Date.now()}`,
    source, name, phone, email, message: message ?? "Inquiry",
    product, location, timestamp: Date.now(), replied: false,
  };
  leadsStore.unshift(lead);
  res.json({ success: true, lead });
});

// ── Get All Leads ─────────────────────────────────
router.get("/list", (req: Request, res: Response) => {
  res.json({ leads: leadsStore.slice(0, 100), total: leadsStore.length });
});

// ── Auto Reply to Lead via Lily ───────────────────
router.post("/auto-reply", async (req: Request, res: Response) => {
  const { leadId } = req.body;
  const lead = leadsStore.find(l => l.id === leadId);
  if (!lead) return res.json({ success: false, error: "Lead not found" });
  if (lead.replied) return res.json({ success: false, error: "Already replied" });

  try {
    const context = `New inquiry from ${lead.source}: "${lead.message}"${lead.product ? ` about ${lead.product}` : ""}. Client: ${lead.name} from ${lead.location ?? "India"}.`;
    const reply = await generateBotReply(lead.phone, context);
    if (reply) {
      lead.replied = true;
      lead.replyText = reply;
    }
    res.json({ success: true, reply, lead });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// ── Auto Reply ALL unreplied leads ───────────────
router.post("/auto-reply-all", async (req: Request, res: Response) => {
  const unreplied = leadsStore.filter(l => !l.replied && l.phone).slice(0, 10);
  const results = [];
  for (const lead of unreplied) {
    try {
      const context = `New inquiry from ${lead.source}: "${lead.message}"${lead.product ? ` about ${lead.product}` : ""}`;
      const reply = await generateBotReply(lead.phone, context);
      if (reply) { lead.replied = true; lead.replyText = reply; }
      results.push({ id: lead.id, success: !!reply });
    } catch { results.push({ id: lead.id, success: false }); }
  }
  res.json({ success: true, processed: results.length, results });
});

// ── Stats ─────────────────────────────────────────
router.get("/stats", (req: Request, res: Response) => {
  const total = leadsStore.length;
  const replied = leadsStore.filter(l => l.replied).length;
  const today = leadsStore.filter(l => l.timestamp > Date.now() - 86400000).length;
  const bySrc = leadsStore.reduce((acc, l) => {
    acc[l.source] = (acc[l.source] ?? 0) + 1; return acc;
  }, {} as Record<string, number>);
  res.json({ total, replied, unreplied: total - replied, today, bySource: bySrc });
});

export default router;
