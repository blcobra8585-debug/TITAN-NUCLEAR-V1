/**
 * TITAN GLOBAL ERROR HANDLER
 *
 * ErrorBoundary only catches React render errors. This file catches:
 *  1. Uncaught JS exceptions (ErrorUtils global handler)
 *  2. Unhandled promise rejections
 *
 * Uses DYNAMIC import for reportCrash so a crash in autoHeal / firebase
 * import chain does NOT prevent this file from loading. Previously a static
 * import of autoHeal → firebase → firebase/firestore could crash the module
 * before installGlobalErrorHandlers() ever ran.
 */
import { Alert } from "react-native";
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

/** Dynamic — so import chain crashes don't propagate back to _layout.tsx */
function reportCrashSafe(error: Error, context: string): void {
  import("@/lib/autoHeal")
    .then(({ reportCrash }) => reportCrash(error, context))
    .catch(() => {
      // Last resort: at least try a raw Telegram ping
      import("@/lib/telegramAlert")
        .then(({ sendTelegramAlert }) =>
          sendTelegramAlert(`Crash (${context})`, error.message, context),
        )
        .catch(() => {});
    });
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
      reportCrashSafe(error, ctx);
      showCrashAlert(error, isFatal ? "Fatal error occurred" : "An unexpected error occurred");
      defaultHandler(error, isFatal);
    });
  }

  const g2 = global as unknown as {
    process?: { on?: (event: string, listener: (...args: any[]) => void) => void };
  };
  if (typeof g2.process?.on === "function") {
    g2.process.on("unhandledRejection", (reason: unknown) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      diagError("unhandled-rejection", error);
      reportCrashSafe(error, "unhandled-promise-rejection");
      showCrashAlert(error, "A background task failed");
    });
  }
}
