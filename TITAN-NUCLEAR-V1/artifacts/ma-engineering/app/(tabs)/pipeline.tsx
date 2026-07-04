import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { listenToQuotes, updateQuoteStatus } from "@/lib/firebaseService";

type Stage = "lead" | "quoted" | "negotiation" | "won" | "lost";

interface PipelineItem {
  id: string;
  clientName: string;
  projectType: string;
  quotedAmount: number;
  status: string;
  timestamp: any;
  notes?: string;
}

const STAGES: { id: Stage; label: string; color: string; emoji: string }[] = [
  { id: "lead",        label: "Lead",        color: "#7B2FFF", emoji: "🎯" },
  { id: "quoted",      label: "Quoted",      color: "#00B4FF", emoji: "📄" },
  { id: "negotiation", label: "Negotiation", color: "#FF9900", emoji: "🤝" },
  { id: "won",         label: "Won",         color: "#25D366", emoji: "🏆" },
  { id: "lost",        label: "Lost",        color: "#FF4444", emoji: "❌" },
];

function getTemp(tsMs: number) {
  const age = Date.now() - tsMs;
  if (age < 86400000)       return { label: "Hot",  color: "#FF4444", emoji: "🔥" };
  if (age < 3 * 86400000)   return { label: "Warm", color: "#FF9900", emoji: "⚡" };
  return                           { label: "Cold", color: "#00B4FF", emoji: "❄️" };
}

function resolveTs(ts: any): number {
  if (!ts) return Date.now();
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  if (typeof ts === "number") return ts;
  return Date.now();
}

