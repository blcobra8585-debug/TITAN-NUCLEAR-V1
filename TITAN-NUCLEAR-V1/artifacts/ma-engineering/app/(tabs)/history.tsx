import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
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
import { useTheme } from "@/context/ThemeContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { sendWhatsAppMessage, buildInvoiceMessage } from "@/lib/whatsapp";
import { generateFollowUp, generateNegotiationReply } from "@/lib/gemini";
import { updateQuoteNotes, updateQuoteReferral, setQuoteAmcDate, markQuoteInvoiced } from "@/lib/firebaseService";
import { scheduleReminder } from "@/lib/notifications";
import SuccessBurst, { SuccessBurstHandle } from "@/components/SuccessBurst";
import Icon3D from "@/components/Icon3D";

interface Quote {
  id: string;
  clientName: string;
  clientPhone?: string;
  projectType: string;
  tonnage: number;
  quotedAmount: number;
  quoteText: string;
  status: "pending" | "approved" | "rejected";
  paymentStatus?: "unpaid" | "partial" | "paid";
  amountPaid?: number;
  createdAt: any;
  leadSource?: string;
  referredBy?: string;
  notes?: string;
  amcDate?: string;
  invoiced?: boolean;
  invoiceNumber?: string;
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
  const { language } = useTheme();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selected, setSelected] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const burstRef = useRef<SuccessBurstHandle>(null);

  const [notesDraft, setNotesDraft] = useState("");
  const [amcDraft, setAmcDraft] = useState("");
  const [aiBusy, setAiBusy] = useState<"followup" | "negotiate" | "invoice" | null>(null);
  const [negotiateModal, setNegotiateModal] = useState(false);
  const [clientOffer, setClientOffer] = useState("");

  useEffect(() => {
    setNotesDraft(selected?.notes ?? "");
    setAmcDraft(selected?.amcDate ?? "");
  }, [selected?.id]);

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
    try {
      await updateDoc(doc(db, "quotes", id), { status });
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    } catch {
      Alert.alert("❌ Error", "Status update nahi hua. Dobara try karo.");
    }
  }

  async function markPaid(q: Quote) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateDoc(doc(db, "quotes", q.id), {
        paymentStatus: "paid",
        amountPaid: q.quotedAmount,
      });
      setSelected(prev => prev?.id === q.id ? { ...prev, paymentStatus: "paid", amountPaid: q.quotedAmount } : prev);
      burstRef.current?.fire();
    } catch {
      Alert.alert("❌ Error", "Payment mark nahi hua. Dobara try karo.");
    }
  }

  async function deleteQuote(id: string) {
    Alert.alert("Delete?", "Is quote ko delete karein?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteDoc(doc(db, "quotes", id));
          setSelected(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {
          Alert.alert("❌ Error", "Delete nahi hua. Dobara try karo.");
        }
      }},
    ]);
  }

  async function sendViaWA(q: Quote) {
    const msg = `🏗️ *MA ENGINEERING — Quote*\n\nClient: *${q.clientName}*\nProject: *${q.projectType}*\nTonnage: ${q.tonnage}T\n\n${q.quoteText}\n\n*Value: ${fmt(q.quotedAmount)}*\n\n✅ *MA Engineering* | 15+ Years | Zero-Accident Record | Pan-India Projects`;
    const digits = (q.clientPhone ?? "").replace(/\D/g, "");
    if (digits.length < 10) {
      Alert.alert("Phone Missing", "Is quote me client ka phone save nahi hai. Naya quote banate waqt phone number bhi add karo.");
      return;
    }
    const phone = digits.length === 10 ? "91" + digits : digits;
    const r = await sendWhatsAppMessage(phone, msg);
    if (r.success) {
      burstRef.current?.fire();
      Alert.alert("✅", "WhatsApp pe bhej diya!");
    } else {
      Alert.alert("ℹ️", r.error ?? "Settings mein WA Token set karo, tab send hoga.");
    }
  }

  function getPhone(q: Quote): string | null {
    const digits = (q.clientPhone ?? "").replace(/\D/g, "");
    if (digits.length < 10) return null;
    return digits.length === 10 ? "91" + digits : digits;
  }

  async function saveNotes(q: Quote) {
    Haptics.selectionAsync();
    try {
      await updateQuoteNotes(q.id, notesDraft.trim());
      setSelected(prev => prev?.id === q.id ? { ...prev, notes: notesDraft.trim() } : prev);
      Alert.alert("✅", "Notes saved.");
    } catch {
      Alert.alert("❌ Error", "Notes save nahi huye. Dobara try karo.");
    }
  }

  async function saveAmcDate(q: Quote) {
    if (!amcDraft.trim()) return;
    Haptics.selectionAsync();
    try {
      await setQuoteAmcDate(q.id, amcDraft.trim());
      setSelected(prev => prev?.id === q.id ? { ...prev, amcDate: amcDraft.trim() } : prev);
      const d = new Date(amcDraft.trim());
      if (!isNaN(d.getTime())) {
        await scheduleReminder("AMC Reminder", `${q.clientName} ka AMC due hai — ${q.projectType}`, d);
      }
      Alert.alert("✅", "AMC date set — reminder scheduled.");
    } catch {
      Alert.alert("❌ Error", "AMC date save nahi hui. Dobara try karo.");
    }
  }

  async function generateInvoice(q: Quote) {
    const phone = getPhone(q);
    if (!phone) {
      Alert.alert("Phone Missing", "Client ka phone number missing hai.");
      return;
    }
    setAiBusy("invoice");
    try {
      const invoiceNumber = `INV-${q.id.slice(0, 6).toUpperCase()}`;
      const msg = buildInvoiceMessage({
        client: q.clientName,
        project: q.projectType,
        invoiceNumber,
        amount: q.quotedAmount,
        amountPaid: q.amountPaid ?? 0,
        lang: language,
      });
      await markQuoteInvoiced(q.id, invoiceNumber);
      setSelected(prev => prev?.id === q.id ? { ...prev, invoiced: true, invoiceNumber } : prev);
      const r = await sendWhatsAppMessage(phone, msg);
      if (r.success) {
        burstRef.current?.fire();
        Alert.alert("✅", "Invoice generate karke WhatsApp pe bhej diya!");
      } else {
        Alert.alert("ℹ️", "Invoice save ho gaya, lekin WhatsApp send fail hua: " + (r.error ?? ""));
      }
    } catch (e: any) {
      Alert.alert("❌ Error", e.message?.slice(0, 100) ?? "Invoice generate nahi hua.");
    } finally {
      setAiBusy(null);
    }
  }

  async function sendAiFollowUp(q: Quote) {
    const phone = getPhone(q);
    if (!phone) {
      Alert.alert("Phone Missing", "Client ka phone number missing hai.");
      return;
    }
    setAiBusy("followup");
    try {
      const daysSince = q.createdAt?.toDate
        ? Math.floor((Date.now() - q.createdAt.toDate().getTime()) / 86400000)
        : 0;
      const msg = await generateFollowUp({ client: q.clientName, project: q.projectType, daysSinceQuote: daysSince, status: q.status });
      const r = await sendWhatsAppMessage(phone, msg);
      if (r.success) {
        burstRef.current?.fire();
        Alert.alert("✅", "AI follow-up bhej diya!");
      } else {
        Alert.alert("ℹ️", r.error ?? "WhatsApp send failed.");
      }
    } catch (e: any) {
      Alert.alert("❌ Error", e.message?.slice(0, 100) ?? "Follow-up generate nahi hua.");
    } finally {
      setAiBusy(null);
    }
  }

  async function sendNegotiationReply(q: Quote) {
    if (!clientOffer.trim()) {
      Alert.alert("Zaroori", "Client ka offer likhein.");
      return;
    }
    const phone = getPhone(q);
    if (!phone) {
      Alert.alert("Phone Missing", "Client ka phone number missing hai.");
      return;
    }
    setAiBusy("negotiate");
    try {
      const msg = await generateNegotiationReply({ client: q.clientName, project: q.projectType, quotedAmount: q.quotedAmount, clientOffer: clientOffer.trim() });
      const r = await sendWhatsAppMessage(phone, msg);
      setNegotiateModal(false);
      setClientOffer("");
      if (r.success) {
        burstRef.current?.fire();
        Alert.alert("✅", "Negotiation reply bhej diya!");
      } else {
        Alert.alert("ℹ️", r.error ?? "WhatsApp send failed.");
      }
    } catch (e: any) {
      Alert.alert("❌ Error", e.message?.slice(0, 100) ?? "Negotiation reply nahi gayi.");
    } finally {
      setAiBusy(null);
    }
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
  const closedCount = quotes.filter(q => q.status !== "pending").length;
  const winRate = closedCount > 0
    ? (quotes.filter(q => q.status === "approved").length / closedCount) * 100
    : 0;

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
            {item.paymentStatus === "paid" ? (
              <View style={[styles.statusPill, { backgroundColor: "#25D36620", marginTop: 4 }]}>
                <Feather name="check-circle" size={9} color="#25D366" />
                <Text style={[styles.statusText, { color: "#25D366" }]}>PAID</Text>
              </View>
            ) : item.status === "approved" ? (
              <View style={[styles.statusPill, { backgroundColor: "#F59E0B20", marginTop: 4 }]}>
                <Feather name="alert-circle" size={9} color="#F59E0B" />
                <Text style={[styles.statusText, { color: "#F59E0B" }]}>PAYMENT DUE</Text>
              </View>
            ) : null}
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
            {item.status === "approved" && item.paymentStatus !== "paid" && (
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#F59E0B30" }]} onPress={() => markPaid(item)}>
                <Feather name="dollar-sign" size={11} color="#F59E0B" />
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

              {selected.status === "approved" && (
                <View style={[styles.statusChip, { backgroundColor: selected.paymentStatus === "paid" ? "#25D36620" : "#F59E0B20", alignSelf: "flex-start" }]}>
                  <Feather name={selected.paymentStatus === "paid" ? "check-circle" : "alert-circle"} size={14} color={selected.paymentStatus === "paid" ? "#25D366" : "#F59E0B"} />
                  <Text style={[styles.statusChipText, { color: selected.paymentStatus === "paid" ? "#25D366" : "#F59E0B" }]}>
                    {selected.paymentStatus === "paid" ? `Paid — ${fmt(selected.amountPaid ?? selected.quotedAmount)}` : "Payment Pending"}
                  </Text>
                </View>
              )}

              <ScrollView style={[styles.quoteTextBox, { backgroundColor: colors.background, borderColor: colors.border }]} showsVerticalScrollIndicator={false}>
                <Text style={[styles.quoteText, { color: colors.foreground }]}>{selected.quoteText}</Text>
              </ScrollView>

              {/* CRM: source / referral */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={[styles.crmChip, { backgroundColor: `${colors.neonBlue}10`, borderColor: `${colors.neonBlue}30` }]}>
                  <Icon3D name="tag" size={12} bgSize={22} color={colors.neonBlue} />
                  <Text style={[styles.crmChipText, { color: colors.neonBlue }]}>{selected.leadSource ?? "Direct"}</Text>
                </View>
                {!!selected.referredBy && (
                  <View style={[styles.crmChip, { backgroundColor: `${colors.neonCyan}10`, borderColor: `${colors.neonCyan}30` }]}>
                    <Icon3D name="user-plus" size={12} bgSize={22} color={colors.neonCyan} />
                    <Text style={[styles.crmChipText, { color: colors.neonCyan }]}>Ref: {selected.referredBy}</Text>
                  </View>
                )}
                {selected.invoiced && (
                  <View style={[styles.crmChip, { backgroundColor: "#25D36610", borderColor: "#25D36630" }]}>
                    <Icon3D name="file-text" size={12} bgSize={22} color="#25D366" />
                    <Text style={[styles.crmChipText, { color: "#25D366" }]}>{selected.invoiceNumber}</Text>
                  </View>
                )}
              </View>

              {/* CRM Notes editor */}
              <View style={[styles.notesBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.crmLabel, { color: colors.mutedForeground }]}>CRM NOTES</Text>
                <TextInput
                  style={[styles.notesInput, { color: colors.foreground }]}
                  placeholder="Site details, special requests..."
                  placeholderTextColor={colors.mutedForeground}
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  multiline
                />
                <TouchableOpacity style={[styles.saveMini, { backgroundColor: `${colors.neonBlue}20` }]} onPress={() => saveNotes(selected)}>
                  <Text style={[styles.saveMiniText, { color: colors.neonBlue }]}>Save Notes</Text>
                </TouchableOpacity>
              </View>

              {/* AMC Date */}
              <View style={[styles.notesBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.crmLabel, { color: colors.mutedForeground }]}>AMC / FOLLOW-UP DATE (YYYY-MM-DD)</Text>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TextInput
                    style={[styles.notesInput, { color: colors.foreground, flex: 1 }]}
                    placeholder="2026-08-15"
                    placeholderTextColor={colors.mutedForeground}
                    value={amcDraft}
                    onChangeText={setAmcDraft}
                  />
                  <TouchableOpacity style={[styles.saveMini, { backgroundColor: `${colors.neonCyan}20` }]} onPress={() => saveAmcDate(selected)}>
                    <Text style={[styles.saveMiniText, { color: colors.neonCyan }]}>Set</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* AI Actions */}
              <View style={styles.detailActions}>
                <TouchableOpacity style={[styles.detailBtn, { backgroundColor: "#8B5CF620", borderColor: "#8B5CF6" }]} onPress={() => sendAiFollowUp(selected)} disabled={aiBusy === "followup"}>
                  <Icon3D name="send" size={12} bgSize={22} color="#8B5CF6" />
                  <Text style={[styles.detailBtnText, { color: "#8B5CF6" }]}>{aiBusy === "followup" ? "..." : "AI Follow-up"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.detailBtn, { backgroundColor: "#F59E0B20", borderColor: "#F59E0B" }]} onPress={() => setNegotiateModal(true)}>
                  <Icon3D name="repeat" size={12} bgSize={22} color="#F59E0B" />
                  <Text style={[styles.detailBtnText, { color: "#F59E0B" }]}>Negotiate</Text>
                </TouchableOpacity>
                {selected.status === "approved" && (
                  <TouchableOpacity style={[styles.detailBtn, { backgroundColor: "#25D36620", borderColor: "#25D366" }]} onPress={() => generateInvoice(selected)} disabled={aiBusy === "invoice"}>
                    <Icon3D name="file-plus" size={12} bgSize={22} color="#25D366" />
                    <Text style={[styles.detailBtnText, { color: "#25D366" }]}>{aiBusy === "invoice" ? "..." : "Invoice"}</Text>
                  </TouchableOpacity>
                )}
              </View>

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
                {selected.status === "approved" && selected.paymentStatus !== "paid" && (
                  <TouchableOpacity style={[styles.detailBtn, { backgroundColor: "#F59E0B20", borderColor: "#F59E0B" }]} onPress={() => markPaid(selected)}>
                    <Feather name="dollar-sign" size={14} color="#F59E0B" />
                    <Text style={[styles.detailBtnText, { color: "#F59E0B" }]}>Mark Paid</Text>
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

      {/* Negotiation Modal */}
      <Modal visible={negotiateModal} transparent animationType="slide" onRequestClose={() => setNegotiateModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}30`, maxHeight: undefined }]}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailClient, { color: colors.foreground }]}>AI Negotiation Reply</Text>
              <TouchableOpacity onPress={() => setNegotiateModal(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.detailProject, { color: colors.mutedForeground }]}>
              Client ka counter-offer ya sawaal likhein, Lily ek smart reply banayegi:
            </Text>
            <View style={[styles.notesBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.foreground }]}
                placeholder="e.g. Client bol raha hai 10% discount chahiye"
                placeholderTextColor={colors.mutedForeground}
                value={clientOffer}
                onChangeText={setClientOffer}
                multiline
              />
            </View>
            <TouchableOpacity
              style={[styles.detailBtn, { backgroundColor: "#F59E0B20", borderColor: "#F59E0B", flex: 0, paddingVertical: 14 }]}
              onPress={() => selected && sendNegotiationReply(selected)}
              disabled={aiBusy === "negotiate"}
            >
              <Icon3D name="send" size={14} bgSize={26} color="#F59E0B" />
              <Text style={[styles.detailBtnText, { color: "#F59E0B" }]}>{aiBusy === "negotiate" ? "Sending..." : "Generate & Send"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SuccessBurst ref={burstRef} />
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
  crmChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  crmChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  notesBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  crmLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  notesInput: { fontSize: 12, fontFamily: "Inter_400Regular", minHeight: 36 },
  saveMini: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  saveMiniText: { fontSize: 10, fontFamily: "Inter_700Bold" },
});
