/**
 * Lightweight on-device boot/runtime diagnostic store.
 * Gates behind __DEV__ so production builds are unaffected.
 *
 * Usage:
 *   import { diagLog, diagError } from "@/lib/diagnostics";
 *   diagLog("fonts loaded");
 *   diagError("firebase init", err);
 */

export type DiagLevel = "info" | "warn" | "error";

export interface DiagEntry {
  ts: number;
  elapsed: number;
  level: DiagLevel;
  msg: string;
}

const START = Date.now();
const entries: DiagEntry[] = [];
const listeners: Array<(entries: DiagEntry[]) => void> = [];

function notify() {
  const snap = [...entries];
  listeners.forEach((fn) => fn(snap));
}

export function diagLog(msg: string, level: DiagLevel = "info"): void {
  if (!__DEV__) return;
  const entry: DiagEntry = { ts: Date.now(), elapsed: Date.now() - START, level, msg };
  entries.push(entry);
  // eslint-disable-next-line no-console
  console.log(`[DIAG ${level.toUpperCase()}] +${entry.elapsed}ms ${msg}`);
  notify();
}

export function diagWarn(msg: string): void {
  diagLog(msg, "warn");
}

export function diagError(tag: string, err?: unknown): void {
  const detail = err instanceof Error ? err.message : String(err ?? "");
  diagLog(`${tag}${detail ? ": " + detail : ""}`, "error");
}

export function diagSubscribe(fn: (entries: DiagEntry[]) => void): () => void {
  listeners.push(fn);
  fn([...entries]); // immediate snapshot
  return () => {
    const i = listeners.indexOf(fn);
    if (i !== -1) listeners.splice(i, 1);
  };
}

export function diagGetAll(): DiagEntry[] {
  return [...entries];
}
