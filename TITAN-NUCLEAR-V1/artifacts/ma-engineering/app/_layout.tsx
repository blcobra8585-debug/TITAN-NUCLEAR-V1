import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import DiagnosticOverlay from "@/components/DiagnosticOverlay";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { autoCheckUpdate } from "@/lib/autoUpdate";
import { startLeadHunting } from "@/lib/autoLeadBot";
import { startRecruitmentBot } from "@/lib/recruitmentBot";
import { healStorage } from "@/lib/autoHeal";
import { diagLog, diagWarn, diagError } from "@/lib/diagnostics";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30000 } },
});

function safeRun(fn: () => Promise<any>, name: string): void {
  Promise.resolve()
    .then(fn)
    .catch((err) => {
      diagError(name, err);
      import("@/lib/autoHeal")
        .then(({ reportCrash }) => reportCrash(err instanceof Error ? err : new Error(String(err)), name))
        .catch(() => {});
    });
}

function AppInit() {
  useEffect(() => {
    diagLog("AppInit mounted — running background services");
    safeRun(healStorage, "healStorage");
    const t1 = setTimeout(() => safeRun(autoCheckUpdate, "autoUpdate"), 8000);
    const t2 = setTimeout(() => safeRun(startLeadHunting, "leadBot"), 5000);
    const t3 = setTimeout(() => safeRun(startRecruitmentBot, "recruitBot"), 12000);
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

  // Font-loading fallback: if fonts take > 4 s (slow device / network),
  // force-proceed so the app never hangs waiting on them forever.
  const fontsReady = useRef(false);
  const [fontsForcedReady, setFontsForcedReady] = React.useState(false);

  useEffect(() => {
    diagLog("RootLayout mounted — loading fonts");
    const fallback = setTimeout(() => {
      if (!fontsReady.current) {
        diagWarn("Fonts timed-out after 4s — force-proceeding without them");
        setFontsForcedReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 4000);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      fontsReady.current = true;
      diagLog("Fonts loaded OK");
      SplashScreen.hideAsync().catch(() => {});
    }
    if (fontError) {
      fontsReady.current = true;
      diagError("Fonts failed to load", fontError);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && !fontsForcedReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
              <AppProvider>
                <AppInit />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" />
                </Stack>
                <DiagnosticOverlay />
              </AppProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
