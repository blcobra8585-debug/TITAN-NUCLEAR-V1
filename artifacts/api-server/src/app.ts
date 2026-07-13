import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sendTelegramAlert, sendDailyDigest } from "./lib/telegramAlert";
import { runIndiaMartPoll, getIndiaMartConfig, getLeadStats } from "./routes/leads";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Bug fix: cors() with no options = allow ALL origins (wildcard *).
// Restrict to localhost (dev) and Replit preview/production domains.
// Requests with no Origin header (mobile apps, curl) are always allowed.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile / server-to-server
    const allowed =
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1") ||
      origin.endsWith(".replit.dev") ||
      origin.endsWith(".replit.app") ||
      origin.endsWith(".repl.co");
    callback(null, allowed);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Global Express error handler — catches any thrown/next(err) in routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled Express route error");
  sendTelegramAlert(
    `Server Route Error: ${err.message}`,
    err.stack ?? err.message,
    "express/errorMiddleware",
  ).catch(() => {});
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;

// ── Server keepalive — self-ping every 5 min to prevent Replit from sleeping ──
const replitDomain = process.env["REPLIT_DEV_DOMAIN"] || process.env["REPLIT_DOMAINS"]?.split(",")[0];
if (replitDomain) {
  const keepAliveUrl = `https://${replitDomain}/api/healthz`;
  setInterval(() => {
    fetch(keepAliveUrl, { signal: AbortSignal.timeout(10000) }).catch(() => {});
  }, 5 * 60 * 1000);
}

// ── Background IndiaMART cron — polls every 30 min ───────────────────────────
// Credentials are saved the first time the dashboard/mobile triggers a manual
// fetch (POST /api/leads/indiamart/config or GET /api/leads/indiamart).
// New leads automatically trigger a Telegram alert + Lily auto-reply via WA.
setInterval(async () => {
  const cfg = getIndiaMartConfig();
  if (!cfg) return; // no credentials yet — skip silently
  try {
    const { newCount } = await runIndiaMartPoll(cfg.glid, cfg.key, { autoReply: true });
    if (newCount > 0) logger.info({ newCount }, "Cron: new IndiaMART leads processed");
  } catch (err: any) {
    logger.warn({ err: err.message }, "Cron: IndiaMART poll failed");
  }
}, 30 * 60 * 1000); // every 30 minutes

// ── Daily digest — fires at 9:00 AM IST every day ────────────────────────────
function scheduleDigest() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowUTC = Date.now();
  const nowIST = nowUTC + IST_OFFSET_MS;
  const todayIST = new Date(nowIST);
  // Next 9:00 AM IST = next 3:30 AM UTC
  const next9am = new Date(Date.UTC(
    todayIST.getUTCFullYear(), todayIST.getUTCMonth(), todayIST.getUTCDate(), 3, 30, 0, 0
  ));
  if (next9am.getTime() <= nowUTC) next9am.setUTCDate(next9am.getUTCDate() + 1);
  const msUntil = next9am.getTime() - nowUTC;
  logger.info({ inHours: (msUntil / 3600000).toFixed(1) }, "Daily digest scheduled");

  setTimeout(function fireDailyDigest() {
    const stats = getLeadStats();
    sendDailyDigest({
      totalLeads:     stats.totalLeads,
      newLeads:       stats.newLeads,
      unreplied:      stats.unreplied,
      totalQuotes:    0, // Firestore-side — not available server-side
      approvedQuotes: 0,
      pendingQuotes:  0,
      totalRevenue:   0,
    }).catch(() => {});
    // Re-schedule for the next day
    setTimeout(fireDailyDigest, 24 * 60 * 60 * 1000);
  }, msUntil);
}
scheduleDigest();
