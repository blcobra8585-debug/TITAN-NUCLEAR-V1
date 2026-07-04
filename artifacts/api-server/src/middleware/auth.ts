import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

/**
 * Shared-secret API authentication middleware.
 *
 * Every protected request must include:
 *   X-API-Key: <value of API_INTERNAL_KEY env var>
 *
 * Two env vars are intentionally separate:
 *   API_SECRET_KEY   — AES-256 file encryption only (settings.ts)
 *   API_INTERNAL_KEY — HTTP request auth only (this file)
 *
 * Fail-closed: if API_INTERNAL_KEY is not set, reject every request with
 * 401. An obviously-broken server gets noticed; a silently-open one doesn't.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env["API_INTERNAL_KEY"];

  if (!expected) {
    logger.error(
      { path: req.path },
      "API_INTERNAL_KEY is not set — rejecting all API requests. " +
        "Set API_INTERNAL_KEY in your deployment environment."
    );
    res.status(401).json({
      success: false,
      error: "Server misconfiguration: API_INTERNAL_KEY not set.",
    });
    return;
  }

  const provided = req.header("x-api-key");
  if (provided && provided === expected) {
    next();
    return;
  }

  logger.warn({ path: req.path, ip: req.ip }, "Rejected — missing or invalid x-api-key");
  res.status(401).json({ success: false, error: "Unauthorized — missing or invalid x-api-key" });
}
