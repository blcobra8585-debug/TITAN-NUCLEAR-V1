import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView,
  Share, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { saveChatMessage } from "@/lib/firebaseService";
import { speakWithLily, stopSpeaking } from "@/lib/elevenlabs";
import { askAI, AIModel, ALL_AI_MODELS, resetAllAIChats, getAvailableModels, AIModelInfo } from "@/lib/multiAI";

interface Msg { id: string; text: string; isLily: boolean; model?: AIModel; }

const WELCOME: Msg = {
  id: "0",
  text: "[ TITAN NEURAL LINK ESTABLISHED ]\n\nNamaskar! Main TITAN hoon ⚡ — MA Engineering ka Multi-AI Brain.\n\nMujhse poochho: quotes, negotiations, crane specs, leads, HR, aur duniya ki koi bhi cheez.\n\nKaunsa AI use karna hai? Model select karo upar se 👆",
  isLily: true,
  model: "titan",
};

const QUICK_PHRASES = [
  "EOT Crane 50T quote chahiye",
  "Chimney 80m rate batao",
  "New lead reply draft karo",
  "AMC contract terms batao",
  "Competitor analysis karo",
  "Payment terms explain karo",
  "IS standards kaunsi follow karte ho?",
  "Urgent delivery possible hai?",
];

