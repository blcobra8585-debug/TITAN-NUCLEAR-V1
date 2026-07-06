/**
 * TITAN DIAGNOSTIC OVERLAY
 *
 * Always-visible on-screen boot/status trace panel.
 * Collapsed by default (a small strip at the bottom of the screen).
 * Tap to expand into a full scrollable log of every timestamped entry.
 *
 * Gated behind __DEV__ OR the "debugOverlay" AsyncStorage flag
 * (defaults ON so it's visible without any manual toggle during active debugging).
 *
 * Gate condition: visible in __DEV__, OR when AsyncStorage key
 * "debug_overlay" is "1" (set by Admin screen toggle).
 * Set "debug_overlay" = "0" to hide in production.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DiagEntry,
  getEntries,
  getCurrentStage,
  isBooted,
  subscribeDiag,
} from '@/lib/diagnosticLog';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtTs(ms: number): string {
  const s = (ms / 1000).toFixed(1);
  return `+${s}s`;
}

function levelColor(level: DiagEntry['level']): string {
  if (level === 'error') return '#FF4444';
  if (level === 'warn')  return '#FF9900';
  return '#00FFD1';
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StripStatus({ entries, stage }: { entries: DiagEntry[]; stage: string }) {
  const warns  = entries.filter(e => e.level === 'warn').length;
  const errors = entries.filter(e => e.level === 'error').length;
  const booted = isBooted();

  if (errors > 0) {
    return (
      <Text style={strip.label} numberOfLines={1}>
        <Text style={{ color: '#FF4444' }}>✗ {errors} error{errors !== 1 ? 's' : ''}</Text>
        {warns > 0 && <Text style={{ color: '#FF9900' }}>  ⚠ {warns}</Text>}
      </Text>
    );
  }
  if (!booted) {
    return (
      <Text style={strip.label} numberOfLines={1}>
        <Text style={{ color: '#00B4FF' }}>⏳ </Text>
        <Text style={{ color: '#AABBCC' }}>{stage}</Text>
      </Text>
    );
  }
  if (warns > 0) {
    return (
      <Text style={strip.label} numberOfLines={1}>
        <Text style={{ color: '#FF9900' }}>⚠ {warns} warning{warns !== 1 ? 's' : ''}</Text>
      </Text>
    );
  }
  return (
    <Text style={strip.label} numberOfLines={1}>
      <Text style={{ color: '#00FFD1' }}>● Ready</Text>
    </Text>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DiagnosticOverlay() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible]   = useState(false);    // gating
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries]   = useState<DiagEntry[]>(getEntries);
  const [stage, setStage]       = useState(getCurrentStage);
  const scrollRef               = useRef<ScrollView>(null);
  const heightAnim              = useRef(new Animated.Value(0)).current;

  // ── Gate: show in __DEV__ always, or when AsyncStorage flag is set ──────
  useEffect(() => {
    if (__DEV__) {
      setVisible(true);
      return;
    }
    AsyncStorage.getItem('debug_overlay').then(v => {
      setVisible(v !== '0');   // default ON (undefined → show)
    }).catch(() => {});
  }, []);

  // ── Subscribe to log updates ────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeDiag((newEntries, newStage) => {
      setEntries(newEntries);
      setStage(newStage);
    });
    return unsub;
  }, []);

  // ── Auto-scroll to bottom on new entry ─────────────────────────────────
  useEffect(() => {
    if (expanded) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [entries.length, expanded]);

  // ── Expand / collapse animation ─────────────────────────────────────────
  const toggleExpand = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(heightAnim, {
      toValue,
      useNativeDriver: false,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [expanded, heightAnim]);

  if (!visible) return null;

  const panelHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260],
  });

  return (
    <View style={[styles.container, { bottom: insets.bottom + 4 }]} pointerEvents="box-none">
      {/* Expanded log panel */}
      <Animated.View style={[styles.panel, { height: panelHeight }]}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {entries.length === 0 && (
            <Text style={styles.empty}>No log entries yet…</Text>
          )}
          {entries.map(e => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.ts}>{fmtTs(e.ts)}</Text>
              <Text style={[styles.tag, { color: levelColor(e.level) }]}>[{e.tag}]</Text>
              <Text style={styles.msg} numberOfLines={2}>{e.message}</Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Collapsed strip — always visible */}
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.8}
        style={styles.strip}
      >
        <StripStatus entries={entries} stage={stage} />
        <Text style={strip.chevron}>{expanded ? '▾' : '▴'}</Text>
        <Text style={strip.count}>{entries.length}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position:  'absolute',
    left:      8,
    right:     8,
    zIndex:    9999,
    elevation: 9999,
  },
  panel: {
    backgroundColor: 'rgba(6,6,16,0.96)',
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     'rgba(0,180,255,0.25)',
    overflow:        'hidden',
    marginBottom:    3,
  },
  scroll:        { flex: 1 },
  scrollContent: { padding: 8, gap: 4 },
  empty:         { color: '#445566', fontSize: 11, textAlign: 'center', paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    gap:           6,
    alignItems:    'flex-start',
  },
  ts:  { color: '#445566', fontSize: 10, fontFamily: 'Inter_400Regular', minWidth: 38 },
  tag: { fontSize: 10, fontFamily: 'Inter_600SemiBold', minWidth: 60 },
  msg: { flex: 1, color: '#AABBCC', fontSize: 10, fontFamily: 'Inter_400Regular' },
  strip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: 'rgba(6,6,16,0.92)',
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     'rgba(0,180,255,0.2)',
    paddingVertical:   5,
    paddingHorizontal: 10,
  },
});

const strip = StyleSheet.create({
  label:   { flex: 1, fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  chevron: { color: '#445566', fontSize: 11 },
  count:   { color: '#334455', fontSize: 10, fontFamily: 'Inter_400Regular' },
});
