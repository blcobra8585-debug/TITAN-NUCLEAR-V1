import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

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

  async function save() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setGeminiKey(gKey.trim());
    await setWaToken(waT.trim());
    await setWabaId(waba.trim());
    await setElevenLabsKey(elKey.trim());
    await setServerUrl(sUrl.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: Platform.OS === "web" ? 34 : 20, gap: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.screenTitle, { color: colors.neonBlue }]}>VIP ADMIN PANEL</Text>

      {/* Admin Profile */}
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
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: colors.neonCyan }]} />
          <Text style={[styles.statusText, { color: colors.neonCyan }]}>Firebase Connected</Text>
        </View>
        <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>Project: ma-engineering-titan</Text>
        <View style={[styles.row, { gap: 16, marginTop: 10, flexWrap: "wrap" }]}>
          {["Auth ✓", "Firestore ✓", "Storage ✓"].map((s) => (
            <View key={s} style={[styles.tag, { borderColor: `${colors.neonCyan}40`, backgroundColor: `${colors.neonCyan}10` }]}>
              <Text style={[styles.tagText, { color: colors.neonCyan }]}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>API CONFIGURATION</Text>

      {/* Show/Hide toggle */}
      <TouchableOpacity
        style={[styles.toggleRow, { borderColor: colors.border }]}
        onPress={() => setShowKeys(!showKeys)}
      >
        <Feather name={showKeys ? "eye-off" : "eye"} size={16} color={colors.neonBlue} />
        <Text style={[styles.toggleText, { color: colors.neonBlue }]}>
          {showKeys ? "Hide Keys" : "Show API Keys"}
        </Text>
      </TouchableOpacity>

      {/* Gemini Pro Key */}
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="cpu" size={18} color={colors.neonBlue} />
        <TextInput
          style={[styles.textInput, { color: colors.foreground }]}
          placeholder="Gemini Pro API Key (AIza...)"
          placeholderTextColor={colors.mutedForeground}
          value={gKey}
          onChangeText={setGKey}
          secureTextEntry={!showKeys}
          autoCapitalize="none"
        />
        <View style={[styles.keyTag, { backgroundColor: `${colors.neonBlue}15` }]}>
          <Text style={[styles.keyTagText, { color: colors.neonBlue }]}>PRO</Text>
        </View>
      </View>

      {/* ElevenLabs Key */}
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="volume-2" size={18} color={colors.neonCyan} />
        <TextInput
          style={[styles.textInput, { color: colors.foreground }]}
          placeholder="ElevenLabs API Key (Lily voice)"
          placeholderTextColor={colors.mutedForeground}
          value={elKey}
          onChangeText={setElKey}
          secureTextEntry={!showKeys}
          autoCapitalize="none"
        />
      </View>

      {/* Server URL */}
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="server" size={18} color={colors.accent} />
        <TextInput
          style={[styles.textInput, { color: colors.foreground }]}
          placeholder="Replit Server URL (https://...replit.app)"
          placeholderTextColor={colors.mutedForeground}
          value={sUrl}
          onChangeText={setSUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WHATSAPP BUSINESS API</Text>

      {/* WhatsApp Token */}
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="message-circle" size={18} color={colors.neonBlue} />
        <TextInput
          style={[styles.textInput, { color: colors.foreground }]}
          placeholder="WhatsApp Meta Token (EAAx...)"
          placeholderTextColor={colors.mutedForeground}
          value={waT}
          onChangeText={setWaT}
          secureTextEntry={!showKeys}
          autoCapitalize="none"
        />
      </View>

      {/* WABA ID */}
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="hash" size={18} color={colors.neonBlue} />
        <TextInput
          style={[styles.textInput, { color: colors.foreground }]}
          placeholder="WABA ID (12345...)"
          placeholderTextColor={colors.mutedForeground}
          value={waba}
          onChangeText={setWaba}
          autoCapitalize="none"
        />
      </View>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: `${colors.neonCyan}08`, borderColor: `${colors.neonCyan}30` }]}>
        <Feather name="info" size={16} color={colors.neonCyan} style={{ marginTop: 2 }} />
        <Text style={[styles.infoText, { color: `${colors.neonCyan}CC` }]}>
          {"• Gemini Pro Key: aistudio.google.com\n• ElevenLabs: elevenlabs.io/app\n• Server URL: Replit app domain (WhatsApp Web ke liye)\n• Sab keys device par securely store hote hain"}
        </Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: saved ? colors.neonCyan : colors.neonBlue }]}
        onPress={save}
        activeOpacity={0.85}
      >
        <Feather name={saved ? "check" : "save"} size={18} color="#060610" />
        <Text style={styles.saveBtnText}>{saved ? "SAVED!" : "SAVE CONFIGURATION"}</Text>
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
  statusCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statusSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignSelf: "flex-start" },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputWrap: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  textInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  keyTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  keyTagText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  infoBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 19 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, shadowColor: "#00B4FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  saveBtnText: { color: "#060610", fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 1 },
});
