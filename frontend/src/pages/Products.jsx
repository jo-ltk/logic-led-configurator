import { useEffect, useState } from "react";
import { api, money } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Package } from "lucide-react";

const CATEGORIES = ["Indoor LED", "Outdoor LED", "Rental LED", "COB LED", "Transparent LED", "Creative LED"];
const PITCHES = ["P0.9","P1.2","P1.5","P1.8","P2","P2.5","P3","P4","P5","P6","P8","P10"];

const empty = {
  category: "Indoor LED", series: "", pixel_pitch: "P2.5", name: "",
  cabinet_width_mm: 500, cabinet_height_mm: 500, cabinet_depth_mm: 80,
  cabinet_weight_kg: 8, cabinet_material: "Die Cast",
  brightness_nits: 800, contrast_ratio: "5000:1", refresh_rate_hz: 3840,
  viewing_angle: "160/160", power_max_w: 500, power_typical_w: 200,
  operating_voltage: "110-240V", ip_rating: "IP40", led_brand: "Nationstar",
  driver_ic: "ICN2038S", color_temp: "3200K-9300K", life_hours: 100000,
  maintenance: "Front & Rear", cabinet_price: 45000, module_price: 0,
  installation_cost_per_sqm: 5000, structure_cost_per_sqm: 3000,
  commissioning_cost: 25000, packing_cost: 5000, transport_cost: 15000,
  amc_percent: 8, warranty_years: 2, archived: false, certifications: ["CE","RoHS"],
};

export default function Products() {
  const [items, setItems] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const { data } = await api.get("/products");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditingId(null); setOpenForm(true); };
  const openEdit = (p) => { setForm(p); setEditingId(p.id); setOpenForm(true); };
  const save = async () => {
    try {
      if (editingId) await api.put(`/products/${editingId}`, form);
      else await api.post("/products", form);
      toast.success("Saved"); setOpenForm(false); load();
    } catch (e) { toast.error("Failed"); }
  };
  const del = async (id) => {
    if (!window.confirm("Archive this product?")) return;
    await api.delete(`/products/${id}`); toast.success("Archived"); load();
  };
  const dup = async (id) => { await api.post(`/products/${id}/duplicate`); toast.success("Duplicated"); load(); };

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <div className="space-y-6" data-testid="products-page">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Master Data</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Product Master</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage LED display models, specs and pricing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44" data-testid="products-filter"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openNew} data-testid="new-product-btn"><Plus className="w-4 h-4 mr-1"/>New Product</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="products-grid">
        {filtered.map((p) => (
          <Card key={p.id} className="p-5 rounded-2xl border-border hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Package className="w-5 h-5"/>
              </div>
              <Badge variant="outline" className="text-[10px]">{p.pixel_pitch}</Badge>
            </div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{p.category}</div>
            <div className="font-display font-bold text-lg leading-tight mb-3">{p.name}</div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-4">
              <div><span className="text-muted-foreground">Cabinet</span><div className="font-medium">{p.cabinet_width_mm}×{p.cabinet_height_mm}mm</div></div>
              <div><span className="text-muted-foreground">Brightness</span><div className="font-medium">{p.brightness_nits} nits</div></div>
              <div><span className="text-muted-foreground">Power (max)</span><div className="font-medium">{p.power_max_w} W</div></div>
              <div><span className="text-muted-foreground">Price</span><div className="font-medium">{money(p.cabinet_price)}</div></div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" className="flex-1" onClick={()=>openEdit(p)} data-testid={`edit-${p.id}`}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={()=>dup(p.id)} data-testid={`dup-${p.id}`}><Copy className="w-3.5 h-3.5"/></Button>
              <Button variant="ghost" size="sm" onClick={()=>del(p.id)} data-testid={`del-${p.id}`}><Trash2 className="w-3.5 h-3.5"/></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit" : "New"} Product</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name"><Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} data-testid="prod-name"/></Field>
            <Field label="Series"><Input value={form.series} onChange={(e)=>setForm({...form, series: e.target.value})}/></Field>
            <Field label="Category">
              <Select value={form.category} onValueChange={(v)=>setForm({...form, category: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Pixel Pitch">
              <Select value={form.pixel_pitch} onValueChange={(v)=>setForm({...form, pixel_pitch: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{PITCHES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Cabinet Width (mm)"><Input type="number" value={form.cabinet_width_mm} onChange={(e)=>setForm({...form, cabinet_width_mm: +e.target.value})}/></Field>
            <Field label="Cabinet Height (mm)"><Input type="number" value={form.cabinet_height_mm} onChange={(e)=>setForm({...form, cabinet_height_mm: +e.target.value})}/></Field>
            <Field label="Weight (kg)"><Input type="number" value={form.cabinet_weight_kg} onChange={(e)=>setForm({...form, cabinet_weight_kg: +e.target.value})}/></Field>
            <Field label="Brightness (nits)"><Input type="number" value={form.brightness_nits} onChange={(e)=>setForm({...form, brightness_nits: +e.target.value})}/></Field>
            <Field label="Power Max (W)"><Input type="number" value={form.power_max_w} onChange={(e)=>setForm({...form, power_max_w: +e.target.value})}/></Field>
            <Field label="Power Typ (W)"><Input type="number" value={form.power_typical_w} onChange={(e)=>setForm({...form, power_typical_w: +e.target.value})}/></Field>
            <Field label="IP Rating"><Input value={form.ip_rating} onChange={(e)=>setForm({...form, ip_rating: e.target.value})}/></Field>
            <Field label="Refresh Rate (Hz)"><Input type="number" value={form.refresh_rate_hz} onChange={(e)=>setForm({...form, refresh_rate_hz: +e.target.value})}/></Field>
            <Field label="Cabinet Price (INR)"><Input type="number" value={form.cabinet_price} onChange={(e)=>setForm({...form, cabinet_price: +e.target.value})}/></Field>
            <Field label="Install per sqm"><Input type="number" value={form.installation_cost_per_sqm} onChange={(e)=>setForm({...form, installation_cost_per_sqm: +e.target.value})}/></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setOpenForm(false)}>Cancel</Button>
            <Button onClick={save} data-testid="save-product-btn">{editingId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
