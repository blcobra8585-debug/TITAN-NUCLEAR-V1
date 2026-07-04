import { useState, useEffect } from "react";
import { Router as WouterRouter, Switch, Route } from "wouter";
import { Toaster } from "sonner";
import WhatsAppPage from "@/pages/WhatsAppPage";
import QuotesPage from "@/pages/QuotesPage";
import PaymentsPage from "@/pages/PaymentsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SettingsPage from "@/pages/SettingsPage";
import BotPage from "@/pages/BotPage";
import { MessageSquare, FileText, BarChart3, Settings, Zap, Wifi, WifiOff, Bot, Wallet } from "lucide-react";

const TABS = [
  { id: "whatsapp", label: "WhatsApp", Icon: MessageSquare, color: "#25D366" },
  { id: "bot",      label: "Lily Bot", Icon: Bot,           color: "#00B4FF" },
  { id: "quotes",   label: "Quotes",   Icon: FileText,      color: "#00FFD1" },
  { id: "payments", label: "Payments", Icon: Wallet,        color: "#F59E0B" },
  { id: "analytics",label: "Analytics",Icon: BarChart3,     color: "#7B2FFF" },
  { id: "settings", label: "Settings", Icon: Settings,      color: "#FF6B6B" },
];

export default function App() {
  const [tab, setTab] = useState("whatsapp");
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00B4FF] to-[#00FFD1] flex items-center justify-center">
              <Zap size={16} className="text-black" />
            </div>
            <div>
              <div className="text-sm font-bold gradient-text">MA TITAN</div>
              <div className="text-[10px] text-muted-foreground">WhatsApp Business Hub</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {online
              ? <div className="flex items-center gap-1 text-[#25D366] text-xs"><Wifi size={12}/> Live</div>
              : <div className="flex items-center gap-1 text-destructive text-xs"><WifiOff size={12}/> Offline</div>
            }
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          <Switch>
            <Route path="/">
              {tab === "whatsapp" && <WhatsAppPage />}
              {tab === "bot" && <BotPage />}
              {tab === "quotes" && <QuotesPage />}
              {tab === "payments" && <PaymentsPage />}
              {tab === "analytics" && <AnalyticsPage />}
              {tab === "settings" && <SettingsPage />}
            </Route>
          </Switch>
        </main>

        {/* Bottom Nav */}
        <nav className="flex border-t border-border bg-card shrink-0">
          {TABS.map(({ id, label, Icon, color }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-all"
                style={{ color: active ? color : "hsl(220 20% 55%)" }}
              >
                <div className="relative">
                  <Icon size={20} />
                  {active && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: color }} />}
                </div>
                <span className="text-[10px] font-semibold">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <Toaster theme="dark" richColors />
    </WouterRouter>
  );
}
