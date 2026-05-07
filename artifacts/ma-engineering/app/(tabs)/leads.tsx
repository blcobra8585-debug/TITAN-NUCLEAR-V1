import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, Platform, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

interface Lead {
  id: string;
  source: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  product?: string;
  location?: string;
  timestamp: number;
  replied: boolean;
  replyText?: string;
}

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
  const { serverUrl } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const loadData = useCallback(async () => {
    if (!serverUrl) return;
    try {
      const [leadsRes, statsRes] = await Promise.all([
        fetch(`${serverUrl}/api/leads/list`, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => null),
        fetch(`${serverUrl}/api/leads/stats`, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => null),
      ]);
      if (leadsRes?.leads) setLeads(leadsRes.leads);
      if (statsRes) setStats(statsRes);
    } catch {}
  }, [serverUrl]);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
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
      const res = await fetch(`${serverUrl}/api/leads/indiamart?glid=${encodeURIComponent(imGlid)}&key=${encodeURIComponent(imKey)}`, { signal: AbortSignal.timeout(20000) });
      const data = await res.json();
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✅ Done!", `${data.leads?.length ?? 0} naye leads mile IndiaMART se!`);
        setShowImSetup(false);
        await loadData();
      } else {
        Alert.alert("❌ Error", data.error ?? "IndiaMART API failed");
      }
    } catch (e: any) {
      Alert.alert("❌ Error", e.message);
    }
    setLoading(false);
  }

  async function addManualLead() {
    if (!newLead.name.trim() || !newLead.phone.trim()) {
      Alert.alert("Required", "Name aur phone number daalein");
      return;
    }
    try {
      const res = await fetch(`${serverUrl}/api/leads/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newLead, source: "Manual" }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAddLead(false);
        setNewLead({ name: "", phone: "", message: "", product: "", location: "" });
        await loadData();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function autoReplyAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setAutoReplying(true);
    try {
      const res = await fetch(`${serverUrl}/api/leads/auto-reply-all`, {
        method: "POST",
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("✅ Auto-Reply Complete!", `${data.processed} leads ko Lily ne reply kar di!`);
      await loadData();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setAutoReplying(false);
  }

  async function replyOne(lead: Lead) {
    Haptics.selectionAsync();
    try {
      const res = await fetch(`${serverUrl}/api/leads/auto-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json();
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadData();
      } else {
        Alert.alert("Error", data.error ?? "Reply failed");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  function fmtTime(ts: number) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-IN");
  }

  const filteredLeads = leads.filter(l =>
    activeTab === "all" ? true :
    activeTab === "unreplied" ? !l.replied :
    l.replied
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.neonBlue }]}>LEAD BOT 🤖</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Auto Lead Generator • IndiaMART + B2B</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.neonBlue }]} onPress={() => setShowAddLead(true)}>
          <Feather name="plus" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonBlue} />}
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
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: `${s.color}40`, flex: 1 }]}>
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
              <View key={src} style={[styles.srcBadge, { backgroundColor: `${SOURCE_COLORS[src] ?? colors.neonBlue}20`, borderColor: `${SOURCE_COLORS[src] ?? colors.neonBlue}50` }]}>
                <View style={[styles.srcDot, { backgroundColor: SOURCE_COLORS[src] ?? colors.neonBlue }]} />
                <Text style={[styles.srcText, { color: SOURCE_COLORS[src] ?? colors.neonBlue }]}>{src}: {count}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#1B75BB", flex: 1 }]}
            onPress={() => setShowImSetup(true)}
          >
            <Feather name="download" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>IndiaMART Leads</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: autoReplying ? `${colors.neonCyan}60` : colors.neonCyan, flex: 1 }]}
            onPress={autoReplyAll}
            disabled={autoReplying || !serverUrl}
          >
            {autoReplying ? <ActivityIndicator size="small" color="#000" /> : <Feather name="zap" size={16} color="#000" />}
            <Text style={[styles.actionBtnText, { color: "#000" }]}>
              {autoReplying ? "Replying..." : "Auto Reply All"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* No server warning */}
        {!serverUrl && (
          <View style={[styles.warnBox, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}40` }]}>
            <Feather name="alert-triangle" size={16} color={colors.accent} />
            <Text style={[styles.warnText, { color: colors.accent }]}>Admin Panel mein Server URL set karo pehle</Text>
          </View>
        )}

        {/* Tab filter */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["all", "unreplied", "replied"] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, { backgroundColor: activeTab === t ? `${colors.neonBlue}20` : "transparent", borderBottomColor: activeTab === t ? colors.neonBlue : "transparent" }]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabLabel, { color: activeTab === t ? colors.neonBlue : colors.mutedForeground }]}>
                {t === "all" ? `All (${leads.length})` : t === "unreplied" ? `Pending (${leads.filter(l => !l.replied).length})` : `Done (${leads.filter(l => l.replied).length})`}
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
              {"IndiaMART se fetch karo ya manually add karo\nBot automatically reply karega Lily AI se"}
            </Text>
          </View>
        ) : (
          filteredLeads.map(lead => (
            <View key={lead.id} style={[styles.leadCard, { backgroundColor: colors.card, borderColor: lead.replied ? `${colors.neonCyan}30` : `${colors.accent}30`, borderLeftWidth: 3, borderLeftColor: SOURCE_COLORS[lead.source] ?? colors.neonBlue }]}>
              <View style={styles.leadTop}>
                <View style={[styles.srcTag, { backgroundColor: `${SOURCE_COLORS[lead.source] ?? colors.neonBlue}20` }]}>
                  <Text style={[styles.srcTagText, { color: SOURCE_COLORS[lead.source] ?? colors.neonBlue }]}>{lead.source}</Text>
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
              {lead.location && <Text style={[styles.leadMeta, { color: colors.mutedForeground }]}>📍 {lead.location}</Text>}
              {lead.product && <Text style={[styles.leadMeta, { color: colors.neonBlue }]}>🔧 {lead.product}</Text>}
              <Text style={[styles.leadMsg, { color: colors.mutedForeground }]} numberOfLines={2}>{lead.message}</Text>

              {lead.replied && lead.replyText && (
                <View style={[styles.replyPreview, { backgroundColor: `${colors.neonBlue}08`, borderColor: `${colors.neonBlue}20` }]}>
                  <Text style={[styles.replyLabel, { color: colors.neonBlue }]}>LILY REPLIED:</Text>
                  <Text style={[styles.replyText, { color: colors.foreground }]} numberOfLines={2}>{lead.replyText}</Text>
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
              <TouchableOpacity onPress={() => setShowImSetup(false)}><Feather name="x" size={20} color={colors.mutedForeground} /></TouchableOpacity>
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
                <TextInput style={[styles.input, { color: colors.foreground }]} placeholder={f.ph} placeholderTextColor={colors.mutedForeground} value={f.val} onChangeText={f.set} autoCapitalize="none" />
              </View>
            ))}
            <View style={[styles.infoBox, { backgroundColor: "#1B75BB10", borderColor: "#1B75BB30" }]}>
              <Feather name="info" size={14} color="#1B75BB" />
              <Text style={[styles.infoText, { color: "#1B75BB99" }]}>Last 24 ghante ke leads fetch honge. Bot automatically Lily se reply karega.</Text>
            </View>
            <TouchableOpacity style={[styles.mainBtn, { backgroundColor: loading ? "#1B75BB80" : "#1B75BB" }]} onPress={fetchIndiaMART} disabled={loading}>
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
              <TouchableOpacity onPress={() => setShowAddLead(false)}><Feather name="x" size={20} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
            {[
              { ph: "Client Name *", key: "name", icon: "user" as const },
              { ph: "Phone Number * (91XXXXXXXXXX)", key: "phone", icon: "phone" as const },
              { ph: "Product Interest (e.g. EOT Crane 50T)", key: "product", icon: "tool" as const },
              { ph: "Location (e.g. Mumbai)", key: "location", icon: "map-pin" as const },
              { ph: "Message / Requirement", key: "message", icon: "message-circle" as const },
            ].map(f => (
              <View key={f.key} style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name={f.icon} size={16} color={colors.neonBlue} />
                <TextInput style={[styles.input, { color: colors.foreground }]} placeholder={f.ph} placeholderTextColor={colors.mutedForeground} value={(newLead as any)[f.key]} onChangeText={v => setNewLead(prev => ({ ...prev, [f.key]: v }))} />
              </View>
            ))}
            <TouchableOpacity style={[styles.mainBtn, { backgroundColor: colors.neonBlue }]} onPress={addManualLead}>
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
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: 14, elevation: 4 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  warnBox: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  tabBar: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2 },
  tabLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyBox: { alignItems: "center", gap: 10, paddingTop: 40 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  leadCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
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
