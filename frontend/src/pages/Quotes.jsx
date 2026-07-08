import { useCallback, useEffect, useState } from "react";
import { api, money, STATUS_COLORS } from "@/lib/api";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileSpreadsheet, ArrowLeft, Sparkles, Loader2, Trash2 } from "lucide-react";

const STATUSES = ["draft", "submitted", "won", "lost", "cancelled"];

export function QuotesList() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const load = useCallback(async () => {
    const url = status === "all" ? "/quotes" : `/quotes?status=${status}`;
    const { data } = await api.get(url);
    setItems(data);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((it) =>
    !q || it.quote_number.toLowerCase().includes(q.toLowerCase()) ||
    it.project_name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="quotes-page">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Sales Pipeline</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground mt-1">Search, filter and manage all generated quotes.</p>
        </div>
        <Link to="/configurator"><Button data-testid="new-quote-btn">+ New Quotation</Button></Link>
      </header>

      <Card className="p-4 rounded-2xl border-border flex flex-wrap gap-3 items-center">
        <Input placeholder="Search quote # or project…" value={q} onChange={(e)=>setQ(e.target.value)} className="max-w-xs" data-testid="quote-search-input"/>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40" data-testid="status-filter"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">{filtered.length} quote(s)</div>
      </Card>

      <Card className="rounded-2xl border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
              <th className="px-6 py-3 text-left font-medium">Quote #</th>
              <th className="px-6 py-3 text-left font-medium">Project</th>
              <th className="px-6 py-3 text-left font-medium">Sales Person</th>
              <th className="px-6 py-3 text-right font-medium">Value</th>
              <th className="px-6 py-3 text-left font-medium">Status</th>
              <th className="px-6 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody data-testid="quotes-table">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">No quotes found.</td></tr>
            )}
            {filtered.map((q) => (
              <tr key={q.id} className="border-t border-border hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => window.location.assign(`/quotes/${q.id}`)}>
                <td className="px-6 py-3 font-mono text-xs">{q.quote_number}</td>
                <td className="px-6 py-3 font-medium">{q.project_name}</td>
                <td className="px-6 py-3 text-muted-foreground">{q.sales_person_name}</td>
                <td className="px-6 py-3 text-right font-mono">{money(q.grand_total)}</td>
                <td className="px-6 py-3"><Badge variant="outline" className={STATUS_COLORS[q.status]}>{q.status}</Badge></td>
                <td className="px-6 py-3 text-muted-foreground text-xs">{q.created_at.slice(0,10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function QuoteDetail() {
  const { id } = useParams();
  const [q, setQ] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const nav = useNavigate();

  useEffect(() => { api.get(`/quotes/${id}`).then((r) => setQ(r.data)); }, [id]);
  if (!q) return <div className="p-6">Loading…</div>;

  const changeStatus = async (s) => {
    await api.patch(`/quotes/${id}/status?status=${s}`);
    setQ({ ...q, status: s }); toast.success(`Marked ${s}`);
  };

  const download = (kind) => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/quotes/${id}/${kind}`;
    window.open(url, "_blank");
  };

  const del = async () => {
    if (!window.confirm("Delete this quote?")) return;
    await api.delete(`/quotes/${id}`);
    toast.success("Deleted"); nav("/quotes");
  };

  const genAi = async () => {
    setLoadingAi(true);
    try {
      const { data } = await api.post("/ai/proposal-summary", { quote_id: id });
      setAiSummary(data.summary);
    } catch { toast.error("AI failed"); }
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="quote-detail-page">
      <Link to="/quotes" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-4 h-4"/> Back</Link>

      <Card className="p-8 rounded-2xl border-border">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="font-mono text-xs text-muted-foreground mb-1">{q.quote_number}</div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{q.project_name}</h1>
            <div className="text-sm text-muted-foreground mt-2">
              Prepared by {q.sales_person_name} · {q.created_at.slice(0,10)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={q.status} onValueChange={changeStatus}>
              <SelectTrigger className="w-36" data-testid="quote-status-select"><SelectValue/></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={()=>download("pdf")} data-testid="download-pdf-btn"><Download className="w-4 h-4 mr-2"/>PDF</Button>
            <Button variant="outline" onClick={()=>download("excel")} data-testid="download-excel-btn"><FileSpreadsheet className="w-4 h-4 mr-2"/>Excel</Button>
            <Button variant="outline" size="icon" onClick={del} data-testid="delete-quote-btn"><Trash2 className="w-4 h-4"/></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cabinets</div><div className="font-display font-bold text-lg">{q.config.total_cabinets}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Resolution</div><div className="font-display font-bold text-lg">{q.config.resolution_w}×{q.config.resolution_h}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">LED Area</div><div className="font-display font-bold text-lg">{q.config.led_area_sqm} m²</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Power</div><div className="font-display font-bold text-lg">{q.config.power_max_kw} kW</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div><div className="font-display font-bold text-lg text-primary">{money(q.grand_total)}</div></div>
        </div>
      </Card>

      <Card className="p-6 rounded-2xl border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">AI proposal summary</div>
            <div className="font-display font-semibold">Executive Summary Generator</div>
          </div>
          <Button variant="outline" onClick={genAi} disabled={loadingAi} data-testid="ai-summary-btn">
            {loadingAi ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2"/>}
            {aiSummary ? "Regenerate" : "Generate with AI"}
          </Button>
        </div>
        {aiSummary && (
          <div className="rounded-xl bg-secondary/40 border border-border p-4 text-sm leading-relaxed whitespace-pre-wrap" data-testid="ai-summary-text">
            {aiSummary}
          </div>
        )}
      </Card>

      <Card className="p-6 rounded-2xl border-border">
        <div className="font-display font-semibold mb-4">Bill of Materials</div>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 text-left font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Rate</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {q.items.map((it, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-2.5">{it.description}</td>
                  <td className="py-2.5 text-right font-mono">{it.qty} {it.unit}</td>
                  <td className="py-2.5 text-right font-mono text-xs">{money(it.unit_price)}</td>
                  <td className="py-2.5 text-right font-mono">{money(it.total)}</td>
                </tr>
              ))}
              <tr><td colSpan={3} className="py-2 text-right text-xs uppercase text-muted-foreground">Subtotal</td><td className="py-2 text-right font-mono">{money(q.subtotal)}</td></tr>
              <tr><td colSpan={3} className="py-2 text-right text-xs uppercase text-muted-foreground">GST</td><td className="py-2 text-right font-mono">{money(q.gst_amount)}</td></tr>
              <tr className="border-t-2"><td colSpan={3} className="py-3 text-right font-semibold uppercase text-xs">Grand Total</td><td className="py-3 text-right font-display font-bold text-lg text-primary">{money(q.grand_total)}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
