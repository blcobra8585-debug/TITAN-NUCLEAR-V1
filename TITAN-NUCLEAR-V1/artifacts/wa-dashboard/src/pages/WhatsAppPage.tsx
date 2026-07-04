import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Send, Search, QrCode, RefreshCw, MessageSquare, Phone, MoreVertical, Smile, Paperclip, Mic, CheckCheck, Clock, Star } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, getDocs, limit } from "firebase/firestore";
import { sendWAMessage, TEMPLATES } from "@/lib/whatsapp";

interface Contact { id: string; name: string; phone: string; lastMsg?: string; lastTime?: string; unread?: number; online?: boolean; }
interface Message { id: string; text: string; from: "me" | "them"; time: string; status: "sent"|"delivered"|"read"|"pending"; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fmtTime(ts: any): string {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("en-IN", { weekday: "short" });
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function WhatsAppPage() {
  const [waStatus, setWaStatus] = useState<"disconnected"|"connecting"|"qr"|"connected">("disconnected");
  const [qrImg, setQrImg] = useState<string|null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
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
  const endRef = useRef<HTMLDivElement>(null);
  const waToken = localStorage.getItem("wa_token") ?? "";
  const wabaId = localStorage.getItem("waba_id") ?? "";

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Build contact list from Firestore wa_messages (grouped by phone, latest msg per contact)
  useEffect(() => {
    setContactsLoading(true);
    const unsubscribe = onSnapshot(
      query(collection(db, "wa_messages"), orderBy("time", "desc"), limit(500)),
      (snapshot) => {
        const byPhone = new Map<string, Contact>();
        snapshot.docs.forEach(doc => {
          const d = doc.data();
          const phone = d.phone as string;
          if (!phone) return;
          if (!byPhone.has(phone)) {
            byPhone.set(phone, {
              id: phone,
              name: d.name || phone,
              phone,
              lastMsg: d.text,
              lastTime: fmtTime(d.time),
              unread: 0,
            });
          }
        });
        setContacts(Array.from(byPhone.values()));
        setContactsLoading(false);
      },
      () => {
        // Firestore unavailable — try API fallback
        setContactsLoading(false);
        fetch(`${BASE}/api/wa/chats`)
          .then(r => r.ok ? r.json() : [])
          .then((chats: any[]) => {
            if (!Array.isArray(chats)) return;
            setContacts(chats.map(c => ({
              id: c.phone ?? c.id,
              name: c.name || c.phone,
              phone: c.phone ?? c.id,
              lastMsg: c.lastMsg ?? c.lastMessage ?? "",
              lastTime: fmtTime(c.lastTime ?? c.updatedAt),
              unread: c.unread ?? 0,
            })));
          })
          .catch(() => {});
      }
    );
    return () => unsubscribe();
  }, []);

  // Live message subscription when contact selected
  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    const q = query(
      collection(db, "wa_messages"),
      where("phone", "==", selected.phone),
      orderBy("time", "asc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            text: d.text ?? "",
            from: d.from === "me" ? "me" : "them",
            time: fmtTime(d.time),
            status: (d.status ?? "sent") as Message["status"],
          };
        });
        setMessages(msgs);
      },
      () => {
        // Firestore failed — fetch from API
        fetch(`${BASE}/api/wa/messages/${selected.phone}`)
          .then(r => r.ok ? r.json() : [])
          .then((apiMsgs: any[]) => {
            if (!Array.isArray(apiMsgs)) return;
            setMessages(apiMsgs.map(m => ({
              id: m.id ?? m._id ?? String(Math.random()),
              text: m.text ?? m.body ?? "",
              from: m.from === "me" ? "me" : "them",
              time: fmtTime(m.time ?? m.timestamp),
              status: (m.status ?? "sent") as Message["status"],
            })));
          })
          .catch(() => setMessages([]));
      }
    );
    return () => unsubscribe();
  }, [selected?.phone]);

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
    const text = input;
    setInput("");
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = { id: tempId, text, from: "me", time: new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}), status: "pending" };
    setMessages(m => [...m, tempMsg]);
    setSending(true);
    try {
      // Save to Firestore first (provides live update for both sides)
      await addDoc(collection(db, "wa_messages"), {
        phone: selected.phone, name: selected.name, text, from: "me",
        time: serverTimestamp(), status: "sent",
      });
      // Also forward via API/Meta token
      if (waToken && wabaId) {
        const r = await sendWAMessage(selected.phone, text, waToken, wabaId);
        if (!r.success) toast.error(r.error ?? "Send failed");
      } else {
        await fetch(`${BASE}/api/wa/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: selected.phone, message: text }),
        }).catch(() => {});
      }
      // Remove temp optimistic message (Firestore onSnapshot will add the real one)
      setMessages(m => m.filter(x => x.id !== tempId));
    } catch {
      // Keep temp message, mark as pending
      setMessages(m => m.map(x => x.id === tempId ? { ...x, status: "pending" } : x));
      toast.error("Send failed");
    } finally {
      setSending(false);
    }
  }

  async function broadcastSend() {
    if (!broadcastMsg.trim() || broadcastTargets.length === 0) { toast.error("Message aur contacts select karo"); return; }
    setBroadcasting(true);
    let ok = 0, fail = 0;
    for (const id of broadcastTargets) {
      const c = contacts.find(x => x.id === id);
      if (!c) continue;
      try {
        const r = await sendWAMessage(c.phone, broadcastMsg, waToken, wabaId);
        if (r.success) ok++; else fail++;
      } catch { fail++; }
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
          <button onClick={connectWA} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground"><QrCode size={15}/></button>
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
            {contactsLoading && (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
                <RefreshCw size={13} className="animate-spin"/> Loading conversations...
              </div>
            )}
            {!contactsLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-4 text-center">
                <MessageSquare size={32} className="text-muted-foreground/40"/>
                <div className="text-xs text-muted-foreground">Abhi tak koi WhatsApp message nahi mila hai.<br/>Pehle message aane pe yahan dikhega.</div>
              </div>
            )}
            {filtered.map(c => (
              <button key={c.id} onClick={() => setSelected(c)} className="w-full flex items-center gap-3 p-3 hover:bg-card/60 transition-colors border-b border-border/30 text-left"
                style={{ background: selected?.id === c.id ? "hsl(240 42% 12%)" : "transparent" }}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00B4FF] to-[#7B2FFF] flex items-center justify-center text-white font-bold text-sm shrink-0">{c.name[0]}</div>
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

        {/* Contacts Tab */}
        {tab === "contacts" && (
          <div className="flex-1 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.id} onClick={() => { setSelected(c); setTab("chats"); }}
                className="w-full flex items-center gap-3 p-3 hover:bg-card/60 border-b border-border/30 text-left">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00B4FF] to-[#7B2FFF] flex items-center justify-center text-white font-bold text-sm shrink-0">{c.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">+{c.phone}</div>
                </div>
              </button>
            ))}
            {!contactsLoading && filtered.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-8">Koi contact nahi</div>
            )}
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
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00B4FF] to-[#7B2FFF] flex items-center justify-center text-white font-bold text-sm">{selected.name[0]}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">{selected.name}</div>
                <div className="text-[10px] text-muted-foreground">{selected.phone}</div>
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
                    <button key={key} onClick={() => { setInput(fn(selected.name, "50T EOT Crane", "₹8.5L")); setShowTemplates(false); }}
                      className="text-left p-2 bg-background border border-border rounded-lg text-[10px] text-muted-foreground hover:border-[#25D366] hover:text-[#25D366] transition-colors capitalize">{key}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "linear-gradient(180deg, #060610 0%, #0a0a1e 100%)" }}>
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">Is contact ke saath abhi tak koi message nahi</div>
              )}
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
