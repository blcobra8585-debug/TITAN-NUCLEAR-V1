import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { setModel, getCurrentModel } from "@/lib/gemini";
import { requestNotificationPermission } from "@/lib/notifications";

const MODEL_OPTIONS = [
  { key: "flash", label: "Gemini Flash", desc: "Fast replies, less token cost" },
  { key: "pro", label: "Gemini 1.5 Pro", desc: "Smartest, best for negotiations" },
  { key: "flash2", label: "Gemini 2.0 Flash", desc: "Latest model, experimental" },
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
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [selectedModel, setSelectedModel] = useState("pro");
  const [notifGranted, setNotifGranted] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  useEffect(() => {
    getCurrentModel().then(setSelectedModel);
  }, []);

  async function save() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setGeminiKey(gKey.trim());
    await setWaToken(waT.trim());
    await setWabaId(waba.trim());
    await setElevenLabsKey(elKey.trim());
    await setServerUrl(sUrl.trim());
    await setModel(selectedModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function pingServer() {
    if (!sUrl.trim()) { setPingResult("❌ Server URL empty hai"); return; }
    setPingResult("⏳ Ping kar raha hoon...");
    try {
      const res = await fetch(`${sUrl.trim()}/api/healthz`, { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      setPingResult(`✅ Server Online! Status: ${data.status ?? "ok"}`);
    } catch (e: any) {
      setPingResult(`❌ Server offline ya URL galat: ${e.message?.slice(0, 50)}`);
    }
  }

  async function requestNotif() {
    const ok = await requestNotificationPermission();
    setNotifGranted(ok);
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.screenTitle, { color: colors.neonBlue }]}>VIP ADMIN PANEL</Text>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
        <View style={[styles.avatar, { backgroundColor: `${colors.accent}20` }]}>
          <Feather name="shield" size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.adminName, { color: colors.foreground }]}>Suhan Siddiqui</Text>
          <Text style={[styles.adminSub, { color: colors.mutedForeground }]}>Master Admin • +917895643069</Text>
        </View>
        <View style={[styles.vipBadge, { backgroundColor: `${colors.accent}20` }]}>
          <Text style={[styles.vipText, { color: colors.accent }]}>VIP</Text>
        </View>
      </View>

      {/* Firebase Status */}
      <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: `${colors.neonCyan}40` }]}>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: colors.neonCyan }]} />
          <Text style={[styles.statusText, { color: colors.neonCyan }]}>Firebase Connected</Text>
        </View>
        <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>ma-engineering-titan • Auth ✓ Firestore ✓ Storage ✓</Text>
      </View>

      {/* AI MODEL SELECTION */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>🧠 LILY AI MODEL</Text>
      <View style={[styles.modelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {MODEL_OPTIONS.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modelRow, { backgroundColor: selectedModel === m.key ? `${colors.neonBlue}15` : "transparent", borderColor: selectedModel === m.key ? `${colors.neonBlue}40` : "transparent" }]}
            onPress={() => { setSelectedModel(m.key); Haptics.selectionAsync(); }}
          >
            <View style={[styles.radio, { borderColor: selectedModel === m.key ? colors.neonBlue : colors.mutedForeground }]}>
              {selectedModel === m.key && <View style={[styles.radioDot, { backgroundColor: colors.neonBlue }]} />}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.modelName, { color: selectedModel === m.key ? colors.neonBlue : colors.foreground }]}>{m.label}</Text>
              <Text style={[styles.modelDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
            </View>
            {selectedModel === m.key && (
              <View style={[styles.activeBadge, { backgroundColor: `${colors.neonBlue}20` }]}>
                <Text style={[styles.activeText, { color: colors.neonBlue }]}>ACTIVE</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* API KEYS */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>🔑 API CONFIGURATION</Text>
      <TouchableOpacity style={[styles.toggleRow, { borderColor: colors.border }]} onPress={() => setShowKeys(!showKeys)}>
        <Feather name={showKeys ? "eye-off" : "eye"} size={16} color={colors.neonBlue} />
        <Text style={[styles.toggleText, { color: colors.neonBlue }]}>{showKeys ? "Keys Chhupao" : "Keys Dikhao"}</Text>
      </TouchableOpacity>

      {[
        { icon: "cpu", color: colors.neonBlue, placeholder: "Gemini API Key (AIza...)", value: gKey, onChange: setGKey, label: "PRO", secure: true },
        { icon: "volume-2", color: colors.neonCyan, placeholder: "ElevenLabs API Key (Lily voice)", value: elKey, onChange: setElKey, secure: true },
        { icon: "server", color: colors.accent, placeholder: "Replit Server URL (https://...)", value: sUrl, onChange: setSUrl, secure: false },
        { icon: "message-circle", color: "#25D366", placeholder: "WhatsApp Meta Token (EAAx...)", value: waT, onChange: setWaT, secure: true },
        { icon: "hash", color: colors.mutedForeground, placeholder: "WABA ID (123456...)", value: waba, onChange: setWaba, secure: false },
      ].map((f, i) => (
        <View key={i} style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name={f.icon as any} size={17} color={f.color} />
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder={f.placeholder}
            placeholderTextColor={colors.mutedForeground}
            value={f.value}
            onChangeText={f.onChange}
            secureTextEntry={f.secure && !showKeys}
            autoCapitalize="none"
          />
          {f.label && (
            <View style={[styles.keyTag, { backgroundColor: `${f.color}15` }]}>
              <Text style={[styles.keyTagText, { color: f.color }]}>{f.label}</Text>
            </View>
          )}
        </View>
      ))}

      {/* Server Ping Test */}
      <TouchableOpacity style={[styles.pingBtn, { borderColor: colors.accent }]} onPress={pingServer}>
        <Feather name="wifi" size={15} color={colors.accent} />
        <Text style={[styles.pingText, { color: colors.accent }]}>Server Ping Test</Text>
      </TouchableOpacity>
      {pingResult && (
        <View style={[styles.pingResult, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.pingResultText, { color: colors.foreground }]}>{pingResult}</Text>
        </View>
      )}

      {/* Notifications */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>🔔 NOTIFICATIONS</Text>
      <TouchableOpacity
        style={[styles.notifBtn, { backgroundColor: notifGranted ? `${colors.neonCyan}10` : colors.card, borderColor: notifGranted ? colors.neonCyan : colors.border }]}
        onPress={requestNotif}
      >
        <Feather name={notifGranted ? "bell" : "bell-off"} size={18} color={notifGranted ? colors.neonCyan : colors.mutedForeground} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.notifTitle, { color: notifGranted ? colors.neonCyan : colors.foreground }]}>
            {notifGranted ? "Notifications ON ✓" : "Notifications Allow Karo"}
          </Text>
          <Text style={[styles.notifSub, { color: colors.mutedForeground }]}>
            Lily ke bot replies ka alert milega instantly
          </Text>
        </View>
      </TouchableOpacity>

      {/* Info */}
      <View style={[styles.infoBox, { backgroundColor: `${colors.neonCyan}08`, borderColor: `${colors.neonCyan}30` }]}>
        <Feather name="info" size={16} color={colors.neonCyan} style={{ marginTop: 2 }} />
        <Text style={[styles.infoText, { color: `${colors.neonCyan}CC` }]}>
          {"• Gemini: aistudio.google.com\n• ElevenLabs: elevenlabs.io/app\n• Server URL: Replit deployed domain\n• Sab keys device par securely encrypted hote hain\n• Kabhi bhi bahar share mat karo"}
        </Text>
      </View>

      {/* Save */}
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: saved ? colors.neonCyan : colors.neonBlue }]} onPress={save} activeOpacity={0.85}>
        <Feather name={saved ? "check-circle" : "save"} size={18} color="#060610" />
        <Text style={styles.saveBtnText}>{saved ? "SAVED SUCCESSFULLY!" : "SAVE ALL SETTINGS"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1.5 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  adminName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  adminSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  vipBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  vipText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  statusCard: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statusSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  modelCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  modelRow: { flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1, margin: 4, borderRadius: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  modelName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modelDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, alignSelf: "flex-start" },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputWrap: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  textInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  keyTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  keyTagText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  pingBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, alignSelf: "flex-start" },
  pingText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pingResult: { padding: 12, borderRadius: 10, borderWidth: 1 },
  pingResultText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  notifBtn: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1 },
  notifTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notifSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  infoBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 19 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, shadowColor: "#00B4FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  saveBtnText: { color: "#060610", fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 1 },
});
