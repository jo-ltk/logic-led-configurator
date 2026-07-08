import { useEffect, useState } from "react";
import { api, money, STATUS_COLORS } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KanbanSquare, Plus, MoveRight } from "lucide-react";

const STAGES = ["enquiry", "quotation", "po", "manufacturing", "qc", "dispatch", "installation", "commissioning", "amc", "warranty"];
const STAGE_COLORS = {
  enquiry: "border-slate-300", quotation: "border-blue-300", po: "border-purple-300",
  manufacturing: "border-amber-300", qc: "border-cyan-300", dispatch: "border-pink-300",
  installation: "border-emerald-300", commissioning: "border-indigo-300",
  amc: "border-teal-300", warranty: "border-lime-300",
};

export default function Projects() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", customer_id: "", stage: "enquiry", value: 0, notes: "", expected_close_date: "" });

  const load = async () => setItems((await api.get("/projects")).data);
  useEffect(() => {
    load();
    api.get("/customers").then((r) => setCustomers(r.data));
  }, []);

  const create = async () => {
    if (!form.name || !form.customer_id) { toast.error("Name + customer required"); return; }
    try { await api.post("/projects", form); toast.success("Created"); setOpen(false); load();
      setForm({ name: "", customer_id: "", stage: "enquiry", value: 0, notes: "", expected_close_date: "" });
    } catch { toast.error("Failed"); }
  };

  const moveStage = async (proj, delta) => {
    const idx = STAGES.indexOf(proj.stage);
    const next = STAGES[Math.max(0, Math.min(STAGES.length - 1, idx + delta))];
    await api.patch(`/projects/${proj.id}/stage?stage=${next}`);
    load();
  };

  const grouped = STAGES.map((s) => ({ stage: s, items: items.filter((i) => i.stage === s) }));
  const customerName = (id) => customers.find((c) => c.id === id)?.company || "—";

  return (
    <div className="space-y-6" data-testid="projects-page">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
            <KanbanSquare className="w-3 h-3"/> Pipeline
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Project Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Track projects from enquiry to AMC.</p>
        </div>
        <Button onClick={()=>setOpen(true)} data-testid="new-project-btn"><Plus className="w-4 h-4 mr-1"/>New Project</Button>
      </header>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max" data-testid="pipeline-board">
          {grouped.map(({ stage, items }) => (
            <div key={stage} className={`w-72 shrink-0 rounded-2xl border-t-4 ${STAGE_COLORS[stage]} bg-card border border-border p-3`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-xs uppercase tracking-widest font-semibold">{stage.replace("_", " ")}</div>
                <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {items.map((p) => (
                  <div key={p.id} className="rounded-lg bg-secondary/50 border border-border p-3 hover:bg-secondary transition-colors" data-testid={`project-card-${p.id}`}>
                    <div className="text-sm font-semibold mb-1">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{customerName(p.customer_id)}</div>
                    {p.value > 0 && <div className="text-xs font-mono font-semibold text-primary mt-1">{money(p.value)}</div>}
                    <div className="flex items-center gap-1 mt-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>moveStage(p, -1)}>←</Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>moveStage(p, 1)} data-testid={`move-forward-${p.id}`}>→</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="mt-1.5" data-testid="project-name-input"/></div>
            <div><Label className="text-xs">Customer</Label>
              <Select value={form.customer_id} onValueChange={(v)=>setForm({...form, customer_id: v})}>
                <SelectTrigger className="mt-1.5" data-testid="project-customer-select"><SelectValue placeholder="Pick customer"/></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Value (₹)</Label><Input type="number" value={form.value} onChange={(e)=>setForm({...form, value: +e.target.value})} className="mt-1.5"/></div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})} className="mt-1.5"/></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={create} data-testid="save-project-btn">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
