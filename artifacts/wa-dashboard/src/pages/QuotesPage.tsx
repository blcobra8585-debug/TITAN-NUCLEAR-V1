import { useState, useEffect } from "react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, updateDoc, doc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { generateQuoteText } from "@/lib/gemini";
import { sendWAMessage } from "@/lib/whatsapp";
import { FileText, Zap, Check, X, Clock, Search, Filter, Trash2, Send, Eye, Plus, ChevronDown, Download } from "lucide-react";

interface Quote { id: string; clientName: string; projectType: string; tonnage: number; quotedAmount: number; quoteText: string; status: "pending"|"approved"|"rejected"; createdAt: any; }

const PROJECTS = ["EOT Crane Installation","EOT Crane Dismantling","Gantry Crane Erection","Chimney Installation","Industrial Boiler Setup","Steel Structure Erection","Overhead Crane","Jib Crane Installation"];
const STATUS_COLORS: Record<string,string> = { pending: "#F59E0B", approved: "#25D366", rejected: "#EF4444" };
const STATUS_BG: Record<string,string> = { pending: "#F59E0B20", approved: "#25D36620", rejected: "#EF444420" };

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filter, setFilter] = useState<"all"|"pending"|"approved"|"rejected">("all");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote|null>(null);
  const [generating, setGenerating] = useState(false);
  const [client, setClient] = useState("");
  const [project, setProject] = useState(PROJECTS[0]);
  const [tons, setTons] = useState("");
  const [newQuoteText, setNewQuoteText] = useState("");

  const geminiKey = localStorage.getItem("gemini_key") ?? "";
  const waToken = localStorage.getItem("wa_token") ?? "";
  const wabaId = localStorage.getItem("waba_id") ?? "";

  useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quote)));
    }, () => {
      setQuotes([
        { id: "1", clientName: "Ramesh Kumar", projectType: "EOT Crane Installation", tonnage: 50, quotedAmount: 687500, quoteText: "Professional EOT crane installation quote for 50T capacity...", status: "pending", createdAt: new Date() },
        { id: "2", clientName: "Vijay Steel", projectType: "Chimney Installation", tonnage: 30, quotedAmount: 412500, quoteText: "Chimney installation project quote...", status: "approved", createdAt: new Date() },
        { id: "3", clientName: "Suresh Industries", projectType: "Gantry Crane Erection", tonnage: 100, quotedAmount: 1375000, quoteText: "Gantry crane erection detailed quote...", status: "rejected", createdAt: new Date() },
      ]);
    });
    return () => unsub();
  }, []);

  async function generate() {
    if (!client || !tons) { toast.error("Client naam aur tonnage daalein"); return; }
    if (!geminiKey) { toast.error("Gemini API key Settings mein daalo"); return; }
    setGenerating(true);
    const text = await generateQuoteText(client, project, parseFloat(tons), geminiKey);
    setNewQuoteText(text);
    setGenerating(false);
  }

  async function saveQuote() {
    if (!newQuoteText) { toast.error("Pehle quote generate karo"); return; }
    const amt = parseFloat(tons) * 5500 * 1.25;
    await addDoc(collection(db, "quotes"), { clientName: client, projectType: project, tonnage: parseFloat(tons), quotedAmount: amt, quoteText: newQuoteText, status: "pending", createdAt: serverTimestamp() });
    toast.success("Quote save ho gaya!");
    setShowNew(false); setClient(""); setTons(""); setNewQuoteText("");
  }

  async function updateStatus(id: string, status: string) {
    await updateDoc(doc(db, "quotes", id), { status });
    toast.success(`Status update: ${status}`);
  }

  async function deleteQuote(id: string) {
    await deleteDoc(doc(db, "quotes", id));
    toast.success("Quote delete ho gaya");
  }

  async function sendViaWA(q: Quote) {
    if (!waToken || !wabaId) { toast.error("WA token settings mein daalo"); return; }
    const msg = `🏗️ *MA ENGINEERING — Quote*\n\nClient: *${q.clientName}*\nProject: *${q.projectType}*\n\n${q.quoteText}\n\nQuote Value: *₹${(q.quotedAmount/100000).toFixed(2)}L*\n\n*MA Engineering* | Suhan Siddiqui`;
    toast.loading("Bhej raha hoon...");
    const r = await sendWAMessage("91" + q.clientName, msg, waToken, wabaId);
    toast.dismiss();
    if (r.success) toast.success("WhatsApp pe bhej diya!"); else toast.error(r.error);
  }

  const filtered = quotes.filter(q => (filter === "all" || q.status === filter) && (q.clientName.toLowerCase().includes(search.toLowerCase()) || q.projectType.toLowerCase().includes(search.toLowerCase())));
  const total = quotes.reduce((s,q) => s + (q.status === "approved" ? q.quotedAmount : 0), 0);
  const pending = quotes.filter(q => q.status === "pending").length;

  function fmt(n: number) { return n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${(n/1000).toFixed(0)}K`; }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Stats */}
      <div className="flex gap-2 p-3 border-b border-border bg-card shrink-0">
        {[
          { label: "Total Quotes", val: quotes.length.toString(), color: "#00B4FF" },
          { label: "Approved", val: fmt(total), color: "#25D366" },
          { label: "Pending", val: pending.toString(), color: "#F59E0B" },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-background border border-border rounded-xl p-2 text-center">
            <div className="text-sm font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[9px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-lg px-2.5 py-1.5">
          <Search size={13} className="text-muted-foreground"/>
          <input className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none" placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none" value={filter} onChange={e => setFilter(e.target.value as any)}>
          <option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-black" style={{ background: "#00B4FF" }}>
          <Plus size={13}/> New
        </button>
      </div>

      {/* New Quote Form */}
      {showNew && (
        <div className="border-b border-border bg-card p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#00B4FF]">NEW QUOTE</div>
            <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none" placeholder="Client Name" value={client} onChange={e => setClient(e.target.value)}/>
            <input type="number" className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none" placeholder="Tonnage (T)" value={tons} onChange={e => setTons(e.target.value)}/>
          </div>
          <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none" value={project} onChange={e => setProject(e.target.value)}>
            {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {newQuoteText && <textarea className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground outline-none resize-none" rows={4} value={newQuoteText} onChange={e => setNewQuoteText(e.target.value)}/>}
          <div className="flex gap-2">
            <button onClick={generate} disabled={generating} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-black" style={{ background: generating ? "#1a6e8a" : "#00B4FF" }}>
              <Zap size={13}/> {generating ? "Generating..." : "Generate with Lily"}
            </button>
            {newQuoteText && <button onClick={saveQuote} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-black" style={{ background: "#25D366" }}><Check size={13}/> Save</button>}
          </div>
        </div>
      )}

      {/* Quote Detail */}
      {selectedQuote && (
        <div className="border-b border-border bg-card p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#00FFD1]">{selectedQuote.clientName}</div>
            <button onClick={() => setSelectedQuote(null)}><X size={16} className="text-muted-foreground"/></button>
          </div>
          <div className="text-xs text-muted-foreground">{selectedQuote.projectType} • {selectedQuote.tonnage}T • {fmt(selectedQuote.quotedAmount)}</div>
          <div className="bg-background border border-border rounded-lg p-3 text-xs text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">{selectedQuote.quoteText}</div>
          <button onClick={() => sendViaWA(selectedQuote)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "#25D366" }}>
            <Send size={13}/> Send via WhatsApp
          </button>
        </div>
      )}

      {/* Quotes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">Koi quote nahi mili</div>}
        {filtered.map(q => (
          <div key={q.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00B4FF]/20 flex items-center justify-center"><FileText size={13} className="text-[#00B4FF]"/></div>
                <div>
                  <div className="text-xs font-bold text-foreground">{q.clientName}</div>
                  <div className="text-[10px] text-muted-foreground">{q.projectType}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: STATUS_COLORS[q.status], background: STATUS_BG[q.status] }}>{q.status}</span>
                <span className="text-xs font-bold text-[#00FFD1]">{fmt(q.quotedAmount)}</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground line-clamp-2">{q.quoteText}</div>
            <div className="flex gap-1.5">
              <button onClick={() => setSelectedQuote(selectedQuote?.id === q.id ? null : q)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-muted-foreground hover:text-[#00B4FF]"><Eye size={10}/> View</button>
              {q.status !== "approved" && <button onClick={() => updateStatus(q.id,"approved")} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-[#25D366]"><Check size={10}/> Approve</button>}
              {q.status !== "rejected" && <button onClick={() => updateStatus(q.id,"rejected")} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-destructive"><X size={10}/> Reject</button>}
              <button onClick={() => sendViaWA(q)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-black ml-auto" style={{ background: "#25D366" }}><Send size={10}/> WA</button>
              <button onClick={() => deleteQuote(q.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-destructive"><Trash2 size={10}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
