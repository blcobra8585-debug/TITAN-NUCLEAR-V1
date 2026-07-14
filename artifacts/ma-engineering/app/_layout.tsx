import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import DiagnosticOverlay from "@/components/DiagnosticOverlay";
import PinLockScreen from "@/components/PinLockScreen";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { diagLog, diagStage, diagWarn } from "@/lib/diagnosticLog";
import { hasPIN, setupAutoLock } from "@/lib/security";
// NOTE: autoUpdate / autoLeadBot / recruitmentBot / autoHeal are NOT statically
// imported here. A crash in any of those (or their import chains) used to prevent
// _layout.tsx from loading entirely, keeping the splash screen up forever.
// They are now loaded via dynamic import() inside AppInit → safeRun.

SplashScreen.preventAutoHideAsync().catch(() => {});

// ── Module-level splash failsafe ──────────────────────────────────────────────
// If React never mounts (an import somewhere crashed before this file finished
// evaluating, or the JS thread hung), this still hides the native splash after
// 5 s so the user sees something instead of being stuck on the launch logo forever.
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 5000);

// Global error handlers — wrapped so a failure here can't crash the module.
try {
  // Dynamic import so a crash in globalErrorHandler's own deps doesn't block load
  import("@/lib/globalErrorHandler")
    .then(({ installGlobalErrorHandlers }) => installGlobalErrorHandlers())
    .catch((e) => console.warn("[layout] globalErrorHandler load failed:", e));
} catch (e) {
  console.warn("[layout] globalErrorHandler import threw:", e);
}

diagStage("fonts loading…");

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30000 } },
});

/** Safely run a background service — errors go to Telegram + Firestore. */
function safeRun(fn: () => Promise<any>, name: string): void {
  Promise.resolve()
    .then(fn)
    .catch((err) => {
      console.warn(`[safeRun] ${name} failed:`, err);
      diagWarn(name, err instanceof Error ? err.message : String(err));
      import("@/lib/autoHeal")
        .then(({ reportCrash }) =>
          reportCrash(err instanceof Error ? err : new Error(String(err)), name),
        )
        .catch(() => {});
    });
}

/** Background services — all via dynamic import so any crash is isolated. */
function AppInit() {
  useEffect(() => {
    diagLog("AppInit", "background services starting");

    // healStorage first — cleans up corrupt AsyncStorage entries
    safeRun(
      () => import("@/lib/autoHeal").then((m) => m.healStorage()),
      "healStorage",
    );

    // Delayed services — give the app time to render first
    const t1 = setTimeout(
      () => safeRun(() => import("@/lib/autoUpdate").then((m) => m.autoCheckUpdate()), "autoUpdate"),
      8000,
    );
    const t2 = setTimeout(
      () => safeRun(() => import("@/lib/autoLeadBot").then((m) => m.startLeadHunting()), "leadBot"),
      5000,
    );
    const t3 = setTimeout(
      () => safeRun(() => import("@/lib/recruitmentBot").then((m) => m.startRecruitmentBot()), "recruitBot"),
      12000,
    );

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // PIN lock state — checked once on mount, re-triggered by setupAutoLock on resume
  const [pinLocked, setPinLocked] = useState(false);

  useEffect(() => {
    hasPIN().then(has => {
      if (has) setPinLocked(true);
    }).catch(() => {});
    // Re-lock when app returns from background (15 min session timeout)
    const unsubscribe = setupAutoLock(() => setPinLocked(true));
    return unsubscribe;
  }, []);

  // Fonts can hang forever on some Android release builds — force fallback at 4 s.
  const [fontsTimedOut, setFontsTimedOut] = React.useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      diagWarn("fonts", "timed out after 4s — using system fonts");
      setFontsTimedOut(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const readyToRender = fontsLoaded || !!fontError || fontsTimedOut;

  useEffect(() => {
    if (fontsLoaded) {
      diagLog("fonts", "loaded ✓");
      diagStage("fonts loaded — rendering app…");
    } else if (fontError) {
      diagWarn("fonts", `error: ${fontError.message}`);
      diagStage("fonts error — using system fonts");
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (readyToRender) {
      diagLog("RootLayout", "hiding native splash, mounting Stack");
      SplashScreen.hideAsync().catch((err) => {
        diagWarn("SplashScreen.hideAsync", err instanceof Error ? err.message : String(err));
      });
    }
  }, [readyToRender]);

  if (!readyToRender) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
              <AppProvider>
                <AppInit />
                {pinLocked ? (
                  <PinLockScreen onUnlock={() => setPinLocked(false)} />
                ) : (
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" />
                  </Stack>
                )}
                {/* Diagnostic overlay — always on top */}
                <DiagnosticOverlay />
              </AppProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
