import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Key, Phone, Bot, Zap, Eye, EyeOff, CheckCircle } from "lucide-react";

const FIELDS = [
  { key: "wa_token",    label: "WhatsApp Access Token",    icon: Key,   type: "password", placeholder: "EAAxxxxx..." },
  { key: "waba_id",     label: "WABA / Phone Number ID",   icon: Phone, type: "text",     placeholder: "1234567890" },
  { key: "gemini_key",  label: "Gemini API Key",           icon: Bot,   type: "password", placeholder: "AIzaSy..." },
];

export default function SettingsPage() {
  const [vals, setVals] = useState<Record<string,string>>({});
  const [show, setShow] = useState<Record<string,boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loaded: Record<string,string> = {};
    FIELDS.forEach(f => { loaded[f.key] = localStorage.getItem(f.key) ?? ""; });
    setVals(loaded);
  }, []);

  function save() {
    FIELDS.forEach(f => { if (vals[f.key]) localStorage.setItem(f.key, vals[f.key]); });
    setSaved(true);
    toast.success("Settings save ho gayi!");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#7B2FFF]/20 flex items-center justify-center">
          <Zap size={16} className="text-[#7B2FFF]" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">Configuration</div>
          <div className="text-[10px] text-muted-foreground">API Keys & Tokens</div>
        </div>
      </div>

      <div className="bg-[#00B4FF]/10 border border-[#00B4FF]/30 rounded-xl p-3 text-xs text-[#00B4FF] space-y-1">
        <div className="font-bold">📋 Setup Guide:</div>
        <div>1. Meta Business Manager → WhatsApp → API Setup</div>
        <div>2. WABA ID = Phone Number ID (nahi Business ID)</div>
        <div>3. Gemini API: aistudio.google.com/apikey</div>
      </div>

      {FIELDS.map(({ key, label, icon: Icon, type, placeholder }) => (
        <div key={key} className="bg-card border border-border rounded-xl p-4 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Icon size={13} className="text-[#00B4FF]" />
            {label}
          </label>
          <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-2.5">
            <input
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              type={show[key] ? "text" : type}
              placeholder={placeholder}
              value={vals[key] ?? ""}
              onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
            />
            {type === "password" && (
              <button onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))} className="text-muted-foreground hover:text-foreground">
                {show[key] ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            )}
          </div>
          {vals[key] && (
            <div className="flex items-center gap-1 text-[10px] text-[#25D366]">
              <CheckCircle size={10}/> Saved locally
            </div>
          )}
        </div>
      ))}

      <button
        onClick={save}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
        style={{ background: saved ? "#25D366" : "#00B4FF", color: "#000" }}
      >
        {saved ? <CheckCircle size={16}/> : <Save size={16}/>}
        {saved ? "Saved!" : "Save Settings"}
      </button>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold text-muted-foreground">ABOUT MA TITAN</div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between"><span>Version</span><span className="text-[#00B4FF] font-mono">v2.0.0</span></div>
          <div className="flex justify-between"><span>Company</span><span className="text-foreground">MA Engineering</span></div>
          <div className="flex justify-between"><span>Admin</span><span className="text-foreground">Suhan Siddiqui</span></div>
          <div className="flex justify-between"><span>AI Engine</span><span className="text-[#00FFD1]">Gemini 1.5 Flash</span></div>
          <div className="flex justify-between"><span>WA API</span><span className="text-[#25D366]">Meta v18.0</span></div>
        </div>
      </div>
    </div>
  );
}
