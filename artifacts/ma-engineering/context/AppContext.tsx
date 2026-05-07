import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { getTotalRevenue, ensureAuth } from "@/lib/firebaseService";

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
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [titanMode, setTitanModeState] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [geminiKey, setGeminiKeyState] = useState("");
  const [waToken, setWaTokenState] = useState("");
  const [wabaId, setWabaIdState] = useState("");

  useEffect(() => {
    loadSettings();
    ensureAuth().catch(() => {});
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
    const rev = await getTotalRevenue().catch(() => 0);
    setTotalRevenue(rev);
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

  return (
    <AppContext.Provider
      value={{
        titanMode,
        setTitanMode,
        totalRevenue,
        refreshRevenue,
        geminiKey,
        setGeminiKey,
        waToken,
        setWaToken,
        wabaId,
        setWabaId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
