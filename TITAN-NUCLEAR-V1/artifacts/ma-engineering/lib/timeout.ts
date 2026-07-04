/**
 * React Native safe fetch-timeout helper.
 *
 * NOTE:
 * - `AbortSignal.timeout(ms)` is not guaranteed to exist in all RN/Hermes builds.
 * - This wrapper falls back to an AbortController + setTimeout implementation.
 */
export function timeoutSignal(ms: number): AbortSignal {
  // Prefer native implementation when available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAbortSignal = AbortSignal as any;
  if (anyAbortSignal && typeof anyAbortSignal.timeout === "function") {
    return anyAbortSignal.timeout(ms) as AbortSignal;
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

