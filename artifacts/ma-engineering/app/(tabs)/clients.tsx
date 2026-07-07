import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getSecureItem } from "@/lib/security";

interface Client {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  projectType: string;
  notes: string;
  createdAt: string;
  totalQuotes: number;
  totalValue: number;
  status: "active" | "prospect" | "inactive";
}

const PROJECT_TYPES = [
  "EOT Crane", "Gantry Crane", "Chimney", "Boiler", "Steel Structure", "Jib Crane", "Other"
];
const STATUS_COLORS = { active: "#25D366", prospect: "#00B4FF", inactive: "#8899AA" };

const STORAGE_KEY = "ma_clients";

function randomId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function ClientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "prospect" | "inactive">("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [showDetail, setShowDetail] = useState<Client | null>(null);

  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", city: "", projectType: PROJECT_TYPES[0], notes: "", status: "prospect" as Client["status"] });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setClients(parsed);
      else setClients([]);
    } catch {
      // Corrupted storage data can crash the screen — reset safely
      await AsyncStorage.removeItem(STORAGE_KEY);
      setClients([]);
    }
  }

  async function save(list: Client[]) {
    setClients(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", company: "", phone: "", email: "", city: "", projectType: PROJECT_TYPES[0], notes: "", status: "prospect" });
    setShowModal(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({ name: c.name, company: c.company, phone: c.phone, email: c.email, city: c.city, projectType: c.projectType, notes: c.notes, status: c.status });
    setShowDetail(null);
    setShowModal(true);
  }

  async function submitForm() {
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert("Zaroori", "Naam aur phone number daalein.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date().toISOString();
    if (editing) {
      const updated = clients.map(c => c.id === editing.id ? { ...c, ...form } : c);
      await save(updated);
    } else {
      const newC: Client = { id: randomId(), ...form, createdAt: now, totalQuotes: 0, totalValue: 0 };
      await save([newC, ...clients]);
    }
    setShowModal(false);
  }

  async function deleteClient(id: string) {
    Alert.alert("Delete?", "Is client ko delete karein?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await save(clients.filter(c => c.id !== id));
        setShowDetail(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }},
    ]);
  }

  async function callClient(phone: string) {
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert("Error", "Call open nahi ho paya (phone dialer unavailable).");
    }
  }

  async function waClient(c: Client) {
    const waToken = await getSecureItem("wa_token").catch(() => null) ?? "";
    const wabaId = await getSecureItem("waba_id").catch(() => null) ?? "";
    const msg = `Namaskar *${c.name}* ji! 🙏\n\nMain Lily hoon, MA Engineering se. Aapke ${c.projectType} project ke baare mein baat karni thi.\n\nKya aap available hain?\n\n*MA Engineering* | 15+ Years Experience`;
    const result = await sendWhatsAppMessage(c.phone, msg);
    if (result.success) {
      Alert.alert("✅", "WhatsApp message bhej diya!");
    } else {
      Alert.alert("❌", result.error ?? "Failed");
    }
  }

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === "active").length,
    prospect: clients.filter(c => c.status === "prospect").length,
  };

  function renderClient({ item }: { item: Client }) {
    return (
      <TouchableOpacity style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowDetail(item)} activeOpacity={0.8}>
        <View style={styles.clientRow}>
          <View style={[styles.avatar, { backgroundColor: `${colors.neonBlue}20` }]}>
            <Text style={[styles.avatarText, { color: colors.neonBlue }]}>{item.name[0]?.toUpperCase()}</Text>
          </View>
          <View style={styles.clientInfo}>
            <View style={styles.clientNameRow}>
              <Text style={[styles.clientName, { color: colors.foreground }]}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={[styles.clientCompany, { color: colors.mutedForeground }]}>{item.company || item.projectType}</Text>
            <Text style={[styles.clientPhone, { color: colors.neonCyan }]}>{item.phone}</Text>
          </View>
          <TouchableOpacity style={styles.quickWA} onPress={() => waClient(item)}>
            <Feather name="message-circle" size={20} color="#25D366" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.neonBlue }]}>CLIENT CRM</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{clients.length} clients registered</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.neonBlue }]} onPress={openAdd}>
            <Feather name="user-plus" size={16} color="#000" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Total", val: stats.total, color: colors.neonBlue },
            { label: "Active", val: stats.active, color: "#25D366" },
            { label: "Prospects", val: stats.prospect, color: colors.neonCyan },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput style={[styles.searchInput, { color: colors.foreground }]} placeholder="Search clients..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
          {search ? <TouchableOpacity onPress={() => setSearch("")}><Feather name="x" size={15} color={colors.mutedForeground} /></TouchableOpacity> : null}
        </View>

        {/* Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(["all", "active", "prospect", "inactive"] as const).map(f => (
            <TouchableOpacity key={f} style={[styles.filterBtn, { backgroundColor: filter === f ? colors.neonBlue : colors.card, borderColor: filter === f ? colors.neonBlue : colors.border }]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, { color: filter === f ? "#000" : colors.mutedForeground }]}>{f.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderClient}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: botPad + 20, paddingTop: 8, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Koi client nahi{"\n"}Add New dabao</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={!!showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(null)}>
        <View style={styles.overlay}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}30` }]}>
            {showDetail && (
              <>
                <View style={styles.detailHeader}>
                  <View style={[styles.avatarLg, { backgroundColor: `${colors.neonBlue}20` }]}>
                    <Text style={[styles.avatarTextLg, { color: colors.neonBlue }]}>{showDetail.name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailName, { color: colors.foreground }]}>{showDetail.name}</Text>
                    <Text style={[styles.detailCompany, { color: colors.mutedForeground }]}>{showDetail.company}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[showDetail.status]}20`, alignSelf: "flex-start", marginTop: 4 }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[showDetail.status] }]}>{showDetail.status}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setShowDetail(null)}><Feather name="x" size={20} color={colors.mutedForeground} /></TouchableOpacity>
                </View>

                <View style={styles.detailGrid}>
                  {[
                    { icon: "phone", val: showDetail.phone, color: colors.neonCyan },
                    { icon: "mail", val: showDetail.email || "—", color: colors.neonBlue },
                    { icon: "map-pin", val: showDetail.city || "—", color: colors.neonPurple },
                    { icon: "tool", val: showDetail.projectType, color: "#F59E0B" },
                  ].map(d => (
                    <View key={d.icon} style={[styles.detailItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Feather name={d.icon as any} size={14} color={d.color} />
                      <Text style={[styles.detailItemText, { color: colors.foreground }]}>{d.val}</Text>
                    </View>
                  ))}
                </View>

                {showDetail.notes ? (
                  <View style={[styles.notesBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>NOTES</Text>
                    <Text style={[styles.notesText, { color: colors.foreground }]}>{showDetail.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#25D36620", borderColor: "#25D366" }]} onPress={() => waClient(showDetail)}>
                    <Feather name="message-circle" size={16} color="#25D366" />
                    <Text style={[styles.actionBtnText, { color: "#25D366" }]}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.neonBlue}20`, borderColor: colors.neonBlue }]} onPress={() => callClient(showDetail.phone)}>
                    <Feather name="phone" size={16} color={colors.neonBlue} />
                    <Text style={[styles.actionBtnText, { color: colors.neonBlue }]}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.neonPurple}20`, borderColor: colors.neonPurple }]} onPress={() => openEdit(showDetail)}>
                    <Feather name="edit-2" size={16} color={colors.neonPurple} />
                    <Text style={[styles.actionBtnText, { color: colors.neonPurple }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#EF444420", borderColor: "#EF4444" }]} onPress={() => deleteClient(showDetail.id)}>
                    <Feather name="trash-2" size={16} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}30` }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: colors.neonBlue }]}>{editing ? "CLIENT EDIT" : "NEW CLIENT"}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Feather name="x" size={20} color={colors.mutedForeground} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              {[
                { key: "name", placeholder: "Client Naam *", icon: "user" },
                { key: "company", placeholder: "Company / Organization", icon: "briefcase" },
                { key: "phone", placeholder: "Phone / WhatsApp *", icon: "phone", keyboardType: "phone-pad" },
                { key: "email", placeholder: "Email Address", icon: "mail", keyboardType: "email-address" },
                { key: "city", placeholder: "City / Location", icon: "map-pin" },
              ].map(f => (
                <View key={f.key} style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name={f.icon as any} size={15} color={colors.neonBlue} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={(form as any)[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    keyboardType={(f as any).keyboardType ?? "default"}
                  />
                </View>
              ))}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {PROJECT_TYPES.map(p => (
                  <TouchableOpacity key={p} style={[styles.projectChip, { backgroundColor: form.projectType === p ? `${colors.neonBlue}30` : colors.background, borderColor: form.projectType === p ? colors.neonBlue : colors.border }]} onPress={() => setForm(f => ({ ...f, projectType: p }))}>
                    <Text style={[styles.projectChipText, { color: form.projectType === p ? colors.neonBlue : colors.mutedForeground }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.statusRow}>
                {(["prospect", "active", "inactive"] as const).map(s => (
                  <TouchableOpacity key={s} style={[styles.statusOption, { backgroundColor: form.status === s ? `${STATUS_COLORS[s]}20` : colors.background, borderColor: form.status === s ? STATUS_COLORS[s] : colors.border }]} onPress={() => setForm(f => ({ ...f, status: s }))}>
                    <Text style={[styles.statusOptionText, { color: form.status === s ? STATUS_COLORS[s] : colors.mutedForeground }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, alignItems: "flex-start" }]}>
                <Feather name="file-text" size={15} color={colors.neonBlue} style={{ marginTop: 2 }} />
                <TextInput style={[styles.input, { color: colors.foreground }]} placeholder="Notes / Remarks" placeholderTextColor={colors.mutedForeground} value={form.notes} onChangeText={v => setForm(p => ({ ...p, notes: v }))} multiline numberOfLines={3} />
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.neonBlue }]} onPress={submitForm}>
              <Feather name={editing ? "save" : "user-plus"} size={16} color="#000" />
              <Text style={styles.submitBtnText}>{editing ? "Update Client" : "Add Client"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: "#000", fontSize: 12, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center" },
  statVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 2 },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  filterScroll: { flexGrow: 0 },
  filterBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 5, marginRight: 8 },
  filterText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  clientCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  clientInfo: { flex: 1, gap: 2 },
  clientNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  clientName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  clientCompany: { fontSize: 11, fontFamily: "Inter_400Regular" },
  clientPhone: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  quickWA: { padding: 6 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  detailCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 14 },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatarLg: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarTextLg: { fontSize: 22, fontFamily: "Inter_700Bold" },
  detailName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  detailCompany: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, width: "47%" },
  detailItemText: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  notesBox: { borderRadius: 10, borderWidth: 1, padding: 10 },
  notesLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 4 },
  notesText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "column", alignItems: "center", gap: 4, borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  actionBtnText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  formCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  formTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  formInput: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 10, marginBottom: 8 },
  input: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  projectChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  projectChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statusRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  statusOption: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: "center" },
  statusOptionText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  submitBtnText: { color: "#000", fontSize: 14, fontFamily: "Inter_700Bold" },
  neonPurple: { color: "#7B2FFF" },
});
