import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
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

interface BotReply {
  phone: string;
  userMsg: string;
  botMsg: string;
  time: number;
}

interface BotStats {
  enabled: boolean;
  totalMessages: number;
  totalReplies: number;
  uptime: number;
  activeChats: number;
}

type TabView = "connect" | "replies" | "stats";

export default function WhatsAppScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { serverUrl } = useApp();
  const [status, setStatus] = useState<WAStatus>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabView>("connect");
  const [replies, setReplies] = useState<BotReply[]>([]);
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [botEnabled, setBotEnabledState] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fetchAll = useCallback(async () => {
    if (!serverUrl) return;
    try {
      const [waRes, repliesRes, statsRes] = await Promise.all([
        fetch(`${serverUrl}/api/wa/status`, { signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => null),
        fetch(`${serverUrl}/api/wa/bot-replies`, { signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => null),
        fetch(`${serverUrl}/api/bot/status`, { signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => null),
      ]);
      if (waRes) { setStatus(waRes.status ?? "disconnected"); setQr(waRes.qr ?? null); }
      if (repliesRes?.replies) setReplies(repliesRes.replies);
      if (statsRes) { setBotStats(statsRes); setBotEnabledState(statsRes.enabled ?? true); }
    } catch {}
  }, [serverUrl]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    pollRef.current = setInterval(fetchAll, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchAll]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

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

  async function toggleBot() {
    if (!serverUrl) return;
    Haptics.selectionAsync();
    const endpoint = botEnabled ? "disable" : "enable";
    await fetch(`${serverUrl}/api/bot/${endpoint}`, { method: "POST", signal: AbortSignal.timeout(5000) }).catch(() => {});
    setBotEnabledState(!botEnabled);
    await fetchAll();
  }

  const statusColor = status === "connected" ? colors.neonCyan : status === "qr" ? "#F59E0B" : status === "connecting" ? colors.neonBlue : colors.mutedForeground;
  const statusLabel = status === "connected" ? "Connected" : status === "qr" ? "QR Ready — Scan Now!" : status === "connecting" ? "Connecting..." : "Disconnected";

  function fmtTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtUptime(s: number) {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  }

  const TABS: { key: TabView; label: string; icon: any }[] = [
    { key: "connect", label: "Connect", icon: "link" },
    { key: "replies", label: `Replies (${replies.length})`, icon: "message-circle" },
    { key: "stats", label: "Stats", icon: "bar-chart-2" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.neonBlue }]}>WHATSAPP TITAN</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Lily Bot • Auto Reply System</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}40` }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, { backgroundColor: tab === t.key ? `${colors.neonBlue}20` : "transparent", borderBottomColor: tab === t.key ? colors.neonBlue : "transparent" }]}
            onPress={() => setTab(t.key)}
          >
            <Feather name={t.icon} size={14} color={tab === t.key ? colors.neonBlue : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: tab === t.key ? colors.neonBlue : colors.mutedForeground }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonBlue} />}
      >
        {/* === CONNECT TAB === */}
        {tab === "connect" && (
          <>
            {!serverUrl && (
              <View style={[styles.warnBox, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}40` }]}>
                <Feather name="alert-triangle" size={16} color={colors.accent} />
                <Text style={[styles.warnText, { color: colors.accent }]}>Admin Panel mein Server URL set karo (Replit domain)</Text>
              </View>
            )}

            {status === "qr" && qr && (
              <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: "#F59E0B50" }]}>
                <Text style={[styles.qrTitle, { color: "#F59E0B" }]}>SCAN WITH WHATSAPP</Text>
                <View style={styles.qrWrapper}>
                  <Image source={{ uri: qr }} style={styles.qrImage} contentFit="contain" />
                </View>
                <Text style={[styles.qrInstr, { color: colors.mutedForeground }]}>
                  WhatsApp → 3 dots → Linked Devices → Link a Device → Scan
                </Text>
                <View style={[styles.scanningBadge, { backgroundColor: "#F59E0B15" }]}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={[styles.scanningText, { color: "#F59E0B" }]}>  Scan ka intezaar hai...</Text>
                </View>
              </View>
            )}

            {status === "connected" && (
              <View style={[styles.connectedCard, { backgroundColor: `${colors.neonCyan}08`, borderColor: `${colors.neonCyan}40` }]}>
                <Feather name="check-circle" size={36} color={colors.neonCyan} />
                <Text style={[styles.connectedTitle, { color: colors.neonCyan }]}>WhatsApp Connected!</Text>
                <Text style={[styles.connectedSub, { color: colors.mutedForeground }]}>
                  Lily ab automatically clients ke messages ka reply kar rahi hai Gemini Pro se
                </Text>

                {/* Bot Toggle */}
                <TouchableOpacity
                  style={[styles.botToggle, { backgroundColor: botEnabled ? `${colors.neonCyan}20` : `${colors.accent}20`, borderColor: botEnabled ? colors.neonCyan : colors.accent }]}
                  onPress={toggleBot}
                >
                  <Feather name={botEnabled ? "zap" : "zap-off"} size={16} color={botEnabled ? colors.neonCyan : colors.accent} />
                  <Text style={[styles.botToggleText, { color: botEnabled ? colors.neonCyan : colors.accent }]}>
                    Lily Bot: {botEnabled ? "ON (Auto-Reply Active)" : "OFF (Manual Mode)"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* How it works */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoTitle, { color: colors.neonBlue }]}>Kaise kaam karta hai?</Text>
              {[
                { icon: "server" as const, text: "Replit server par Lily Bot 24/7 run hota hai", color: colors.neonBlue },
                { icon: "smartphone" as const, text: "QR scan se tumhara WhatsApp link hota hai (no logout)", color: colors.neonCyan },
                { icon: "message-circle" as const, text: "Har client message ka Lily AI auto reply deti hai", color: "#25D366" },
                { icon: "zap" as const, text: "Gemini Pro se smart engineering quotes aur negotiations", color: colors.accent },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <Feather name={item.icon} size={15} color={item.color} />
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{item.text}</Text>
                </View>
              ))}
            </View>

            {/* Action Button */}
            {status !== "connected" ? (
              <TouchableOpacity
                style={[styles.mainBtn, { backgroundColor: colors.neonBlue, opacity: !serverUrl || loading ? 0.5 : 1 }]}
                onPress={connect}
                disabled={!serverUrl || loading}
              >
                {loading ? <ActivityIndicator color="#000" /> : <Feather name="link" size={20} color="#000" />}
                <Text style={styles.mainBtnText}>{loading ? "Connecting..." : "Connect WhatsApp"}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.mainBtn, { backgroundColor: "#FF4757" }]} onPress={disconnect} disabled={loading}>
                <Feather name="link-2" size={20} color="#fff" />
                <Text style={[styles.mainBtnText, { color: "#fff" }]}>Disconnect</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* === REPLIES TAB === */}
        {tab === "replies" && (
          <>
            <View style={[styles.repliesHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="message-circle" size={18} color={colors.neonBlue} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.repliesTitle, { color: colors.foreground }]}>Live Bot Reply Log</Text>
                <Text style={[styles.repliesSub, { color: colors.mutedForeground }]}>Last 50 Lily auto-replies • Auto-refresh</Text>
              </View>
              <View style={[styles.liveChip, { backgroundColor: `${colors.neonCyan}15`, borderColor: `${colors.neonCyan}40` }]}>
                <View style={[styles.dot, { backgroundColor: colors.neonCyan, width: 6, height: 6 }]} />
                <Text style={[styles.liveText, { color: colors.neonCyan }]}>LIVE</Text>
              </View>
            </View>

            {replies.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="inbox" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {!serverUrl ? "Server URL set karo Admin Panel mein" : "Abhi koi WhatsApp replies nahi aaye\nWhatsApp connect karo aur client message bhejo"}
                </Text>
              </View>
            ) : (
              replies.map((reply, i) => (
                <View key={i} style={[styles.replyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.replyTop}>
                    <View style={[styles.phoneChip, { backgroundColor: `${colors.neonBlue}15` }]}>
                      <Feather name="phone" size={11} color={colors.neonBlue} />
                      <Text style={[styles.phoneText, { color: colors.neonBlue }]}>
                        +{"*".repeat(7)}{reply.phone.slice(-4)}
                      </Text>
                    </View>
                    <Text style={[styles.replyTime, { color: colors.mutedForeground }]}>{fmtTime(reply.time)}</Text>
                  </View>
                  <View style={[styles.msgBox, { backgroundColor: `${colors.accent}08`, borderColor: `${colors.accent}20` }]}>
                    <Text style={[styles.msgLabel, { color: colors.mutedForeground }]}>CLIENT:</Text>
                    <Text style={[styles.msgText, { color: colors.foreground }]}>{reply.userMsg}</Text>
                  </View>
                  <View style={[styles.msgBox, { backgroundColor: `${colors.neonBlue}08`, borderColor: `${colors.neonBlue}20` }]}>
                    <Text style={[styles.msgLabel, { color: colors.neonBlue }]}>LILY:</Text>
                    <Text style={[styles.msgText, { color: colors.foreground }]}>{reply.botMsg}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* === STATS TAB === */}
        {tab === "stats" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>BOT PERFORMANCE</Text>
            <View style={styles.statsGrid}>
              {[
                { label: "Total Msgs", value: botStats?.totalMessages ?? 0, color: colors.neonBlue, icon: "message-circle" as const },
                { label: "Replies Sent", value: botStats?.totalReplies ?? 0, color: "#25D366", icon: "send" as const },
                { label: "Active Chats", value: botStats?.activeChats ?? 0, color: colors.neonCyan, icon: "users" as const },
                { label: "Uptime", value: botStats ? fmtUptime(botStats.uptime) : "—", color: colors.accent, icon: "clock" as const },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: `${s.color}40` }]}>
                  <Feather name={s.icon} size={20} color={s.color} />
                  <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoTitle, { color: colors.neonBlue }]}>Bot Status</Text>
              <View style={[styles.botStatusRow, { borderColor: (botStats?.enabled ? colors.neonCyan : colors.accent) + "40" }]}>
                <View style={[styles.dot, { backgroundColor: botStats?.enabled ? colors.neonCyan : colors.accent, width: 10, height: 10 }]} />
                <Text style={[styles.botStatusText, { color: botStats?.enabled ? colors.neonCyan : colors.accent }]}>
                  Lily Bot {botStats?.enabled ? "ACTIVE — Auto-reply ON" : "PAUSED — Manual mode"}
                </Text>
              </View>

              {botStats && (
                <View style={styles.rateRow}>
                  <View style={[styles.rateCard, { backgroundColor: `${colors.neonCyan}10` }]}>
                    <Text style={[styles.rateVal, { color: colors.neonCyan }]}>
                      {botStats.totalMessages > 0 ? ((botStats.totalReplies / botStats.totalMessages) * 100).toFixed(0) : 0}%
                    </Text>
                    <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>Reply Rate</Text>
                  </View>
                  <View style={[styles.rateCard, { backgroundColor: `${colors.neonBlue}10` }]}>
                    <Text style={[styles.rateVal, { color: colors.neonBlue }]}>
                      {botStats.totalMessages - botStats.totalReplies}
                    </Text>
                    <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>Skipped</Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: botEnabled ? "#FF4757" : colors.neonCyan }]}
              onPress={toggleBot}
              disabled={!serverUrl}
            >
              <Feather name={botEnabled ? "zap-off" : "zap"} size={18} color="#000" />
              <Text style={[styles.mainBtnText, { color: "#000" }]}>
                {botEnabled ? "Bot Band Karo" : "Bot Chalu Karo"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 16, borderRadius: 0 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderBottomWidth: 2 },
  tabLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  warnBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  qrCard: { padding: 20, borderRadius: 16, borderWidth: 1.5, alignItems: "center", gap: 14 },
  qrTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  qrWrapper: { padding: 12, backgroundColor: "#fff", borderRadius: 12 },
  qrImage: { width: 220, height: 220 },
  qrInstr: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  scanningBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  scanningText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  connectedCard: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 12 },
  connectedTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  connectedSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  botToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  botToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  infoCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  infoTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  infoRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  mainBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, elevation: 8 },
  mainBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  repliesHeader: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1 },
  repliesTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  repliesSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  emptyBox: { alignItems: "center", gap: 12, paddingTop: 40 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  replyCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  replyTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  phoneChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  phoneText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  replyTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  msgBox: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 3 },
  msgLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  msgText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sectionTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "47%", borderRadius: 14, borderWidth: 1.5, padding: 16, gap: 6, alignItems: "flex-start" },
  statVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  botStatusRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  botStatusText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rateRow: { flexDirection: "row", gap: 10 },
  rateCard: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center" },
  rateVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  rateLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
});
