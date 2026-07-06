/**
 * DiagnosticOverlay — always-visible on-screen debug panel. DEV only.
 * Uses a Modal so it appears on top of EVERYTHING including Stack screens.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Modal, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { diagSubscribe, DiagEntry } from "@/lib/diagnostics";

function levelColor(level: DiagEntry["level"]): string {
  if (level === "error") return "#FF4444";
  if (level === "warn")  return "#FF9900";
  return "#00FFD1";
}

function stripLabel(entries: DiagEntry[]): string {
  if (!entries.length) return "⏳ Booting…";
  const errors = entries.filter(e => e.level === "error").length;
  const warns  = entries.filter(e => e.level === "warn").length;
  if (errors) return `🔴 ${errors} error${errors > 1 ? "s" : ""}`;
  if (warns)  return `⚠️  ${warns} warn`;
  const last = entries[entries.length - 1];
  return `✅ ${last.msg.slice(0, 34)}`;
}

export default function DiagnosticOverlay() {
  if (!__DEV__) return null;

  const [entries, setEntries]   = useState<DiagEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const stripH    = useRef(new Animated.Value(0)).current;

  useEffect(() => diagSubscribe(e => {
    setEntries(e);
    if (expanded) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }), [expanded]);

  useEffect(() => {
    Animated.spring(stripH, {
      toValue: expanded ? 240 : 0,
      useNativeDriver: false,
      damping: 18, stiffness: 180,
    }).start();
  }, [expanded]);

  const errors = entries.filter(e => e.level === "error").length;
  const dotColor = errors ? "#FF4444" : entries.length ? "#00FFD1" : "#FF9900";

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      hardwareAccelerated
    >
      {/* Pass touches through when collapsed — only the strip is tappable */}
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.logPanel, { height: stripH }]} pointerEvents={expanded ? "auto" : "none"}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {entries.map((e, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.ts}>+{e.elapsed}ms</Text>
                <Text style={[styles.msg, { color: levelColor(e.level) }]} numberOfLines={2}>{e.msg}</Text>
              </View>
            ))}
            {!entries.length && <Text style={styles.empty}>No entries yet…</Text>}
          </ScrollView>
        </Animated.View>

        <TouchableOpacity style={styles.strip} onPress={() => setExpanded(v => !v)} activeOpacity={0.85}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.stripText} numberOfLines={1}>🛠 {stripLabel(entries)}</Text>
          <Text style={styles.chevron}>{expanded ? "▼" : "▲"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  logPanel: {
    backgroundColor: "rgba(4,4,12,0.97)",
    borderTopWidth: 1,
    borderTopColor: "#00B4FF30",
    overflow: "hidden",
  },
  scroll:        { flex: 1 },
  scrollContent: { padding: 8, gap: 3 },
  row:           { flexDirection: "row", gap: 6, paddingVertical: 2 },
  ts:            { fontSize: 9, color: "#556677", width: 52, fontVariant: ["tabular-nums"] as any },
  msg:           { fontSize: 10, flex: 1, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  empty:         { color: "#8899AA", fontSize: 11, textAlign: "center", marginTop: 20 },
  strip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(4,4,12,0.92)",
    paddingHorizontal: 14, paddingVertical: 9,
    borderTopWidth: 1, borderTopColor: "#00B4FF20",
  },
  dot:       { width: 7, height: 7, borderRadius: 4 },
  stripText: { flex: 1, color: "#BDD0E0", fontSize: 11 },
  chevron:   { color: "#8899AA", fontSize: 11 },
});
