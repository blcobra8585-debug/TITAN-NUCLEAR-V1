import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "neon" | "bright";
export type Language = "hi" | "en";

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "neon",
  setThemeMode: async () => {},
  toggleTheme: async () => {},
  language: "hi",
  setLanguage: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("neon");
  const [language, setLanguageState] = useState<Language>("hi");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("theme_mode").catch(() => null),
      AsyncStorage.getItem("app_language").catch(() => null),
    ]).then(([tm, lang]) => {
      if (tm === "bright" || tm === "neon") setThemeModeState(tm);
      if (lang === "hi" || lang === "en") setLanguageState(lang);
    }).catch(() => {});
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    await AsyncStorage.setItem("theme_mode", mode).catch(() => {});
    setThemeModeState(mode);
  };
  const toggleTheme = async () => {
    await setThemeMode(themeMode === "neon" ? "bright" : "neon");
  };
  const setLanguage = async (lang: Language) => {
    await AsyncStorage.setItem("app_language", lang).catch(() => {});
    setLanguageState(lang);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, toggleTheme, language, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
