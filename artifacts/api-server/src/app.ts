import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sendTelegramAlert } from "./lib/telegramAlert";

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
// Only runs if REPLIT_DEV_DOMAIN is set (i.e. running on Replit)
const replitDomain = process.env["REPLIT_DEV_DOMAIN"] || process.env["REPLIT_DOMAINS"]?.split(",")[0];
if (replitDomain) {
  const keepAliveUrl = `https://${replitDomain}/api/healthz`;
  setInterval(() => {
    fetch(keepAliveUrl, { signal: AbortSignal.timeout(10000) })
      .then(() => {})
      .catch(() => {}); // silently ignore — just keeping connection alive
  }, 5 * 60 * 1000); // every 5 minutes
}
