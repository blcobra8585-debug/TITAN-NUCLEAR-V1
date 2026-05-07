import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getWAStatus, startWAConnect, disconnectWA, WAStatus } from "@/lib/waWebClient";
import { useApp } from "@/context/AppContext";

export default function WhatsAppScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { serverUrl } = useApp();
  const [status, setStatus] = useState<WAStatus>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const refresh = useCallback(async () => {
    if (!serverUrl) return;
    const s = await getWAStatus();
    setStatus(s.status);
    setQr(s.qr);
  }, [serverUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll every 3 seconds when waiting for QR scan
  useEffect(() => {
    if (status === "qr" || status === "connecting") {
      pollRef.current = setInterval(refresh, 3000);
      setPolling(true);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      setPolling(false);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, refresh]);

  async function connect() {
    if (!serverUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setStatus("connecting");
    const s = await startWAConnect();
    setStatus(s.status);
    setQr(s.qr);
    setLoading(false);
  }

  async function disconnect() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLoading(true);
    await disconnectWA();
    setStatus("disconnected");
    setQr(null);
    setLoading(false);
  }

  const statusColor = status === "connected" ? colors.neonCyan : status === "qr" ? colors.accent : colors.mutedForeground;
  const statusLabel = status === "connected" ? "Connected" : status === "qr" ? "QR Ready — Scan Now!" : status === "connecting" ? "Connecting..." : "Disconnected";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.neonBlue }]}>WHATSAPP CONNECT</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Lily Bot — Auto Reply System</Text>

      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: `${statusColor}40` }]}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
            {status === "connected" ? "WhatsApp linked — Lily is answering auto" : status === "qr" ? "Open WhatsApp → Linked Devices → Scan QR" : "Server se connect karo"}
          </Text>
        </View>
        {polling && <ActivityIndicator size="small" color={statusColor} />}
      </View>

      {/* No server URL warning */}
      {!serverUrl && (
        <View style={[styles.warnBox, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}40` }]}>
          <Feather name="alert-triangle" size={16} color={colors.accent} />
          <Text style={[styles.warnText, { color: colors.accent }]}>
            Admin Panel mein Server URL set karo pehle (jaise https://your-replit-domain.replit.app)
          </Text>
        </View>
      )}

      {/* QR Code */}
      {status === "qr" && qr && (
        <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: `${colors.accent}50` }]}>
          <Text style={[styles.qrTitle, { color: colors.accent }]}>QR CODE — SCAN KRO</Text>
          <View style={styles.qrWrapper}>
            <Image
              source={{ uri: qr }}
              style={styles.qrImage}
              contentFit="contain"
            />
          </View>
          <Text style={[styles.qrInstr, { color: colors.mutedForeground }]}>
            WhatsApp → 3 dots → Linked Devices → Link a Device → Scan
          </Text>
          <View style={[styles.timer, { backgroundColor: `${colors.accent}10` }]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.timerText, { color: colors.accent }]}>  Scan ka wait ho raha hai...</Text>
          </View>
        </View>
      )}

      {/* Connected success */}
      {status === "connected" && (
        <View style={[styles.successCard, { backgroundColor: `${colors.neonCyan}08`, borderColor: `${colors.neonCyan}40` }]}>
          <Feather name="check-circle" size={32} color={colors.neonCyan} />
          <Text style={[styles.successTitle, { color: colors.neonCyan }]}>WhatsApp Connected!</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
            Lily ab automatically clients ke WhatsApp messages ka reply karegi Gemini Pro se.
          </Text>
        </View>
      )}

      {/* How it works */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.neonBlue }]}>Kaise kaam karta hai?</Text>
        {[
          { icon: "server" as const, text: "Replit server par Lily Bot run hota hai" },
          { icon: "smartphone" as const, text: "QR scan se tumhara WhatsApp link hota hai" },
          { icon: "message-circle" as const, text: "Har client message ka Lily auto reply deti hai" },
          { icon: "zap" as const, text: "Gemini Pro se smart engineering quotes generate hoti hain" },
        ].map((item, i) => (
          <View key={i} style={styles.infoRow}>
            <Feather name={item.icon} size={16} color={colors.neonBlue} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      {status !== "connected" ? (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.neonBlue, opacity: !serverUrl || loading ? 0.5 : 1 }]}
          onPress={connect}
          disabled={!serverUrl || loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Feather name="link" size={20} color="#fff" />}
          <Text style={styles.actionBtnText}>{loading ? "Connecting..." : "WhatsApp Connect Karo"}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#FF4757" }]}
          onPress={disconnect}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Feather name="link-2" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Disconnect</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.refreshBtn, { borderColor: colors.border }]}
        onPress={refresh}
        activeOpacity={0.7}
      >
        <Feather name="refresh-cw" size={16} color={colors.neonBlue} />
        <Text style={[styles.refreshText, { color: colors.neonBlue }]}>Status Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -8 },
  statusCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1.5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statusSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  warnBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  qrCard: { padding: 20, borderRadius: 16, borderWidth: 1.5, alignItems: "center", gap: 14 },
  qrTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  qrWrapper: { padding: 12, backgroundColor: "#fff", borderRadius: 12 },
  qrImage: { width: 220, height: 220 },
  qrInstr: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  timer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  timerText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  successCard: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 10 },
  successTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  infoCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  infoTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  actionBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  refreshText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
