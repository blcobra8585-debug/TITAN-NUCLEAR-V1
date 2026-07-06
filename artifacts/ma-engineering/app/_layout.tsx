import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { autoCheckUpdate } from "@/lib/autoUpdate";
import { startLeadHunting } from "@/lib/autoLeadBot";
import { startRecruitmentBot } from "@/lib/recruitmentBot";
import { healStorage } from "@/lib/autoHeal";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30000 } },
});

function safeRun(fn: () => Promise<any>, name: string): void {
  // Fix #6: stay non-fatal, but log failures instead of swallowing them
  // silently — otherwise a real problem (bad IndiaMART keys, Firestore
  // permission errors, etc.) just looks like "nothing happens" with zero
  // way to diagnose it.
  Promise.resolve()
    .then(fn)
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(`[safeRun] ${name} failed:`, err);
      import("@/lib/autoHeal")
        .then(({ reportCrash }) => reportCrash(err instanceof Error ? err : new Error(String(err)), name))
        .catch(() => {});
    });
}

function AppInit() {
  useEffect(() => {
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

  // Fix: on some Android release builds, useFonts can hang forever without
  // ever resolving fontsLoaded=true or fontError — if that happens the app
  // used to stay stuck on the splash screen indefinitely (RootLayout kept
  // returning null and SplashScreen.hideAsync() was never called). Force a
  // fallback after 4s so the app always starts, using system fonts if the
  // custom fonts never finished loading.
  const [fontsTimedOut, setFontsTimedOut] = React.useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontsTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const readyToRender = fontsLoaded || fontError || fontsTimedOut;

  useEffect(() => {
    if (readyToRender) {
      SplashScreen.hideAsync().catch(() => {});
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
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </AppProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
