import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { timeoutSignal } from "@/lib/timeout";

function fmt(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

interface BotStats { enabled: boolean; totalReplies: number; activeChats: number; }

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { titanMode, setTitanMode, totalRevenue, refreshRevenue, serverUrl } = useApp();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [waConnected, setWaConnected] = useState(false);

  async function loadAll() {
    setLoading(true);
    await refreshRevenue().catch(() => {});
    if (serverUrl) {
      try {
        const [botRes, waRes] = await Promise.all([
          fetch(`${serverUrl}/api/bot/status`, { signal: timeoutSignal(5000) }).then(r => r.json()).catch(() => null),
          fetch(`${serverUrl}/api/wa/status`, { signal: timeoutSignal(5000) }).then(r => r.json()).catch(() => null),
        ]);
        if (botRes) setBotStats(botRes);
        if (waRes) setWaConnected(waRes.connected ?? false);
      } catch {}
    }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  async function toggleTitan(val: boolean) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTitanMode(val);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 34 : 20 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonBlue} />}
    >
      <View style={styles.pad}>
        {/* Header */}
        <View style={styles.row}>
          <View>
            <Text style={[styles.logo, { color: colors.neonBlue }]}>MA TITAN</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Suhan Siddiqui • Admin</Text>
          </View>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => router.push("/(tabs)/admin")}
          >
            <Feather name="settings" size={20} color={colors.neonBlue} />
          </TouchableOpacity>
        </View>

        {/* Titan Mode */}
        <View style={[styles.titanCard, { backgroundColor: colors.card, borderColor: titanMode ? colors.neonBlue : colors.border, shadowColor: titanMode ? colors.neonBlue : "transparent" }]}>
          <View style={[styles.titanIcon, { backgroundColor: titanMode ? `${colors.neonBlue}20` : `${colors.border}50` }]}>
            <Feather name="zap" size={26} color={titanMode ? colors.neonBlue : colors.mutedForeground} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.cardTitle, { color: titanMode ? colors.neonBlue : colors.foreground }]}>TITAN MODE</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{titanMode ? "System Full Power pe hai" : "Tap karo activate karne ke liye"}</Text>
          </View>
          <Switch value={titanMode} onValueChange={toggleTitan} trackColor={{ false: colors.border, true: `${colors.neonBlue}50` }} thumbColor={titanMode ? colors.neonBlue : "#555"} />
        </View>

        {/* Revenue + Bot Row */}
        <View style={[styles.row, { gap: 12, alignItems: "stretch" }]}>
          {/* Revenue */}
          <View style={[styles.revenueCard, { borderColor: colors.neonCyan, backgroundColor: colors.card, flex: 1 }]}>
            <View style={[styles.row, { gap: 6 }]}>
              <Feather name="trending-up" size={13} color={colors.neonCyan} />
              <Text style={[styles.miniLabel, { color: colors.neonCyan, letterSpacing: 1 }]}>REVENUE</Text>
            </View>
            {loading ? (
              <ActivityIndicator color={colors.neonCyan} style={{ marginTop: 10 }} />
            ) : (
              <Text style={[styles.revenueAmount, { color: colors.neonCyan }]}>
                {fmt(totalRevenue + 1130000)}
              </Text>
            )}
            <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>This Quarter</Text>
          </View>

          {/* Bot Status */}
          <View style={[styles.botCard, { borderColor: waConnected ? `${colors.neonCyan}60` : colors.border, backgroundColor: colors.card, flex: 1 }]}>
            <View style={[styles.row, { gap: 6 }]}>
              <View style={[styles.smallDot, { backgroundColor: waConnected ? colors.neonCyan : colors.mutedForeground }]} />
              <Text style={[styles.miniLabel, { color: waConnected ? colors.neonCyan : colors.mutedForeground, letterSpacing: 1 }]}>LILY BOT</Text>
            </View>
            <Text style={[styles.botReplies, { color: waConnected ? colors.neonCyan : colors.mutedForeground }]}>
              {botStats?.totalReplies ?? 0}
            </Text>
            <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>
              {waConnected ? "Replies sent" : "WA Disconnected"}
            </Text>
            {botStats && (
              <Text style={[styles.botActive, { color: botStats.enabled ? "#25D366" : colors.accent }]}>
                {botStats.enabled ? "● Auto ON" : "● Manual"}
              </Text>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.row, { gap: 12 }]}>
          {[
            { icon: "tool" as const, num: "4", label: "Active\nProjects", color: colors.neonBlue },
            { icon: "file-text" as const, num: "7", label: "Pending\nQuotes", color: colors.accent },
            { icon: "users" as const, num: botStats?.activeChats?.toString() ?? "0", label: "Active\nChats", color: "#25D366" },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { borderColor: s.color, backgroundColor: colors.card, flex: 1 }]}>
              <Feather name={s.icon} size={20} color={s.color} />
              <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>QUICK ACTIONS</Text>
        <View style={[styles.row, { flexWrap: "wrap", gap: 12 }]}>
          {[
            { label: "Chat Lily", icon: "message-circle" as const, color: colors.neonBlue, route: "/(tabs)/chat" },
            { label: "Auto Quote", icon: "file-text" as const, color: colors.neonCyan, route: "/(tabs)/quote" },
            { label: "WhatsApp", icon: "smartphone" as const, color: "#25D366", route: "/(tabs)/whatsapp" },
            { label: "Admin", icon: "shield" as const, color: "#FF9F43", route: "/(tabs)/admin" },
            { label: "Clients", icon: "users" as const, color: colors.accent, route: "/(tabs)/clients" },
            { label: "History", icon: "bar-chart-2" as const, color: "#F59E0B", route: "/(tabs)/history" },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionCard, { borderColor: a.color, backgroundColor: colors.card, width: "30%" }]}
              onPress={() => { Haptics.selectionAsync(); router.push(a.route as any); }}
              activeOpacity={0.75}
            >
              <Feather name={a.icon} size={22} color={a.color} />
              <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lily Status */}
        <View style={[styles.lilyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: `${colors.neonBlue}20` }]}>
            <Feather name="user" size={22} color={colors.neonBlue} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Lily | Senior Manager</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Gemini Pro • EOT Cranes up to 200T</Text>
          </View>
          <View style={[styles.onlineBadge, { backgroundColor: `${colors.neonCyan}20`, borderColor: `${colors.neonCyan}50` }]}>
            <Text style={[styles.onlineText, { color: colors.neonCyan }]}>ONLINE</Text>
          </View>
        </View>

        {/* Pricing Info */}
        <View style={[styles.pricingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PRICING MATRIX</Text>
          <View style={[styles.row, { marginTop: 10, gap: 16, flexWrap: "wrap" }]}>
            {[
              ["Base Rate", "₹5,500/T"],
              ["Quote Rate", "₹6,600+/T"],
              ["EOT Crane", "₹11.3L+"],
              ["Margin", "20-30%"],
            ].map(([lbl, val]) => (
              <View key={lbl} style={{ alignItems: "center" }}>
                <Text style={[styles.pricingVal, { color: colors.neonCyan }]}>{val}</Text>
                <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{lbl}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pad: { paddingHorizontal: 16, gap: 14 },
  row: { flexDirection: "row", alignItems: "center" },
  logo: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  iconBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titanCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, elevation: 5 },
  titanIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  cardSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  revenueCard: { padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 4 },
  botCard: { padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 4 },
  revenueAmount: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  botReplies: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  botActive: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  smallDot: { width: 7, height: 7, borderRadius: 4 },
  miniLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  statCard: { padding: 14, borderRadius: 14, borderWidth: 1.5, alignItems: "flex-start", gap: 4, elevation: 4 },
  statNum: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  actionCard: { padding: 14, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 8, elevation: 4 },
  actionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  lilyCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  onlineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  onlineText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  pricingCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  pricingVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
