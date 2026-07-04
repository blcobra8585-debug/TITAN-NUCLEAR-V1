import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Bot, Power, PowerOff, RefreshCw, Trash2, MessageSquare, TrendingUp, Clock, Users, Key, Zap, Activity } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BotStats {
  enabled: boolean;
  totalMessages: number;
  totalReplies: number;
  uptime: number;
  activeChats: number;
}

interface BotReply {
  phone: string;
  userMsg: string;
  botMsg: string;
  time: number;
}

export default function BotPage() {
  const [stats, setStats] = useState<BotStats | null>(null);
  const [replies, setReplies] = useState<BotReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("gemini_key") ?? "");
  const [savingKey, setSavingKey] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/bot/status`);
      // Fix: guard against non-JSON body (502/504 HTML error pages cause a
      // SyntaxError that bubbles past the outer catch and freezes the UI).
      const data = await r.json().catch(() => ({}));
      setStats(data);
    } catch {
      // API not connected
    }
  }, []);

  const fetchReplies = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/wa/bot-replies`);
      // Fix: guard against non-JSON body
      const data = await r.json().catch(() => ({ replies: [] }));
      setReplies(data.replies ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    // Fix(M4): recursive setTimeout instead of setInterval — guarantees the
    // next fetch only starts after the previous one finishes, so slow networks
    // can't stack up concurrent requests that race each other.
    let alive = true;
    async function poll() {
      await Promise.all([fetchStats(), fetchReplies()]);
      if (alive) setTimeout(poll, 5000);
    }
    poll();
    return () => { alive = false; };
  }, [fetchStats, fetchReplies]);

  async function toggleBot() {
    if (!stats) return;
    setLoading(true);
    try {
      const endpoint = stats.enabled ? "disable" : "enable";
      const r = await fetch(`${BASE}/api/bot/${endpoint}`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      toast.success(data.message ?? (stats.enabled ? "Bot OFF!" : "Bot ON!"));
      fetchStats();
    } catch {
      toast.error("API server se connect nahi hua");
    }
    setLoading(false);
  }

  async function saveGeminiKey() {
    if (!geminiKey.trim()) { toast.error("Key daalo pehle"); return; }
    setSavingKey(true);
    try {
      localStorage.setItem("gemini_key", geminiKey);
      const r = await fetch(`${BASE}/api/bot/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey }),
      });
      const data = await r.json().catch(() => ({}));
      toast.success(data.message ?? "Key save ho gayi!");
    } catch {
      toast.error("API connect nahi hua — key locally save ki");
    }
    setSavingKey(false);
  }

  async function clearAllHistory() {
    try {
      await fetch(`${BASE}/api/bot/clear-all`, { method: "POST" });
      toast.success("Sab chat history clear ho gayi!");
      fetchStats();
    } catch {
      toast.error("Clear nahi hua");
    }
  }

  function formatUptime(seconds: number) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4FF] to-[#7B2FFF] flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <div className="text-base font-bold gradient-text">Lily AI Bot</div>
            <div className="text-[11px] text-muted-foreground">WhatsApp Auto-Reply System</div>
          </div>
        </div>
        <button onClick={fetchStats} className="p-2 rounded-lg hover:bg-card/60 text-muted-foreground">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Bot Toggle Card */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-foreground">Bot Status</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {stats === null ? "API se connect karo..." : stats.enabled ? "Lily bot active hai — clients ko auto-reply ho raha hai" : "Bot off hai — manually reply karo"}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${stats?.enabled ? "bg-[#25D366]/20 text-[#25D366]" : "bg-red-500/20 text-red-400"}`}>
            {stats === null ? "—" : stats.enabled ? "● ON" : "○ OFF"}
          </div>
        </div>

        <button
          onClick={toggleBot}
          disabled={loading || !stats}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
          style={{ background: stats?.enabled ? "rgba(239,68,68,0.15)" : "linear-gradient(135deg,#00B4FF,#7B2FFF)", color: stats?.enabled ? "#ef4444" : "#fff" }}
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : stats?.enabled ? <PowerOff size={16} /> : <Power size={16} />}
          {stats?.enabled ? "Bot Band Karo" : "Bot Chalu Karo"}
        </button>

        <div className="text-[10px] text-muted-foreground bg-background/40 rounded-lg p-2">
          ⚡ Bot chalu hone ke liye pehle <span className="text-[#25D366] font-bold">WhatsApp Web connect</span> karo (WA tab → QR scan)
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Messages Received", value: stats.totalMessages, icon: MessageSquare, color: "#00B4FF" },
            { label: "Auto Replies Sent", value: stats.totalReplies, icon: Zap, color: "#00FFD1" },
            { label: "Active Chats", value: stats.activeChats, icon: Users, color: "#7B2FFF" },
            { label: "Bot Uptime", value: formatUptime(stats.uptime), icon: Clock, color: "#25D366" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <Icon size={13} style={{ color }} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
              <div className="text-xl font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Gemini Key Config */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Key size={14} className="text-[#00B4FF]" />
          <div className="text-sm font-bold text-foreground">Gemini API Key</div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Lily Bot ke liye Gemini key chahiye. <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-[#00B4FF] underline">aistudio.google.com</a> se free mein milegi.
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[#00B4FF]"
            placeholder="AIzaSy..."
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
          />
          <button
            onClick={saveGeminiKey}
            disabled={savingKey}
            className="px-4 py-2 rounded-lg text-xs font-bold text-black transition-all"
            style={{ background: "#00B4FF" }}
          >
            {savingKey ? "..." : "Save"}
          </button>
        </div>
      </div>

      {/* Bot Commands Info */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#00FFD1]" />
          <div className="text-sm font-bold text-foreground">Bot Commands</div>
        </div>
        <div className="space-y-2">
          {[
            { cmd: "quote / price / rate", desc: "Lily quote generate karegi" },
            { cmd: "contact / manager", desc: "Admin contact details bhejegi" },
            { cmd: "meeting / visit", desc: "Meeting schedule karne ki info" },
            { cmd: "catalog / brochure", desc: "Catalog bhejne ka message" },
            { cmd: "!human", desc: "Human agent ko handoff" },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="flex items-start gap-2">
              <div className="bg-[#00B4FF]/10 text-[#00B4FF] px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0">{cmd}</div>
              <div className="text-[11px] text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Bot Replies */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#25D366]" />
            <div className="text-sm font-bold text-foreground">Recent Auto-Replies</div>
          </div>
          <button onClick={clearAllHistory} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300">
            <Trash2 size={11}/> Clear
          </button>
        </div>

        {replies.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <MessageSquare size={32} className="mx-auto text-muted-foreground/40" />
            <div className="text-xs text-muted-foreground">Abhi koi auto-reply nahi hua</div>
            <div className="text-[10px] text-muted-foreground">Bot chalu karo aur WhatsApp connect karo</div>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {replies.map((r, i) => (
              <div key={i} className="border border-border/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00B4FF]/30 to-[#7B2FFF]/30 flex items-center justify-center text-[10px] font-bold text-[#00B4FF]">
                      {r.phone.slice(-4, -2)}
                    </div>
                    <span className="text-[11px] text-muted-foreground">+{r.phone}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatTime(r.time)}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground shrink-0 mt-0.5">CLIENT:</span>
                    <div className="text-[11px] text-foreground/80 bg-background/40 rounded-lg px-2 py-1 flex-1">{r.userMsg}</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold text-[#25D366] shrink-0 mt-0.5">LILY:</span>
                    <div className="text-[11px] text-[#25D366]/90 bg-[#25D366]/5 rounded-lg px-2 py-1 flex-1">{r.botMsg}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
