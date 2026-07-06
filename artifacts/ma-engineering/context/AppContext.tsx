import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getTotalRevenue } from "@/lib/firebaseService";
import { getSecureItem, setSecureItem } from "@/lib/security";
import { diagLog, diagWarn } from "@/lib/diagnosticLog";

interface AppContextType {
  titanMode: boolean;
  setTitanMode: (val: boolean) => void;
  totalRevenue: number;
  refreshRevenue: () => Promise<void>;
  geminiKey: string;
  setGeminiKey: (key: string) => Promise<void>;
  waToken: string;
  setWaToken: (token: string) => Promise<void>;
  wabaId: string;
  setWabaId: (id: string) => Promise<void>;
  elevenLabsKey: string;
  setElevenLabsKey: (key: string) => Promise<void>;
  serverUrl: string;
  setServerUrl: (url: string) => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [titanMode, setTitanModeState] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [geminiKey, setGeminiKeyState] = useState("");
  const [waToken, setWaTokenState] = useState("");
  const [wabaId, setWabaIdState] = useState("");
  const [elevenLabsKey, setElevenLabsKeyState] = useState("");
  const [serverUrl, setServerUrlState] = useState("");

  useEffect(() => {
    loadSettings().catch((err) => {
      diagWarn("AppContext", `loadSettings failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, []);

  async function loadSettings() {
    diagLog("AppContext", "loading settings from AsyncStorage…");
    try {
      const [tm, gk, wa, wb, el, su] = await Promise.all([
        AsyncStorage.getItem("titan_mode").catch(() => null),
        getSecureItem("gemini_api_key").catch(() => null),
        getSecureItem("wa_token").catch(() => null),
        getSecureItem("waba_id").catch(() => null),
        getSecureItem("elevenlabs_api_key").catch(() => null),
        AsyncStorage.getItem("server_url").catch(() => null),
      ]);
      setTitanModeState(tm === "true");
      setGeminiKeyState(gk ?? "");
      setWaTokenState(wa ?? "");
      setWabaIdState(wb ?? "");
      setElevenLabsKeyState(el ?? "");
      setServerUrlState(su ?? "");
      diagLog("AppContext", `settings loaded ✓ (gemini=${gk ? "set" : "missing"}, wa=${wa ? "set" : "missing"})`);
    } catch (err) {
      diagWarn("AppContext", `settings load error: ${err instanceof Error ? err.message : String(err)}`);
    }
    getTotalRevenue()
      .then((rev) => {
        setTotalRevenue(rev);
        diagLog("AppContext", `revenue loaded ✓ ₹${rev}`);
      })
      .catch((err) => {
        diagWarn("AppContext", `revenue fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      });
  }

  const setTitanMode = async (val: boolean) => {
    await AsyncStorage.setItem("titan_mode", val ? "true" : "false").catch(() => {});
    setTitanModeState(val);
  };
  const refreshRevenue = async () => {
    const rev = await getTotalRevenue().catch(() => 0);
    setTotalRevenue(rev);
  };
  const setGeminiKey = async (key: string) => {
    await setSecureItem("gemini_api_key", key).catch(() => {});
    setGeminiKeyState(key);
  };
  const setWaToken = async (token: string) => {
    await setSecureItem("wa_token", token).catch(() => {});
    setWaTokenState(token);
  };
  const setWabaId = async (id: string) => {
    await setSecureItem("waba_id", id).catch(() => {});
    setWabaIdState(id);
  };
  const setElevenLabsKey = async (key: string) => {
    await setSecureItem("elevenlabs_api_key", key).catch(() => {});
    setElevenLabsKeyState(key);
  };
  const setServerUrl = async (url: string) => {
    await AsyncStorage.setItem("server_url", url).catch(() => {});
    setServerUrlState(url);
  };

  return (
    <AppContext.Provider
      value={{
        titanMode, setTitanMode,
        totalRevenue, refreshRevenue,
        geminiKey, setGeminiKey,
        waToken, setWaToken,
        wabaId, setWabaId,
        elevenLabsKey, setElevenLabsKey,
        serverUrl, setServerUrl,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