function fmtAmt(n: number) {
  if (!n) return "";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function fmtAge(tsMs: number) {
  const d = Date.now() - tsMs;
  if (d < 3600000)  return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return `${Math.floor(d / 86400000)}d`;
}

function stageOf(status: string): Stage {
  if (status === "lead")        return "lead";
  if (status === "negotiation") return "negotiation";
  if (status === "won")         return "won";
  if (status === "lost")        return "lost";
  return "quoted";
}

const COL_W = 195;

export default function PipelineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [items, setItems]         = useState<PipelineItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [movingId, setMovingId]   = useState<string | null>(null);
  const [modal, setModal]         = useState<{ id: string; current: Stage } | null>(null);

  useEffect(() => {
    const unsub = listenToQuotes((docs) => {
      setItems(docs as PipelineItem[]);
      setLoading(false);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  async function moveStage(id: string, to: Stage) {
    setModal(null);
    setMovingId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateQuoteStatus(id, to);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Move failed");
    }
    setMovingId(null);
  }

  const cols = { lead: [], quoted: [], negotiation: [], won: [], lost: [] } as Record<Stage, PipelineItem[]>;
  items.forEach((i) => cols[stageOf(i.status ?? "pending")].push(i));

  const totalWon  = cols.won.reduce((s, i) => s + (i.quotedAmount ?? 0), 0);
  const totalPipe = items.reduce((s, i) => s + (i.quotedAmount ?? 0), 0);
  const winRate   = items.length > 0 ? Math.round((cols.won.length / items.length) * 100) : 0;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <Text style={[s.title, { color: colors.neonPurple }]}>DEAL PIPELINE 🏗️</Text>
        <Text style={[s.sub, { color: colors.mutedForeground }]}>Tap card → Move Stage</Text>
      </View>

      <View style={[s.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: "Pipeline", value: fmtAmt(totalPipe) || "₹0",  color: colors.neonBlue },
          { label: "Won",      value: fmtAmt(totalWon) || "₹0",   color: "#25D366" },
          { label: "Win Rate", value: `${winRate}%`,                color: "#FF9900" },
          { label: "Deals",    value: String(items.length),         color: colors.neonCyan },
        ].map((x) => (
          <View key={x.label} style={s.sumItem}>
            <Text style={[s.sumVal, { color: x.color }]}>{x.value}</Text>
            <Text style={[s.sumLabel, { color: colors.mutedForeground }]}>{x.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={colors.neonBlue} size="large" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={COL_W + 10}
          decelerationRate="fast"
          contentContainerStyle={{ padding: 10, gap: 10 }}
        >
          {STAGES.map((stage) => {
            const colItems = cols[stage.id];
            const colTotal = colItems.reduce((s, i) => s + (i.quotedAmount ?? 0), 0);
            return (
              <View key={stage.id} style={[s.col, { width: COL_W, backgroundColor: colors.card, borderColor: `${stage.color}30` }]}>
                <View style={[s.colHead, { borderBottomColor: `${stage.color}40` }]}>
                  <Text style={[s.colTitle, { color: stage.color }]}>{stage.emoji} {stage.label}</Text>
                  <View style={[s.colBadge, { backgroundColor: `${stage.color}20` }]}>
                    <Text style={[s.colBadgeTxt, { color: stage.color }]}>{colItems.length}</Text>
                  </View>
                </View>
                {colTotal > 0 && (
                  <Text style={[s.colTotal, { color: `${stage.color}99` }]}>{fmtAmt(colTotal)}</Text>
                )}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 8, paddingTop: 6 }}>
                  {colItems.length === 0 && (
                    <Text style={[s.emptyCol, { color: colors.mutedForeground }]}>Koi deal nahi</Text>
                  )}
                  {colItems.map((item) => {
                    const tsMs = resolveTs(item.timestamp);
                    const temp = getTemp(tsMs);
                    const isMoving = movingId === item.id;
                    const isGhost = stageOf(item.status ?? "") !== "won" &&
                                    stageOf(item.status ?? "") !== "lost" &&
                                    (Date.now() - tsMs) > 48 * 3600 * 1000;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[s.card, { backgroundColor: colors.background, borderColor: `${stage.color}25`, opacity: isMoving ? 0.5 : 1 }]}
                        onPress={() => setModal({ id: item.id, current: stage.id })}
                        activeOpacity={0.75}
                      >
                        <View style={s.cardTop}>
                          <Text style={[s.tempBadge, { color: temp.color }]}>{temp.emoji} {temp.label}</Text>
                          <Text style={[s.age, { color: colors.mutedForeground }]}>{fmtAge(tsMs)}</Text>
                          {isGhost && <Text style={s.ghost}>👻</Text>}
                        </View>
                        <Text style={[s.clientName, { color: colors.foreground }]} numberOfLines={1}>{item.clientName}</Text>
                        <Text style={[s.projType, { color: colors.mutedForeground }]} numberOfLines={1}>{item.projectType}</Text>
                        {!!item.quotedAmount && (
                          <Text style={[s.amt, { color: "#25D366" }]}>{fmtAmt(item.quotedAmount)}</Text>
                        )}
                        {isMoving ? (
                          <ActivityIndicator size="small" color={stage.color} style={{ marginTop: 6 }} />
                        ) : (
                          <View style={[s.moveBtn, { borderColor: `${stage.color}40` }]}>
                            <Feather name="shuffle" size={10} color={stage.color} />
                            <Text style={[s.moveTxt, { color: stage.color }]}>Move</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setModal(null)}>
          <View style={[s.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>Stage Move Karo</Text>
            {modal && STAGES.filter((x) => x.id !== modal.current).map((x) => (
              <TouchableOpacity
                key={x.id}
                style={[s.stageRow, { borderColor: `${x.color}40` }]}
                onPress={() => moveStage(modal.id, x.id)}
              >
                <View style={[s.stageDot, { backgroundColor: x.color }]} />
                <Text style={[s.stageLbl, { color: x.color }]}>{x.emoji} {x.label}</Text>
                <Feather name="arrow-right" size={14} color={x.color} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { paddingHorizontal: 16, paddingBottom: 10 },
  title:      { fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  sub:        { fontSize: 11, marginTop: 2 },
  summary:    { flexDirection: "row", marginHorizontal: 12, marginBottom: 8, borderRadius: 14, borderWidth: 1, padding: 10 },
  sumItem:    { flex: 1, alignItems: "center" },
  sumVal:     { fontSize: 13, fontWeight: "800" },
  sumLabel:   { fontSize: 9, marginTop: 2 },
  col:        { borderRadius: 14, borderWidth: 1, maxHeight: "100%", minHeight: 200 },
  colHead:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, borderBottomWidth: 1 },
  colTitle:   { fontSize: 12, fontWeight: "700" },
  colBadge:   { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  colBadgeTxt:{ fontSize: 11, fontWeight: "700" },
  colTotal:   { textAlign: "center", fontSize: 10, fontWeight: "600", paddingBottom: 4 },
  emptyCol:   { textAlign: "center", fontSize: 11, paddingVertical: 20, opacity: 0.6 },
  card:       { borderRadius: 10, borderWidth: 1, padding: 10, gap: 3 },
  cardTop:    { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  tempBadge:  { fontSize: 10, fontWeight: "700" },
  age:        { fontSize: 9, flex: 1, textAlign: "right" },
  ghost:      { fontSize: 12 },
  clientName: { fontSize: 13, fontWeight: "700" },
  projType:   { fontSize: 10 },
  amt:        { fontSize: 12, fontWeight: "800", marginTop: 2 },
  moveBtn:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start" },
  moveTxt:    { fontSize: 10, fontWeight: "600" },
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalBox:   { width: 280, borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  modalTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  stageRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  stageDot:   { width: 8, height: 8, borderRadius: 4 },
  stageLbl:   { flex: 1, fontSize: 13, fontWeight: "600" },
});
