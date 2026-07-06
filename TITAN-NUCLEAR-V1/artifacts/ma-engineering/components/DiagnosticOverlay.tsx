/**
 * DiagnosticOverlay — always-visible on-screen boot/runtime trace panel.
 * DEV-only: renders nothing in production builds.
 *
 * Shows a small strip at the bottom of the screen. Tap to expand a
 * scrollable list of every timestamped log entry from this session.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { diagSubscribe, DiagEntry } from "@/lib/diagnostics";

function levelColor(level: DiagEntry["level"]): string {
  if (level === "error") return "#FF4444";
  if (level === "warn")  return "#FF9900";
  return "#00FFD1";
}

function stripLabel(entries: DiagEntry[]): string {
  if (!entries.length) return "⏳ Booting…";
  const errors = entries.filter((e) => e.level === "error").length;
  const warns  = entries.filter((e) => e.level === "warn").length;
  if (errors) return `🔴 ${errors} error${errors > 1 ? "s" : ""}`;
  if (warns)  return `⚠️  ${warns} warning${warns > 1 ? "s" : ""}`;
  const last = entries[entries.length - 1];
  return `✅ ${last.msg.slice(0, 36)}`;
}

export default function DiagnosticOverlay() {
  if (!__DEV__) return null;

  const [entries, setEntries] = useState<DiagEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return diagSubscribe((e) => {
      setEntries(e);
      if (expanded) {
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      }
    });
  }, [expanded]);

  useEffect(() => {
    Animated.spring(height, {
      toValue: expanded ? 260 : 0,
      useNativeDriver: false,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [expanded]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Expandable log list */}
      <Animated.View style={[styles.logPanel, { height }]}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {entries.map((e, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.ts, { color: "#8899AA" }]}>+{e.elapsed}ms</Text>
              <Text style={[styles.msg, { color: levelColor(e.level) }]} numberOfLines={2}>
                {e.msg}
              </Text>
            </View>
          ))}
          {entries.length === 0 && (
            <Text style={styles.empty}>No entries yet…</Text>
          )}
        </ScrollView>
      </Animated.View>

      {/* Tap strip */}
      <TouchableOpacity
        style={styles.strip}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={styles.pill} />
        <Text style={styles.stripText} numberOfLines={1}>
          🛠 {stripLabel(entries)}
        </Text>
        <Text style={styles.chevron}>{expanded ? "▼" : "▲"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:  "absolute",
    bottom:    0,
    left:      0,
    right:     0,
    zIndex:    9999,
    elevation: 9999,
  },
  logPanel: {
    backgroundColor: "rgba(6,6,16,0.96)",
    borderTopWidth:  1,
    borderTopColor:  "#00B4FF30",
    overflow:        "hidden",
  },
  scroll:        { flex: 1 },
  scrollContent: { padding: 8, gap: 4 },
  row: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  ts:    { fontSize: 9, fontVariant: ["tabular-nums"] as any, width: 52 },
  msg:   { fontSize: 10, flex: 1, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  empty: { color: "#8899AA", fontSize: 11, textAlign: "center", marginTop: 20 },
  strip: {
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: "rgba(6,6,16,0.93)",
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderTopWidth:    1,
    borderTopColor:    "#00B4FF25",
    gap:               8,
  },
  pill: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#00FFD1",
  },
  stripText: { flex: 1, color: "#CCD6E0", fontSize: 11 },
  chevron:   { color: "#8899AA", fontSize: 11 },
});
