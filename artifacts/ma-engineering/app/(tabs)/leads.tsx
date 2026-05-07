import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, Platform, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { sendToLily } from "@/lib/gemini";
import {
  FirebaseLead,
  getLeadStatsFromFirebase,
  listenToLeads,
  saveLeadToFirebase,
  updateLeadInFirebase,
} from "@/lib/firebaseService";

interface LeadStats {
  total: number;
  replied: number;
  unreplied: number;
  today: number;
  bySource: Record<string, number>;
}

const SOURCE_COLORS: Record<string, string> = {
  IndiaMART: "#1B75BB",
  TradeIndia: "#E8341B",
  JustDial: "#FF6B00",
  Manual: "#7B2FFF",
  WhatsApp: "#25D366",
};

export default function LeadsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [leads, setLeads] = useState<FirebaseLead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [imGlid, setImGlid] = useState("");
  const [imKey, setImKey] = useState("");
  const [showImSetup, setShowImSetup] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [autoReplying, setAutoReplying] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", phone: "", message: "", product: "", location: "" });
  const [activeTab, setActiveTab] = useState<"all" | "unreplied" | "replied">("all");
  const unsubRef = useRef<(() => void) | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Load saved IndiaMART credentials
  useEffect(() => {
    AsyncStorage.multiGet(["indiamart_glid", "indiamart_key"]).then((pairs) => {
      const glid = pairs[0][1] ?? "";
      const key = pairs[1][1] ?? "";
      if (glid) setImGlid(glid);
      if (key) setImKey(key);
    });
  }, []);

  // Real-time leads from Firebase
  useEffect(() => {
    const unsub = listenToLeads((newLeads) => {
      setLeads(newLeads);
      // Compute stats inline
      const total = newLeads.length;
      const replied = newLeads.filter((l) => l.replied).length;
      const today = newLeads.filter((l) => l.timestamp > Date.now() - 86400000).length;
      const bySource = newLeads.reduce((acc, l) => {
        acc[l.source] = (acc[l.source] ?? 0) + 1; return acc;
      }, {} as Record<string, number>);
      setStats({ total, replied, unreplied: total - replied, today, bySource });
    });
    unsubRef.current = unsub;
    return () => unsub();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    const s = await getLeadStatsFromFirebase();
    setStats(s);
    setRefreshing(false);
  }

  async function fetchIndiaMART() {
    if (!imGlid.trim() || !imKey.trim()) {
      Alert.alert("Required", "IndiaMART GLID aur API Key daalein");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Save credentials for auto-hunting
      await AsyncStorage.multiSet([
        ["indiamart_glid", imGlid.trim()],
        ["indiamart_key", imKey.trim()],
      ]);

      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const fmt = (d: Date) =>
        `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()} 00:00:00`;

      const url =
        `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?` +
        `glusr_crm_key=${encodeURIComponent(imKey.trim())}` +
        `&glusr_crm_glid=${encodeURIComponent(imGlid.trim())}` +
        `&glusr_crm_start_time=${encodeURIComponent(fmt(start))}` +
        `&glusr_crm_end_time=${encodeURIComponent(fmt(now))}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const data = await res.json() as any;
      const inquiries = data.RESPONSE?.STATUS === 1 ? (data.RESPONSE?.RESULTS ?? []) : [];

      let newCount = 0;
      const existingIds = new Set(leads.map((l) => l.id));

      for (const inq of inquiries) {
        const id = `im_${inq.UNIQUE_QUERY_ID ?? Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        if (existingIds.has(id)) continue;
        const lead: FirebaseLead = {
          id,
          source: "IndiaMART",
          name: inq.SENDER_NAME ?? "Unknown",
          phone: inq.SENDER_MOBILE ?? inq.SENDER_PHONE ?? "",
          email: inq.SENDER_EMAIL ?? "",
          message: inq.QUERY_MESSAGE ?? inq.SUBJECT ?? "Product inquiry",
          product: inq.QUERY_PRODUCT_NAME ?? "",
          location: inq.SENDER_CITY ?? "",
          timestamp: new Date(inq.QUERY_TIME ?? Date.now()).getTime(),
          replied: false,
        };
        await saveLeadToFirebase(lead);
        newCount++;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("✅ Done!", `${newCount} naye leads mile IndiaMART se! Firebase mein save ho gaye.`);
      setShowImSetup(false);
      await AsyncStorage.setItem("last_lead_hunt", Date.now().toString());
    } catch (e: any) {
      Alert.alert("❌ Error", e.message ?? "IndiaMART fetch failed");
    }
    setLoading(false);
  }

  async function addManualLead() {
    if (!newLead.name.trim() || !newLead.phone.trim()) {
      Alert.alert("Required", "Name aur phone number daalein");
      return;
    }
    try {
      const lead: FirebaseLead = {
        id: `manual_${Date.now()}`,
        source: "Manual",
        name: newLead.name.trim(),
        phone: newLead.phone.trim(),
        message: newLead.message.trim() || "Inquiry",
        product: newLead.product.trim(),
        location: newLead.location.trim(),
        timestamp: Date.now(),
        replied: false,
      };
      await saveLeadToFirebase(lead);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddLead(false);
      setNewLead({ name: "", phone: "", message: "", product: "", location: "" });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function replyOne(lead: FirebaseLead) {
    Haptics.selectionAsync();
    try {
      const prompt =
        `New lead from ${lead.source}:\n` +
        `Client: ${lead.name}${lead.location ? ` (${lead.location})` : ""}\n` +
        `Message: "${lead.message}"${lead.product ? `\nProduct: ${lead.product}` : ""}\n\n` +
        `Write a short, professional WhatsApp reply in Hinglish (2-4 lines). Introduce MA Engineering, ask qualifying questions (tonnage? span? application?). Keep it warm and friendly.`;
      const reply = await sendToLily(prompt);
      await updateLeadInFirebase(lead.id, { replied: true, replyText: reply });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function autoReplyAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setAutoReplying(true);
    const unreplied = leads.filter((l) => !l.replied).slice(0, 10);
    let count = 0;
    for (const lead of unreplied) {
      try {
        const prompt =
          `Lead from ${lead.source}: "${lead.message}"${lead.product ? ` about ${lead.product}` : ""}. Client: ${lead.name}.` +
          ` Write a short professional Hinglish WhatsApp reply (2-4 lines) from MA Engineering. Ask qualifying questions.`;
        const reply = await sendToLily(prompt);
        await updateLeadInFirebase(lead.id, { replied: true, replyText: reply });
        count++;
      } catch {}
    }
    setAutoReplying(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("✅ Auto-Reply Complete!", `${count} leads ko Lily ne reply kar di!`);
  }

  function fmtTime(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString("en-IN");
  }

  const filteredLeads = leads.filter((l) =>
    activeTab === "all" ? true : activeTab === "unreplied" ? !l.replied : l.replied
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.neonBlue }]}>LEAD BOT 🤖</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Auto Lead Generator • Firebase Sync
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.neonBlue }]}
          onPress={() => setShowAddLead(true)}
        >
          <Feather name="plus" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonBlue} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            {[
              { label: "Total", value: stats.total, color: colors.neonBlue },
              { label: "Today", value: stats.today, color: colors.neonCyan },
              { label: "Replied", value: stats.replied, color: "#25D366" },
              { label: "Pending", value: stats.unreplied, color: colors.accent },
            ].map((s) => (
              <View
                key={s.label}
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: `${s.color}40`, flex: 1 }]}
              >
                <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Source Badges */}
        {stats?.bySource && Object.keys(stats.bySource).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {Object.entries(stats.bySource).map(([src, count]) => (
              <View
                key={src}
                style={[
                  styles.srcBadge,
                  {
                    backgroundColor: `${SOURCE_COLORS[src] ?? colors.neonBlue}20`,
                    borderColor: `${SOURCE_COLORS[src] ?? colors.neonBlue}50`,
                  },
                ]}
              >
                <View style={[styles.srcDot, { backgroundColor: SOURCE_COLORS[src] ?? colors.neonBlue }]} />
                <Text style={[styles.srcText, { color: SOURCE_COLORS[src] ?? colors.neonBlue }]}>
                  {src}: {count}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Firebase Badge */}
        <View style={[styles.fbBadge, { backgroundColor: "#FF6B0010", borderColor: "#FF6B0040" }]}>
          <Feather name="database" size={13} color="#FF6B00" />
          <Text style={[styles.fbText, { color: "#FF6B00" }]}>
            Firebase Firestore — Real-time sync active ✓
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#1B75BB", flex: 1 }]}
            onPress={() => setShowImSetup(true)}
          >
            <Feather name="download" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>IndiaMART</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: autoReplying ? `${colors.neonCyan}60` : colors.neonCyan, flex: 1 },
            ]}
            onPress={autoReplyAll}
            disabled={autoReplying}
          >
            {autoReplying ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Feather name="zap" size={16} color="#000" />
            )}
            <Text style={[styles.actionBtnText, { color: "#000" }]}>
              {autoReplying ? "Replying..." : "Auto Reply All"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab filter */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["all", "unreplied", "replied"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: activeTab === t ? `${colors.neonBlue}20` : "transparent",
                  borderBottomColor: activeTab === t ? colors.neonBlue : "transparent",
                },
              ]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabLabel, { color: activeTab === t ? colors.neonBlue : colors.mutedForeground }]}>
                {t === "all"
                  ? `All (${leads.length})`
                  : t === "unreplied"
                  ? `Pending (${leads.filter((l) => !l.replied).length})`
                  : `Done (${leads.filter((l) => l.replied).length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leads List */}
        {filteredLeads.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="inbox" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Koi lead nahi abhi</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {"IndiaMART se fetch karo ya manually add karo\nBot automatically Lily AI se reply karega"}
            </Text>
          </View>
        ) : (
          filteredLeads.map((lead) => (
            <View
              key={lead.id}
              style={[
                styles.leadCard,
                {
                  backgroundColor: colors.card,
                  borderColor: lead.replied ? `${colors.neonCyan}30` : `${colors.accent}30`,
                  borderLeftColor: SOURCE_COLORS[lead.source] ?? colors.neonBlue,
                },
              ]}
            >
              <View style={styles.leadTop}>
                <View style={[styles.srcTag, { backgroundColor: `${SOURCE_COLORS[lead.source] ?? colors.neonBlue}20` }]}>
                  <Text style={[styles.srcTagText, { color: SOURCE_COLORS[lead.source] ?? colors.neonBlue }]}>
                    {lead.source}
                  </Text>
                </View>
                <Text style={[styles.leadTime, { color: colors.mutedForeground }]}>{fmtTime(lead.timestamp)}</Text>
                {lead.replied && (
                  <View style={[styles.repliedTag, { backgroundColor: "#25D36620" }]}>
                    <Feather name="check" size={11} color="#25D366" />
                    <Text style={[styles.repliedText, { color: "#25D366" }]}>Replied</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.leadName, { color: colors.foreground }]}>{lead.name}</Text>
              {!!lead.location && (
                <Text style={[styles.leadMeta, { color: colors.mutedForeground }]}>📍 {lead.location}</Text>
              )}
              {!!lead.product && (
                <Text style={[styles.leadMeta, { color: colors.neonBlue }]}>🔧 {lead.product}</Text>
              )}
              <Text style={[styles.leadMsg, { color: colors.mutedForeground }]} numberOfLines={2}>
                {lead.message}
              </Text>
              {lead.replied && !!lead.replyText && (
                <View
                  style={[
                    styles.replyPreview,
                    { backgroundColor: `${colors.neonBlue}08`, borderColor: `${colors.neonBlue}20` },
                  ]}
                >
                  <Text style={[styles.replyLabel, { color: colors.neonBlue }]}>LILY REPLIED:</Text>
                  <Text style={[styles.replyText, { color: colors.foreground }]} numberOfLines={2}>
                    {lead.replyText}
                  </Text>
                </View>
              )}
              {!lead.replied && (
                <TouchableOpacity
                  style={[styles.replyBtn, { backgroundColor: colors.neonCyan }]}
                  onPress={() => replyOne(lead)}
                >
                  <Feather name="zap" size={14} color="#000" />
                  <Text style={styles.replyBtnText}>Lily se Auto Reply</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* IndiaMART Setup Modal */}
      <Modal visible={showImSetup} transparent animationType="slide" onRequestClose={() => setShowImSetup(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}30` }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.srcIcon, { backgroundColor: "#1B75BB20" }]}>
                <Feather name="download-cloud" size={22} color="#1B75BB" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>IndiaMART Lead Fetch</Text>
              <TouchableOpacity onPress={() => setShowImSetup(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              IndiaMART Seller Panel → My Account → API → Lead Manager API se GLID aur Key milega
            </Text>
            {[
              { ph: "GLID (e.g. 12345678)", val: imGlid, set: setImGlid },
              { ph: "CRM API Key", val: imKey, set: setImKey },
            ].map((f, i) => (
              <View key={i} style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="key" size={16} color="#1B75BB" />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={f.ph}
                  placeholderTextColor={colors.mutedForeground}
                  value={f.val}
                  onChangeText={f.set}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ))}
            <View style={[styles.infoBox, { backgroundColor: "#1B75BB10", borderColor: "#1B75BB30" }]}>
              <Feather name="info" size={14} color="#1B75BB" />
              <Text style={[styles.infoText, { color: "#1B75BB99" }]}>
                Last 24 ghante ke leads fetch honge. Firebase mein save honge. Bot automatically Lily se reply karega. Server ki zaroorat nahi!
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: loading ? "#1B75BB80" : "#1B75BB" }]}
              onPress={fetchIndiaMART}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Feather name="download" size={18} color="#fff" />}
              <Text style={styles.mainBtnText}>{loading ? "Fetching..." : "Leads Fetch Karo"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Manual Lead Modal */}
      <Modal visible={showAddLead} transparent animationType="slide" onRequestClose={() => setShowAddLead(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}30` }]}>
            <View style={styles.modalHeader}>
              <Feather name="user-plus" size={22} color={colors.neonBlue} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Manual Lead Add</Text>
              <TouchableOpacity onPress={() => setShowAddLead(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {[
              { ph: "Client Name *", key: "name", icon: "user" as const },
              { ph: "Phone * (91XXXXXXXXXX)", key: "phone", icon: "phone" as const },
              { ph: "Product Interest (e.g. EOT Crane 50T)", key: "product", icon: "tool" as const },
              { ph: "Location (e.g. Mumbai)", key: "location", icon: "map-pin" as const },
              { ph: "Message / Requirement", key: "message", icon: "message-circle" as const },
            ].map((f) => (
              <View key={f.key} style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name={f.icon} size={16} color={colors.neonBlue} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={f.ph}
                  placeholderTextColor={colors.mutedForeground}
                  value={(newLead as any)[f.key]}
                  onChangeText={(v) => setNewLead((prev) => ({ ...prev, [f.key]: v }))}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: colors.neonBlue }]}
              onPress={addManualLead}
            >
              <Feather name="plus" size={18} color="#000" />
              <Text style={[styles.mainBtnText, { color: "#000" }]}>Lead Add Karo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { padding: 12, borderRadius: 12, borderWidth: 1.5, alignItems: "center", gap: 3 },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  srcBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  srcDot: { width: 7, height: 7, borderRadius: 4 },
  srcText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  fbBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  fbText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: 14, elevation: 4 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  tabBar: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2 },
  tabLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyBox: { alignItems: "center", gap: 10, paddingTop: 40 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  leadCard: { borderRadius: 14, borderWidth: 1, borderLeftWidth: 3, padding: 14, gap: 8 },
  leadTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  srcTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  srcTagText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  leadTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  repliedTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  repliedText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  leadName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  leadMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  leadMsg: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  replyPreview: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 3 },
  replyLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  replyText: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  replyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 10, borderRadius: 12 },
  replyBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#000" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalCard: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, gap: 14, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  srcIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  infoBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  mainBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 15, borderRadius: 14, elevation: 6 },
  mainBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
