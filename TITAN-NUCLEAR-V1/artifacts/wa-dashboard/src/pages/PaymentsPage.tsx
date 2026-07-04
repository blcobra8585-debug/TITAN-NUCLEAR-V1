import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { recordPayment, subscribeToPayments, totalPaid, type Payment } from "@/lib/payments";
import { downloadInvoicePDF, makeInvoiceNumber } from "@/lib/invoice";
import { sendWAMessage } from "@/lib/whatsapp";
import { Wallet, Plus, X, Send, FileDown, IndianRupee } from "lucide-react";

interface Quote {
  id: string;
  clientName: string;
  clientPhone?: string;
  projectType: string;
  tonnage: number;
  quotedAmount: number;
  status: "pending" | "approved" | "rejected";
}

const GST_RATE = 0.18;
const METHODS: Payment["method"][] = ["cash", "bank_transfer", "upi", "cheque", "other"];

export default function PaymentsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("upi");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const waToken = localStorage.getItem("wa_token") ?? "";
  const wabaId = localStorage.getItem("waba_id") ?? "";

  useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => setQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quote)).filter((q2) => q2.status === "approved")),
      () => setQuotes([])
    );
    return unsub;
  }, []);

  useEffect(() => subscribeToPayments(setPayments), []);

  const rows = useMemo(() => {
    return quotes.map((q) => {
      const grandTotal = q.quotedAmount * (1 + GST_RATE);
      const paid = totalPaid(payments, q.id);
      const balance = Math.max(grandTotal - paid, 0);
      return { quote: q, grandTotal, paid, balance };
    });
  }, [quotes, payments]);

  const totalDue = rows.reduce((s, r) => s + r.balance, 0);
  const totalCollected = rows.reduce((s, r) => s + r.paid, 0);

  function fmt(n: number) {
    return n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${n.toLocaleString("en-IN")}`;
  }

  async function submitPayment() {
    if (!activeQuote) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Valid amount daalo");
      return;
    }
    setSaving(true);
    try {
      await recordPayment({ quoteId: activeQuote.id, clientName: activeQuote.clientName, amount: amt, method, note });
      toast.success("Payment record ho gaya");
      setAmount("");
      setNote("");
      setActiveQuote(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Payment save nahi hua");
    } finally {
      setSaving(false);
    }
  }

  async function sendReminder(row: (typeof rows)[number]) {
    if (!waToken || !wabaId) {
      toast.error("WA token Settings mein daalo");
      return;
    }
    if (!row.quote.clientPhone) {
      toast.error("Client ka phone number quote mein nahi hai");
      return;
    }
    const msg = `🔔 *Payment Reminder — MA Engineering*\n\nHi ${row.quote.clientName},\nAapka ${row.quote.projectType} ke liye balance due hai: *₹${row.balance.toLocaleString("en-IN")}*\n\nPlease jaldi clear karein. Koi bhi query ho to hamare office se contact karein. 🙏\n\n✅ *MA Engineering* | Pan-India Projects`;
    toast.loading("Reminder bhej raha hoon...");
    const r = await sendWAMessage(row.quote.clientPhone, msg, waToken, wabaId);
    toast.dismiss();
    if (r.success) toast.success("Reminder bhej diya!");
    else toast.error(r.error);
  }

  function invoiceFor(row: (typeof rows)[number]) {
    const invoiceNumber = makeInvoiceNumber(row.quote.id);
    downloadInvoicePDF(
      { id: row.quote.id, clientName: row.quote.clientName, clientPhone: row.quote.clientPhone, projectType: row.quote.projectType, tonnage: row.quote.tonnage, quotedAmount: row.quote.quotedAmount },
      invoiceNumber,
      row.paid
    );
    toast.success(`Invoice ${invoiceNumber} download ho gaya`);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex gap-2 p-3 border-b border-border bg-card shrink-0">
        {[
          { label: "Approved Clients", val: rows.length.toString(), color: "#00B4FF" },
          { label: "Collected", val: fmt(totalCollected), color: "#25D366" },
          { label: "Balance Due", val: fmt(totalDue), color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-background border border-border rounded-xl p-2 text-center">
            <div className="text-sm font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {activeQuote && (
        <div className="border-b border-border bg-card p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#00B4FF]">Record Payment — {activeQuote.clientName}</div>
            <button onClick={() => setActiveQuote(null)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 py-2">
              <IndianRupee size={12} className="text-muted-foreground" />
              <input type="number" className="flex-1 bg-transparent text-xs text-foreground outline-none" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <select className="bg-background border border-border rounded-lg px-2 py-2 text-xs text-foreground outline-none" value={method} onChange={(e) => setMethod(e.target.value as Payment["method"])}>
              {METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
            </select>
          </div>
          <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button onClick={submitPayment} disabled={saving} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-black" style={{ background: saving ? "#1a6e8a" : "#25D366" }}>
            <Plus size={13} /> {saving ? "Saving..." : "Save Payment"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {rows.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">Koi approved quote nahi mili</div>}
        {rows.map((row) => (
          <div key={row.quote.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#25D366]/20 flex items-center justify-center"><Wallet size={13} className="text-[#25D366]" /></div>
                <div>
                  <div className="text-xs font-bold text-foreground">{row.quote.clientName}</div>
                  <div className="text-[10px] text-muted-foreground">{row.quote.projectType}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[#00FFD1]">{fmt(row.grandTotal)}</div>
                <div className="text-[10px]" style={{ color: row.balance > 0 ? "#F59E0B" : "#25D366" }}>
                  {row.balance > 0 ? `Due: ${fmt(row.balance)}` : "Paid in full"}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setActiveQuote(row.quote)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-[#00B4FF]"><Plus size={10} /> Add Payment</button>
              <button onClick={() => invoiceFor(row)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-muted-foreground"><FileDown size={10} /> Invoice</button>
              {row.balance > 0 && (
                <button onClick={() => sendReminder(row)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-black ml-auto" style={{ background: "#F59E0B" }}><Send size={10} /> Remind</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
