import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, IndianRupee, FileText, Users, Zap, Target, Award, Activity, Loader2 } from "lucide-react";

const COLORS = ["#00B4FF","#25D366","#7B2FFF","#F59E0B","#EF4444","#00FFD1"];

interface Quote { id: string; clientName: string; projectType: string; tonnage: number; quotedAmount: number; status: string; createdAt: any; }

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function StatCard({ label, value, sub, color, icon: Icon, trend }: { label:string; value:string; sub?:string; color:string; icon:any; trend?:string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color+"20" }}>
        <Icon size={16} style={{ color }}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-bold text-foreground">{value}</div>
        {sub && <div className="text-[10px]" style={{ color }}>{sub}</div>}
      </div>
      {trend && <div className="text-[10px] font-bold" style={{ color: trend.startsWith("+") ? "#25D366" : "#EF4444" }}>{trend}</div>}
    </div>
  );
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AnalyticsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week"|"month"|"year">("month");
  const [leadStats, setLeadStats] = useState<{ totalLeads:number; newLeads:number; unreplied:number } | null>(null);

  useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => {
      setQuotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quote)));
      setLoading(false);
    }, () => { setLoading(false); });
    return () => unsub();
  }, []);

  // Fetch lead stats from API for the pipeline section
  useEffect(() => {
    fetch(`${BASE}/api/leads/stats`)
      .then(r => r.json())
      .then(d => setLeadStats({ totalLeads: d.total ?? 0, newLeads: d.today ?? 0, unreplied: d.unreplied ?? 0 }))
      .catch(() => {});
  }, []);

  const approved = quotes.filter(q => q.status === "approved");
  const pending = quotes.filter(q => q.status === "pending");
  const rejected = quotes.filter(q => q.status === "rejected");
  const totalRev = approved.reduce((s,q) => s+q.quotedAmount, 0);
  const avgDeal = approved.length > 0 ? totalRev / approved.length : 0;
  const winRate = quotes.length > 0 ? (approved.length / (approved.length + rejected.length)) * 100 : 0;

  function fmt(n: number) { return n >= 10000000 ? `₹${(n/10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${(n/1000).toFixed(0)}K`; }

  const byProject = Object.entries(quotes.reduce((acc,q) => {
    const k = q.projectType.split(" ").slice(0,2).join(" ");
    acc[k] = (acc[k]||0) + q.quotedAmount;
    return acc;
  }, {} as Record<string,number>)).map(([name,value]) => ({ name, value }));

  const byStatus = [
    { name: "Approved", value: approved.length, color: "#25D366" },
    { name: "Pending", value: pending.length, color: "#F59E0B" },
    { name: "Rejected", value: rejected.length, color: "#EF4444" },
  ];

  const monthly = Array.from({length:6},(_,i) => {
    const m = (new Date().getMonth() - 5 + i + 12) % 12;
    const monthQuotes = quotes.filter(q => {
      try { const d = q.createdAt?.toDate?.() ?? new Date(q.createdAt); return d.getMonth() === m; } catch { return false; }
    });
    return { name: MONTHS[m], revenue: monthQuotes.filter(q=>q.status==="approved").reduce((s,q)=>s+q.quotedAmount,0)/100000, quotes: monthQuotes.length };
  });

  const topClients = [...quotes].sort((a,b)=>b.quotedAmount-a.quotedAmount).slice(0,5);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-2 text-xs">
        <div className="font-bold text-foreground">{label}</div>
        {payload.map((p:any,i:number) => <div key={i} style={{color:p.color}}>₹{p.value}L</div>)}
      </div>
    );
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 size={24} className="animate-spin text-[#00B4FF]"/>
        <span className="text-xs">Analytics load ho rahi hai...</span>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total Revenue" value={fmt(totalRev)} sub="approved quotes" color="#25D366" icon={IndianRupee}/>
        <StatCard label="Total Quotes" value={quotes.length.toString()} sub={`${approved.length} approved`} color="#00B4FF" icon={FileText} trend={`+${approved.length}`}/>
        <StatCard label="Win Rate" value={`${winRate.toFixed(0)}%`} sub="vs industry 45%" color="#00FFD1" icon={Target} trend={winRate > 45 ? "+good" : "-low"}/>
        <StatCard label="Avg Deal" value={fmt(avgDeal)} sub="per project" color="#7B2FFF" icon={Award}/>
      </div>

      {/* Lead Pipeline from API */}
      {leadStats && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-xs font-bold text-[#F59E0B] mb-3 flex items-center gap-1.5"><Users size={12}/> LEAD PIPELINE (IndiaMART)</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total", value: leadStats.totalLeads, color: "#00B4FF" },
              { label: "Aaj", value: leadStats.newLeads, color: "#25D366" },
              { label: "Unreplied", value: leadStats.unreplied, color: leadStats.unreplied > 0 ? "#EF4444" : "#25D366" },
            ].map(s => (
              <div key={s.label} className="text-center p-2 rounded-lg bg-background">
                <div className="text-base font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-[#00B4FF] flex items-center gap-1.5"><Activity size={13}/> REVENUE TREND (L)</div>
          <div className="flex gap-1">
            {(["week","month","year"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className="text-[10px] px-2 py-0.5 rounded-md font-bold capitalize transition-colors"
                style={{ background: period===p ? "#00B4FF" : "transparent", color: period===p ? "#000" : "hsl(220 20% 55%)" }}>{p}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 42% 14%)"/>
            <XAxis dataKey="name" tick={{ fontSize:10, fill:"hsl(220 20% 55%)" }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize:10, fill:"hsl(220 20% 55%)" }} axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Line type="monotone" dataKey="revenue" stroke="#00B4FF" strokeWidth={2} dot={{ fill:"#00B4FF", r:3 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Project Breakdown */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-xs font-bold text-[#00FFD1] mb-3">PROJECT TYPE BREAKDOWN</div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={byProject} layout="vertical">
            <XAxis type="number" tick={{ fontSize:9, fill:"hsl(220 20% 55%)" }} axisLine={false} tickLine={false}/>
            <YAxis dataKey="name" type="category" tick={{ fontSize:9, fill:"hsl(220 20% 55%)" }} axisLine={false} tickLine={false} width={90}/>
            <Tooltip formatter={(v:any) => fmt(v)} contentStyle={{ background:"hsl(240 62% 9%)", border:"1px solid hsl(240 42% 18%)", borderRadius:8, fontSize:11 }}/>
            <Bar dataKey="value" fill="#00B4FF" radius={[0,4,4,0]}>
              {byProject.map((e,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status Pie */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-xs font-bold text-[#7B2FFF] mb-3">QUOTE STATUS DISTRIBUTION</div>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={byStatus} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                {byStatus.map((e,i) => <Cell key={i} fill={e.color}/>)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {byStatus.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }}/>
                <span className="text-xs text-muted-foreground">{s.name}</span>
                <span className="text-xs font-bold text-foreground ml-auto">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Clients */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-xs font-bold text-[#F59E0B] mb-3">TOP CLIENTS BY VALUE</div>
        <div className="space-y-2">
          {topClients.map((q,i) => (
            <div key={q.id} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground w-4">#{i+1}</span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: COLORS[i] }}>{q.clientName[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{q.clientName}</div>
                <div className="text-[10px] text-muted-foreground truncate">{q.projectType}</div>
              </div>
              <div className="text-xs font-bold" style={{ color: COLORS[i] }}>{fmt(q.quotedAmount)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MA Engineering Info */}
      <div className="bg-gradient-to-br from-[#00B4FF]/10 to-[#7B2FFF]/10 border border-[#00B4FF]/30 rounded-xl p-4 text-center space-y-2">
        <div className="text-base font-bold gradient-text">MA ENGINEERING</div>
        <div className="text-xs text-muted-foreground">Industrial Cranes • Chimneys • Steel Structures</div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[["15+","Years Exp"],["200T","Max Capacity"],["0","Accidents"]].map(([v,l]) => (
            <div key={l}>
              <div className="text-sm font-bold text-[#00B4FF]">{v}</div>
              <div className="text-[9px] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
