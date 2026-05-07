import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { generateQuote } from "@/lib/gemini";
import { saveQuote } from "@/lib/firebaseService";
import { useApp } from "@/context/AppContext";

const PROJECTS = [
  "EOT Crane Installation",
  "EOT Crane Dismantling",
  "Gantry Crane Erection",
  "Chimney Installation",
  "Industrial Boiler Setup",
  "Steel Structure Erection",
];

export default function QuoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refreshRevenue } = useApp();
  const [client, setClient] = useState("");
  const [tons, setTons] = useState("");
  const [project, setProject] = useState(PROJECTS[0]);
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const baseCost = (parseFloat(tons) || 0) * 5500;
  const quotedCost = baseCost * 1.25;

  function fmt(amount: number) {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  }

  async function generate() {
    if (!client.trim() || !tons.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setQuote("");
    const result = await generateQuote(client, project, parseFloat(tons));
    setQuote(result);
    await saveQuote({ clientName: client, projectType: project, tonnage: parseFloat(tons), quotedAmount: quotedCost, quoteText: result }).catch(() => {});
    await refreshRevenue();
    setLoading(false);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: Platform.OS === "web" ? 34 : 20, gap: 14 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.screenTitle, { color: colors.neonBlue }]}>AUTO-NEGOTIATION</Text>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>QUOTE GENERATOR</Text>

      {/* Client Name */}
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="user" size={18} color={colors.neonBlue} />
        <TextInput
          style={[styles.textInput, { color: colors.foreground }]}
          placeholder="Client / Company Name"
          placeholderTextColor={colors.mutedForeground}
          value={client}
          onChangeText={setClient}
        />
      </View>

      {/* Project Picker */}
      <TouchableOpacity
        style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowProjectPicker(!showProjectPicker)}
        activeOpacity={0.8}
      >
        <Feather name="tool" size={18} color={colors.neonBlue} />
        <Text style={[styles.textInput, { color: colors.foreground }]}>{project}</Text>
        <Feather name={showProjectPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.neonBlue} />
      </TouchableOpacity>

      {showProjectPicker && (
        <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {PROJECTS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.pickerItem, { borderBottomColor: colors.border, backgroundColor: p === project ? `${colors.neonBlue}15` : "transparent" }]}
              onPress={() => { setProject(p); setShowProjectPicker(false); }}
            >
              <Feather name="tool" size={14} color={colors.neonBlue} />
              <Text style={[styles.pickerText, { color: p === project ? colors.neonBlue : colors.foreground }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tonnage */}
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="database" size={18} color={colors.neonBlue} />
        <TextInput
          style={[styles.textInput, { color: colors.foreground }]}
          placeholder="Tonnage / Scale (T)"
          placeholderTextColor={colors.mutedForeground}
          value={tons}
          onChangeText={setTons}
          keyboardType="numeric"
        />
      </View>

      {/* Cost Preview */}
      {!!tons && parseFloat(tons) > 0 && (
        <View style={[styles.costCard, { backgroundColor: colors.card, borderColor: colors.neonCyan }]}>
          {[["Base Cost", fmt(baseCost), colors.mutedForeground], ["Quote Price", fmt(quotedCost), colors.neonCyan], ["Margin", "25%", "#4CAF50"]].map(([lbl, val, clr], i) => (
            <React.Fragment key={lbl}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: `${colors.neonCyan}30` }]} />}
              <View style={styles.costItem}>
                <Text style={[styles.costVal, { color: clr as string }]}>{val}</Text>
                <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>{lbl}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: loading ? `${colors.neonBlue}80` : colors.neonBlue }]}
        onPress={generate}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Feather name="zap" size={18} color="#fff" />}
        <Text style={styles.btnText}>
          {loading ? "Lily generating..." : "GENERATE QUOTE WITH LILY"}
        </Text>
      </TouchableOpacity>

      {/* Quote Output */}
      {!!quote && (
        <View style={[styles.quoteCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}50` }]}>
          <View style={styles.quoteHeader}>
            <Feather name="star" size={14} color={colors.neonBlue} />
            <Text style={[styles.sectionLabel, { color: colors.neonBlue, marginLeft: 8 }]}>LILY'S QUOTE</Text>
          </View>
          <Text style={[styles.quoteText, { color: colors.foreground }]}>{quote}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  inputWrap: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  textInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  picker: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  pickerItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1 },
  pickerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  costCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", padding: 18, borderRadius: 14, borderWidth: 1.5 },
  costItem: { alignItems: "center", gap: 4 },
  costVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  costLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  divider: { width: 1, height: 40 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, shadowColor: "#00B4FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  btnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  quoteCard: { padding: 18, borderRadius: 16, borderWidth: 1, gap: 12 },
  quoteHeader: { flexDirection: "row", alignItems: "center" },
  quoteText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 22 },
});
