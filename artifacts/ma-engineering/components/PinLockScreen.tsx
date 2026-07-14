import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Vibration, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { verifyPIN } from "@/lib/security";
import { useTheme } from "@/context/ThemeContext";
import { useStrings } from "@/lib/strings";

interface Props {
  onUnlock: () => void;
}

export default function PinLockScreen({ onUnlock }: Props) {
  const { language } = useTheme();
  const s = useStrings(language);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [lockoutMsg, setLockoutMsg] = useState("");

  const NEON = "#00B4FF";
  const BG   = "#060610";
  const FG   = "#E8EAF0";
  const MUTED = "#6B7280";

  useEffect(() => {
    if (pin.length === 6) {
      handleVerify(pin);
    }
  }, [pin]);

  async function handleVerify(code?: string) {
    const entry = code ?? pin;
    if (!entry || checking) return;
    setChecking(true);
    setError("");

    const result = await verifyPIN(entry);

    if (result.success) {
      onUnlock();
    } else if (result.locked) {
      setLockoutMsg(result.error ?? s.pin_locked);
      setPin("");
    } else {
      setError(result.error ?? s.pin_error_wrong);
      if (Platform.OS !== "web") Vibration.vibrate(200);
      setPin("");
    }
    setChecking(false);
  }

  function press(digit: string) {
    if (pin.length >= 6 || checking) return;
    setError("");
    setPin(p => p + digit);
  }

  function del() {
    setError("");
    setPin(p => p.slice(0, -1));
  }

  const KEYS = [
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    ["","0","⌫"],
  ];

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      {/* Glow orb */}
      <View style={[styles.orb, { backgroundColor: `${NEON}12` }]} />

      {/* Logo */}
      <View style={styles.logoWrap}>
        <View style={[styles.logoIcon, { backgroundColor: `${NEON}20`, borderColor: `${NEON}40` }]}>
          <Feather name="lock" size={28} color={NEON} />
        </View>
        <Text style={[styles.title, { color: NEON }]}>{s.pin_title}</Text>
        <Text style={[styles.subtitle, { color: MUTED }]}>{s.pin_subtitle}</Text>
      </View>

      {/* PIN dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < pin.length
                  ? (error ? "#FF4444" : NEON)
                  : "transparent",
                borderColor: i < pin.length
                  ? (error ? "#FF4444" : NEON)
                  : `${MUTED}60`,
                transform: [{ scale: i < pin.length ? 1.15 : 1 }],
              },
            ]}
          />
        ))}
        {/* Show extra dots if 5-6 digit PIN */}
        {pin.length > 4 && Array.from({ length: Math.min(pin.length - 4, 2) }).map((_, i) => (
          <View
            key={`e${i}`}
            style={[styles.dot, { backgroundColor: NEON, borderColor: NEON, transform: [{ scale: 1.15 }] }]}
          />
        ))}
      </View>

      {/* Error / lockout message */}
      {(error || lockoutMsg) ? (
        <Text style={styles.errorText}>{lockoutMsg || error}</Text>
      ) : (
        <Text style={{ height: 20 }} />
      )}

      {/* Number pad */}
      <View style={styles.pad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((k, ki) => {
              if (!k) return <View key={ki} style={styles.keyEmpty} />;
              if (k === "⌫") {
                return (
                  <TouchableOpacity key={ki} style={styles.key} onPress={del} activeOpacity={0.7}>
                    <Feather name="delete" size={20} color={MUTED} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={ki}
                  style={[styles.key, { borderColor: `${NEON}20` }]}
                  onPress={() => press(k)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.keyText, { color: FG }]}>{k}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Manual confirm button (for 4-5 digit PINs) */}
      {pin.length >= 4 && pin.length < 6 && (
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: NEON }]}
          onPress={() => handleVerify()}
          activeOpacity={0.85}
          disabled={checking}
        >
          <Feather name="unlock" size={16} color="#000" />
          <Text style={styles.confirmText}>{s.pin_enter}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  orb: { position: "absolute", width: 300, height: 300, borderRadius: 150, top: -80, alignSelf: "center" },
  logoWrap: { alignItems: "center", marginBottom: 40 },
  logoIcon: { width: 72, height: 72, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 3, marginBottom: 6 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dotsRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  errorText: { color: "#FF4444", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8, textAlign: "center" },
  pad: { gap: 12, marginTop: 8 },
  padRow: { flexDirection: "row", gap: 16 },
  key: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.04)" },
  keyEmpty: { width: 72, height: 72 },
  keyText: { fontSize: 22, fontFamily: "Inter_500Medium" },
  confirmBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 16 },
  confirmText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },
});
