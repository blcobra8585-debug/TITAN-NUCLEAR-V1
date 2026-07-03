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
import ReAnimated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { timeoutSignal } from "@/lib/timeout";
import GlowOrb from "@/components/GlowOrb";
import Tilt3DCard from "@/components/Tilt3DCard";
import Icon3D from "@/components/Icon3D";

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
  const [stealthMode, setStealthMode] = useState(false);
  const [coreTemp, setCoreTemp] = useState(42);

  useEffect(() => {
    const interval = setInterval(() => {
      setCoreTemp(prev => (titanMode ? Math.floor(Math.random() * 15) + 70 : Math.floor(Math.random() * 5) + 38));
    }, 3000);
    return () => clearInterval(interval);
  }, [titanMode]);

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
      {/* Ambient depth — drifting neon orbs give the header area a sense of 3D space */}
      <GlowOrb color={colors.neonBlue} size={200} style={{ top: -50, left: -60 }} duration={5800} />
      <GlowOrb color={colors.neonPurple} size={160} style={{ top: 40, right: -60 }} duration={7000} driftX={22} driftY={14} />

      <View style={styles.pad}>
        {/* Header */}
        <ReAnimated.View entering={FadeInDown.duration(500)} style={styles.row}>
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
        </ReAnimated.View>

        {/* Titan Mode */}
        <ReAnimated.View entering={FadeInDown.duration(500).delay(80)}>
          <Tilt3DCard style={[styles.titanCard, { backgroundColor: colors.card, borderColor: titanMode ? colors.neonBlue : colors.border, shadowColor: titanMode ? colors.neonBlue : "transparent" }]}>
            <Icon3D name="zap" size={24} bgSize={48} color={titanMode ? colors.neonBlue : colors.mutedForeground} glow={titanMode} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.cardTitle, { color: titanMode ? colors.neonBlue : colors.foreground }]}>TITAN MODE</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{titanMode ? "System Full Power pe hai" : "Tap karo activate karne ke liye"}</Text>
            </View>
            <Switch value={titanMode} onValueChange={toggleTitan} trackColor={{ false: colors.border, true: `${colors.neonBlue}50` }} thumbColor={titanMode ? colors.neonBlue : "#555"} />
          </Tilt3DCard>
        </ReAnimated.View>

        {/* Revenue + Bot Row */}
        <View style={[styles.row, { gap: 12, alignItems: "stretch" }]}>
          {/* Revenue */}
          <ReAnimated.View entering={FadeInDown.duration(500).delay(140)} style={{ flex: 1 }}>
            <Tilt3DCard style={[styles.revenueCard, { borderColor: colors.neonCyan, backgroundColor: colors.card }]}>
              <View style={[styles.row, { gap: 6 }]}>
                <Icon3D name="trending-up" size={11} bgSize={22} color={colors.neonCyan} />
                <Text style={[styles.miniLabel, { color: colors.neonCyan, letterSpacing: 1 }]}>REVENUE</Text>
              </View>
              {loading ? (
                <ActivityIndicator color={colors.neonCyan} style={{ marginTop: 10 }} />
              ) : (
                <Text style={[styles.revenueAmount, { color: colors.neonCyan }]}>
                  {fmt(totalRevenue + 1130000)}
                </Text>
              )}
              <View style={styles.miniTrend}>
                {[40, 55, 35, 70, 50, 85, 65].map((h, i) => (
                  <View key={i} style={[styles.trendBar, { height: h * 0.28, backgroundColor: `${colors.neonCyan}${i === 6 ? "" : "60"}` }]} />
                ))}
              </View>
              <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>This Quarter</Text>
            </Tilt3DCard>
          </ReAnimated.View>

          {/* Bot Status */}
          <ReAnimated.View entering={FadeInDown.duration(500).delay(200)} style={{ flex: 1 }}>
            <Tilt3DCard style={[styles.botCard, { borderColor: waConnected ? `${colors.neonCyan}60` : colors.border, backgroundColor: colors.card }]}>
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
            </Tilt3DCard>
          </ReAnimated.View>
        </View>

        {/* Stats Row */}
        <View style={[styles.row, { gap: 12 }]}>
          {[
            { icon: "tool" as const, num: "4", label: "Active\nProjects", color: colors.neonBlue },
            { icon: "file-text" as const, num: "7", label: "Pending\nQuotes", color: colors.accent },
            { icon: "users" as const, num: botStats?.activeChats?.toString() ?? "0", label: "Active\nChats", color: "#25D366" },
          ].map((s, i) => (
            <ReAnimated.View key={s.label} entering={FadeInDown.duration(500).delay(260 + i * 60)} style={{ flex: 1 }}>
              <Tilt3DCard style={[styles.statCard, { borderColor: s.color, backgroundColor: colors.card }]}>
                <Icon3D name={s.icon} size={17} bgSize={34} color={s.color} />
                <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </Tilt3DCard>
            </ReAnimated.View>
          ))}
        </View>

        {/* NUCLEAR DIAGNOSTICS (NEW FEATURE) */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 10 }]}>NUCLEAR CORE DIAGNOSTICS</Text>
        <View style={[styles.diagCard, { backgroundColor: colors.card, borderColor: coreTemp > 80 ? "#ef4444" : colors.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: coreTemp > 80 ? "#ef4444" : colors.foreground }]}>
                {titanMode ? "CORE OVERRIDE ACTIVE" : "SYSTEM STABLE"}
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                Core Temp: {coreTemp}°C • Ping: {Math.floor(Math.random() * 20) + 12}ms
              </Text>
            </View>
            <View style={[styles.titanIcon, { backgroundColor: stealthMode ? "#10b98120" : `${colors.border}50`, width: 40, height: 40 }]}>
              <Feather name={stealthMode ? "eye-off" : "eye"} size={20} color={stealthMode ? "#10b981" : colors.mutedForeground} />
            </View>
          </View>
          
          <View style={[styles.row, { marginTop: 16, justifyContent: "space-between" }]}>
            <Text style={[styles.cardSub, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Stealth Protocol (Ghost Sync)</Text>
            <Switch 
              value={stealthMode} 
              onValueChange={(val) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStealthMode(val); }} 
              trackColor={{ false: colors.border, true: "#10b98150" }} 
              thumbColor={stealthMode ? "#10b981" : "#555"} 
            />
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 10 }]}>QUICK ACTIONS</Text>
        <View style={[styles.row, { flexWrap: "wrap", gap: 12 }]}>
          {[
            { label: "Chat Lily", icon: "message-circle" as const, color: colors.neonBlue, route: "/(tabs)/chat" },
            { label: "Auto Quote", icon: "file-text" as const, color: colors.neonCyan, route: "/(tabs)/quote" },
            { label: "WhatsApp", icon: "smartphone" as const, color: "#25D366", route: "/(tabs)/whatsapp" },
            { label: "Admin", icon: "shield" as const, color: "#FF9F43", route: "/(tabs)/admin" },
            { label: "Clients", icon: "users" as const, color: colors.accent, route: "/(tabs)/clients" },
            { label: "History", icon: "bar-chart-2" as const, color: "#F59E0B", route: "/(tabs)/history" },
          ].map((a, i) => (
            <ReAnimated.View key={a.label} entering={FadeInUp.duration(450).delay(400 + i * 50)} style={{ width: "30%" }}>
              <Tilt3DCard
                style={[styles.actionCard, { borderColor: a.color, backgroundColor: colors.card }]}
                maxTilt={14}
              >
                <TouchableOpacity
                  style={styles.actionCardInner}
                  onPress={() => { Haptics.selectionAsync(); router.push(a.route as any); }}
                  activeOpacity={0.75}
                >
                  <Icon3D name={a.icon} size={18} bgSize={38} color={a.color} />
                  <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
                </TouchableOpacity>
              </Tilt3DCard>
            </ReAnimated.View>
          ))}
        </View>

        {/* Lily Status */}
        <ReAnimated.View entering={FadeInDown.duration(500).delay(700)}>
          <Tilt3DCard style={[styles.lilyCard, { backgroundColor: colors.card, borderColor: colors.border }]} maxTilt={6}>
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
          </Tilt3DCard>
        </ReAnimated.View>

        {/* Pricing Info */}
        <ReAnimated.View entering={FadeInDown.duration(500).delay(760)}>
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
        </ReAnimated.View>
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
  diagCard: { padding: 16, borderRadius: 16, borderWidth: 1.5, marginTop: 4 },
  revenueAmount: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  botReplies: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  botActive: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  smallDot: { width: 7, height: 7, borderRadius: 4 },
  miniLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  statCard: { padding: 14, borderRadius: 14, borderWidth: 1.5, alignItems: "flex-start", gap: 4, elevation: 4 },
  statNum: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  actionCard: { borderRadius: 14, borderWidth: 1.5, elevation: 4, overflow: "hidden" },
  actionCardInner: { padding: 14, alignItems: "center", gap: 8 },
  actionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  lilyCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  onlineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  onlineText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  pricingCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  pricingVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  miniTrend: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 26, marginTop: 6 },
  trendBar: { flex: 1, borderRadius: 2 },
});
