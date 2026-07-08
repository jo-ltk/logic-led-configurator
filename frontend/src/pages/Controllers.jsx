import { useEffect, useState } from "react";
import { api, money } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Cpu, Sparkles, CheckCircle2, Plus, Edit, Trash2 } from "lucide-react";

const emptyForm = {
  model: "", class_: "All-in-One", max_pixels: 1000000, output_ports: 4,
  pixels_per_port: 650000, price: 50000, features: [],
};

export default function Controllers() {
  const [items, setItems] = useState([]);
  const [pixels, setPixels] = useState(3000000);
  const [plan, setPlan] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [featuresStr, setFeaturesStr] = useState("");

  const load = async () => setItems((await api.get("/controllers")).data);
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(emptyForm); setFeaturesStr(""); setEditId(null); setOpen(true); };
  const openEdit = (c) => {
    setForm({ ...emptyForm, ...c, class_: c.class || "Custom" });
    setFeaturesStr((c.features || []).join(", "));
    setEditId(c.id || null);
    setOpen(true);
  };
  const save = async () => {
    const payload = { ...form, features: featuresStr.split(",").map((s) => s.trim()).filter(Boolean) };
    try {
      if (editId) await api.put(`/controllers/${editId}`, payload);
      else await api.post("/controllers", payload);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const del = async (id) => {
    if (!id) { toast.error("Seeded catalog entries can't be deleted"); return; }
    if (!window.confirm("Delete this controller?")) return;
    try { await api.delete(`/controllers/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const runPlan = async () => {
    try { const { data } = await api.post("/controllers/plan", { total_pixels: +pixels }); setPlan(data); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-8" data-testid="controllers-page">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
            <Cpu className="w-3 h-3"/> Controller Catalog
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Controllers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage Novastar + custom controllers, auto-plan any LED wall.</p>
        </div>
        <Button onClick={openNew} data-testid="new-controller-btn"><Plus className="w-4 h-4 mr-1"/>Add controller</Button>
      </header>

      <Card className="p-6 rounded-2xl border-border">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary"/>
          <div className="font-display font-semibold">Auto-plan a controller</div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Total pixels</Label>
            <Input type="number" value={pixels} onChange={(e)=>setPixels(e.target.value)} className="mt-1.5" data-testid="planner-pixels-input"/>
          </div>
          <Button onClick={runPlan} className="h-11" data-testid="planner-run-btn"><Cpu className="w-4 h-4 mr-2"/>Recommend</Button>
        </div>
        {plan && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="planner-result">
            <div className="col-span-1 md:col-span-2 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 border border-primary/20 p-5">
              <div className="text-xs uppercase tracking-widest text-primary mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5"/> Recommended
              </div>
              <div className="font-display text-2xl font-bold">{plan.recommended.model}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{plan.recommended.class} · qty {plan.quantity}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(plan.recommended.features || []).map((f) => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
              </div>
              <div className="text-xs text-muted-foreground mt-3">{plan.note}</div>
            </div>
            <div className="rounded-xl bg-secondary/60 border border-border p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Ports Used</div>
              <div className="font-display text-2xl font-bold">{plan.ports_used}</div>
              <div className="text-xs text-muted-foreground mt-1">Free: {plan.ports_free}</div>
            </div>
            <div className="rounded-xl bg-secondary/60 border border-border p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Utilization</div>
              <div className="font-display text-2xl font-bold">{plan.utilization_percent}%</div>
              <div className="text-xs text-muted-foreground mt-1">{money(plan.recommended.price)}</div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="controllers-catalog">
        {items.map((c) => (
          <Card key={c.model + (c.id || "")} className="p-5 rounded-2xl border-border hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Cpu className="w-5 h-5"/></div>
              <Badge variant="outline" className="text-[10px]">{c.class}</Badge>
            </div>
            <div className="font-display font-bold text-xl">{c.model}</div>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between border-b border-border/60 py-1"><span className="text-muted-foreground">Max Pixels</span><span className="font-mono font-semibold">{(c.max_pixels/1e6).toFixed(1)}M</span></div>
              <div className="flex justify-between border-b border-border/60 py-1"><span className="text-muted-foreground">Output Ports</span><span className="font-mono font-semibold">{c.output_ports}</span></div>
              <div className="flex justify-between border-b border-border/60 py-1"><span className="text-muted-foreground">Per Port</span><span className="font-mono">{(c.pixels_per_port/1e3).toFixed(0)}K</span></div>
              <div className="flex justify-between py-1"><span className="text-muted-foreground">Price</span><span className="font-mono font-semibold text-primary">{money(c.price)}</span></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(c.features || []).slice(0, 3).map((f) => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={()=>openEdit(c)} data-testid={`edit-controller-${c.model}`}><Edit className="w-3.5 h-3.5 mr-1"/>Edit</Button>
              <Button variant="ghost" size="sm" onClick={()=>del(c.id)}><Trash2 className="w-3.5 h-3.5"/></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} controller</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Model</Label><Input value={form.model} onChange={(e)=>setForm({...form, model: e.target.value})} className="mt-1.5" data-testid="controller-model-input"/></div>
            <div><Label className="text-xs">Class</Label><Input value={form.class_} onChange={(e)=>setForm({...form, class_: e.target.value})} className="mt-1.5"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Max Pixels</Label><Input type="number" value={form.max_pixels} onChange={(e)=>setForm({...form, max_pixels: +e.target.value})} className="mt-1.5"/></div>
              <div><Label className="text-xs">Output Ports</Label><Input type="number" value={form.output_ports} onChange={(e)=>setForm({...form, output_ports: +e.target.value})} className="mt-1.5"/></div>
              <div><Label className="text-xs">Pixels / Port</Label><Input type="number" value={form.pixels_per_port} onChange={(e)=>setForm({...form, pixels_per_port: +e.target.value})} className="mt-1.5"/></div>
              <div><Label className="text-xs">Price (₹)</Label><Input type="number" value={form.price} onChange={(e)=>setForm({...form, price: +e.target.value})} className="mt-1.5"/></div>
            </div>
            <div><Label className="text-xs">Features (comma-separated)</Label><Input value={featuresStr} onChange={(e)=>setFeaturesStr(e.target.value)} className="mt-1.5" placeholder="4K Input, Genlock, Dual Power"/></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={save} data-testid="save-controller-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
