import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert, Platform, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { checkForUpdate } from "@/lib/autoUpdate";
import { getLastHuntTime } from "@/lib/autoLeadBot";
import { getLastRecruitmentRun } from "@/lib/recruitmentBot";
import { runDiagnostics } from "@/lib/autoHeal";
import { hasPIN, setPIN, removePIN, getSecurityStatus } from "@/lib/security";
import { resetAllAIChats } from "@/lib/multiAI";

interface ApiKeyField { label: string; storageKey: string; color: string; icon: string; placeholder: string; freeHint?: string; }

const AI_KEYS: ApiKeyField[] = [
  { label: "Google Gemini",    storageKey: "gemini_api_key",      color: "#8B5CF6", icon: "🔮", placeholder: "AIzaSy...",            freeHint: "aistudio.google.com (FREE)" },
  { label: "OpenAI / ChatGPT", storageKey: "openai_api_key",      color: "#74AA9C", icon: "🤖", placeholder: "sk-...",               freeHint: "platform.openai.com" },
  { label: "Anthropic Claude", storageKey: "anthropic_api_key",   color: "#D97757", icon: "🎭", placeholder: "sk-ant-...",           freeHint: "console.anthropic.com" },
  { label: "Groq (FREE!)",     storageKey: "groq_api_key",        color: "#F97316", icon: "🦙", placeholder: "gsk_...",              freeHint: "console.groq.com — bilkul FREE!" },
  { label: "DeepSeek",         storageKey: "deepseek_api_key",    color: "#4F46E5", icon: "🧠", placeholder: "sk-...",               freeHint: "platform.deepseek.com" },
  { label: "Mistral AI",       storageKey: "mistral_api_key",     color: "#FF7000", icon: "🌊", placeholder: "...",                  freeHint: "console.mistral.ai" },
  { label: "Cohere",           storageKey: "cohere_api_key",      color: "#39C5BB", icon: "🎯", placeholder: "...",                  freeHint: "dashboard.cohere.com" },
  { label: "Perplexity",       storageKey: "perplexity_api_key",  color: "#20B2AA", icon: "🔍", placeholder: "pplx-...",             freeHint: "perplexity.ai/settings/api" },
  { label: "ElevenLabs Voice", storageKey: "elevenlabs_api_key",  color: "#00B4FF", icon: "🎙️", placeholder: "el_...",              freeHint: "elevenlabs.io (voice AI)" },
];

