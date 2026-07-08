import { useCallback, useEffect, useState } from "react";
import { api, money } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Zap, Cable, Wrench, Loader2, ArrowDown, ArrowRight, Info, Building2, Hammer, Anchor } from "lucide-react";

const CONFIG_STORAGE_KEY = "logic-led:last-config";

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "null"); }
  catch { return null; }
}

function Stat({ label, value, sub, testid, exportKey, includeInReport, toggle }) {
  return (
    <div className="rounded-xl bg-secondary/60 border border-border p-3 relative" data-testid={testid}>
      {exportKey !== undefined && (
        <button
          onClick={()=>toggle(exportKey)}
          className={`absolute top-2 right-2 w-4 h-4 rounded border ${includeInReport ? "bg-primary border-primary" : "border-border bg-transparent"}`}
          title="Include in PDF report"
          data-testid={`export-toggle-${exportKey}`}
        >
          {includeInReport && <span className="text-white text-[10px] leading-4 block">✓</span>}
        </button>
      )}
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-base font-bold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Engineering() {
  const [tab, setTab] = useState("power");
  const [config, setConfig] = useState(loadConfig());

  // Refresh config on interval
  useEffect(() => {
    const iv = setInterval(() => setConfig(loadConfig()), 2000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="space-y-8" data-testid="engineering-page">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
          <Wrench className="w-3 h-3"/> Engineering Suite
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Power • Network • Structural</h1>
        {config ? (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-1">
              <Info className="w-3 h-3"/> Auto-loaded from configurator: {config.product?.name} · {config.wall?.cabinets_x}×{config.wall?.cabinets_y} · {config.wall?.power_max_kw} kW
            </span>
          </div>
        ) : (
          <div className="mt-2 text-xs text-muted-foreground">Configure a wall first in the Configurator to auto-load values here.</div>
        )}
      </header>

      <div className="flex gap-2 p-1 bg-secondary rounded-lg w-fit">
        {[
          { k: "power", l: "Power", Icon: Zap },
          { k: "network", l: "Network", Icon: Cable },
          { k: "structural", l: "Structural", Icon: Wrench },
        ].map(({ k, l, Icon }) => (
          <button key={k} onClick={()=>setTab(k)} data-testid={`tab-${k}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm ${tab===k ? "bg-card shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-4 h-4"/> {l}
          </button>
        ))}
      </div>

      {tab === "power" && <PowerPanel config={config}/>}
      {tab === "network" && <NetworkPanel config={config}/>}
      {tab === "structural" && <StructuralPanel config={config}/>}
    </div>
  );
}

function PowerPanel({ config }) {
  const configWall = config?.wall;
  const [form, setForm] = useState({
    power_max_kw: configWall?.power_max_kw ?? 15,
    power_typical_kw: configWall?.power_typical_kw ?? 6,
    voltage: 230, phase: "single",
    daily_hours: 10, tariff_inr_kwh: 8.5, days_per_month: 30,
  });
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [include, setInclude] = useState({
    current: true, mcb: true, rccb: true, cable: true, vdrop: false,
    sockets: true, earthing: false, ups: true, generator: false,
    monthly: true, annual: true,
  });
  const toggle = (k) => setInclude((s) => ({ ...s, [k]: !s[k] }));

  useEffect(() => {
    if (configWall) {
      setForm((f) => ({
        ...f,
        power_max_kw: configWall.power_max_kw,
        power_typical_kw: configWall.power_typical_kw,
      }));
    }
  }, [configWall]);

  const run = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.post("/engineering/power", form); setRes(data); }
    catch { toast.error("Failed"); }
    setLoading(false);
  }, [form]);

  useEffect(() => { run(); }, [run]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="power-panel">
      <Card className="p-6 rounded-2xl border-border space-y-4 lg:col-span-1">
        <div className="font-display font-semibold text-lg">Inputs (editable)</div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Max Power (kW)</Label><Input type="number" step="0.1" value={form.power_max_kw} onChange={(e)=>setForm({...form, power_max_kw: +e.target.value})} className="mt-1.5" data-testid="power-max-input"/></div>
          <div><Label className="text-xs">Typical (kW)</Label><Input type="number" step="0.1" value={form.power_typical_kw} onChange={(e)=>setForm({...form, power_typical_kw: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Phase</Label>
            <Select value={form.phase} onValueChange={(v)=>setForm({...form, phase: v})}>
              <SelectTrigger className="mt-1.5" data-testid="power-phase-select"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="three">Three</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Voltage</Label>
            <Select value={String(form.voltage)} onValueChange={(v)=>setForm({...form, voltage: +v})} disabled={form.phase==="three"}>
              <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="230">230V</SelectItem><SelectItem value="110">110V</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Daily hours</Label><Input type="number" value={form.daily_hours} onChange={(e)=>setForm({...form, daily_hours: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Tariff ₹/kWh</Label><Input type="number" step="0.1" value={form.tariff_inr_kwh} onChange={(e)=>setForm({...form, tariff_inr_kwh: +e.target.value})} className="mt-1.5"/></div>
        </div>
        <Button onClick={run} className="w-full h-11" data-testid="power-calc-btn">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Zap className="w-4 h-4 mr-2"/>}Recalculate
        </Button>
        <div className="text-[11px] text-muted-foreground">Tick each result to include it in the PDF report.</div>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        {res ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Current (max)" value={`${res.current_max_a} A`} sub={`PF ${res.power_factor}`} exportKey="current" includeInReport={include.current} toggle={toggle}/>
              <Stat label="MCB (IS 60898)" value={res.mcb_combo} sub="6/10/16/20/32 A" exportKey="mcb" includeInReport={include.mcb} toggle={toggle}/>
              <Stat label="RCCB" value={`${res.rccb_rating_a} A`} sub={`${res.rccb_sensitivity_ma}mA`} exportKey="rccb" includeInReport={include.rccb} toggle={toggle}/>
              <Stat label="Cable" value={`${res.cable_size_sqmm} sq.mm`} exportKey="cable" includeInReport={include.cable} toggle={toggle}/>
              <Stat label="V-drop" value={`${res.voltage_drop_percent}%`} sub={`${res.voltage_drop_v} V`} exportKey="vdrop" includeInReport={include.vdrop} toggle={toggle}/>
              <Stat label="Sockets" value={`${res.socket_count}× ${res.socket_amp}A`} sub={res.socket_type} exportKey="sockets" includeInReport={include.sockets} toggle={toggle}/>
              <Stat label="Earth Pits" value={res.earth_pits} sub="TN-S" exportKey="earthing" includeInReport={include.earthing} toggle={toggle}/>
              <Stat label="UPS" value={`${res.ups_kva} kVA`} sub={`${res.ups_backup_min} min · ${money(res.ups_price_inr)}`} exportKey="ups" includeInReport={include.ups} toggle={toggle}/>
              <Stat label="Generator" value={`${res.generator_kva} kVA`} sub="Silent DG" exportKey="generator" includeInReport={include.generator} toggle={toggle}/>
              <Stat label="Monthly kWh" value={`${res.monthly_kwh}`} sub={`${res.daily_hours}h/day`} exportKey="monthly" includeInReport={include.monthly} toggle={toggle}/>
            </div>
            <Card className="p-6 rounded-2xl border-border bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/40 dark:to-blue-950/40">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-2">Running cost</div>
                  <div className="font-display text-3xl font-bold">{money(res.monthly_cost_inr)}<span className="text-sm text-muted-foreground"> /month</span></div>
                  <div className="text-sm text-muted-foreground mt-1">{res.monthly_kwh} kWh × ₹{res.tariff_inr_kwh}/kWh</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase text-muted-foreground">Annual</div>
                  <div className="font-display text-2xl font-bold">{money(res.annual_cost_inr)}</div>
                </div>
              </div>
            </Card>
            <Card className="p-5 rounded-2xl border-border">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Design notes</div>
              <ul className="text-sm space-y-1 list-disc pl-5">{res.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </Card>
          </>
        ) : (
          <Card className="p-12 rounded-2xl border-border text-center text-muted-foreground">Loading…</Card>
        )}
      </div>
    </div>
  );
}

function NetworkPanel({ config }) {
  const w = config?.wall || {};
  const controller = config?.controller || {};
  const [form, setForm] = useState({
    cabinets_x: w.cabinets_x || 8, cabinets_y: w.cabinets_y || 5,
    total_pixels: w.total_pixels || 4000000,
    controller_ports: controller.output_ports || 16,
    pixels_per_port: controller.pixels_per_port || 650000,
    run_length_m: 30,
    environment: config?.environment || "indoor",
    pixels_per_cabinet: w.total_pixels && w.total_cabinets ? Math.round(w.total_pixels / w.total_cabinets) : 100000,
  });
  const [res, setRes] = useState(null);
  const [include, setInclude] = useState({ home_runs: true, cable: true, patch: true, switch_: true, ports: true });
  const toggle = (k) => setInclude((s) => ({ ...s, [k]: !s[k] }));

  useEffect(() => {
    if (config?.wall) {
      setForm((f) => ({
        ...f,
        cabinets_x: config.wall.cabinets_x, cabinets_y: config.wall.cabinets_y,
        total_pixels: config.wall.total_pixels,
        pixels_per_cabinet: Math.round(config.wall.total_pixels / config.wall.total_cabinets),
        environment: config.environment || f.environment,
      }));
    }
    if (config?.controller) {
      setForm((f) => ({ ...f, controller_ports: config.controller.output_ports, pixels_per_port: config.controller.pixels_per_port }));
    }
  }, [config]);

  const run = useCallback(async () => {
    try { const { data } = await api.post("/engineering/network", form); setRes(data); }
    catch { toast.error("Failed"); }
  }, [form]);
  useEffect(() => { run(); }, [run]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="network-panel">
      <Card className="p-6 rounded-2xl border-border space-y-4 lg:col-span-1">
        <div className="font-display font-semibold text-lg">Inputs (editable)</div>
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Matrix</span><span className="font-mono font-semibold">{form.cabinets_x} × {form.cabinets_y}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Resolution</span><span className="font-mono font-semibold">{w.resolution_w || "-"} × {w.resolution_h || "-"} px</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Pixels</span><span className="font-mono font-semibold">{Number(form.total_pixels).toLocaleString()}</span></div>
        </div>
        <div>
          <Label className="text-xs">Environment</Label>
          <div className="flex gap-1 mt-1.5 p-1 bg-secondary rounded-lg">
            {["indoor", "outdoor"].map((e) => (
              <button key={e} onClick={()=>setForm({...form, environment: e})}
                      className={`flex-1 px-2 py-1.5 text-xs rounded-md ${form.environment===e ? "bg-card shadow-sm font-semibold" : "text-muted-foreground"}`}
                      data-testid={`net-env-${e}`}>
                {e === "indoor" ? "↕ Indoor (vertical)" : "↔ Outdoor (horizontal)"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Cabinets X</Label><Input type="number" value={form.cabinets_x} onChange={(e)=>setForm({...form, cabinets_x: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Cabinets Y</Label><Input type="number" value={form.cabinets_y} onChange={(e)=>setForm({...form, cabinets_y: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Controller Ports</Label><Input type="number" value={form.controller_ports} onChange={(e)=>setForm({...form, controller_ports: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Pixels / Port</Label><Input type="number" value={form.pixels_per_port} onChange={(e)=>setForm({...form, pixels_per_port: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Pixels / Cabinet</Label><Input type="number" value={form.pixels_per_cabinet} onChange={(e)=>setForm({...form, pixels_per_cabinet: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Run Length (m)</Label><Input type="number" value={form.run_length_m} onChange={(e)=>setForm({...form, run_length_m: +e.target.value})} className="mt-1.5"/></div>
        </div>
        <Button onClick={run} className="w-full h-11" data-testid="network-calc-btn"><Cable className="w-4 h-4 mr-2"/>Recalculate</Button>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        {res && (
          <>
            <Card className="p-5 rounded-2xl border-primary/30 bg-primary/5">
              <div className="text-xs uppercase tracking-widest text-primary mb-2">Looping Strategy · {res.looping_strategy}</div>
              <div className="text-sm">{res.split_note}</div>
              <div className="text-xs text-muted-foreground mt-1">{res.port_note}</div>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Home Runs" value={res.home_runs} exportKey="home_runs" includeInReport={include.home_runs} toggle={toggle}/>
              <Stat label="Cable Type" value={res.cable_type} exportKey="cable" includeInReport={include.cable} toggle={toggle}/>
              <Stat label="Cable Length" value={`${res.cable_length_m} m`} sub="+15% spare"/>
              <Stat label="Patch Cords" value={res.patch_cords} exportKey="patch" includeInReport={include.patch} toggle={toggle}/>
              <Stat label="RJ45" value={res.rj45_connectors}/>
              <Stat label="Switch Ports" value={res.network_switch_ports} exportKey="switch_" includeInReport={include.switch_} toggle={toggle}/>
              <Stat label="Fiber Pairs" value={res.fiber_converter_pairs}/>
              <Stat label="Ports Free" value={res.controller_ports_free} exportKey="ports" includeInReport={include.ports} toggle={toggle}/>
            </div>
            <Card className="p-5 rounded-2xl border-border">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Signal flow</div>
              <ol className="text-sm space-y-2 list-decimal pl-5">{res.signal_flow.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StructuralPanel({ config }) {
  const w = config?.wall || {};
  const [form, setForm] = useState({
    total_weight_kg: w.weight_kg || 320,
    wall_w_mm: w.total_width_mm || 4000,
    wall_h_mm: w.total_height_mm || 2250,
    total_cabinets: w.total_cabinets || 40,
    mount_type: "wall_mount",
  });
  const [res, setRes] = useState(null);
  const [include, setInclude] = useState({ load: true, bolts: true, clearance: true, recommendation: true });
  const toggle = (k) => setInclude((s) => ({ ...s, [k]: !s[k] }));

  useEffect(() => {
    if (config?.wall) {
      setForm((f) => ({
        ...f,
        total_weight_kg: config.wall.weight_kg,
        wall_w_mm: config.wall.total_width_mm,
        wall_h_mm: config.wall.total_height_mm,
        total_cabinets: config.wall.total_cabinets,
      }));
    }
  }, [config]);

  const run = useCallback(async () => {
    try { const { data } = await api.post("/engineering/structural", form); setRes(data); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  }, [form]);
  useEffect(() => { run(); }, [run]);

  const MOUNTS = [
    { key: "wall_mount", label: "Wall Mount", Icon: Building2,
      desc: "MS frame anchored directly to a load-bearing wall. Ideal for indoor boardrooms, retail, control rooms." },
    { key: "hanging", label: "Suspended", Icon: ArrowDown,
      desc: "Rigged from ceiling truss / structural beam. Great for auditoriums, atriums, hanging signage." },
    { key: "floor_stand", label: "Floor Stand", Icon: Hammer,
      desc: "Free-standing MS structure with base plate + counterweight. For heavy walls or where wall load is limited." },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="structural-panel">
      <Card className="p-6 rounded-2xl border-border space-y-4 lg:col-span-1">
        <div className="font-display font-semibold text-lg">Inputs</div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Weight (kg)</Label><Input type="number" value={form.total_weight_kg} onChange={(e)=>setForm({...form, total_weight_kg: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Cabinets</Label><Input type="number" value={form.total_cabinets} onChange={(e)=>setForm({...form, total_cabinets: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Wall W (mm)</Label><Input type="number" value={form.wall_w_mm} onChange={(e)=>setForm({...form, wall_w_mm: +e.target.value})} className="mt-1.5"/></div>
          <div><Label className="text-xs">Wall H (mm)</Label><Input type="number" value={form.wall_h_mm} onChange={(e)=>setForm({...form, wall_h_mm: +e.target.value})} className="mt-1.5"/></div>
        </div>
        <div>
          <Label className="text-xs">Mount type</Label>
          <div className="grid grid-cols-1 gap-2 mt-1.5">
            {MOUNTS.map(({ key, label, Icon, desc }) => (
              <button key={key} onClick={()=>setForm({...form, mount_type: key})} data-testid={`mount-${key}-btn`}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        form.mount_type === key ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                      }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-primary"/>
                  <span className="font-semibold text-sm">{label}</span>
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">{desc}</div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        {res ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Total Load" value={`${res.total_load_kg} kg`} sub={`+${res.frame_weight_kg} kg frame`} exportKey="load" includeInReport={include.load} toggle={toggle}/>
              <Stat label="Load / sqm" value={`${res.load_per_sqm} kg/m²`}/>
              <Stat label="Anchor Bolts" value={res.anchor_bolt_count} sub="M12 SS" exportKey="bolts" includeInReport={include.bolts} toggle={toggle}/>
              <Stat label="Design Load / Bolt" value={`${res.design_load_per_bolt_kg} kg`} sub="SF 4"/>
              <Stat label="Front Clearance" value={`${res.maintenance_space_front_mm} mm`} exportKey="clearance" includeInReport={include.clearance} toggle={toggle}/>
              <Stat label="Rear Clearance" value={`${res.maintenance_space_rear_mm} mm`}/>
              <Stat label="Service Clearance" value={`${res.service_clearance_mm} mm`}/>
              <Stat label="Wall Area" value={`${res.wall_area_sqm} m²`}/>
            </div>
            <Card className="p-6 rounded-2xl border-primary/30 bg-primary/5" data-testid="structural-recommendation">
              <div className="text-xs uppercase tracking-widest text-primary mb-1 flex items-center gap-2">
                <Anchor className="w-3.5 h-3.5"/> Recommended structure
              </div>
              <div className="font-display text-lg font-bold">{res.recommended_structure}</div>
              <div className="text-sm text-muted-foreground mt-1">Suggested mount: {res.recommended_mount_type}</div>
              <div className="text-xs text-muted-foreground mt-2">Anchor: {res.anchor_bolt_spec}</div>
            </Card>
            <Card className="p-5 rounded-2xl border-border">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Design notes</div>
              <ul className="text-sm space-y-1 list-disc pl-5">{res.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </Card>
          </>
        ) : (
          <Card className="p-12 rounded-2xl border-border text-center text-muted-foreground">Enter values or configure a wall to see structural analysis.</Card>
        )}
      </div>
    </div>
  );
}
