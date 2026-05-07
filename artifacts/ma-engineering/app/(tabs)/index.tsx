import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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

function fmt(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { titanMode, setTitanMode, totalRevenue, refreshRevenue } = useApp();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    refreshRevenue().finally(() => setLoading(false));
  }, []);

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
    >
      <View style={styles.pad}>
        {/* Header */}
        <View style={styles.row}>
          <View>
            <Text style={[styles.logo, { color: colors.neonBlue }]}>MA TITAN</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Admin: Suhan Siddiqui</Text>
          </View>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => router.push("/(tabs)/admin")}
          >
            <Feather name="settings" size={20} color={colors.neonBlue} />
          </TouchableOpacity>
        </View>

        {/* Titan Mode */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: titanMode ? colors.neonBlue : colors.border, shadowColor: titanMode ? colors.neonBlue : "transparent" }]}>
          <Feather name="zap" size={26} color={titanMode ? colors.neonBlue : colors.mutedForeground} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.cardTitle, { color: titanMode ? colors.neonBlue : colors.foreground }]}>TITAN MODE</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{titanMode ? "System at Full Power" : "Tap to activate"}</Text>
          </View>
          <Switch
            value={titanMode}
            onValueChange={toggleTitan}
            trackColor={{ false: colors.border, true: `${colors.neonBlue}50` }}
            thumbColor={titanMode ? colors.neonBlue : "#555"}
          />
        </View>

        {/* Revenue Tracker */}
        <View style={[styles.revenueCard, { borderColor: colors.neonCyan, backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <Feather name="trending-up" size={14} color={colors.neonCyan} />
            <Text style={[styles.revenueLabel, { color: colors.neonCyan }]}>  LIVE PROFIT TRACKER</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.neonCyan} style={{ marginTop: 12 }} />
          ) : (
            <Text style={[styles.revenueAmount, { color: colors.neonCyan }]}>
              {fmt(totalRevenue + 1130000)}
            </Text>
          )}
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Total Revenue This Quarter</Text>
          <View style={[styles.row, { marginTop: 14, gap: 20 }]}>
            {[["Base Rate", "₹5,500/T"], ["Margin", "20-30%"], ["EOT Rate", "₹11.3L+"]].map(([lbl, val]) => (
              <View key={lbl}>
                <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>{lbl}</Text>
                <Text style={[styles.miniVal, { color: colors.neonCyan }]}>{val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.row, { gap: 12 }]}>
          <View style={[styles.statCard, { borderColor: colors.neonBlue, backgroundColor: colors.card, flex: 1 }]}>
            <Feather name="tool" size={24} color={colors.neonBlue} />
            <Text style={[styles.statNum, { color: colors.neonBlue }]}>4</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active{"\n"}Projects</Text>
          </View>
          <View style={[styles.statCard, { borderColor: colors.accent, backgroundColor: colors.card, flex: 1 }]}>
            <Feather name="file-text" size={24} color={colors.accent} />
            <Text style={[styles.statNum, { color: colors.accent }]}>7</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pending{"\n"}Quotes</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>QUICK ACTIONS</Text>
        <View style={[styles.row, { flexWrap: "wrap", gap: 12 }]}>
          {[
            { label: "Chat with Lily", icon: "message-circle" as const, color: colors.neonBlue, route: "/(tabs)/chat" },
            { label: "Auto-Quote", icon: "file-text" as const, color: colors.neonCyan, route: "/(tabs)/quote" },
            { label: "Negotiations", icon: "users" as const, color: colors.accent, route: "/(tabs)/quote" },
            { label: "Admin Panel", icon: "shield" as const, color: "#FF9F43", route: "/(tabs)/admin" },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.actionCard, { borderColor: a.color, backgroundColor: colors.card, width: "47%" }]}
              onPress={() => { Haptics.selectionAsync(); router.push(a.route as any); }}
              activeOpacity={0.75}
            >
              <Feather name={a.icon} size={28} color={a.color} />
              <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lily Status */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: `${colors.neonBlue}20` }]}>
            <Feather name="user" size={24} color={colors.neonBlue} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Lily | Senior Manager</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>EOT Cranes (200T), Chimneys & Boilers</Text>
          </View>
          <View style={[styles.onlineBadge, { backgroundColor: `${colors.neonCyan}20`, borderColor: `${colors.neonCyan}50` }]}>
            <Text style={[styles.onlineText, { color: colors.neonCyan }]}>ONLINE</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pad: { paddingHorizontal: 20, gap: 16 },
  row: { flexDirection: "row", alignItems: "center" },
  logo: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  iconBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, elevation: 5 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  cardSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  revenueCard: { padding: 20, borderRadius: 16, borderWidth: 1.5, gap: 4, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, elevation: 5 },
  revenueLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  revenueAmount: { fontSize: 34, fontFamily: "Inter_700Bold", marginTop: 8 },
  miniLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  miniVal: { fontSize: 12, fontFamily: "Inter_700Bold" },
  statCard: { padding: 16, borderRadius: 16, borderWidth: 1.5, alignItems: "flex-start", gap: 4, shadowOffset: { width: 0, height: 0 }, shadowRadius: 15, elevation: 4 },
  statNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2, marginTop: 4 },
  actionCard: { padding: 18, borderRadius: 16, borderWidth: 1.5, alignItems: "center", gap: 10, shadowOffset: { width: 0, height: 0 }, shadowRadius: 15, elevation: 4 },
  actionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  onlineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  onlineText: { fontSize: 10, fontFamily: "Inter_700Bold" },
});
