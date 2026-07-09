import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { sendWhatsAppMessage, buildQuoteMessage, buildQuoteMessageLang } from "@/lib/whatsapp";
import { shareQuotePdf, type QuoteLineItem } from "@/lib/quotePdf";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import SuccessBurst, { SuccessBurstHandle } from "@/components/SuccessBurst";
import Icon3D from "@/components/Icon3D";

const PROJECTS = [
  "EOT Crane Installation",
  "EOT Crane Dismantling",
  "Gantry Crane Erection",
  "Chimney Installation",
  "Industrial Boiler Setup",
  "Steel Structure Erection",
];

const LEAD_SOURCES = ["Direct", "IndiaMART", "Referral", "WhatsApp", "Website", "Cold Call"];

interface ToneTemplate { key: string; label: string; icon: string; suffix: string; }
const TONE_TEMPLATES: ToneTemplate[] = [
  { key: "formal",   label: "Formal",    icon: "briefcase", suffix: "" },
  { key: "friendly", label: "Friendly",  icon: "smile",     suffix: "\n\nP.S. Koi bhi sawaal ho, bina hesitate call kariye — hum hamesha ready hain! 😊" },
  { key: "discount", label: "Early-Bird", icon: "percent",  suffix: "\n\n🎁 *Early-Bird Offer*: 7 din ke andar confirm karo aur 3% extra discount pao!" },
];

