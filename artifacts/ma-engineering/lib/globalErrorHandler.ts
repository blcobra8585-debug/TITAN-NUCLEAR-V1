/**
 * TITAN GLOBAL ERROR HANDLER
 *
 * ErrorBoundary (components/ErrorBoundary.tsx) only catches errors thrown
 * during React render. Anything thrown outside render — inside a
 * setTimeout/setInterval callback, an event handler, or an unhandled
 * promise rejection — used to crash or silently freeze the app with zero
 * visible explanation to the user.
 *
 * This installs two extra safety nets:
 *  1. A global JS error handler (ErrorUtils) that catches uncaught
 *     exceptions anywhere in the JS thread.
 *  2. An unhandled promise rejection tracker, since a rejected promise with
 *     no .catch() does NOT go through ErrorUtils on its own.
 *
 * Both paths report to Firestore via reportCrash (same as ErrorBoundary),
 * push to the on-screen DiagnosticOverlay, and show a plain-language Alert
 * to the user immediately, so "the app just froze" becomes "here's exactly
 * what broke."
 */
import { Alert } from "react-native";
import { reportCrash } from "@/lib/autoHeal";
import { diagError } from "@/lib/diagnosticLog";

let installed = false;

function showCrashAlert(error: Error, context: string): void {
  Alert.alert(
    "App Error",
    `${context}:\n\n${error.message || "Unknown error"}`,
    [{ text: "OK" }],
    { cancelable: true },
  );
}

export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;

  const g = global as unknown as {
    ErrorUtils?: {
      getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
  };

  if (g.ErrorUtils) {
    const defaultHandler = g.ErrorUtils.getGlobalHandler();
    g.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      const ctx = isFatal ? "fatal-js-error" : "js-error";
      diagError(ctx, error);
      reportCrash(error, ctx).catch(() => {});
      showCrashAlert(error, isFatal ? "A fatal error occurred" : "An unexpected error occurred");
      defaultHandler(error, isFatal);
    });
  }

  const g2 = global as unknown as {
    HermesInternal?: unknown;
    process?: { on?: (event: string, listener: (...args: any[]) => void) => void };
  };
  if (typeof g2.process?.on === "function") {
    g2.process.on("unhandledRejection", (reason: unknown) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      diagError("unhandled-rejection", error);
      reportCrash(error, "unhandled-promise-rejection").catch(() => {});
      showCrashAlert(error, "A background task failed");
    });
  }
}
