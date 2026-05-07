import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { sendToLily } from "@/lib/gemini";
import { saveChatMessage } from "@/lib/firebaseService";
import { speakWithLily, stopSpeaking } from "@/lib/elevenlabs";

interface Msg {
  id: string;
  text: string;
  isLily: boolean;
}

const WELCOME: Msg = {
  id: "0",
  text: "Namaskar! Main Lily hoon, MA Engineering ki Senior Manager. Crane erection, chimney ya boiler project ke baare mein poochhiye — main ready hoon!",
  isLily: true,
};

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    Haptics.selectionAsync();
    const userMsg: Msg = { id: Date.now().toString(), text, isLily: false };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    saveChatMessage(text, false).catch(() => {});
    const reply = await sendToLily(text);
    const lilyId = Date.now().toString() + "l";
    const lilyMsg: Msg = { id: lilyId, text: reply, isLily: true };
    setMessages((prev) => [...prev, lilyMsg]);
    saveChatMessage(reply, true).catch(() => {});
    setLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
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
        <View style={[styles.liveBadge, { backgroundColor: `${colors.neonCyan}15`, borderColor: `${colors.neonCyan}40` }]}>
          <Text style={[styles.liveText, { color: colors.neonCyan }]}>LIVE</Text>
        </View>
      </View>

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
                backgroundColor: item.isLily ? `${colors.neonBlue}15` : `${colors.accent}15`,
                borderColor: item.isLily ? `${colors.neonBlue}40` : `${colors.accent}40`,
                maxWidth: "80%",
              },
            ]}>
              <Text style={[styles.msgText, { color: colors.foreground }]}>{item.text}</Text>
              {item.isLily && (
                <TouchableOpacity
                  style={[styles.speakBtn, { borderColor: `${colors.neonCyan}40` }]}
                  onPress={() => handleSpeak(item)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={speakingId === item.id && speaking ? "volume-x" : "volume-2"}
                    size={13}
                    color={speakingId === item.id && speaking ? colors.accent : colors.neonCyan}
                  />
                  <Text style={[styles.speakLabel, { color: speakingId === item.id && speaking ? colors.accent : colors.neonCyan }]}>
                    {speakingId === item.id && speaking ? "Stop" : "Lily ki awaaz"}
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
              <Text style={[styles.typingText, { color: colors.mutedForeground }]}>  Lily is typing...</Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: `${colors.neonBlue}20`, paddingBottom: botPad + 8 }]}>
        <TextInput
          style={[styles.input, { backgroundColor: `${colors.neonBlue}08`, color: colors.foreground, borderColor: `${colors.neonBlue}20` }]}
          placeholder="Lily se kuch poochho..."
          placeholderTextColor={colors.mutedForeground}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          multiline
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.neonBlue }]}
          onPress={send}
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  liveBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
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
