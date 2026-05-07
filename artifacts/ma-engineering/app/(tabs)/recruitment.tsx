import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, Platform, RefreshControl,
  ScrollView, Share, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  generateJobPost, getJobPostsFromFirebase, JOB_ROLES,
  JobPost, RECRUITMENT_PLATFORMS, saveJobPostToFirebase,
  startRecruitmentBot, stopRecruitmentBot, getLastRecruitmentRun,
} from "@/lib/recruitmentBot";

export default function RecruitmentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<(JobPost & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [botEnabled, setBotEnabled] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([JOB_ROLES[0].role]);
  const [customLocation, setCustomLocation] = useState("Pan India");
  const [customSalary, setCustomSalary] = useState("As per industry standards + PF/ESI");
  const [showSetup, setShowSetup] = useState(false);
  const [showPost, setShowPost] = useState<(JobPost & { id: string }) | null>(null);
  const [generatingRole, setGeneratingRole] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState("Kabhi nahi");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    loadData();
    AsyncStorage.multiGet(["recruitment_bot_enabled", "recruitment_location", "recruitment_salary", "recruitment_active_roles"])
      .then(vals => {
        setBotEnabled(vals[0][1] === "true");
        if (vals[1][1]) setCustomLocation(vals[1][1]);
        if (vals[2][1]) setCustomSalary(vals[2][1]);
        if (vals[3][1]) { try { setSelectedRoles(JSON.parse(vals[3][1])); } catch {} }
      });
    getLastRecruitmentRun().then(setLastRun);
  }, []);

  async function loadData() {
    const data = await getJobPostsFromFirebase().catch(() => []);
    setPosts(data);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setLastRun(await getLastRecruitmentRun());
    setRefreshing(false);
  }

  async function saveSettings() {
    await AsyncStorage.multiSet([
      ["recruitment_bot_enabled", botEnabled ? "true" : "false"],
      ["recruitment_location", customLocation],
      ["recruitment_salary", customSalary],
      ["recruitment_active_roles", JSON.stringify(selectedRoles)],
    ]);
    if (botEnabled) startRecruitmentBot(); else stopRecruitmentBot();
    setShowSetup(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function generateOne(roleData: typeof JOB_ROLES[0]) {
    setGeneratingRole(roleData.role);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const post = await generateJobPost(roleData, customLocation);
      if (post) {
        const id = await saveJobPostToFirebase(post);
        setPosts(prev => [{ ...post, id }, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✅ Post Generated!", `${roleData.role} ke liye job post ready hai! Share kar sakte ho.`);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setGeneratingRole(null);
  }

  async function sharePost(post: JobPost) {
    Haptics.selectionAsync();
    await Share.share({
      message: post.postContent,
      title: `MA Engineering — ${post.role} Hiring`,
    });
  }

  async function generateAll() {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let count = 0;
    for (const roleName of selectedRoles.slice(0, 5)) {
      const roleData = JOB_ROLES.find(r => r.role === roleName) ?? JOB_ROLES[0];
      try {
        const post = await generateJobPost(roleData, customLocation);
        if (post) { await saveJobPostToFirebase(post); count++; }
      } catch {}
    }
    await loadData();
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("✅ Done!", `${count} job posts generate ho gaye! WhatsApp aur social media pe share karo.`);
  }

  function toggleRole(role: string) {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
    Haptics.selectionAsync();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.neonBlue }]}>RECRUIT BOT 👥</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Auto Job Posting • Gemini Powered • {posts.length} posts
          </Text>
        </View>
        <TouchableOpacity style={[styles.setupBtn, { backgroundColor: `${colors.neonBlue}15`, borderColor: `${colors.neonBlue}40` }]}
          onPress={() => setShowSetup(true)}>
          <Feather name="settings" size={16} color={colors.neonBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.neonBlue} />}
        showsVerticalScrollIndicator={false}>

        {/* Bot Status Card */}
        <View style={[styles.botCard, { backgroundColor: colors.card, borderColor: botEnabled ? `${colors.neonBlue}40` : `${colors.border}` }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.statusDot, { backgroundColor: botEnabled ? "#00FF41" : colors.mutedForeground }]} />
              <Text style={[styles.botTitle, { color: colors.foreground }]}>
                {botEnabled ? "BOT ACTIVE — Har 12 ghante auto-post" : "BOT INACTIVE"}
              </Text>
            </View>
            <Text style={[styles.botSub, { color: colors.mutedForeground }]}>
              Last run: {lastRun} • {selectedRoles.length} roles selected
            </Text>
          </View>
          <Switch
            value={botEnabled}
            onValueChange={async (v) => {
              setBotEnabled(v);
              await AsyncStorage.setItem("recruitment_bot_enabled", v ? "true" : "false");
              if (v) startRecruitmentBot(); else stopRecruitmentBot();
              Haptics.selectionAsync();
            }}
            trackColor={{ false: colors.border, true: `${colors.neonBlue}60` }}
            thumbColor={botEnabled ? colors.neonBlue : colors.mutedForeground}
          />
        </View>

        {/* Platforms */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {RECRUITMENT_PLATFORMS.map(p => (
            <View key={p.name} style={[styles.platformChip, { backgroundColor: `${p.color}15`, borderColor: `${p.color}40` }]}>
              <Feather name={p.icon as any} size={12} color={p.color} />
              <Text style={[styles.platformText, { color: p.color }]}>{p.name}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Quick Generate Buttons */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>⚡ QUICK GENERATE</Text>
        <View style={styles.rolesGrid}>
          {JOB_ROLES.map(role => (
            <TouchableOpacity key={role.role}
              style={[styles.roleBtn, { backgroundColor: colors.card, borderColor: selectedRoles.includes(role.role) ? `${colors.neonBlue}60` : colors.border }]}
              onPress={() => generateOne(role)}
              disabled={generatingRole === role.role}>
              {generatingRole === role.role
                ? <ActivityIndicator size="small" color={colors.neonBlue} />
                : <Feather name="briefcase" size={13} color={selectedRoles.includes(role.role) ? colors.neonBlue : colors.mutedForeground} />}
              <Text style={[styles.roleName, { color: selectedRoles.includes(role.role) ? colors.neonBlue : colors.foreground }]} numberOfLines={1}>
                {role.role}
              </Text>
              <Text style={[styles.roleExp, { color: colors.mutedForeground }]}>{role.exp}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Generate All */}
        <TouchableOpacity style={[styles.generateAllBtn, { backgroundColor: loading ? `${colors.neonBlue}50` : colors.neonBlue }]}
          onPress={generateAll} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Feather name="zap" size={18} color="#000" />}
          <Text style={styles.generateAllText}>
            {loading ? "Generating..." : `Generate All ${selectedRoles.length} Role Posts`}
          </Text>
        </TouchableOpacity>

        {/* Posts List */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>📋 GENERATED POSTS</Text>
        {posts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="users" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Koi post nahi abhi</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Upar se koi bhi role select karke Generate karo
            </Text>
          </View>
        ) : (
          posts.map(post => (
            <TouchableOpacity key={post.id}
              style={[styles.postCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}25` }]}
              onPress={() => setShowPost(post)} activeOpacity={0.85}>
              <View style={styles.postHeader}>
                <View style={[styles.roleBadge, { backgroundColor: `${colors.neonBlue}15` }]}>
                  <Text style={[styles.roleBadgeText, { color: colors.neonBlue }]}>{post.role}</Text>
                </View>
                <Text style={[styles.postTime, { color: colors.mutedForeground }]}>
                  {new Date(post.postedAt).toLocaleDateString("en-IN")}
                </Text>
                {post.active && (
                  <View style={[styles.activePill, { backgroundColor: "#00FF4115" }]}>
                    <Text style={[styles.activePillText, { color: "#00FF41" }]}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.postPreview, { color: colors.mutedForeground }]} numberOfLines={2}>
                {post.postContent}
              </Text>
              <View style={styles.postFooter}>
                <Text style={[styles.postMeta, { color: colors.mutedForeground }]}>
                  📍 {post.location} • 👤 {post.applications} applications
                </Text>
                <TouchableOpacity style={[styles.shareBtn, { backgroundColor: "#25D36615", borderColor: "#25D36640" }]}
                  onPress={() => sharePost(post)}>
                  <Feather name="share-2" size={13} color="#25D366" />
                  <Text style={[styles.shareBtnText, { color: "#25D366" }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Setup Modal */}
      <Modal visible={showSetup} transparent animationType="slide" onRequestClose={() => setShowSetup(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}30` }]}>
            <View style={styles.modalHeader}>
              <Feather name="settings" size={20} color={colors.neonBlue} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Recruitment Bot Setup</Text>
              <TouchableOpacity onPress={() => setShowSetup(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>📍 DEFAULT LOCATION</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="map-pin" size={15} color={colors.neonBlue} />
              <TextInput style={[styles.input, { color: colors.foreground }]} value={customLocation} onChangeText={setCustomLocation} placeholder="e.g. Pan India / Mumbai" placeholderTextColor={colors.mutedForeground} />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>💰 SALARY RANGE</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="dollar-sign" size={15} color={colors.neonCyan} />
              <TextInput style={[styles.input, { color: colors.foreground }]} value={customSalary} onChangeText={setCustomSalary} placeholder="e.g. 25,000-45,000/month" placeholderTextColor={colors.mutedForeground} />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>👷 SELECT ROLES (Auto-post karne ke liye)</Text>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {JOB_ROLES.map(r => (
                <TouchableOpacity key={r.role} style={[styles.roleCheckRow, { backgroundColor: selectedRoles.includes(r.role) ? `${colors.neonBlue}10` : "transparent" }]}
                  onPress={() => toggleRole(r.role)}>
                  <View style={[styles.checkbox, { borderColor: selectedRoles.includes(r.role) ? colors.neonBlue : colors.border, backgroundColor: selectedRoles.includes(r.role) ? colors.neonBlue : "transparent" }]}>
                    {selectedRoles.includes(r.role) && <Feather name="check" size={10} color="#000" />}
                  </View>
                  <View>
                    <Text style={[styles.checkRoleName, { color: colors.foreground }]}>{r.role}</Text>
                    <Text style={[styles.checkRoleExp, { color: colors.mutedForeground }]}>{r.exp} • {r.skills.slice(0, 2).join(", ")}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.neonBlue }]} onPress={saveSettings}>
              <Feather name="save" size={16} color="#000" />
              <Text style={styles.saveBtnText}>Save & Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Post Preview Modal */}
      <Modal visible={!!showPost} transparent animationType="slide" onRequestClose={() => setShowPost(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}30` }]}>
            <View style={styles.modalHeader}>
              <Feather name="file-text" size={20} color={colors.neonBlue} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{showPost?.role}</Text>
              <TouchableOpacity onPress={() => setShowPost(null)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.postFullText, { color: colors.foreground }]}>{showPost?.postContent}</Text>
            </ScrollView>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: "#25D366", marginTop: 12 }]}
              onPress={() => { if (showPost) sharePost(showPost); setShowPost(null); }}>
              <Feather name="share-2" size={16} color="#fff" />
              <Text style={[styles.saveBtnText, { color: "#fff" }]}>WhatsApp pe Share Karo</Text>
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
  setupBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  botCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  botTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  botSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  platformChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  platformText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  sectionLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  rolesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleBtn: { width: "47%", padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  roleName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  roleExp: { fontSize: 9, fontFamily: "Inter_400Regular" },
  generateAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 15, borderRadius: 14, elevation: 6 },
  generateAllText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },
  emptyBox: { alignItems: "center", gap: 10, paddingTop: 30 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  postCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  postTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  activePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activePillText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  postPreview: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  postFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  postMeta: { fontSize: 10, fontFamily: "Inter_400Regular" },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  shareBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalCard: { padding: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, gap: 12, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  roleCheckRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkRoleName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  checkRoleExp: { fontSize: 10, fontFamily: "Inter_400Regular" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },
  postFullText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 22 },
});
