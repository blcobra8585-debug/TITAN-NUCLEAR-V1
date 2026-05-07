import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { sendToLily, resetChat } from "@/lib/gemini";
import { saveChatMessage } from "@/lib/firebaseService";
import { speakWithLily, stopSpeaking } from "@/lib/elevenlabs";

interface Msg {
  id: string;
  text: string;
  isLily: boolean;
}

const WELCOME: Msg = {
  id: "0",
  text: "Namaskar! Main Lily hoon, MA Engineering ki Senior Manager (Gemini Pro powered). Crane erection, chimney ya boiler project ke baare mein poochhiye!",
  isLily: true,
};

const QUICK_PHRASES = [
  "EOT Crane ka rate kya hai?",
  "100 ton crane quote chahiye",
  "Chimney installation ke liye batao",
  "Meeting fix karni hai",
  "Catalog bhejo",
  "Payment terms kya hain?",
];

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [showQuickPhrases, setShowQuickPhrases] = useState(true);
  const listRef = useRef<FlatList>(null);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setShowQuickPhrases(false);
    Haptics.selectionAsync();
    const userMsg: Msg = { id: Date.now().toString(), text: msg, isLily: false };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    saveChatMessage(msg, false).catch(() => {});
    const reply = await sendToLily(msg);
    const lilyId = Date.now().toString() + "l";
    const lilyMsg: Msg = { id: lilyId, text: reply, isLily: true };
    setMessages((prev) => [...prev, lilyMsg]);
    saveChatMessage(reply, true).catch(() => {});
    setLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    // Auto-speak if enabled
    if (autoSpeak) {
      setSpeaking(true);
      setSpeakingId(lilyId);
      await speakWithLily(reply);
      setSpeaking(false);
      setSpeakingId(null);
    }
  }

  async function handleSpeak(msg: Msg) {
    if (speakingId === msg.id && speaking) {
      await stopSpeaking();
      setSpeaking(false);
      setSpeakingId(null);
      return;
    }
    setSpeaking(true);
    setSpeakingId(msg.id);
    Haptics.selectionAsync();
    await speakWithLily(msg.text);
    setSpeaking(false);
    setSpeakingId(null);
  }

  function clearChat() {
    resetChat();
    setMessages([WELCOME]);
    setShowQuickPhrases(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: `${colors.neonBlue}20` }]}>
        <View style={[styles.avatar, { backgroundColor: `${colors.neonBlue}20` }]}>
          <Feather name="user" size={20} color={colors.neonBlue} />
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Lily AI</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Senior Manager • Gemini Pro</Text>
        </View>

        {/* Auto-speak toggle */}
        <TouchableOpacity
          style={[styles.autoSpeakBtn, { backgroundColor: autoSpeak ? `${colors.neonCyan}20` : `${colors.border}50`, borderColor: autoSpeak ? colors.neonCyan : colors.border }]}
          onPress={() => { setAutoSpeak(!autoSpeak); Haptics.selectionAsync(); }}
        >
          <Feather name={autoSpeak ? "volume-2" : "volume-x"} size={14} color={autoSpeak ? colors.neonCyan : colors.mutedForeground} />
        </TouchableOpacity>

        {/* Clear chat */}
        <TouchableOpacity
          style={[styles.clearBtn, { borderColor: colors.border }]}
          onPress={clearChat}
        >
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Auto-speak indicator */}
      {autoSpeak && (
        <View style={[styles.autoSpeakBar, { backgroundColor: `${colors.neonCyan}10`, borderBottomColor: `${colors.neonCyan}20` }]}>
          <Feather name="volume-2" size={12} color={colors.neonCyan} />
          <Text style={[styles.autoSpeakBarText, { color: colors.neonCyan }]}>
            Lily ki awaaz auto-play ON hai
          </Text>
        </View>
      )}

      {/* Quick Phrases */}
      {showQuickPhrases && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.quickScroll, { borderBottomColor: `${colors.neonBlue}10` }]} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}>
          {QUICK_PHRASES.map((phrase) => (
            <TouchableOpacity
              key={phrase}
              style={[styles.quickChip, { backgroundColor: `${colors.neonBlue}10`, borderColor: `${colors.neonBlue}30` }]}
              onPress={() => send(phrase)}
            >
              <Text style={[styles.quickChipText, { color: colors.neonBlue }]}>{phrase}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.msgRow, { justifyContent: item.isLily ? "flex-start" : "flex-end" }]}>
            <View style={[
              styles.bubble,
              {
                backgroundColor: item.isLily ? `${colors.neonBlue}12` : `${colors.accent}12`,
                borderColor: item.isLily ? `${colors.neonBlue}35` : `${colors.accent}35`,
                maxWidth: "82%",
              },
            ]}>
              <Text style={[styles.msgText, { color: colors.foreground }]}>{item.text}</Text>
              {item.isLily && (
                <TouchableOpacity
                  style={[styles.speakBtn, { borderColor: `${speakingId === item.id && speaking ? colors.accent : colors.neonCyan}40` }]}
                  onPress={() => handleSpeak(item)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={speakingId === item.id && speaking ? "volume-x" : "volume-2"}
                    size={12}
                    color={speakingId === item.id && speaking ? colors.accent : colors.neonCyan}
                  />
                  <Text style={[styles.speakLabel, { color: speakingId === item.id && speaking ? colors.accent : colors.neonCyan }]}>
                    {speakingId === item.id && speaking ? "Rok do" : "Lily ki awaaz"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={styles.typing}>
              <ActivityIndicator size="small" color={colors.neonBlue} />
              <Text style={[styles.typingText, { color: colors.mutedForeground }]}>  Lily likh rahi hai...</Text>
            </View>
          ) : null
        }
      />

      {/* Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: `${colors.neonBlue}20`, paddingBottom: botPad + 8 }]}>
        <TextInput
          style={[styles.input, { backgroundColor: `${colors.neonBlue}08`, color: colors.foreground, borderColor: `${colors.neonBlue}20` }]}
          placeholder="Lily se kuch poochho..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          multiline
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: loading ? `${colors.neonBlue}60` : colors.neonBlue }]}
          onPress={() => send()}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Feather name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 6 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  autoSpeakBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  clearBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  autoSpeakBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1 },
  autoSpeakBarText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  quickScroll: { borderBottomWidth: 1, flexGrow: 0 },
  quickChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  quickChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  msgRow: { flexDirection: "row" },
  bubble: { padding: 13, borderRadius: 18, borderWidth: 1 },
  msgText: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 20 },
  speakBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, borderWidth: 1, alignSelf: "flex-start" },
  speakLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  typing: { flexDirection: "row", alignItems: "center", paddingLeft: 4, marginTop: 4 },
  typingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, fontSize: 14, fontFamily: "Inter_400Regular", borderWidth: 1, maxHeight: 100 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", shadowColor: "#00B4FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
});
