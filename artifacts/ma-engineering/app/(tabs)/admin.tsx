import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkForUpdate } from "@/lib/autoUpdate";
import { getLastHuntTime } from "@/lib/autoLeadBot";

const MODEL_OPTIONS = [
  { key: "flash", label: "Gemini 1.5 Flash", desc: "Fast — low cost, quick replies" },
  { key: "pro", label: "Gemini 1.5 Pro", desc: "Smartest — best negotiations & quotes" },
  { key: "flash2", label: "Gemini 2.0 Flash", desc: "Latest — experimental, very fast" },
];

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { geminiKey, setGeminiKey, waToken, setWaToken, wabaId, setWabaId, elevenLabsKey, setElevenLabsKey, serverUrl, setServerUrl } = useApp();
  const [gKey, setGKey] = useState(geminiKey);
  const [waT, setWaT] = useState(waToken);
  const [waba, setWaba] = useState(wabaId);
  const [elKey, setElKey] = useState(elevenLabsKey);
  const [sUrl, setSUrl] = useState(serverUrl);
  const [imGlid, setImGlid] = useState("");
  const [imKey, setImKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("pro");
  const [showKeys, setShowKeys] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<string | null>(null);
  const [lastHunt, setLastHunt] = useState("Loading...");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    AsyncStorage.multiGet(["gemini_model", "indiamart_glid", "indiamart_key"]).then(vals => {
      setSelectedModel(vals[0][1] ?? "pro");
      setImGlid(vals[1][1] ?? "");
      setImKey(vals[2][1] ?? "");
    }).catch(() => {});
    getLastHuntTime().then(setLastHunt).catch(() => {});
  }, []);

  async function save() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Promise.all([
      setGeminiKey(gKey.trim()),
      setWaToken(waT.trim()),
      setWabaId(waba.trim()),
      setElevenLabsKey(elKey.trim()),
      setServerUrl(sUrl.trim()),
      AsyncStorage.setItem("gemini_model", selectedModel),
      AsyncStorage.setItem("indiamart_glid", imGlid.trim()),
      AsyncStorage.setItem("indiamart_key", imKey.trim()),
    ]);
    // Reset gemini session so new key/model takes effect
    const { resetChat } = await import("@/lib/gemini").catch(() => ({ resetChat: () => {} }));
    resetChat();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function pingServer() {
    if (!sUrl.trim()) { setPingResult("❌ Server URL daalo pehle"); return; }
    setPingResult("⏳ Ping kar raha hoon...");
    try {
      const res = await fetch(`${sUrl.trim()}/api/healthz`, { signal: AbortSignal.timeout(7000) });
      const data = await res.json();
      setPingResult(`✅ Server ONLINE — Status: ${data.status ?? "ok"}`);
    } catch (e: any) {
      setPingResult(`❌ Offline ya URL galat: ${e.message?.slice(0, 60)}`);
    }
  }

  async function checkUpdate() {
    setUpdateInfo("⏳ Checking...");
    const info = await checkForUpdate(true);
    if (info.available) {
      setUpdateInfo(`🚀 New build available! Build #${info.buildNumber}`);
    } else {
      setUpdateInfo("✅ App latest version hai");
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 50, gap: 16 }}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      <Text style={[styles.title, { color: colors.neonBlue }]}>⚙️ ADMIN PANEL</Text>

      {/* Profile */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
        <View style={[styles.avatar, { backgroundColor: `${colors.accent}20` }]}>
          <Feather name="shield" size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.adminName, { color: colors.foreground }]}>Suhan Siddiqui</Text>
          <Text style={[styles.adminSub, { color: colors.mutedForeground }]}>Master Admin • MA Engineering</Text>
        </View>
        <View style={[styles.vipBadge, { backgroundColor: `${colors.accent}20` }]}>
          <Text style={[styles.vipText, { color: colors.accent }]}>VIP</Text>
        </View>
      </View>

      {/* Auto Update */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Feather name="refresh-cw" size={16} color={colors.neonCyan} />
          <Text style={[styles.sectionTitle, { color: colors.neonCyan }]}>AUTO UPDATE SYSTEM</Text>
        </View>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>App automatically new version check karega har 6 ghante mein</Text>
        <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.neonCyan }]} onPress={checkUpdate}>
          <Feather name="download-cloud" size={15} color={colors.neonCyan} />
          <Text style={[styles.outlineBtnText, { color: colors.neonCyan }]}>Abhi Check Karo</Text>
        </TouchableOpacity>
        {updateInfo && <Text style={[styles.pingText, { color: colors.foreground }]}>{updateInfo}</Text>}
      </View>

      {/* Auto Lead Bot Status */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Feather name="target" size={16} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>AUTO LEAD BOT</Text>
        </View>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Last hunt: {lastHunt}</Text>
        <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>IndiaMART se har 3 ghante mein leads fetch hote hain automatically</Text>
      </View>

      {/* AI Model Selector */}
      <Text style={[styles.label, { color: colors.mutedForeground }]}>🧠 LILY AI MODEL</Text>
      <View style={[styles.modelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {MODEL_OPTIONS.map(m => (
          <TouchableOpacity key={m.key}
            style={[styles.modelRow, { backgroundColor: selectedModel === m.key ? `${colors.neonBlue}15` : "transparent" }]}
            onPress={() => { setSelectedModel(m.key); Haptics.selectionAsync(); }}>
            <View style={[styles.radio, { borderColor: selectedModel === m.key ? colors.neonBlue : colors.mutedForeground }]}>
              {selectedModel === m.key && <View style={[styles.radioDot, { backgroundColor: colors.neonBlue }]} />}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.modelName, { color: selectedModel === m.key ? colors.neonBlue : colors.foreground }]}>{m.label}</Text>
              <Text style={[styles.modelDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
            </View>
            {selectedModel === m.key && <View style={[styles.activeBadge, { backgroundColor: `${colors.neonBlue}20` }]}><Text style={[styles.activeText, { color: colors.neonBlue }]}>ACTIVE</Text></View>}
          </TouchableOpacity>
        ))}
      </View>

      {/* API Keys */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.mutedForeground, flex: 1 }]}>🔑 API KEYS</Text>
        <TouchableOpacity style={styles.row} onPress={() => setShowKeys(!showKeys)}>
          <Feather name={showKeys ? "eye-off" : "eye"} size={14} color={colors.neonBlue} />
          <Text style={[styles.activeText, { color: colors.neonBlue, marginLeft: 4 }]}>{showKeys ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>

      {[
        { icon: "cpu" as const, color: colors.neonBlue, ph: "Gemini API Key (AIzaSy...)", val: gKey, set: setGKey },
        { icon: "volume-2" as const, color: colors.neonCyan, ph: "ElevenLabs API Key", val: elKey, set: setElKey },
        { icon: "server" as const, color: colors.accent, ph: "Replit Server URL (https://...)", val: sUrl, set: setSUrl, secure: false },
        { icon: "message-circle" as const, color: "#25D366", ph: "WhatsApp Meta Token (EAAx...)", val: waT, set: setWaT },
        { icon: "hash" as const, color: colors.mutedForeground, ph: "WABA ID", val: waba, set: setWaba, secure: false },
      ].map((f, i) => (
        <View key={i} style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name={f.icon} size={17} color={f.color} />
          <TextInput style={[styles.textInput, { color: colors.foreground }]} placeholder={f.ph} placeholderTextColor={colors.mutedForeground} value={f.val} onChangeText={f.set} secureTextEntry={!f.secure && !showKeys} autoCapitalize="none" />
        </View>
      ))}

      {/* IndiaMART */}
      <Text style={[styles.label, { color: colors.mutedForeground }]}>🏭 INDIAMART LEAD API</Text>
      {[
        { ph: "GLID (IndiaMART Seller ID)", val: imGlid, set: setImGlid },
        { ph: "CRM API Key", val: imKey, set: setImKey },
      ].map((f, i) => (
        <View key={i} style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: "#1B75BB40" }]}>
          <Feather name="target" size={17} color="#1B75BB" />
          <TextInput style={[styles.textInput, { color: colors.foreground }]} placeholder={f.ph} placeholderTextColor={colors.mutedForeground} value={f.val} onChangeText={f.set} secureTextEntry={!showKeys} autoCapitalize="none" />
        </View>
      ))}
      <View style={[styles.infoBox, { backgroundColor: "#1B75BB08", borderColor: "#1B75BB30" }]}>
        <Feather name="info" size={14} color="#1B75BB" />
        <Text style={[styles.infoText, { color: "#1B75BB99" }]}>IndiaMART → My Account → API → Lead Manager API se GLID aur Key milega. Bot automatically leads fetch karega.</Text>
      </View>

      {/* Server Ping */}
      <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.accent }]} onPress={pingServer}>
        <Feather name="wifi" size={15} color={colors.accent} />
        <Text style={[styles.outlineBtnText, { color: colors.accent }]}>Server Ping Test</Text>
      </TouchableOpacity>
      {pingResult && <View style={[styles.pingBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.pingText, { color: colors.foreground }]}>{pingResult}</Text></View>}

      {/* Save */}
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: saved ? colors.neonCyan : colors.neonBlue }]} onPress={save}>
        <Feather name={saved ? "check-circle" : "save"} size={18} color="#060610" />
        <Text style={styles.saveBtnText}>{saved ? "✅ SAVED!" : "SAVE ALL SETTINGS"}</Text>
      </TouchableOpacity>

      <View style={[styles.infoBox, { backgroundColor: `${colors.neonBlue}05`, borderColor: `${colors.neonBlue}20` }]}>
        <Feather name="shield" size={14} color={colors.neonBlue} />
        <Text style={[styles.infoText, { color: `${colors.neonBlue}80` }]}>{"Sab keys device pe securely store hote hain. Kabhi share mat karo.\n\nGemini: aistudio.google.com\nElevenLabs: elevenlabs.io"}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  row: { flexDirection: "row", alignItems: "center" },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1.5 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  adminName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  adminSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  vipBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  vipText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  section: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  sectionSub: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: 12, borderWidth: 1, alignSelf: "flex-start" },
  outlineBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  pingBox: { padding: 12, borderRadius: 10, borderWidth: 1 },
  pingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modelCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  modelRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 10, margin: 4 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  modelName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modelDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  inputWrap: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  textInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  infoBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 19 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, shadowColor: "#00B4FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  saveBtnText: { color: "#060610", fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 1 },
});
