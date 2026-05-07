import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Share } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { sendToLily, resetChat, loadChatHistory, getCurrentModel } from "@/lib/gemini";
import { saveChatMessage } from "@/lib/firebaseService";
import { speakWithLily, stopSpeaking } from "@/lib/elevenlabs";
import { sendWAMsg } from "@/lib/waWebClient";
import { useApp } from "@/context/AppContext";

interface Msg { id: string; text: string; isLily: boolean; }

const WELCOME: Msg = {
  id: "0",
  text: "Namaskar! Main Lily hoon 🙏 MA Engineering ki AI Senior Manager.\n\nMain powered hoon Gemini Pro se — engineering, quotes, negotiations, technical specs — sab kuch handle karti hoon.\n\nKya poochhna hai aapko?",
  isLily: true,
};

const QUICK_PHRASES = [
  "EOT Crane 50T ka quote chahiye",
  "Chimney 60 metre height — rate kya hai?",
  "AMC contract ke baare mein batao",
  "Payment terms kya hain?",
  "Suhan sir se milna hai",
  "IS standard kaunsi follow karte ho?",
  "Urgent delivery ho sakti hai?",
  "Catalog bhejo",
];

const MODEL_LABELS: Record<string, string> = {
  flash: "Gemini Flash (Fast)",
  pro: "Gemini Pro (Smart)",
  flash2: "Gemini 2.0 (Latest)",
};

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { serverUrl, waToken } = useApp();
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [showPhrases, setShowPhrases] = useState(true);
  const [currentModel, setCurrentModel] = useState("pro");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadHistory();
    getCurrentModel().then(setCurrentModel);
  }, []);

  async function loadHistory() {
    try {
      const hist = await loadChatHistory();
      if (hist.length > 0) {
        setMessages([WELCOME, ...hist]);
        setShowPhrases(false);
      }
    } catch {}
    setHistoryLoaded(true);
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
    const reply = await sendToLily(msg);
    const lilyId = Date.now().toString() + "l";
    const lilyMsg: Msg = { id: lilyId, text: reply, isLily: true };
    setMessages(prev => [...prev, lilyMsg]);
    saveChatMessage(reply, true).catch(() => {});
    setLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    if (autoSpeak) {
      setSpeaking(true); setSpeakingId(lilyId);
      await speakWithLily(reply);
      setSpeaking(false); setSpeakingId(null);
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

  async function shareMsg(text: string) {
    Haptics.selectionAsync();
    await Share.share({ message: `Lily AI (MA Engineering):\n\n${text}`, title: "Lily ka jawab" });
  }

  async function sendToWA(text: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!serverUrl) { alert("Admin Panel mein Server URL set karo"); return; }
    const result = await sendWAMsg("917895643069", `Lily AI:\n${text}`);
    if (result.success) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else alert(result.error ?? "WhatsApp send failed");
  }

  function clearChat() {
    resetChat();
    setMessages([WELCOME]);
    setShowPhrases(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding" keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.background, borderBottomColor: `${colors.neonBlue}20` }]}>
        <View style={[styles.avatarWrap, { backgroundColor: `${colors.neonBlue}20` }]}>
          <Feather name="cpu" size={18} color={colors.neonBlue} />
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Lily AI</Text>
          <TouchableOpacity onPress={() => setShowModelPicker(!showModelPicker)}>
            <Text style={[styles.headerSub, { color: colors.neonCyan }]}>
              {MODEL_LABELS[currentModel] ?? "Gemini Pro"} ▾
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.hBtn, { backgroundColor: autoSpeak ? `${colors.neonCyan}20` : `${colors.border}40`, borderColor: autoSpeak ? colors.neonCyan : colors.border }]} onPress={() => { setAutoSpeak(!autoSpeak); Haptics.selectionAsync(); }}>
          <Feather name={autoSpeak ? "volume-2" : "volume-x"} size={14} color={autoSpeak ? colors.neonCyan : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.hBtn, { borderColor: colors.border }]} onPress={clearChat}>
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Model Picker */}
      {showModelPicker && (
        <View style={[styles.modelPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {Object.entries(MODEL_LABELS).map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.modelOption, { backgroundColor: currentModel === key ? `${colors.neonBlue}20` : "transparent" }]}
              onPress={async () => {
                const { setModel } = await import("@/lib/gemini");
                await setModel(key);
                setCurrentModel(key);
                setShowModelPicker(false);
                Haptics.selectionAsync();
              }}>
              <Feather name="cpu" size={14} color={currentModel === key ? colors.neonBlue : colors.mutedForeground} />
              <Text style={[styles.modelLabel, { color: currentModel === key ? colors.neonBlue : colors.foreground }]}>{label}</Text>
              {currentModel === key && <Feather name="check" size={14} color={colors.neonBlue} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Auto-speak bar */}
      {autoSpeak && (
        <View style={[styles.autoBar, { backgroundColor: `${colors.neonCyan}10`, borderBottomColor: `${colors.neonCyan}20` }]}>
          <Feather name="volume-2" size={12} color={colors.neonCyan} />
          <Text style={[styles.autoBarText, { color: colors.neonCyan }]}>Auto-voice ON — Lily automatically bolegi</Text>
        </View>
      )}

      {/* Quick phrases */}
      {showPhrases && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.phrasesScroll, { borderBottomColor: `${colors.neonBlue}10` }]} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}>
          {QUICK_PHRASES.map(p => (
            <TouchableOpacity key={p} style={[styles.phraseChip, { backgroundColor: `${colors.neonBlue}10`, borderColor: `${colors.neonBlue}30` }]} onPress={() => send(p)}>
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
        renderItem={({ item }) => (
          <View style={[styles.msgRow, { justifyContent: item.isLily ? "flex-start" : "flex-end" }]}>
            <View style={[styles.bubble, { backgroundColor: item.isLily ? `${colors.neonBlue}12` : `${colors.accent}12`, borderColor: item.isLily ? `${colors.neonBlue}35` : `${colors.accent}35`, maxWidth: "85%" }]}>
              <Text style={[styles.msgText, { color: colors.foreground }]}>{item.text}</Text>
              {item.isLily && (
                <View style={styles.msgActions}>
                  <TouchableOpacity style={[styles.actionChip, { borderColor: `${colors.neonCyan}40` }]} onPress={() => handleSpeak(item)}>
                    <Feather name={speakingId === item.id && speaking ? "volume-x" : "volume-2"} size={11} color={speakingId === item.id && speaking ? colors.accent : colors.neonCyan} />
                    <Text style={[styles.actionChipText, { color: speakingId === item.id && speaking ? colors.accent : colors.neonCyan }]}>
                      {speakingId === item.id && speaking ? "Rok" : "Suno"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionChip, { borderColor: `${colors.mutedForeground}30` }]} onPress={() => shareMsg(item.text)}>
                    <Feather name="share-2" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.actionChipText, { color: colors.mutedForeground }]}>Share</Text>
                  </TouchableOpacity>
                  {(serverUrl || waToken) && (
                    <TouchableOpacity style={[styles.actionChip, { borderColor: "#25D36640" }]} onPress={() => sendToWA(item.text)}>
                      <Feather name="message-circle" size={11} color="#25D366" />
                      <Text style={[styles.actionChipText, { color: "#25D366" }]}>WA</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color={colors.neonBlue} />
            <Text style={[styles.typingText, { color: colors.mutedForeground }]}>  Lily soch rahi hai...</Text>
          </View>
        ) : null}
      />

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: `${colors.neonBlue}20`, paddingBottom: botPad + 8 }]}>
        <TextInput
          style={[styles.input, { backgroundColor: `${colors.neonBlue}08`, color: colors.foreground, borderColor: `${colors.neonBlue}20` }]}
          placeholder="Lily se poochho kuch bhi..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          multiline
          returnKeyType="send"
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: loading ? `${colors.neonBlue}50` : colors.neonBlue }]} onPress={() => send()} disabled={loading} activeOpacity={0.8}>
          <Feather name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, gap: 6 },
  avatarWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 1 },
  hBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modelPicker: { borderRadius: 12, borderWidth: 1, margin: 12, overflow: "hidden" },
  modelOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  modelLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  autoBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1 },
  autoBarText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  phrasesScroll: { flexGrow: 0, borderBottomWidth: 1 },
  phraseChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  phraseText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  msgRow: { flexDirection: "row" },
  bubble: { padding: 13, borderRadius: 18, borderWidth: 1 },
  msgText: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 21 },
  msgActions: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  actionChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, borderWidth: 1 },
  actionChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  typing: { flexDirection: "row", alignItems: "center", paddingLeft: 4, marginTop: 4 },
  typingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, maxHeight: 100 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", shadowColor: "#00B4FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
});
