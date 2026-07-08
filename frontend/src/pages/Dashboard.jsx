import { useEffect, useState } from "react";
import { api, money, STATUS_COLORS } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import {
  FileText, Users, Handshake, IndianRupee, Ruler, Zap,
  TrendingUp, Activity,
} from "lucide-react";
import { Link } from "react-router-dom";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#f97316", "#84cc16"];

function KpiCard({ icon: Icon, label, value, hint, testid, accent = "blue", to }) {
  const inner = (
    <div className="stat-card cursor-pointer h-full" data-testid={testid}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${accent}-50 dark:bg-${accent}-950/40 text-${accent}-600 dark:text-${accent}-400`}>
          <Icon className="w-5 h-5" />
        </div>
        {hint && <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{hint}</div>}
      </div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <div className="text-2xl font-display font-bold tracking-tight">{value}</div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function ChartCard({ title, subtitle, children, testid }) {
  return (
    <Card className="p-6 rounded-2xl border-border" data-testid={testid}>
      <div className="mb-4">
        <div className="font-display font-semibold text-base">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </Card>
  );
}

const chartTooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "10px",
    fontSize: "12px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  },
  labelStyle: { color: "hsl(var(--foreground))", fontWeight: 600 },
};

export default function Dashboard() {
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setD(r.data));
  }, []);

  if (!d) return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full"/>
      <div className="grid grid-cols-4 gap-6">{[1,2,3,4].map(i=><Skeleton key={i} className="h-32"/>)}</div>
    </div>
  );

  const monthly = d.monthly_trend.length ? d.monthly_trend : [{month:"—",count:0,value:0}];
  const statusData = Object.entries(d.status_counts).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Overview</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time analytics across quotations, customers, and product mix.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
          Live
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5" data-testid="kpi-grid">
        <KpiCard icon={FileText} label="Quotations" value={d.total_quotations} testid="kpi-quotations" accent="blue" to="/quotes"/>
        <KpiCard icon={Users} label="Customers" value={d.total_customers} testid="kpi-customers" accent="emerald" to="/customers"/>
        <KpiCard icon={Handshake} label="Partners" value={d.total_partners} testid="kpi-partners" accent="purple" to="/partners"/>
        <KpiCard icon={IndianRupee} label="Sales Value" value={money(d.total_sales_value)} testid="kpi-sales" accent="amber" to="/reports"/>
        <KpiCard icon={Ruler} label="LED Area" value={`${d.total_led_area} m²`} testid="kpi-area" accent="cyan" to="/quotes"/>
        <KpiCard icon={Zap} label="Top Pitch" value={d.most_sold_pitch} hint={d.most_sold_series} testid="kpi-pitch" accent="rose" to="/products"/>
      </section>

      {/* Charts row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Monthly Sales Trend" subtitle="Value across last 6 months" testid="chart-monthly">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="gradVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
              <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))"/>
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))"/>
              <Tooltip {...chartTooltipStyle}/>
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#gradVal)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quote Status" subtitle="Pipeline distribution" testid="chart-status">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip {...chartTooltipStyle}/>
              <Legend iconType="circle" wrapperStyle={{fontSize: 11}}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Indoor vs Outdoor" subtitle="Category split" testid="chart-in-out">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              {name:"Indoor", count:d.indoor_outdoor.indoor},
              {name:"Outdoor", count:d.indoor_outdoor.outdoor},
              {name:"Other", count:d.indoor_outdoor.other},
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
              <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))"/>
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))"/>
              <Tooltip {...chartTooltipStyle}/>
              <Bar dataKey="count" fill="#10b981" radius={[8,8,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Charts row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Pixel Pitch Distribution" subtitle="Most quoted pitches" testid="chart-pitch">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.pitch_distribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false}/>
              <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))"/>
              <YAxis dataKey="pitch" type="category" fontSize={11} stroke="hsl(var(--muted-foreground))"/>
              <Tooltip {...chartTooltipStyle}/>
              <Bar dataKey="count" fill="#a855f7" radius={[0,8,8,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Salesperson Performance" subtitle="Deals & value" testid="chart-sp">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.salesperson_performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
              <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))"/>
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))"/>
              <Tooltip {...chartTooltipStyle}/>
              <Bar dataKey="count" fill="#3b82f6" radius={[8,8,0,0]} name="Quotes"/>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Recent quotes */}
      <section>
        <ChartCard title="Recent Quotations" subtitle="Latest activity" testid="recent-quotes">
          {d.recent_quotes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No quotations yet. <Link to="/configurator" className="text-primary hover:underline">Create your first</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="px-6 py-3 text-left font-medium">Quote #</th>
                    <th className="px-6 py-3 text-left font-medium">Project</th>
                    <th className="px-6 py-3 text-right font-medium">Value</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent_quotes.map((q) => (
                    <tr key={q.id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs">{q.quote_number}</td>
                      <td className="px-6 py-3 font-medium">{q.project_name}</td>
                      <td className="px-6 py-3 text-right font-mono">{money(q.grand_total)}</td>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className={STATUS_COLORS[q.status]}>{q.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">{q.created_at.slice(0,10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </section>
    </div>
  );
}
