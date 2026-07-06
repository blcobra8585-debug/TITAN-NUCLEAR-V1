import app from "./app";
import { logger } from "./lib/logger";
import { sendTelegramAlert } from "./lib/telegramAlert";

// ── Process-level safety nets — catch anything that escapes Express
process.on("uncaughtException", (err: Error) => {
  logger.fatal({ err }, "uncaughtException — server shutting down");
  sendTelegramAlert(
    "💀 SERVER CRASH: uncaughtException",
    err.stack ?? err.message,
    "process/uncaughtException",
  ).finally(() => process.exit(1));
});

process.on("unhandledRejection", (reason: unknown) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error({ err }, "unhandledRejection");
  sendTelegramAlert(
    "⚠️ Server: unhandledRejection",
    err.stack ?? err.message,
    "process/unhandledRejection",
  ).catch(() => {});
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
