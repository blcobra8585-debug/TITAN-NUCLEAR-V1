import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Send, Search, QrCode, RefreshCw, Wifi, WifiOff, MessageSquare, Phone, MoreVertical, Smile, Paperclip, Mic, CheckCheck, Clock, Image as ImageIcon, FileText, Star, Archive, Trash2, Reply, Copy, Forward } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, limit } from "firebase/firestore";
import { sendWAMessage, TEMPLATES } from "@/lib/whatsapp";

interface Contact { id: string; name: string; phone: string; lastMsg?: string; lastTime?: string; unread?: number; avatar?: string; online?: boolean; }
interface Message { id: string; text: string; from: "me" | "them"; time: string; status: "sent"|"delivered"|"read"|"pending"; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEMO_CONTACTS: Contact[] = [
  { id: "1", name: "Ramesh Kumar", phone: "917895001001", lastMsg: "Quote bhejo bhai", lastTime: "10:32", unread: 2, online: true },
  { id: "2", name: "Suresh Gupta", phone: "917895001002", lastMsg: "EOT crane ka price?", lastTime: "09:15", unread: 0, online: false },
  { id: "3", name: "Ajay Sharma", phone: "917895001003", lastMsg: "Meeting confirm hai", lastTime: "Yesterday", unread: 1, online: true },
  { id: "4", name: "Vijay Steel Works", phone: "917895001004", lastMsg: "Payment kar diya", lastTime: "Monday", unread: 0, online: false },
  { id: "5", name: "Bharat Industries", phone: "917895001005", lastMsg: "OK bhai", lastTime: "Sunday", unread: 0, online: false },
];

export default function WhatsAppPage() {
  const [waStatus, setWaStatus] = useState<"disconnected"|"connecting"|"qr"|"connected">("disconnected");
  const [qrImg, setQrImg] = useState<string|null>(null);
  const [contacts, setContacts] = useState<Contact[]>(DEMO_CONTACTS);
  const [selected, setSelected] = useState<Contact|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"chats"|"contacts"|"broadcast">("chats");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTargets, setBroadcastTargets] = useState<string[]>([]);
  const [broadcasting, setBroadcasting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [rightPanel, setRightPanel] = useState<"none"|"info"|"search">("none");
  const endRef = useRef<HTMLDivElement>(null);
  const waToken = localStorage.getItem("wa_token") ?? "";
  const wabaId = localStorage.getItem("waba_id") ?? "";

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!selected) return;
    const demoMsgs: Message[] = [
      { id: "1", text: "Namaskar! MA Engineering se bol raha hoon.", from: "me", time: "09:00", status: "read" },
      { id: "2", text: selected.lastMsg ?? "Hello", from: "them", time: "09:05", status: "read" },
      { id: "3", text: "Hamare EOT crane 200T tak available hain. Quote chahiye?", from: "me", time: "09:10", status: "read" },
      { id: "4", text: "Haan bhai, 50 ton ka chahiye. Kab milega?", from: "them", time: "09:12", status: "read" },
    ];
    setMessages(demoMsgs);
  }, [selected]);

  async function connectWA() {
    setWaStatus("connecting");
    try {
      const r = await fetch(`${BASE}/api/wa/qr`);
      const data = await r.json();
      if (data.qr) { setQrImg(data.qr); setWaStatus("qr"); }
      else if (data.connected) { setWaStatus("connected"); toast.success("WhatsApp connected!"); }
      else { setWaStatus("disconnected"); toast.error("Server pe connect nahi hua."); }
    } catch { setWaStatus("disconnected"); toast.error("API server se connect nahi hua."); }
  }

  async function pollStatus() {
    try {
      const r = await fetch(`${BASE}/api/wa/status`);
      const data = await r.json();
      if (data.connected) { setWaStatus("connected"); setQrImg(null); toast.success("WhatsApp Web connected!"); }
    } catch {}
  }

  useEffect(() => {
    if (waStatus !== "qr") return;
    const t = setInterval(pollStatus, 3000);
    return () => clearInterval(t);
  }, [waStatus]);

  async function sendMsg() {
    if (!input.trim() || !selected) return;
    const msg: Message = { id: Date.now().toString(), text: input, from: "me", time: new Date().toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit"}), status: "pending" };
    setMessages(m => [...m, msg]);
    const text = input; setInput("");
    setSending(true);
    if (waToken && wabaId) {
      const r = await sendWAMessage(selected.phone, text, waToken, wabaId);
      setMessages(m => m.map(x => x.id === msg.id ? { ...x, status: r.success ? "sent" : "pending" } : x));
      if (!r.success) toast.error(r.error ?? "Send failed");
    } else {
      try {
        const r = await fetch(`${BASE}/api/wa/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: selected.phone, message: text }),
        });
        const data = await r.json();
        setMessages(m => m.map(x => x.id === msg.id ? { ...x, status: data.success ? "sent" : "pending" } : x));
      } catch { toast.error("Send failed"); }
    }
    setSending(false);
    try { await addDoc(collection(db, "wa_messages"), { phone: selected.phone, name: selected.name, text, from: "me", time: serverTimestamp() }); } catch {}
  }

  async function sendTemplate(tpl: string) {
    if (!selected) return;
    setInput(tpl); setShowTemplates(false);
  }

  async function broadcastSend() {
    if (!broadcastMsg.trim() || broadcastTargets.length === 0) { toast.error("Message aur contacts select karo"); return; }
    setBroadcasting(true);
    let ok = 0, fail = 0;
    for (const id of broadcastTargets) {
      const c = contacts.find(x => x.id === id);
      if (!c) continue;
      // Fix #13: a single failing/throwing send used to abort the whole
      // broadcast loop, silently skipping every remaining contact.
      try {
        const r = await sendWAMessage(c.phone, broadcastMsg, waToken, wabaId);
        if (r.success) ok++; else fail++;
      } catch {
        fail++;
      }
      await new Promise(res => setTimeout(res, 1000));
    }
    setBroadcasting(false);
    toast.success(`${ok} bheja, ${fail} failed`);
    setBroadcastMsg(""); setBroadcastTargets([]);
  }

  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
  const StatusIcon = ({ s }: { s: string }) => s === "read" ? <CheckCheck size={12} className="text-[#00B4FF]"/> : s === "delivered" ? <CheckCheck size={12} className="text-muted-foreground"/> : s === "sent" ? <CheckCheck size={12} className="text-muted-foreground"/> : <Clock size={10} className="text-muted-foreground"/>;

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div className="w-[300px] border-r border-border flex flex-col shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-bold text-sm">M</div>
            <div><div className="text-xs font-bold text-foreground">MA Engineering</div><div className="text-[10px] text-[#25D366]">● {waStatus === "connected" ? "Connected" : waStatus}</div></div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setRightPanel(p => p === "search" ? "none" : "search")} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground"><Search size={15}/></button>
            <button onClick={connectWA} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground"><QrCode size={15}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["chats","contacts","broadcast"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 text-[10px] font-bold capitalize transition-colors"
              style={{ color: tab===t ? "#25D366" : "hsl(220 20% 55%)", borderBottom: tab===t ? "2px solid #25D366" : "2px solid transparent" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
            <Search size={13} className="text-muted-foreground"/>
            <input className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>

        {/* Chat List */}
        {tab === "chats" && (
          <div className="flex-1 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.id} onClick={() => setSelected(c)} className="w-full flex items-center gap-3 p-3 hover:bg-card/60 transition-colors border-b border-border/30 text-left"
                style={{ background: selected?.id === c.id ? "hsl(240 42% 12%)" : "transparent" }}>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00B4FF] to-[#7B2FFF] flex items-center justify-center text-white font-bold text-sm shrink-0">{c.name[0]}</div>
                  {c.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#25D366] border-2 border-background pulse-online"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground truncate">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{c.lastTime}</span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-[11px] text-muted-foreground truncate">{c.lastMsg}</span>
                    {(c.unread ?? 0) > 0 && <span className="text-[10px] bg-[#25D366] text-black rounded-full w-4 h-4 flex items-center justify-center font-bold shrink-0">{c.unread}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Broadcast Tab */}
        {tab === "broadcast" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="text-xs font-bold text-[#00B4FF]">BROADCAST MESSAGE</div>
            <div className="text-[11px] text-muted-foreground">Select contacts:</div>
            {contacts.map(c => (
              <label key={c.id} className="flex items-center gap-2 p-2 bg-card rounded-lg cursor-pointer">
                <input type="checkbox" checked={broadcastTargets.includes(c.id)} onChange={e => setBroadcastTargets(t => e.target.checked ? [...t,c.id] : t.filter(x=>x!==c.id))} className="accent-[#25D366]"/>
                <span className="text-xs text-foreground">{c.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{c.phone}</span>
              </label>
            ))}
            <textarea className="w-full bg-card border border-border rounded-lg p-2 text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none" rows={4} placeholder="Broadcast message..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}/>
            <button onClick={broadcastSend} disabled={broadcasting} className="w-full py-2 rounded-lg font-bold text-xs text-black transition-all" style={{ background: broadcasting ? "#128C7E" : "#25D366" }}>
              {broadcasting ? "Bhej raha hoon..." : `Send to ${broadcastTargets.length} contacts`}
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* QR Modal */}
        {(waStatus === "qr" || waStatus === "connecting") && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 text-center space-y-4">
              <div className="text-lg font-bold gradient-text">WhatsApp Web Connect</div>
              {waStatus === "connecting" && <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><RefreshCw size={16} className="animate-spin"/> Connecting...</div>}
              {waStatus === "qr" && qrImg && (
                <>
                  <div className="bg-white p-3 rounded-xl inline-block"><img src={qrImg} alt="QR" className="w-48 h-48"/></div>
                  <div className="text-xs text-muted-foreground">Phone pe WhatsApp kholo → Linked Devices → QR scan karo</div>
                  <button onClick={pollStatus} className="flex items-center gap-2 mx-auto text-xs text-[#25D366]"><RefreshCw size={12}/> Refresh</button>
                </>
              )}
              <button onClick={() => setWaStatus("disconnected")} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          </div>
        )}

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
            <div className="w-24 h-24 rounded-full bg-[#25D366]/10 flex items-center justify-center"><MessageSquare size={40} className="text-[#25D366]"/></div>
            <div>
              <div className="text-lg font-bold text-foreground">MA TITAN WhatsApp</div>
              <div className="text-sm text-muted-foreground mt-1">Left se contact select karo</div>
            </div>
            <button onClick={connectWA} className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-black" style={{ background: "#25D366" }}>
              <QrCode size={16}/> WhatsApp Web Connect
            </button>
            <div className="text-xs text-muted-foreground max-w-xs">Meta WhatsApp Token settings mein daalo ya WhatsApp Web QR se seedha connect karo.</div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-3 border-b border-border bg-card shrink-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00B4FF] to-[#7B2FFF] flex items-center justify-center text-white font-bold text-sm">{selected.name[0]}</div>
                {selected.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#25D366] border border-background"/>}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{selected.name}</div>
                <div className="text-[10px] text-muted-foreground">{selected.online ? "online" : selected.phone}</div>
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground"><Phone size={15}/></button>
                <button onClick={() => setShowTemplates(!showTemplates)} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground"><Star size={15}/></button>
                <button className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground"><MoreVertical size={15}/></button>
              </div>
            </div>

            {/* Templates Panel */}
            {showTemplates && (
              <div className="bg-card border-b border-border p-3 space-y-2">
                <div className="text-[10px] font-bold text-[#00B4FF] mb-2">QUICK TEMPLATES</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TEMPLATES).map(([key, fn]) => (
                    <button key={key} onClick={() => sendTemplate(fn(selected.name, "50T EOT Crane", "₹8.5L"))}
                      className="text-left p-2 bg-background border border-border rounded-lg text-[10px] text-muted-foreground hover:border-[#25D366] hover:text-[#25D366] transition-colors capitalize">{key}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "linear-gradient(180deg, #060610 0%, #0a0a1e 100%)" }}>
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3 py-2 ${m.from === "me" ? "wa-bubble-sent" : "wa-bubble-recv"}`}>
                    <div className="text-xs text-foreground whitespace-pre-wrap">{m.text}</div>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <span className="text-[9px] text-muted-foreground">{m.time}</span>
                      {m.from === "me" && <StatusIcon s={m.status}/>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={endRef}/>
            </div>

            {/* Input */}
            <div className="flex items-end gap-2 p-3 border-t border-border bg-card shrink-0">
              <button className="p-2 text-muted-foreground hover:text-[#25D366]"><Smile size={18}/></button>
              <button className="p-2 text-muted-foreground hover:text-[#25D366]"><Paperclip size={18}/></button>
              <div className="flex-1 bg-background border border-border rounded-2xl px-3 py-2">
                <textarea className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-24" rows={1}
                  placeholder="Message..." value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}/>
              </div>
              <button onClick={sendMsg} disabled={sending || !input.trim()} className="p-2.5 rounded-full transition-all" style={{ background: input.trim() ? "#25D366" : "hsl(240 42% 14%)" }}>
                {input.trim() ? <Send size={17} className="text-white"/> : <Mic size={17} className="text-muted-foreground"/>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
