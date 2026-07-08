import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, Save, Building2 } from "lucide-react";

// ---- AI Assistant ----
export function AIAssistant() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ application: "Corporate Boardroom", viewing_distance_m: 4, indoor: true, budget_range_inr: "10-20 Lakh", ambient_light: "normal" });
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState(null);

  useEffect(() => { api.get("/products").then((r) => setProducts(r.data)); }, []);

  const run = async () => {
    setLoading(true); setRec(null);
    try {
      const { data } = await api.post("/ai/recommend", form);
      setRec(data);
    } catch { toast.error("AI failed"); }
    setLoading(false);
  };

  const productById = (id) => products.find((p) => p.id === id);

  return (
    <div className="space-y-6 max-w-4xl" data-testid="ai-page">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
          <Sparkles className="w-3 h-3"/> AI Powered
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Videowall Advisor</h1>
        <p className="text-sm text-muted-foreground mt-1">Describe the use case, get an expert product recommendation powered by Claude.</p>
      </header>

      <Card className="p-6 rounded-2xl border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Application / Use case</Label>
            <Input value={form.application} onChange={(e)=>setForm({...form, application: e.target.value})} className="mt-1.5" data-testid="ai-app-input"/>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Viewing Distance (m)</Label>
            <Input type="number" value={form.viewing_distance_m} onChange={(e)=>setForm({...form, viewing_distance_m: +e.target.value})} className="mt-1.5" data-testid="ai-dist-input"/>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Environment</Label>
            <Select value={form.indoor ? "in" : "out"} onValueChange={(v)=>setForm({...form, indoor: v==="in"})}>
              <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="in">Indoor</SelectItem><SelectItem value="out">Outdoor</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Budget range</Label>
            <Input value={form.budget_range_inr} onChange={(e)=>setForm({...form, budget_range_inr: e.target.value})} className="mt-1.5"/>
          </div>
        </div>
        <Button onClick={run} disabled={loading} className="w-full h-11" data-testid="ai-run-btn">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2"/>}
          Get recommendation
        </Button>
      </Card>

      {rec && (
        <Card className="p-6 rounded-2xl border-primary/30 bg-primary/5">
          <div className="text-xs uppercase tracking-widest text-primary mb-2">Recommendation</div>
          {rec.parsed?.recommended_product_id ? (
            <>
              <h3 className="font-display text-xl font-bold">{productById(rec.parsed.recommended_product_id)?.name || "See raw"}</h3>
              <p className="text-sm mt-3 leading-relaxed">{rec.parsed.reason}</p>
              {rec.parsed.alternatives?.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs uppercase text-muted-foreground mb-2">Alternatives</div>
                  <ul className="space-y-1 text-sm">
                    {rec.parsed.alternatives.map((id) => (
                      <li key={id}>• {productById(id)?.name || id}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <pre className="text-xs whitespace-pre-wrap" data-testid="ai-raw-response">{rec.raw}</pre>
          )}
        </Card>
      )}
    </div>
  );
}

// ---- Reports ----
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export function Reports() {
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState([]);
  useEffect(() => { api.get(`/reports/sales?period=${period}`).then((r) => setData(r.data)); }, [period]);
  return (
    <div className="space-y-6" data-testid="reports-page">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Analytics</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Sales Reports</h1>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40" data-testid="period-select"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </header>
      <Card className="p-6 rounded-2xl border-border">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false}/>
            <XAxis dataKey="period" fontSize={11} stroke="hsl(var(--muted-foreground))"/>
            <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))"/>
            <Tooltip contentStyle={{background:"hsl(var(--card))",border:"1px solid hsl(var(--border))",borderRadius:10,fontSize:12}}/>
            <Legend/>
            <Bar dataKey="value" name="Quoted" fill="#3b82f6" radius={[8,8,0,0]}/>
            <Bar dataKey="won_value" name="Won" fill="#10b981" radius={[8,8,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ---- Settings ----
export function Settings() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/settings").then((r) => setS(r.data)); }, []);
  const save = async () => { await api.put("/settings", s); toast.success("Settings saved"); };
  if (!s) return <div>Loading…</div>;
  return (
    <div className="space-y-6 max-w-3xl" data-testid="settings-page">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
          <Building2 className="w-3 h-3"/> Configuration
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Company Settings</h1>
      </header>
      <Card className="p-6 rounded-2xl border-border space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(s).filter((k) => k !== "id").map((k) => (
            <div key={k}>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{k.replace(/_/g," ")}</Label>
              <Input
                className="mt-1.5" value={s[k] ?? ""}
                type={typeof s[k] === "number" ? "number" : "text"}
                onChange={(e)=>setS({...s, [k]: typeof s[k] === "number" ? +e.target.value : e.target.value})}
              />
            </div>
          ))}
        </div>
        <Button onClick={save} data-testid="save-settings-btn"><Save className="w-4 h-4 mr-2"/>Save Settings</Button>
      </Card>
    </div>
  );
}
