/**
 * TITAN DIAGNOSTIC LOG — Singleton on-screen boot/status trace
 *
 * Designed to be importable from anywhere (non-React code, timers,
 * promise chains) without creating circular deps.
 *
 * Usage:
 *   import { diagLog, diagWarn, diagError, diagStage } from '@/lib/diagnosticLog';
 *   diagLog('Firebase ready');
 *   diagWarn('leadBot', 'timeout — skipping');
 *   diagError('pipeline', err);
 *   diagStage('fonts loaded');   // Updates the "current boot stage" label
 */

export type DiagLevel = 'info' | 'warn' | 'error';

export interface DiagEntry {
  id: number;
  ts: number;          // ms since app start
  level: DiagLevel;
  tag: string;
  message: string;
}

type Listener = (entries: DiagEntry[], currentStage: string) => void;

const APP_START = Date.now();
let _nextId = 0;
const _entries: DiagEntry[] = [];
const _listeners: Set<Listener> = new Set();
let _currentStage = 'initializing…';
let _booted = false;   // set true once tabs mounted

function _notify() {
  for (const l of _listeners) {
    try { l([..._entries], _currentStage); } catch {}
  }
}

function _push(level: DiagLevel, tag: string, message: string): void {
  const entry: DiagEntry = {
    id: _nextId++,
    ts: Date.now() - APP_START,
    level,
    tag,
    message,
  };
  _entries.push(entry);
  // Keep last 200 entries to avoid unbounded memory growth
  if (_entries.length > 200) _entries.shift();
  _notify();
}

/** Log an informational milestone. */
export function diagLog(tagOrMessage: string, message?: string): void {
  if (message !== undefined) {
    _push('info', tagOrMessage, message);
  } else {
    _push('info', 'app', tagOrMessage);
  }
}

/** Log a silent-catch warning that would otherwise be invisible. */
export function diagWarn(tag: string, message: string): void {
  _push('warn', tag, message);
}

/** Log a caught error that would otherwise be invisible. */
export function diagError(tag: string, err: unknown): void {
  const msg = err instanceof Error
    ? `${err.message}`
    : String(err);
  _push('error', tag, msg);
}

/** Update the "current boot stage" shown in the collapsed strip. */
export function diagStage(stage: string): void {
  _currentStage = stage;
  _booted = false;
  _notify();
}

/** Mark that the app has fully booted (tabs mounted, all screens ready). */
export function diagBooted(): void {
  _booted = true;
  _currentStage = 'ready';
  _notify();
}

export function isBooted(): boolean { return _booted; }

/** Subscribe to log updates. Returns an unsubscribe fn. */
export function subscribeDiag(listener: Listener): () => void {
  _listeners.add(listener);
  // Fire immediately with current state
  try { listener([..._entries], _currentStage); } catch {}
  return () => { _listeners.delete(listener); };
}

/** Snapshot of current entries (for initial render). */
export function getEntries(): DiagEntry[] { return [..._entries]; }
export function getCurrentStage(): string { return _currentStage; }