const PROVIDER_COLORS: Record<string, string> = {
  "Google": "#8B5CF6",
  "OpenAI": "#74AA9C",
  "Anthropic": "#D97757",
  "Groq": "#F97316",
  "DeepSeek": "#4F46E5",
  "Mistral": "#FF7000",
  "Cohere": "#39C5BB",
  "Perplexity": "#20B2AA",
  "Multi-AI": "#00B4FF",
};

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [showPhrases, setShowPhrases] = useState(true);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [activeModel, setActiveModel] = useState<AIModel>("titan");
  const [availableModels, setAvailableModels] = useState<AIModelInfo[]>([]);
  const [scanLine, setScanLine] = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getAvailableModels().then(setAvailableModels);
    AsyncStorage.getItem("titan_active_model").then(m => {
      if (m) setActiveModel(m as AIModel);
    });
    const t = setInterval(() => setScanLine(p => (p + 1) % 100), 50);
    return () => clearInterval(t);
  }, []);

  const activeModelInfo = ALL_AI_MODELS.find(m => m.id === activeModel) ?? ALL_AI_MODELS[0];

  async function selectModel(model: AIModel) {
    setActiveModel(model);
    await AsyncStorage.setItem("titan_active_model", model);
    setShowModelPicker(false);
    Haptics.selectionAsync();
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setShowPhrases(false);
    Haptics.selectionAsync();
    const userMsg: Msg = { id: Date.now().toString(), text: msg, isLily: false };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    saveChatMessage(msg, false).catch(() => {});
    try {
      const reply = await askAI(msg, activeModel);
      const lilyId = `${Date.now()}l`;
      const lilyMsg: Msg = { id: lilyId, text: reply, isLily: true, model: activeModel };
      setMessages(prev => [...prev, lilyMsg]);
      saveChatMessage(reply, true).catch(() => {});
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      if (autoSpeak) {
        setSpeaking(true); setSpeakingId(lilyId);
        await speakWithLily(reply);
        setSpeaking(false); setSpeakingId(null);
      }
    } catch (e: any) {
      const errMsg: Msg = {
        id: `${Date.now()}err`,
        text: "⚠️ Kuch gadbad ho gayi, dobara try karo",
        isLily: true,
        model: activeModel,
      };
      setMessages(prev => [...prev, errMsg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } finally {
      setLoading(false);
    }
  }

  async function handleSpeak(msg: Msg) {
    if (speakingId === msg.id && speaking) {
      await stopSpeaking(); setSpeaking(false); setSpeakingId(null); return;
    }
    setSpeaking(true); setSpeakingId(msg.id);
    Haptics.selectionAsync();
    await speakWithLily(msg.text);
    setSpeaking(false); setSpeakingId(null);
  }

  function clearChat() {
    resetAllAIChats();
    setMessages([WELCOME]);
    setShowPhrases(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const modelColor = PROVIDER_COLORS[activeModelInfo.provider] ?? colors.neonBlue;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Hacker Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.background, borderBottomColor: `${modelColor}30` }]}>
        <View style={[styles.avatarWrap, { backgroundColor: `${modelColor}20`, borderColor: `${modelColor}50`, borderWidth: 1 }]}>
          <Text style={{ fontSize: 16 }}>{activeModelInfo.icon}</Text>
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>TITAN AI</Text>
            <View style={[styles.onlineDot, { backgroundColor: "#00FF41" }]} />
            <Text style={[styles.onlineText, { color: "#00FF41" }]}>ONLINE</Text>
          </View>
          <TouchableOpacity onPress={() => setShowModelPicker(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[styles.modelTag, { color: modelColor, backgroundColor: `${modelColor}15` }]}>
              {activeModelInfo.icon} {activeModelInfo.name}
            </Text>
            <Feather name="chevron-down" size={11} color={modelColor} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.hBtn, { backgroundColor: autoSpeak ? `${colors.neonCyan}20` : "transparent", borderColor: autoSpeak ? colors.neonCyan : `${colors.border}60` }]}
          onPress={() => { setAutoSpeak(!autoSpeak); Haptics.selectionAsync(); }}>
          <Feather name={autoSpeak ? "volume-2" : "volume-x"} size={14} color={autoSpeak ? colors.neonCyan : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.hBtn, { borderColor: `${colors.border}60` }]} onPress={clearChat}>
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Quick phrases */}
      {showPhrases && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={[styles.phrasesScroll, { borderBottomColor: `${colors.neonBlue}10` }]}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}>
          {QUICK_PHRASES.map(p => (
            <TouchableOpacity key={p} style={[styles.phraseChip, { backgroundColor: `${colors.neonBlue}08`, borderColor: `${colors.neonBlue}25` }]} onPress={() => send(p)}>
              <Text style={[styles.phraseText, { color: colors.neonBlue }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const mInfo = item.model ? ALL_AI_MODELS.find(m => m.id === item.model) : null;
          const mColor = mInfo ? (PROVIDER_COLORS[mInfo.provider] ?? colors.neonBlue) : colors.neonBlue;
          return (
            <View style={[styles.msgRow, { justifyContent: item.isLily ? "flex-start" : "flex-end" }]}>
              <View style={[styles.bubble, {
                backgroundColor: item.isLily ? `${mColor}0D` : `${colors.accent}12`,
                borderColor: item.isLily ? `${mColor}30` : `${colors.accent}30`,
                maxWidth: "87%",
              }]}>
                {item.isLily && mInfo && (
                  <View style={[styles.modelBadge, { backgroundColor: `${mColor}15` }]}>
                    <Text style={{ fontSize: 10 }}>{mInfo.icon}</Text>
                    <Text style={[styles.modelBadgeText, { color: mColor }]}>{mInfo.name}</Text>
                  </View>
                )}
                <Text style={[styles.msgText, { color: colors.foreground }]}>{item.text}</Text>
                {item.isLily && (
                  <View style={styles.msgActions}>
                    <TouchableOpacity style={[styles.actionChip, { borderColor: `${colors.neonCyan}40` }]} onPress={() => handleSpeak(item)}>
                      <Feather name={speakingId === item.id && speaking ? "volume-x" : "volume-2"} size={11} color={speakingId === item.id && speaking ? colors.accent : colors.neonCyan} />
                      <Text style={[styles.actionChipText, { color: colors.neonCyan }]}>{speakingId === item.id && speaking ? "Rok" : "Suno"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionChip, { borderColor: `${colors.mutedForeground}30` }]}
                      onPress={() => Share.share({ message: `TITAN AI (MA Engineering):\n\n${item.text}` })}>
                      <Feather name="share-2" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.actionChipText, { color: colors.mutedForeground }]}>Share</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={loading ? (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color={modelColor} />
            <Text style={[styles.typingText, { color: modelColor }]}>  {activeModelInfo.name} processing...</Text>
          </View>
        ) : null}
      />

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: `${modelColor}20`, paddingBottom: botPad + 8 }]}>
        <TextInput
          style={[styles.input, { backgroundColor: `${modelColor}08`, color: colors.foreground, borderColor: `${modelColor}20` }]}
          placeholder={`${activeModelInfo.icon} ${activeModelInfo.name} se poochho...`}
          placeholderTextColor={colors.mutedForeground}
          value={input} onChangeText={setInput}
          onSubmitEditing={() => send()} multiline returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: loading ? `${modelColor}50` : modelColor, shadowColor: modelColor }]}
          onPress={() => send()} disabled={loading} activeOpacity={0.8}>
          <Feather name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Model Picker Modal */}
      <Modal visible={showModelPicker} transparent animationType="slide" onRequestClose={() => setShowModelPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: `${colors.neonBlue}30` }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.neonBlue }]}>⚡ AI MODEL SELECT</Text>
              <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              {availableModels.length} models available • Keys Admin Panel mein set karo
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {ALL_AI_MODELS.map(m => {
                const isAvailable = availableModels.some(am => am.id === m.id);
                const mColor = PROVIDER_COLORS[m.provider] ?? colors.neonBlue;
                const isActive = activeModel === m.id;
                return (
                  <TouchableOpacity key={m.id}
                    style={[styles.modelOption, { backgroundColor: isActive ? `${mColor}15` : "transparent", borderColor: isActive ? `${mColor}40` : "transparent", borderWidth: 1, borderRadius: 12, marginBottom: 6 }]}
                    onPress={() => isAvailable ? selectModel(m.id) : null}
                    activeOpacity={isAvailable ? 0.7 : 1}>
                    <View style={[styles.modelIconWrap, { backgroundColor: `${mColor}20` }]}>
                      <Text style={{ fontSize: 18 }}>{m.icon}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.modelName, { color: isAvailable ? colors.foreground : colors.mutedForeground }]}>{m.name}</Text>
                        {m.free && <View style={[styles.freeBadge, { backgroundColor: "#00FF4115" }]}><Text style={[styles.freeText, { color: "#00FF41" }]}>FREE</Text></View>}
                        <View style={[styles.speedBadge, { backgroundColor: m.speed === "fast" ? "#00FF4110" : m.speed === "medium" ? "#FFB90010" : "#FF444410" }]}>
                          <Text style={[styles.speedText, { color: m.speed === "fast" ? "#00FF41" : m.speed === "medium" ? "#FFB900" : "#FF4444" }]}>
                            {m.speed === "fast" ? "⚡ FAST" : m.speed === "medium" ? "◆ MED" : "● DEEP"}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.modelDesc, { color: isAvailable ? colors.mutedForeground : `${colors.mutedForeground}50` }]}>{m.provider} • {m.desc}</Text>
                      {!isAvailable && m.id !== "titan" && (
                        <Text style={[styles.keyHint, { color: `${colors.accent}70` }]}>🔑 Admin Panel → {m.apiKeyField.replace("_api_key", "").toUpperCase()} key set karo</Text>
                      )}
                    </View>
                    {isActive && <Feather name="check-circle" size={18} color={mColor} />}
                    {!isAvailable && <Feather name="lock" size={15} color={`${colors.mutedForeground}50`} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 6 },
  avatarWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  modelTag: { fontSize: 10, fontFamily: "Inter_700Bold", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
  hBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  phrasesScroll: { flexGrow: 0, borderBottomWidth: 1 },
  phraseChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  phraseText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  msgRow: { flexDirection: "row" },
  bubble: { padding: 13, borderRadius: 18, borderWidth: 1, gap: 6 },
  modelBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  modelBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  msgText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  msgActions: { flexDirection: "row", gap: 6, marginTop: 4 },
  actionChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  actionChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  typing: { flexDirection: "row", alignItems: "center", padding: 16 },
  typingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 34, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  modalTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  modalSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 14 },
  modelOption: { flexDirection: "row", alignItems: "center", padding: 12 },
  modelIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modelName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modelDesc: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  keyHint: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 3 },
  freeBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  freeText: { fontSize: 8, fontFamily: "Inter_700Bold" },
  speedBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  speedText: { fontSize: 8, fontFamily: "Inter_700Bold" },
});
