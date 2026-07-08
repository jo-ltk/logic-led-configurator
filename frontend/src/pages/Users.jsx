import { useEffect, useState } from "react";
import { api, ROLES } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, Shield, Trash2, KeyRound } from "lucide-react";

const ROLE_ACCENT = {
  super_admin: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  admin: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  dealer: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
  sales: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  presales: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300",
  consultant: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  customer: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
};

const empty = { email: "", password: "", name: "", role: "sales", active: true };

export default function Users() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = async () => {
    const { data } = await api.get("/auth/users");
    setRows(data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (r) => { setForm({ ...empty, ...r, password: "" }); setEditId(r.id); setOpen(true); };

  const save = async () => {
    try {
      if (editId) {
        const payload = { name: form.name, role: form.role, active: form.active };
        if (form.password) payload.password = form.password;
        await api.put(`/admin/users/${editId}`, payload);
      } else {
        await api.post("/admin/users", form);
      }
      toast.success("Saved"); setOpen(false); load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try { await api.delete(`/admin/users/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
            <Shield className="w-3 h-3"/> Multi-User Control Panel
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Users & Access</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage users, assign roles, control access.</p>
        </div>
        <Button onClick={openNew} data-testid="new-user-btn"><UserPlus className="w-4 h-4 mr-1"/>Invite user</Button>
      </header>

      <Card className="rounded-2xl border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
              <th className="px-6 py-3 text-left font-medium">User</th>
              <th className="px-6 py-3 text-left font-medium">Email</th>
              <th className="px-6 py-3 text-left font-medium">Role</th>
              <th className="px-6 py-3 text-left font-medium">Status</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody data-testid="users-table">
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-secondary/30">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="font-medium">{u.name}</div>
                  </div>
                </td>
                <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-6 py-3">
                  <Badge variant="outline" className={ROLE_ACCENT[u.role] || ""}>{ROLES[u.role] || u.role}</Badge>
                </td>
                <td className="px-6 py-3">
                  {u.active !== false
                    ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900">Active</Badge>
                    : <Badge variant="outline" className="bg-slate-100 text-slate-500">Disabled</Badge>}
                </td>
                <td className="px-6 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={()=>openEdit(u)} data-testid={`edit-user-${u.id}`}>Edit</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>del(u.id)} data-testid={`del-user-${u.id}`}>
                    <Trash2 className="w-3.5 h-3.5"/>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit user" : "Invite user"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Full name</Label>
              <Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="mt-1.5" data-testid="user-name-input"/>
            </div>
            {!editId && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
                <Input type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} className="mt-1.5" data-testid="user-email-input"/>
              </div>
            )}
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <KeyRound className="w-3 h-3"/>{editId ? "New password (optional)" : "Password"}
              </Label>
              <Input type="password" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} className="mt-1.5" data-testid="user-password-input"/>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Role</Label>
              <Select value={form.role} onValueChange={(v)=>setForm({...form, role: v})}>
                <SelectTrigger className="mt-1.5" data-testid="user-role-select"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLES).map((k) => <SelectItem key={k} value={k}>{ROLES[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-3 pt-2">
              <Switch checked={form.active} onCheckedChange={(v)=>setForm({...form, active: v})} data-testid="user-active-toggle"/>
              <span className="text-sm">Account active</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
            <Button onClick={save} data-testid="save-user-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
