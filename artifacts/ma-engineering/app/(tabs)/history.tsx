import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

interface Quote {
  id: string;
  clientName: string;
  projectType: string;
  tonnage: number;
  quotedAmount: number;
  quoteText: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
}

const STATUS_CONFIG = {
  pending:  { color: "#F59E0B", bg: "#F59E0B20", icon: "clock",     label: "PENDING"  },
  approved: { color: "#25D366", bg: "#25D36620", icon: "check-circle", label: "APPROVED" },
  rejected: { color: "#EF4444", bg: "#EF444420", icon: "x-circle",  label: "REJECTED" },
};

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selected, setSelected] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quote)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  async function updateStatus(id: string, status: Quote["status"]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateDoc(doc(db, "quotes", id), { status });
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  }

  async function deleteQuote(id: string) {
    Alert.alert("Delete?", "Is quote ko delete karein?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteDoc(doc(db, "quotes", id));
        setSelected(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }},
    ]);
  }

  async function sendViaWA(q: Quote) {
    const msg = `🏗️ *MA ENGINEERING — Quote*\n\nClient: *${q.clientName}*\nProject: *${q.projectType}*\nTonnage: ${q.tonnage}T\n\n${q.quoteText}\n\n*Value: ${fmt(q.quotedAmount)}*\n\n*MA Engineering* | Suhan Siddiqui\n📞 +917895643069`;
    const r = await sendWhatsAppMessage("91" + q.clientName.replace(/\D/g, ""), msg);
    if (r.success) Alert.alert("✅", "WhatsApp pe bhej diya!");
    else Alert.alert("ℹ️", "Settings mein WA Token set karo, tab send hoga.");
  }

  function fmt(n: number) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    return `₹${(n / 1000).toFixed(1)}K`;
  }

  function fmtDate(ts: any) {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch { return "—"; }
  }

  const filtered = filter === "all" ? quotes : quotes.filter(q => q.status === filter);

  const totalRev = quotes.filter(q => q.status === "approved").reduce((s, q) => s + q.quotedAmount, 0);
  const winRate = quotes.length > 0 ? ((quotes.filter(q => q.status === "approved").length / quotes.filter(q => q.status !== "pending").length) * 100) || 0 : 0;

  function renderQuote({ item }: { item: Quote }) {
    const sc = STATUS_CONFIG[item.status];
    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setSelected(item)} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          <View style={[styles.projectIcon, { backgroundColor: `${colors.neonBlue}15` }]}>
            <Feather name="file-text" size={16} color={colors.neonBlue} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.cardClient, { color: colors.foreground }]}>{item.clientName}</Text>
            <Text style={[styles.cardProject, { color: colors.mutedForeground }]}>{item.projectType} • {item.tonnage}T</Text>
          </View>
          <View>
            <Text style={[styles.cardAmount, { color: colors.neonCyan }]}>{fmt(item.quotedAmount)}</Text>
            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <Feather name={sc.icon as any} size={9} color={sc.color} />
              <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.cardPreview, { color: colors.mutedForeground }]} numberOfLines={2}>{item.quoteText}</Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{fmtDate(item.createdAt)}</Text>
          <View style={styles.quickActions}>
            {item.status !== "approved" && (
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#25D36620" }]} onPress={() => updateStatus(item.id, "approved")}>
                <Feather name="check" size={11} color="#25D366" />
              </TouchableOpacity>
            )}
            {item.status !== "rejected" && (
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#EF444420" }]} onPress={() => updateStatus(item.id, "rejected")}>
                <Feather name="x" size={11} color="#EF4444" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#25D36640" }]} onPress={() => sendViaWA(item)}>
              <Feather name="message-circle" size={11} color="#25D366" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.neonBlue }]}>QUOTE HISTORY</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{quotes.length} quotes • Firestore sync</Text>

        {/* Analytics Strip */}
        <View style={styles.analyticsRow}>
          {[
            { label: "Total Quotes", val: quotes.length.toString(), color: colors.neonBlue },
            { label: "Revenue Won", val: fmt(totalRev), color: "#25D366" },
            { label: "Win Rate", val: `${winRate.toFixed(0)}%`, color: colors.neonCyan },
            { label: "Pending", val: quotes.filter(q => q.status === "pending").length.toString(), color: "#F59E0B" },
          ].map(s => (
            <View key={s.label} style={[styles.analyticCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.analyticVal, { color: s.color }]}>{s.val}</Text>
              <Text style={[styles.analyticLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, {
                backgroundColor: filter === f ? (f === "all" ? colors.neonBlue : f === "approved" ? "#25D366" : f === "rejected" ? "#EF4444" : "#F59E0B") : colors.card,
                borderColor: f === "all" ? colors.neonBlue : f === "approved" ? "#25D366" : f === "rejected" ? "#EF4444" : "#F59E0B",
              }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, { color: filter === f ? "#000" : colors.mutedForeground }]}>
                {f.toUpperCase()} {f !== "all" ? `(${quotes.filter(q => q.status === f).length})` : `(${quotes.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderQuote}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: botPad + 20, paddingTop: 8, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {loading ? "Loading..." : "Koi quote nahi mila\nQuote generator se create karo"}
            </Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          {selected && (
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}30` }]}>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={[styles.detailClient, { color: colors.foreground }]}>{selected.clientName}</Text>
                  <Text style={[styles.detailProject, { color: colors.mutedForeground }]}>{selected.projectType} • {selected.tonnage}T</Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailAmountRow}>
                <View style={[styles.amountChip, { backgroundColor: `${colors.neonCyan}15`, borderColor: `${colors.neonCyan}40` }]}>
                  <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Quote Value</Text>
                  <Text style={[styles.amountVal, { color: colors.neonCyan }]}>{fmt(selected.quotedAmount)}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: STATUS_CONFIG[selected.status].bg }]}>
                  <Feather name={STATUS_CONFIG[selected.status].icon as any} size={14} color={STATUS_CONFIG[selected.status].color} />
                  <Text style={[styles.statusChipText, { color: STATUS_CONFIG[selected.status].color }]}>{STATUS_CONFIG[selected.status].label}</Text>
                </View>
              </View>

              <ScrollView style={[styles.quoteTextBox, { backgroundColor: colors.background, borderColor: colors.border }]} showsVerticalScrollIndicator={false}>
                <Text style={[styles.quoteText, { color: colors.foreground }]}>{selected.quoteText}</Text>
              </ScrollView>

              <View style={styles.detailActions}>
                <TouchableOpacity style={[styles.detailBtn, { backgroundColor: "#25D36620", borderColor: "#25D366" }]} onPress={() => sendViaWA(selected)}>
                  <Feather name="message-circle" size={14} color="#25D366" />
                  <Text style={[styles.detailBtnText, { color: "#25D366" }]}>Send WA</Text>
                </TouchableOpacity>
                {selected.status !== "approved" && (
                  <TouchableOpacity style={[styles.detailBtn, { backgroundColor: "#25D36620", borderColor: "#25D366" }]} onPress={() => updateStatus(selected.id, "approved")}>
                    <Feather name="check-circle" size={14} color="#25D366" />
                    <Text style={[styles.detailBtnText, { color: "#25D366" }]}>Approve</Text>
                  </TouchableOpacity>
                )}
                {selected.status !== "rejected" && (
                  <TouchableOpacity style={[styles.detailBtn, { backgroundColor: "#EF444420", borderColor: "#EF4444" }]} onPress={() => updateStatus(selected.id, "rejected")}>
                    <Feather name="x-circle" size={14} color="#EF4444" />
                    <Text style={[styles.detailBtnText, { color: "#EF4444" }]}>Reject</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.detailBtn, { backgroundColor: "#EF444420", borderColor: "#EF4444" }]} onPress={() => deleteQuote(selected.id)}>
                  <Feather name="trash-2" size={14} color="#EF4444" />
                  <Text style={[styles.detailBtnText, { color: "#EF4444" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  analyticsRow: { flexDirection: "row", gap: 6 },
  analyticCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 8, alignItems: "center" },
  analyticVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  analyticLabel: { fontSize: 8, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
  filterScroll: { flexGrow: 0 },
  filterBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8 },
  filterText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  projectIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardClient: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardProject: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cardAmount: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: "flex-end" },
  statusText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  cardPreview: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardDate: { fontSize: 10, fontFamily: "Inter_400Regular" },
  quickActions: { flexDirection: "row", gap: 6 },
  quickBtn: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  detailCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 14, maxHeight: "85%" },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  detailClient: { fontSize: 17, fontFamily: "Inter_700Bold" },
  detailProject: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  detailAmountRow: { flexDirection: "row", gap: 10 },
  amountChip: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12 },
  amountLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  amountVal: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  statusChip: { borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center", gap: 4 },
  statusChipText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  quoteTextBox: { borderRadius: 12, borderWidth: 1, padding: 12, maxHeight: 180 },
  quoteText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 20 },
  detailActions: { flexDirection: "row", gap: 8 },
  detailBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  detailBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