export default function QuoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refreshRevenue } = useApp();

  const { language } = useTheme();
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const [tons, setTons] = useState("");
  const [project, setProject] = useState(PROJECTS[0]);
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [leadSource, setLeadSource] = useState(LEAD_SOURCES[0]);
  const [referredBy, setReferredBy] = useState("");
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<ToneTemplate>(TONE_TEMPLATES[0]);

  const [site, setSite] = useState("");
  const [lineItems, setLineItems] = useState<{ desc: string; qty: string; rate: string }[]>([
    { desc: "", qty: "1", rate: "" },
  ]);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const [waModal, setWaModal] = useState(false);
  const [clientPhone, setClientPhone] = useState("");
  const [waSending, setWaSending] = useState(false);
  const burstRef = useRef<SuccessBurstHandle>(null);

  function addLineItem() {
    setLineItems(prev => [...prev, { desc: "", qty: "1", rate: "" }]);
  }
  function removeLineItem(idx: number) {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  }
  function updateLineItem(idx: number, field: keyof typeof lineItems[0], value: string) {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }
  function lineTotal(item: { qty: string; rate: string }) {
    return (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
  }
  function grandTotal() {
    return lineItems.reduce((s, r) => s + lineTotal(r), 0);
  }

  async function handleGeneratePdf() {
    if (!client.trim()) {
      Alert.alert("Zaroori", "Client naam daalein.");
      return;
    }
    const validItems = lineItems.filter(r => r.desc.trim() && parseFloat(r.rate) > 0);
    if (validItems.length === 0) {
      Alert.alert("Line Items", "Kam se kam ek line item ka description aur rate daalein.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPdfGenerating(true);
    try {
      await shareQuotePdf({
        clientName: client.trim(),
        projectType: project,
        site: site.trim(),
        lineItems: validItems.map(r => ({
          desc: r.desc.trim(),
          qty: parseFloat(r.qty) || 1,
          rate: parseFloat(r.rate) || 0,
        } as QuoteLineItem)),
      });
    } catch (e: any) {
      Alert.alert("❌ PDF Error", e.message?.slice(0, 120) ?? "PDF generate nahi hua. Dobara try karo.");
    } finally {
      setPdfGenerating(false);
    }
  }

  const baseCost = (parseFloat(tons) || 0) * 5500;
  const quotedCost = baseCost * 1.25;

  function fmt(amount: number) {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  }

  async function generate() {
    if (!client.trim() || !tons.trim()) {
      Alert.alert("Zaroori", "Client naam aur tonnage daalein.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setQuote("");
    try {
      const result = await generateQuote(client, project, parseFloat(tons));
      const finalQuote = result + tone.suffix;
      setQuote(finalQuote);
      const saved = await saveQuote({
        clientName: client,
        clientPhone: phone.trim(),
        projectType: project,
        tonnage: parseFloat(tons),
        quotedAmount: quotedCost,
        quoteText: finalQuote,
        leadSource,
        referredBy: referredBy.trim(),
        notes: notes.trim(),
      }).then(() => true).catch(() => false);
      await refreshRevenue();
      if (saved) burstRef.current?.fire();
    } catch (e: any) {
      Alert.alert("❌ Error", e.message?.slice(0, 120) ?? "Quote generate nahi hua. Dobara try karo.");
    } finally {
      setLoading(false);
    }
  }

  function openWaModal() {
    setClientPhone(phone.trim());
    Haptics.selectionAsync();
    setWaModal(true);
  }

  async function sendViaWhatsApp() {
    if (!clientPhone.trim()) {
      Alert.alert("Phone Number", "Client ka WhatsApp number daalein (country code ke saath).");
      return;
    }
    setWaSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const msg = language === "en"
        ? buildQuoteMessageLang({ client, project, tons, cost: quotedCost }, "en")
        : buildQuoteMessage(client, project, quote);
      const result = await sendWhatsAppMessage(clientPhone, msg);
      setWaModal(false);
      if (result.success) {
        burstRef.current?.fire();
        Alert.alert("✅ Bhej diya!", `Quote ${clientPhone} pe WhatsApp par bhej diya gaya.`);
      } else {
        Alert.alert("❌ Error", result.error ?? "WhatsApp send failed.");
      }
    } catch (e: any) {
      Alert.alert("❌ Error", e.message?.slice(0, 120) ?? "WhatsApp send nahi hua. Dobara try karo.");
    } finally {
      setWaSending(false);
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingTop: topPad + 12,
          paddingHorizontal: 20,
          paddingBottom: botPad + 20,
          gap: 14,
        }}
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

        {/* Client Phone */}
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="phone" size={18} color={colors.neonBlue} />
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Client WhatsApp Number (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Site / Location */}
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="map-pin" size={18} color={colors.neonBlue} />
          <TextInput
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder="Site / Location (PDF mein dikhega)"
            placeholderTextColor={colors.mutedForeground}
            value={site}
            onChangeText={setSite}
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
                style={[
                  styles.pickerItem,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: p === project ? `${colors.neonBlue}15` : "transparent",
                  },
                ]}
                onPress={() => { setProject(p); setShowProjectPicker(false); }}
              >
                <Feather name="tool" size={14} color={colors.neonBlue} />
                <Text style={[styles.pickerText, { color: p === project ? colors.neonBlue : colors.foreground }]}>
                  {p}
                </Text>
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

        {/* Lead Source */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LEAD SOURCE</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {LEAD_SOURCES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, { borderColor: colors.neonBlue, backgroundColor: s === leadSource ? `${colors.neonBlue}20` : "transparent" }]}
              onPress={() => { Haptics.selectionAsync(); setLeadSource(s); }}
            >
              <Text style={[styles.chipText, { color: colors.neonBlue }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {leadSource === "Referral" && (
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="user-plus" size={18} color={colors.neonBlue} />
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder="Referred By (naam)"
              placeholderTextColor={colors.mutedForeground}
              value={referredBy}
              onChangeText={setReferredBy}
            />
          </View>
        )}

        {/* Quote Tone / Template */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>QUOTE TEMPLATE</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {TONE_TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.toneCard, { borderColor: colors.neonCyan, backgroundColor: t.key === tone.key ? `${colors.neonCyan}20` : colors.card }]}
              onPress={() => { Haptics.selectionAsync(); setTone(t); }}
            >
              <Icon3D name={t.icon as any} color={colors.neonCyan} size={14} bgSize={30} glow={t.key === tone.key} />
              <Text style={[styles.toneText, { color: colors.neonCyan }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CRM Notes */}
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "flex-start" }]}>
          <Feather name="edit-3" size={18} color={colors.neonBlue} style={{ marginTop: 2 }} />
          <TextInput
            style={[styles.textInput, { color: colors.foreground, minHeight: 40 }]}
            placeholder="CRM Notes (optional — site details, special requests...)"
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* ── PDF Line Items ── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 4 }]}>📄 PDF QUOTE — LINE ITEMS</Text>
        <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: -8 }}>
          Har kaam ka description, qty aur rate bharein — PDF automatically generate hoga
        </Text>
        {lineItems.map((item, idx) => (
          <View key={idx} style={[{ borderRadius: 12, borderWidth: 1, borderColor: `${colors.neonCyan}40`, backgroundColor: colors.card, padding: 12, gap: 8 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: colors.neonCyan, letterSpacing: 1 }}>ITEM {idx + 1}</Text>
              {lineItems.length > 1 && (
                <TouchableOpacity onPress={() => removeLineItem(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={16} color="#FF4444" />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, backgroundColor: `${colors.neonCyan}08`, borderRadius: 8, padding: 10, minHeight: 36 }]}
              placeholder="Description of Work (e.g. Erection & Commissioning of 10Tx13m EOT)"
              placeholderTextColor={colors.mutedForeground}
              value={item.desc}
              onChangeText={v => updateLineItem(idx, "desc", v)}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: `${colors.neonCyan}08`, borderColor: `${colors.neonCyan}30`, padding: 10 }]}>
                <Text style={{ fontSize: 9, color: colors.neonCyan, fontFamily: "Inter_700Bold" }}>QTY</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.foreground, fontSize: 13 }]}
                  placeholder="1" placeholderTextColor={colors.mutedForeground}
                  value={item.qty} onChangeText={v => updateLineItem(idx, "qty", v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputWrap, { flex: 2, backgroundColor: `${colors.neonCyan}08`, borderColor: `${colors.neonCyan}30`, padding: 10 }]}>
                <Text style={{ fontSize: 9, color: colors.neonCyan, fontFamily: "Inter_700Bold" }}>₹ RATE</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.foreground, fontSize: 13 }]}
                  placeholder="0" placeholderTextColor={colors.mutedForeground}
                  value={item.rate} onChangeText={v => updateLineItem(idx, "rate", v)}
                  keyboardType="numeric"
                />
              </View>
              {(parseFloat(item.rate) > 0) && (
                <View style={[styles.inputWrap, { flex: 2, backgroundColor: `${colors.neonCyan}15`, borderColor: `${colors.neonCyan}50`, padding: 10 }]}>
                  <Text style={{ fontSize: 9, color: colors.neonCyan, fontFamily: "Inter_700Bold" }}>AMT</Text>
                  <Text style={{ flex: 1, color: colors.neonCyan, fontFamily: "Inter_700Bold", fontSize: 12 }}>
                    ₹{lineTotal(item).toLocaleString("en-IN")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Add item + grand total row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            style={[styles.chip, { borderColor: colors.neonCyan, flex: 1, justifyContent: "center" }]}
            onPress={() => { Haptics.selectionAsync(); addLineItem(); }}
          >
            <Feather name="plus" size={13} color={colors.neonCyan} />
            <Text style={[styles.chipText, { color: colors.neonCyan }]}>Item Jodo</Text>
          </TouchableOpacity>
          {grandTotal() > 0 && (
            <View style={[styles.chip, { borderColor: `${colors.neonCyan}60`, backgroundColor: `${colors.neonCyan}15`, paddingHorizontal: 16 }]}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: colors.neonCyan }}>
                Total: ₹{grandTotal().toLocaleString("en-IN")}
              </Text>
            </View>
          )}
        </View>

        {/* Cost Preview */}
        {!!tons && parseFloat(tons) > 0 && (
          <View style={[styles.costCard, { backgroundColor: colors.card, borderColor: colors.neonCyan }]}>
            {[
              ["Base Cost", fmt(baseCost), colors.mutedForeground],
              ["Quote Price", fmt(quotedCost), colors.neonCyan],
              ["Margin", "25%", "#4CAF50"],
            ].map(([lbl, val, clr], i) => (
              <React.Fragment key={lbl as string}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: `${colors.neonCyan}30` }]} />}
                <View style={styles.costItem}>
                  <Text style={[styles.costVal, { color: clr as string }]}>{val}</Text>
                  <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>{lbl}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Generate AI Quote Button */}
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

        {/* PDF Quote Button (Section F) */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: pdfGenerating ? "#F2620780" : "#F26207" }]}
          onPress={handleGeneratePdf}
          disabled={pdfGenerating}
          activeOpacity={0.85}
        >
          {pdfGenerating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Feather name="file-text" size={18} color="#fff" />}
          <Text style={styles.btnText}>
            {pdfGenerating ? "PDF ban raha hai..." : "GENERATE PDF QUOTE"}
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

            {/* WhatsApp Send Button */}
            <TouchableOpacity
              style={[styles.waBtn, { backgroundColor: "#25D366", borderColor: "#1ebe5d" }]}
              onPress={openWaModal}
              activeOpacity={0.85}
            >
              <Feather name="message-circle" size={18} color="#fff" />
              <Text style={styles.waBtnText}>SEND VIA WHATSAPP</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* WhatsApp Modal */}
      <Modal visible={waModal} transparent animationType="slide" onRequestClose={() => setWaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: `${colors.neonBlue}40` }]}>
            <View style={styles.modalHeader}>
              <Feather name="message-circle" size={22} color="#25D366" />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>WhatsApp Quote</Text>
              <TouchableOpacity onPress={() => setWaModal(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Client ka WhatsApp number daalein (country code ke saath):
            </Text>

            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="phone" size={18} color="#25D366" />
              <TextInput
                style={[styles.textInput, { color: colors.foreground }]}
                placeholder="917895643069"
                placeholderTextColor={colors.mutedForeground}
                value={clientPhone}
                onChangeText={setClientPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={[styles.waPreview, { backgroundColor: `${colors.neonBlue}08`, borderColor: `${colors.neonBlue}20` }]}>
              <Text style={[styles.waPreviewLabel, { color: colors.mutedForeground }]}>Preview:</Text>
              <Text style={[styles.waPreviewText, { color: colors.foreground }]} numberOfLines={4}>
                {buildQuoteMessage(client, project, quote)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: waSending ? "#1ebe5d90" : "#25D366" }]}
              onPress={sendViaWhatsApp}
              disabled={waSending}
              activeOpacity={0.85}
            >
              {waSending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Feather name="send" size={18} color="#fff" />}
              <Text style={styles.btnText}>{waSending ? "Bhej raha hoon..." : "QUOTE BHEJO"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <SuccessBurst ref={burstRef} />
    </>
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
  quoteCard: { padding: 18, borderRadius: 16, borderWidth: 1, gap: 14 },
  quoteHeader: { flexDirection: "row", alignItems: "center" },
  quoteText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 22 },
  waBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, shadowColor: "#25D366", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  waBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, gap: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  waPreview: { padding: 12, borderRadius: 10, borderWidth: 1 },
  waPreviewLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 6 },
  waPreviewText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  toneCard: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 14, borderWidth: 1 },
  toneText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
