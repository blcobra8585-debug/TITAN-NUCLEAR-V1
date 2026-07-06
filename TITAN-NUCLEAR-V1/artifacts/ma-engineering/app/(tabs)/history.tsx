import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert, FlatList, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { db, firebaseReady } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { sendWhatsAppMessage, buildInvoiceMessage } from "@/lib/whatsapp";
import { generateFollowUp, generateNegotiationReply } from "@/lib/gemini";
import { updateQuoteNotes, updateQuoteReferral, setQuoteAmcDate, markQuoteInvoiced } from "@/lib/firebaseService";
import { scheduleReminder } from "@/lib/notifications";
import SuccessBurst, { SuccessBurstHandle } from "@/components/SuccessBurst";
import Icon3D from "@/components/Icon3D";
import { diagError } from "@/lib/diagnostics";

interface Quote {
  id: string; clientName: string; clientPhone?: string;
  projectType: string; tonnage: number; quotedAmount: number;
  quoteText: string; status: "pending" | "approved" | "rejected";
  paymentStatus?: "unpaid" | "partial" | "paid"; amountPaid?: number;
  createdAt: any; leadSource?: string; referredBy?: string; notes?: string;
  amcDate?: string; invoiced?: boolean; invoiceNumber?: string;
}

const STATUS_CONFIG = {
  pending:  { color: "#F59E0B", bg: "#F59E0B20", icon: "clock",       label: "PENDING"  },
  approved: { color: "#25D366", bg: "#25D36620", icon: "check-circle", label: "APPROVED" },
  rejected: { color: "#EF4444", bg: "#EF444420", icon: "x-circle",    label: "REJECTED" },
};

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { language } = useTheme();

  const [quotes, setQuotes]             = useState<Quote[]>([]);
  const [filter, setFilter]             = useState<"all"|"pending"|"approved"|"rejected">("all");
  const [selected, setSelected]         = useState<Quote | null>(null);
  const [loading, setLoading]           = useState(true);
  const burstRef                        = useRef<SuccessBurstHandle>(null);
  const [notesDraft, setNotesDraft]     = useState("");
  const [amcDraft, setAmcDraft]         = useState("");
  const [aiBusy, setAiBusy]             = useState<"followup"|"negotiate"|"invoice"|null>(null);
  const [negotiateModal, setNegotiateModal] = useState(false);
  const [clientOffer, setClientOffer]   = useState("");

  useEffect(() => {
    setNotesDraft(selected?.notes ?? "");
    setAmcDraft(selected?.amcDate ?? "");
  }, [selected?.id]);

  useEffect(() => {
    // Guard: if Firebase never initialised, skip snapshot to prevent crash
    if (!firebaseReady || !db) {
      diagError("HistoryScreen", "Firebase not ready — skipping snapshot");
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(q,
        snap => { setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quote))); setLoading(false); },
        err  => { diagError("HistoryScreen.onSnapshot", err); setLoading(false); }
      );
      return () => unsub();
    } catch (err) {
      diagError("HistoryScreen.useEffect", err);
      setLoading(false);
    }
  }, []);

  async function updateStatus(id: string, status: Quote["status"]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (!firebaseReady || !db) return;
      await updateDoc(doc(db, "quotes", id), { status });
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    } catch { Alert.alert("❌ Error", "Status update nahi hua."); }
  }

  const filtered = filter === "all" ? quotes : quotes.filter(q => q.status === filter);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: botPad }]}>
      <Text style={[s.title, { color: colors.foreground }]}>Quote History</Text>
      <View style={s.filters}>
        {(["all","pending","approved","rejected"] as const).map(f => (
          <TouchableOpacity key={f} style={[s.chip, filter===f && { backgroundColor: colors.neonBlue }]} onPress={() => setFilter(f)}>
            <Text style={[s.chipTxt, { color: filter===f ? "#fff" : colors.mutedForeground }]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {filtered.length === 0
        ? <View style={s.center}><Text style={{ color: colors.mutedForeground }}>Koi quote nahi</Text></View>
        : <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 12, gap: 10 }}
            renderItem={({ item: q }) => {
              const cfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.pending;
              return (
                <TouchableOpacity style={[s.card, { backgroundColor: colors.card, borderColor: cfg.color+"30" }]}
                  onPress={() => setSelected(q)} activeOpacity={0.8}>
                  <View style={s.row}>
                    <Text style={[s.client, { color: colors.foreground }]}>{q.clientName}</Text>
                    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Text style={[s.sub, { color: colors.mutedForeground }]}>{q.projectType} • {q.tonnage}T</Text>
                  <Text style={[s.amt, { color: "#25D366" }]}>₹{q.quotedAmount?.toLocaleString()}</Text>
                </TouchableOpacity>
              );
            }}
          />
      }
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1 },
  center:   { flex: 1, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: 20, fontWeight: "700", padding: 16 },
  filters:  { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  chip:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "#1a1a2e" },
  chipTxt:  { fontSize: 10, fontWeight: "600" },
  card:     { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  row:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  client:   { fontSize: 15, fontWeight: "700", flex: 1 },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { fontSize: 10, fontWeight: "700" },
  sub:      { fontSize: 12 },
  amt:      { fontSize: 14, fontWeight: "800" },
});
