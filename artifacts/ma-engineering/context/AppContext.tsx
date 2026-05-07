import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getTotalRevenue } from "@/lib/firebaseService";

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
    loadSettings();
  }, []);

  async function loadSettings() {
    const tm = await AsyncStorage.getItem("titan_mode");
    setTitanModeState(tm === "true");
    const gk = await AsyncStorage.getItem("gemini_api_key");
    setGeminiKeyState(gk ?? "");
    const wa = await AsyncStorage.getItem("wa_token");
    setWaTokenState(wa ?? "");
    const wb = await AsyncStorage.getItem("waba_id");
    setWabaIdState(wb ?? "");
    const el = await AsyncStorage.getItem("elevenlabs_api_key");
    setElevenLabsKeyState(el ?? "");
    const su = await AsyncStorage.getItem("server_url");
    setServerUrlState(su ?? "");
    getTotalRevenue().then(setTotalRevenue).catch(() => {});
  }

  const setTitanMode = async (val: boolean) => {
    await AsyncStorage.setItem("titan_mode", val ? "true" : "false");
    setTitanModeState(val);
  };
  const refreshRevenue = async () => {
    const rev = await getTotalRevenue().catch(() => 0);
    setTotalRevenue(rev);
  };
  const setGeminiKey = async (key: string) => {
    await AsyncStorage.setItem("gemini_api_key", key);
    setGeminiKeyState(key);
  };
  const setWaToken = async (token: string) => {
    await AsyncStorage.setItem("wa_token", token);
    setWaTokenState(token);
  };
  const setWabaId = async (id: string) => {
    await AsyncStorage.setItem("waba_id", id);
    setWabaIdState(id);
  };
  const setElevenLabsKey = async (key: string) => {
    await AsyncStorage.setItem("elevenlabs_api_key", key);
    setElevenLabsKeyState(key);
  };
  const setServerUrl = async (url: string) => {
    await AsyncStorage.setItem("server_url", url);
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

export const useApp = () => useContext(AppContext);
