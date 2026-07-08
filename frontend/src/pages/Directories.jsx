import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, STATUS_COLORS } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Users, Handshake, FileText, IndianRupee } from "lucide-react";

function CrudTable({ resource, title, columns, emptyForm, testidPrefix, Icon, extraChild }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    const loadRows = async () => setRows((await api.get(`/${resource}`)).data);
    loadRows();
  }, [resource]);

  const load = async () => setRows((await api.get(`/${resource}`)).data);

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const openEdit = (r) => { setForm(r); setEditId(r.id); setOpen(true); };
  const save = async () => {
    try {
      const payload = {...form};
      // strip aggregates
      delete payload.count; delete payload.value; delete payload.won;
      if (editId) await api.put(`/${resource}/${editId}`, payload);
      else await api.post(`/${resource}`, payload);
      toast.success("Saved"); setOpen(false); load();
    } catch { toast.error("Failed"); }
  };

  const viewDetails = async (row) => {
    setSelected(row);
    try {
      const { data } = await api.get(`/${resource}/${row.id}/quotes`);
      setQuotes(data);
    } catch { setQuotes([]); }
  };

  return (
    <div className="space-y-6" data-testid={`${testidPrefix}-page`}>
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
            <Icon className="w-3 h-3"/> Directory
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Click any row to view quotations linked to this {title.toLowerCase().slice(0,-1)}.</p>
        </div>
        <Button onClick={openNew} data-testid={`new-${testidPrefix}-btn`}><Plus className="w-4 h-4 mr-1"/>New</Button>
      </header>

      <Card className="rounded-2xl border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
              {columns.map((c) => <th key={c.key} className="px-6 py-3 text-left font-medium">{c.label}</th>)}
              <th className="px-6 py-3 text-right font-medium">Quotes</th>
              <th className="px-6 py-3 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody data-testid={`${testidPrefix}-table`}>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 2} className="px-6 py-12 text-center text-muted-foreground">No records yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                  onClick={()=>viewDetails(r)} data-testid={`${testidPrefix}-row-${r.id}`}>
                {columns.map((c) => <td key={c.key} className="px-6 py-3">{r[c.key] || "—"}</td>)}
                <td className="px-6 py-3 text-right">
                  <Badge variant="outline" className="font-mono">{r.count || 0}</Badge>
                </td>
                <td className="px-6 py-3 text-right font-mono text-xs">{money(r.value || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} {title.slice(0,-1)}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {Object.keys(emptyForm).map((k) => (
              <div key={k}>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{k.replace(/_/g, " ")}</Label>
                <Input
                  className="mt-1.5"
                  value={form[k] ?? ""}
                  type={typeof emptyForm[k] === "number" ? "number" : "text"}
                  onChange={(e)=>setForm({...form, [k]: typeof emptyForm[k] === "number" ? +e.target.value : e.target.value})}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={save} data-testid={`save-${testidPrefix}-btn`}>Save</Button>
            {editId && <Button variant="outline" onClick={()=>{setOpen(false); viewDetails(form);}}>View Quotes</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details drawer */}
      <Sheet open={!!selected} onOpenChange={(v)=>!v && setSelected(null)}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-2xl">{selected?.company || selected?.name}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-6" data-testid={`${testidPrefix}-detail-drawer`}>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-secondary/60 border border-border p-4">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    <FileText className="w-3 h-3"/> Quotations
                  </div>
                  <div className="font-display text-2xl font-bold">{selected.count || 0}</div>
                </div>
                <div className="rounded-xl bg-secondary/60 border border-border p-4">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    <IndianRupee className="w-3 h-3"/> Total Value
                  </div>
                  <div className="font-display text-xl font-bold">{money(selected.value || 0)}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-4">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1">Won</div>
                  <div className="font-display text-2xl font-bold text-emerald-700 dark:text-emerald-400">{selected.won || 0}</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {columns.map((c) => selected[c.key] && (
                  <div key={c.key} className="flex justify-between gap-4 py-1 border-b border-border/60">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-medium">{selected[c.key]}</span>
                  </div>
                ))}
                {selected.email && (
                  <div className="flex justify-between gap-4 py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Email</span><span className="font-medium">{selected.email}</span>
                  </div>
                )}
                {selected.gst && (
                  <div className="flex justify-between gap-4 py-1 border-b border-border/60">
                    <span className="text-muted-foreground">GST</span><span className="font-mono text-xs">{selected.gst}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Quotations</div>
                {quotes.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">No quotations yet.</div>
                ) : (
                  <div className="space-y-2">
                    {quotes.map((q) => (
                      <Link key={q.id} to={`/quotes/${q.id}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
                            data-testid={`linked-quote-${q.id}`}>
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{q.quote_number}</div>
                          <div className="font-medium text-sm">{q.project_name}</div>
                          <div className="text-xs text-muted-foreground">{q.sales_person_name} · {q.created_at.slice(0,10)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display font-bold">{money(q.grand_total)}</div>
                          <Badge variant="outline" className={STATUS_COLORS[q.status]}>{q.status}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={()=>{ openEdit(selected); setSelected(null); }}>Edit details</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const customerForm = {
  company: "", contact_person: "", designation: "", email: "", phone: "",
  industry: "", city: "", state: "", pin: "", gst: "", address: "",
};

const partnerForm = {
  name: "", region: "", sales_manager: "", email: "", phone: "",
  gst: "", pan: "", address: "", discount_level: 0, credit_limit: 0,
};

export function Customers() {
  return <CrudTable
    resource="customers" title="Customers" testidPrefix="customer" Icon={Users}
    emptyForm={customerForm}
    columns={[
      { key: "company", label: "Company" },
      { key: "contact_person", label: "Contact" },
      { key: "industry", label: "Industry" },
      { key: "city", label: "City" },
      { key: "phone", label: "Phone" },
    ]}
  />;
}

export function Partners() {
  return <CrudTable
    resource="partners" title="Partners" testidPrefix="partner" Icon={Handshake}
    emptyForm={partnerForm}
    columns={[
      { key: "name", label: "Partner" },
      { key: "region", label: "Region" },
      { key: "sales_manager", label: "Sales Manager" },
      { key: "phone", label: "Phone" },
      { key: "discount_level", label: "Discount %" },
    ]}
  />;
}
