import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

let warnedNoKeyConfigured = false;

/**
 * Fix #11: mutating routes (send WhatsApp messages, add/reply leads, write
 * to Firestore) previously had zero auth — anyone who discovered the server
 * URL could trigger them. This checks a shared secret sent as `x-api-key`.
 *
 * If API_SECRET_KEY is not configured, requests are allowed through (so the
 * server keeps working out-of-the-box) but a warning is logged once so the
 * gap is visible instead of silent.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env["API_SECRET_KEY"];

  if (!expected) {
    if (!warnedNoKeyConfigured) {
      logger.warn(
        "API_SECRET_KEY is not set — all API routes are unauthenticated. Set API_SECRET_KEY to require the x-api-key header.",
      );
      warnedNoKeyConfigured = true;
    }
    next();
    return;
  }

  const provided = req.header("x-api-key");
  if (provided && provided === expected) {
    next();
    return;
  }

  res.status(401).json({ success: false, error: "Unauthorized — missing or invalid x-api-key" });
}