const SERVICE_KEYS: ApiKeyField[] = [
  { label: "WhatsApp Meta Token", storageKey: "wa_token",      color: "#25D366", icon: "💬", placeholder: "EAAx..." },
  { label: "WhatsApp WABA ID",    storageKey: "waba_id",       color: "#25D366", icon: "#️⃣", placeholder: "1234567890..." },
  { label: "Replit Server URL",   storageKey: "server_url",    color: "#F26207", icon: "🖥️", placeholder: "https://....repl.co/api" },
];

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { geminiKey, setGeminiKey, waToken, setWaToken, wabaId, setWabaId, elevenLabsKey, setElevenLabsKey, serverUrl, setServerUrl } = useApp();

  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<string | null>(null);
  const [lastHunt, setLastHunt] = useState("...");
  const [lastRecruit, setLastRecruit] = useState("...");
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [runningDiag, setRunningDiag] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [showPinSection, setShowPinSection] = useState(false);
  const [imGlid, setImGlid] = useState("");
  const [imKey, setImKey] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const allKeys = [...AI_KEYS, ...SERVICE_KEYS].map(k => k.storageKey);
    const vals = await AsyncStorage.multiGet([...allKeys, "indiamart_glid", "indiamart_key"]);
    const map: Record<string, string> = {};
    vals.forEach(([k, v]) => { if (v) map[k] = v; });
    setKeyValues(map);
    setImGlid(map["indiamart_glid"] ?? "");
    setImKey(map["indiamart_key"] ?? "");
    getLastHuntTime().then(setLastHunt);
    getLastRecruitmentRun().then(setLastRecruit);
    hasPIN().then(setPinEnabled);
  }

  async function saveAll() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const pairs: [string, string][] = Object.entries(keyValues).map(([k, v]) => [k, v.trim()]);
    pairs.push(["indiamart_glid", imGlid.trim()], ["indiamart_key", imKey.trim()]);
    await AsyncStorage.multiSet(pairs);
    // Sync app context
    if (keyValues["gemini_api_key"] !== undefined) await setGeminiKey(keyValues["gemini_api_key"].trim());
    if (keyValues["wa_token"] !== undefined) await setWaToken(keyValues["wa_token"].trim());
    if (keyValues["waba_id"] !== undefined) await setWabaId(keyValues["waba_id"].trim());
    if (keyValues["elevenlabs_api_key"] !== undefined) await setElevenLabsKey(keyValues["elevenlabs_api_key"].trim());
    if (keyValues["server_url"] !== undefined) await setServerUrl(keyValues["server_url"].trim());
    resetAllAIChats();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function setKey(storageKey: string, val: string) {
    setKeyValues(prev => ({ ...prev, [storageKey]: val }));
  }

  async function pingServer() {
    const url = (keyValues["server_url"] ?? serverUrl).trim();
    if (!url) { setPingResult("❌ Server URL daalo pehle"); return; }
    setPingResult("⏳ Pinging...");
    try {
      const res = await fetch(`${url}/api/healthz`, { signal: AbortSignal.timeout(7000) });
      const data = await res.json();
      setPingResult(`✅ ONLINE — ${data.status ?? "ok"}`);
    } catch (e: any) {
      setPingResult(`❌ Offline: ${e.message?.slice(0, 50)}`);
    }
  }

  async function checkUpdate() {
    setUpdateInfo("⏳ Checking GitHub...");
    const info = await checkForUpdate(true);
    setUpdateInfo(info.available ? `🚀 New Build #${info.buildNumber} available!` : "✅ App is latest version");
  }

  async function runDiag() {
    setRunningDiag(true);
    const results = await runDiagnostics();
    setDiagnostics(results);
    setRunningDiag(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handlePinToggle(val: boolean) {
    if (!val) {
      Alert.alert("Remove PIN?", "App se PIN lock hata doge?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: async () => { await removePIN(); setPinEnabled(false); } },
      ]);
    } else {
      setShowPinSection(true);
    }
  }

  async function savePin() {
    if (newPin.length < 4) { Alert.alert("Error", "PIN kam se kam 4 digits ka hona chahiye"); return; }
    await setPIN(newPin);
    setPinEnabled(true);
    setNewPin("");
    setShowPinSection(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("✅ PIN Set!", "App ab PIN se protect ho gayi. Admin Panel mein PIN change kar sakte ho.");
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 18, paddingBottom: 60, gap: 16 }}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.neonBlue }]}>⚙️ ADMIN PANEL</Text>
        <View style={[styles.vipBadge, { backgroundColor: `${colors.accent}20`, borderColor: `${colors.accent}50` }]}>
          <Text style={[styles.vipText, { color: colors.accent }]}>MASTER</Text>
        </View>
      </View>

      {/* Profile Card */}
      <View style={[styles.card, { borderColor: `${colors.accent}50` }]}>
        <View style={[styles.avatar, { backgroundColor: `${colors.accent}20` }]}>
          <Feather name="shield" size={26} color={colors.accent} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.adminName, { color: colors.foreground }]}>Suhan Siddiqui</Text>
          <Text style={[styles.adminSub, { color: colors.mutedForeground }]}>Master Admin • MA Engineering</Text>
          <Text style={[styles.adminSub, { color: colors.neonBlue }]}>+917895643069</Text>
        </View>
      </View>

      {/* System Status */}
      <View style={[styles.section, { borderColor: `${colors.neonCyan}30` }]}>
        <Text style={[styles.sectionTitle, { color: colors.neonCyan }]}>🖥️ SYSTEM STATUS</Text>
        {[
          { label: "Lead Bot", value: `Last: ${lastHunt}`, color: colors.neonBlue },
          { label: "Recruit Bot", value: `Last: ${lastRecruit}`, color: "#F97316" },
        ].map(s => (
          <View key={s.label} style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: s.color }]} />
            <Text style={[styles.statusLabel, { color: colors.foreground }]}>{s.label}</Text>
            <Text style={[styles.statusVal, { color: colors.mutedForeground }]}>{s.value}</Text>
          </View>
        ))}
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.neonCyan }]} onPress={checkUpdate}>
            <Feather name="download-cloud" size={14} color={colors.neonCyan} />
            <Text style={[styles.outlineBtnText, { color: colors.neonCyan }]}>Check Update</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.accent }]} onPress={pingServer}>
            <Feather name="wifi" size={14} color={colors.accent} />
            <Text style={[styles.outlineBtnText, { color: colors.accent }]}>Ping Server</Text>
          </TouchableOpacity>
        </View>
        {(updateInfo || pingResult) && (
          <View style={[styles.resultBox, { backgroundColor: `${colors.neonBlue}08`, borderColor: `${colors.neonBlue}20` }]}>
            {updateInfo && <Text style={[styles.resultText, { color: colors.foreground }]}>{updateInfo}</Text>}
            {pingResult && <Text style={[styles.resultText, { color: colors.foreground }]}>{pingResult}</Text>}
          </View>
        )}
      </View>

      {/* Diagnostics */}
      <View style={[styles.section, { borderColor: `${colors.neonBlue}20` }]}>
        <Text style={[styles.sectionTitle, { color: colors.neonBlue }]}>🔬 AUTO DIAGNOSTICS</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>App ki sari settings check karo — errors auto-detect ho jaayenge</Text>
        <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.neonBlue }]} onPress={runDiag} disabled={runningDiag}>
          <Feather name="activity" size={14} color={colors.neonBlue} />
          <Text style={[styles.outlineBtnText, { color: colors.neonBlue }]}>{runningDiag ? "Running..." : "Run Diagnostics"}</Text>
        </TouchableOpacity>
        {diagnostics.map((d, i) => (
          <View key={i} style={styles.diagRow}>
            <Feather name={d.status === "ok" ? "check-circle" : d.status === "warning" ? "alert-circle" : "x-circle"} size={14}
              color={d.status === "ok" ? "#00FF41" : d.status === "warning" ? "#FFB900" : "#FF4444"} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.diagLabel, { color: colors.foreground }]}>{d.issue}</Text>
              {d.fix && <Text style={[styles.diagFix, { color: colors.mutedForeground }]}>{d.fix}</Text>}
            </View>
          </View>
        ))}
      </View>

      {/* Security */}
      <View style={[styles.section, { borderColor: "#FF444430" }]}>
        <Text style={[styles.sectionTitle, { color: "#FF4444" }]}>🔒 SECURITY</Text>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>PIN Lock</Text>
            <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>App kholne pe PIN maange</Text>
          </View>
          <Switch value={pinEnabled} onValueChange={handlePinToggle}
            trackColor={{ false: colors.border, true: "#FF444460" }}
            thumbColor={pinEnabled ? "#FF4444" : colors.mutedForeground} />
        </View>
        {showPinSection && (
          <View style={{ gap: 10 }}>
            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: "#FF444440" }]}>
              <Feather name="lock" size={16} color="#FF4444" />
              <TextInput style={[styles.textInput, { color: colors.foreground }]} placeholder="4-6 digit PIN set karo" placeholderTextColor={colors.mutedForeground}
                value={newPin} onChangeText={setNewPin} keyboardType="numeric" secureTextEntry maxLength={6} />
            </View>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: "#FF4444" }]} onPress={savePin}>
              <Feather name="lock" size={14} color="#FF4444" />
              <Text style={[styles.outlineBtnText, { color: "#FF4444" }]}>PIN Save Karo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* AI API Keys */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>🤖 AI MODEL KEYS</Text>
        <TouchableOpacity onPress={() => setShowKeys(!showKeys)} style={styles.showHideBtn}>
          <Feather name={showKeys ? "eye-off" : "eye"} size={14} color={colors.neonBlue} />
          <Text style={[styles.showHideText, { color: colors.neonBlue }]}>{showKeys ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>

      {AI_KEYS.map(f => (
        <View key={f.storageKey}>
          <View style={[styles.inputWrap, { borderColor: `${f.color}35` }]}>
            <Text style={{ fontSize: 16 }}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.keyLabel, { color: f.color }]}>{f.label}</Text>
              <TextInput style={[styles.keyInput, { color: colors.foreground }]}
                placeholder={f.placeholder} placeholderTextColor={`${colors.mutedForeground}70`}
                value={keyValues[f.storageKey] ?? ""}
                onChangeText={v => setKey(f.storageKey, v)}
                secureTextEntry={!showKeys} autoCapitalize="none" autoCorrect={false} />
            </View>
            {keyValues[f.storageKey] ? (
              <Feather name="check-circle" size={16} color="#00FF41" />
            ) : (
              <Feather name="circle" size={16} color={`${colors.mutedForeground}40`} />
            )}
          </View>
          {f.freeHint && !keyValues[f.storageKey] && (
            <Text style={[styles.freeHint, { color: `${f.color}80` }]}>💡 {f.freeHint}</Text>
          )}
        </View>
      ))}

      {/* Service Keys */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>🔧 SERVICE KEYS</Text>
      {SERVICE_KEYS.map(f => (
        <View key={f.storageKey} style={[styles.inputWrap, { borderColor: `${f.color}35` }]}>
          <Text style={{ fontSize: 16 }}>{f.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.keyLabel, { color: f.color }]}>{f.label}</Text>
            <TextInput style={[styles.keyInput, { color: colors.foreground }]}
              placeholder={f.placeholder} placeholderTextColor={`${colors.mutedForeground}70`}
              value={keyValues[f.storageKey] ?? ""}
              onChangeText={v => setKey(f.storageKey, v)}
              secureTextEntry={!showKeys && f.storageKey !== "server_url"}
              autoCapitalize="none" autoCorrect={false} />
          </View>
          {keyValues[f.storageKey] ? <Feather name="check-circle" size={16} color="#00FF41" /> : <Feather name="circle" size={16} color={`${colors.mutedForeground}40`} />}
        </View>
      ))}

      {/* IndiaMART */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>🏭 INDIAMART LEAD API</Text>
      {[
        { ph: "GLID (Seller ID)", val: imGlid, set: setImGlid },
        { ph: "CRM API Key", val: imKey, set: setImKey },
      ].map((f, i) => (
        <View key={i} style={[styles.inputWrap, { borderColor: "#1B75BB35" }]}>
          <Feather name="target" size={16} color="#1B75BB" />
          <TextInput style={[styles.textInput, { color: colors.foreground }]} placeholder={f.ph} placeholderTextColor={`${colors.mutedForeground}70`}
            value={f.val} onChangeText={f.set} secureTextEntry={!showKeys} autoCapitalize="none" />
        </View>
      ))}
      <View style={[styles.infoBox, { backgroundColor: "#1B75BB08", borderColor: "#1B75BB25" }]}>
        <Feather name="info" size={13} color="#1B75BB" />
        <Text style={[styles.infoText, { color: "#1B75BB90" }]}>IndiaMART → My Account → API → Lead Manager API. Bot har 3 ghante mein auto-fetch karega.</Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: saved ? "#00FF41" : colors.neonBlue, shadowColor: saved ? "#00FF41" : colors.neonBlue }]} onPress={saveAll} activeOpacity={0.85}>
        <Feather name={saved ? "check-circle" : "save"} size={20} color="#000" />
        <Text style={styles.saveBtnText}>{saved ? "✅ ALL SAVED!" : "SAVE ALL SETTINGS"}</Text>
      </TouchableOpacity>

      <View style={[styles.infoBox, { backgroundColor: `${colors.neonBlue}05`, borderColor: `${colors.neonBlue}15` }]}>
        <Feather name="shield" size={13} color={colors.neonBlue} />
        <Text style={[styles.infoText, { color: `${colors.neonBlue}70` }]}>
          {"Sab keys device pe encrypted store hote hain.\n\n🆓 FREE AIs: Groq (Llama/Mixtral), Gemini (aistudio.google.com)\n\nGroq = duniya ki sabse fast AI — bilkul free!"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  vipBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  vipText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  card: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1.5, backgroundColor: "transparent" },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  adminName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  adminSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  section: { padding: 15, borderRadius: 14, borderWidth: 1, gap: 10, backgroundColor: "transparent" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  sectionSub: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sectionLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  showHideBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  showHideText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusVal: { fontSize: 10, fontFamily: "Inter_400Regular" },
  btnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  outlineBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  resultBox: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 4 },
  resultText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  diagRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  diagLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  diagFix: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  switchRow: { flexDirection: "row", alignItems: "center" },
  switchLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  switchSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  inputWrap: { flexDirection: "row", alignItems: "center", padding: 13, borderRadius: 13, borderWidth: 1, gap: 10, backgroundColor: "transparent" },
  keyLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 3 },
  keyInput: { fontSize: 12, fontFamily: "Inter_400Regular" },
  textInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  freeHint: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: -6, marginLeft: 14, marginBottom: 4 },
  infoBox: { flexDirection: "row", gap: 10, padding: 13, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 18 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  saveBtnText: { color: "#000", fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 1 },
});
