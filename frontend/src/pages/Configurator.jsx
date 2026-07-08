import { useEffect, useMemo, useState, useRef } from "react";
import { api, money } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sparkles, Monitor, Calculator, ArrowRight, Loader2, Trash2, Plus, Undo, Redo, Grid3x3, Cpu } from "lucide-react";

const UNITS = ["mm", "cm", "m", "ft", "in"];
const PITCHES = ["all", "P0.9", "P1.2", "P1.5", "P1.8", "P2", "P2.5", "P2.9", "P3", "P4", "P5", "P6", "P8", "P10"];

const STANDARD_RESOLUTIONS = [
  { key: "custom", label: "Custom (manual)" },
  { key: "hd", label: "HD Ready (1280 × 720)", w: 1280, h: 720 },
  { key: "fhd", label: "Full HD (1920 × 1080)", w: 1920, h: 1080 },
  { key: "2k", label: "2K DCI (2048 × 1080)", w: 2048, h: 1080 },
  { key: "wuxga", label: "WUXGA (1920 × 1200)", w: 1920, h: 1200 },
  { key: "qhd", label: "2.5K QHD (2560 × 1440)", w: 2560, h: 1440 },
  { key: "4k", label: "4K UHD (3840 × 2160)", w: 3840, h: 2160 },
  { key: "4kdci", label: "4K DCI (4096 × 2160)", w: 4096, h: 2160 },
  { key: "5k", label: "5K (5120 × 2880)", w: 5120, h: 2880 },
  { key: "8k", label: "8K UHD (7680 × 4320)", w: 7680, h: 4320 },
];

const DEFAULT_INCLUDE = {
  cabinet: true, controller: true, video_processor: true, mounting_frame: true,
  installation: true, power_signal_cabling: true, packing_transport: true,
  spare_modules: true, mcb: false, ups: false,
};
const INCLUDE_LABELS = {
  cabinet: "Cabinets", controller: "Sending Card / Controller",
  video_processor: "Video Processor (Seamless Switcher)",
  mounting_frame: "Mounting Frame & Structure",
  installation: "Installation & Commissioning",
  power_signal_cabling: "Power & Signal Cabling",
  packing_transport: "Packing & Transportation",
  spare_modules: "Spare Modules", mcb: "MCB Distribution Board", ups: "Online UPS",
};

const CONFIG_STORAGE_KEY = "logic-led:last-config";

function Stat({ label, value, sub, testid }) {
  return (
    <div className="rounded-xl bg-secondary/60 border border-border p-4" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="font-display text-lg font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function LivePreview({ result }) {
  if (!result) return (
    <div className="aspect-video rounded-2xl bg-secondary/40 border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
      <Monitor className="w-12 h-12 mb-3 opacity-50"/>
      <div className="text-sm">Configure your wall to preview</div>
    </div>
  );
  const { wall } = result;
  const cx = wall.cabinets_x, cy = wall.cabinets_y;
  const w = wall.total_width_mm, h = wall.total_height_mm;
  const aspect = w / h;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-border p-8 flex items-center justify-center" data-testid="live-preview">
      <div className="relative shadow-2xl rounded-md overflow-hidden"
        style={{
          width: `min(100%, ${aspect > 1 ? "560px" : `${aspect * 400}px`})`,
          aspectRatio: `${aspect}`,
          background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #0f172a 100%)",
          display: "grid",
          gridTemplateColumns: `repeat(${cx}, 1fr)`,
          gridTemplateRows: `repeat(${cy}, 1fr)`,
        }}>
        {Array.from({ length: cx * cy }).map((_, i) => (
          <div key={i} className="border border-blue-400/30 hover:bg-blue-500/20 transition-colors"/>
        ))}
      </div>
    </div>
  );
}

export default function Configurator() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [controllers, setControllers] = useState([]);

  const [pitch, setPitch] = useState("all");
  const [productId, setProductId] = useState("");
  const [mode, setMode] = useState("dimensions"); // dimensions | matrix | resolution
  const [width, setWidth] = useState(4000);
  const [height, setHeight] = useState(2250);
  const [unit, setUnit] = useState("mm");
  const [matrixX, setMatrixX] = useState(8);
  const [matrixY, setMatrixY] = useState(5);
  const [resolutionKey, setResolutionKey] = useState("fhd");
  const [manualControllerId, setManualControllerId] = useState("auto");
  const [environment, setEnvironment] = useState("indoor"); // indoor | outdoor
  const [include, setInclude] = useState(DEFAULT_INCLUDE);
  const [sparePercent, setSparePercent] = useState(2);
  const [result, setResult] = useState(null);
  const [items, setItems] = useState([]);

  // Undo/redo history
  const historyRef = useRef({ past: [], future: [] });
  const pushHistory = (snapshot) => {
    historyRef.current.past.push(snapshot);
    historyRef.current.future = [];
    if (historyRef.current.past.length > 30) historyRef.current.past.shift();
  };

  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [partnerId, setPartnerId] = useState("none");
  const [salesRepId, setSalesRepId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [gstPct, setGstPct] = useState(18);
  const nav = useNavigate();

  const canOverrideRep = user && (user.role === "super_admin" || user.role === "admin" || user.role === "sales");

  useEffect(() => {
    api.get("/products").then((r) => { setProducts(r.data); if (r.data[0]) setProductId(r.data[0].id); });
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/partners").then((r) => setPartners(r.data));
    api.get("/controllers").then((r) => setControllers(r.data));
    api.get("/auth/users").then((r) => {
      const reps = r.data.filter((u) => ["sales", "admin", "super_admin", "dealer", "presales"].includes(u.role));
      setSalesReps(reps);
      if (user) setSalesRepId(user.id);
    }).catch(() => {});
  }, [user]);

  const filteredProducts = useMemo(() => {
    if (pitch === "all") return products;
    return products.filter((p) => p.pixel_pitch === pitch);
  }, [products, pitch]);

  const currentProduct = products.find((p) => p.id === productId);

  // When user picks model, auto-select the pitch
  useEffect(() => {
    if (currentProduct && pitch !== "all" && currentProduct.pixel_pitch !== pitch) {
      setPitch(currentProduct.pixel_pitch);
    }
  }, [productId]); // eslint-disable-line

  // Compute width/height based on mode
  const effectiveDims = useMemo(() => {
    if (!currentProduct) return { width: +width, height: +height, unit };
    if (mode === "matrix") {
      return { width: matrixX * currentProduct.cabinet_width_mm, height: matrixY * currentProduct.cabinet_height_mm, unit: "mm" };
    }
    if (mode === "resolution") {
      const preset = STANDARD_RESOLUTIONS.find((r) => r.key === resolutionKey);
      if (preset && preset.w) {
        // Compute pitch mm from product pixel pitch label
        const pitchMm = parseFloat(currentProduct.pixel_pitch.replace("P", ""));
        return {
          width: Math.round(preset.w * pitchMm),
          height: Math.round(preset.h * pitchMm),
          unit: "mm",
        };
      }
    }
    return { width: +width, height: +height, unit };
  }, [mode, width, height, unit, matrixX, matrixY, resolutionKey, currentProduct]);

  const compute = async () => {
    if (!productId) return;
    setComputing(true);
    try {
      const { data } = await api.post("/configure", {
        product_id: productId,
        width: effectiveDims.width, height: effectiveDims.height, unit: effectiveDims.unit,
        include, spare_percent: +sparePercent,
      });
      setResult(data);
      setItems(data.items);
      setGstPct(data.gst_percent);
      historyRef.current = { past: [], future: [] };
    } catch { toast.error("Failed to compute"); }
    finally { setComputing(false); }
  };

  useEffect(() => { if (productId) compute(); /* eslint-disable-next-line */ }, [productId, include, sparePercent, mode, matrixX, matrixY, resolutionKey, width, height, unit]);

  // Auto-plan controller when we have result (unless manual)
  const [autoController, setAutoController] = useState(null);
  useEffect(() => {
    if (!result) return;
    if (manualControllerId === "auto") {
      api.post("/controllers/plan", { total_pixels: result.wall.total_pixels }).then((r) => setAutoController(r.data));
    }
  }, [result, manualControllerId]);

  const selectedController = manualControllerId === "auto"
    ? autoController?.recommended
    : controllers.find((c) => c.id === manualControllerId);

  // Save config state to localStorage for Engineering pages
  useEffect(() => {
    if (!result || !currentProduct) return;
    const state = {
      product: currentProduct,
      wall: result.wall,
      dims: { width_mm: result.width_mm, height_mm: result.height_mm },
      controller: selectedController,
      environment,
      updated_at: new Date().toISOString(),
    };
    try { localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [result, currentProduct, selectedController, environment]);

  const subtotal = items.reduce((s, it) => s + (+it.total || 0), 0);
  const gstAmount = Math.round(subtotal * gstPct / 100 * 100) / 100;
  const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;

  const updateItem = (idx, field, val) => {
    pushHistory([...items]);
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      if (field === "qty" || field === "unit_price") {
        const q = +copy[idx].qty || 0;
        const p = +copy[idx].unit_price || 0;
        copy[idx].total = Math.round(q * p * 100) / 100;
      }
      return copy;
    });
  };
  const removeItem = (idx) => { pushHistory([...items]); setItems((prev) => prev.filter((_, i) => i !== idx)); };
  const addCustomItem = () => { pushHistory([...items]); setItems((p) => [...p, { key: "custom", description: "Custom Item", qty: 1, unit: "Nos", unit_price: 0, total: 0 }]); };
  const undo = () => {
    const past = historyRef.current.past;
    if (!past.length) return;
    historyRef.current.future.unshift([...items]);
    setItems(past.pop());
    toast.success("Undone");
  };
  const redo = () => {
    const fut = historyRef.current.future;
    if (!fut.length) return;
    historyRef.current.past.push([...items]);
    setItems(fut.shift());
    toast.success("Redone");
  };

  // Include controller line item in BOQ if not "auto"
  useEffect(() => {
    if (!selectedController) return;
    setItems((prev) => {
      const others = prev.filter((it) => it.key !== "novastar_controller");
      const row = {
        key: "novastar_controller",
        description: `Novastar ${selectedController.model} (${selectedController.class || ""})`,
        qty: (autoController?.quantity) || 1, unit: "Nos",
        unit_price: selectedController.price || 0,
        total: (selectedController.price || 0) * ((autoController?.quantity) || 1),
      };
      // Replace the generic "Sending Card / Controller" line
      const withoutGeneric = others.filter((it) => it.key !== "controller");
      return [...withoutGeneric, row];
    });
    // eslint-disable-next-line
  }, [selectedController]);

  const saveQuote = async () => {
    if (!result || !customerId || !projectName) {
      toast.error("Select customer and enter project name"); return;
    }
    setSaving(true);
    try {
      const cfg = { product_id: result.product.id, width_mm: result.width_mm, height_mm: result.height_mm, ...result.wall };
      const body = {
        customer_id: customerId,
        partner_id: partnerId === "none" ? null : partnerId,
        project_name: projectName,
        sales_person_id_override: canOverrideRep ? salesRepId : null,
        config: cfg,
        items: items.map(({ key, description, qty, unit, unit_price, total }) => ({ key, description, qty: +qty, unit, unit_price: +unit_price, total: +total })),
        subtotal, gst_percent: gstPct, gst_amount: gstAmount, grand_total: grandTotal,
        validity_days: 30,
        controller_data: selectedController || null,
      };
      const { data } = await api.post("/quotes", body);
      toast.success(`Quote ${data.quote_number} created`);
      nav(`/quotes/${data.id}`);
    } catch { toast.error("Failed to create quote"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8" data-testid="configurator-page">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
            <Monitor className="w-3 h-3"/> Videowall Configurator
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Design your LED wall</h1>
          <p className="text-sm text-muted-foreground mt-1">Pixel-pitch, standard resolution, manual matrix or dimensions — three ways in.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6 space-y-5 rounded-2xl border-border xl:col-span-1">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Pixel Pitch</Label>
            <Select value={pitch} onValueChange={setPitch}>
              <SelectTrigger className="mt-1.5" data-testid="pitch-select"><SelectValue/></SelectTrigger>
              <SelectContent>
                {PITCHES.map((p) => <SelectItem key={p} value={p}>{p === "all" ? "All Pitches" : p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Product Model</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="mt-1.5" data-testid="product-select"><SelectValue/></SelectTrigger>
              <SelectContent>
                {filteredProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {p.pixel_pitch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Environment</Label>
            <div className="flex gap-1 mt-1.5 p-1 bg-secondary rounded-lg">
              {["indoor", "outdoor"].map((e) => (
                <button key={e} onClick={()=>setEnvironment(e)}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md ${environment===e ? "bg-card shadow-sm font-semibold" : "text-muted-foreground"}`}
                        data-testid={`env-${e}-btn`}>
                  {e.charAt(0).toUpperCase() + e.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Input Mode</Label>
            <div className="flex gap-1 mt-1.5 p-1 bg-secondary rounded-lg">
              {[
                { k: "dimensions", l: "Dimensions" },
                { k: "matrix", l: "Matrix", Icon: Grid3x3 },
                { k: "resolution", l: "Resolution" },
              ].map(({ k, l }) => (
                <button key={k} onClick={()=>setMode(k)} data-testid={`mode-${k}-btn`}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md ${mode===k ? "bg-card shadow-sm font-semibold" : "text-muted-foreground"}`}>{l}</button>
              ))}
            </div>
          </div>

          {mode === "dimensions" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Width</Label><Input type="number" value={width} onChange={(e)=>setWidth(e.target.value)} data-testid="width-input" className="mt-1.5"/></div>
                <div><Label className="text-xs">Height</Label><Input type="number" value={height} onChange={(e)=>setHeight(e.target.value)} data-testid="height-input" className="mt-1.5"/></div>
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <div className="flex gap-1 mt-1.5 p-1 bg-secondary rounded-lg">
                  {UNITS.map((u) => (
                    <button key={u} onClick={()=>setUnit(u)} data-testid={`unit-${u}-btn`}
                            className={`flex-1 px-2 py-1.5 text-xs rounded-md ${unit===u ? "bg-card shadow-sm font-semibold" : "text-muted-foreground"}`}>{u}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          {mode === "matrix" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Cabinets X</Label><Input type="number" value={matrixX} onChange={(e)=>setMatrixX(+e.target.value)} className="mt-1.5" data-testid="matrix-x-input"/></div>
              <div><Label className="text-xs">Cabinets Y</Label><Input type="number" value={matrixY} onChange={(e)=>setMatrixY(+e.target.value)} className="mt-1.5" data-testid="matrix-y-input"/></div>
              {currentProduct && (
                <div className="col-span-2 text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2">
                  → Wall: {(matrixX * currentProduct.cabinet_width_mm / 1000).toFixed(2)}m × {(matrixY * currentProduct.cabinet_height_mm / 1000).toFixed(2)}m
                </div>
              )}
            </div>
          )}
          {mode === "resolution" && (
            <div>
              <Label className="text-xs">Standard Resolution</Label>
              <Select value={resolutionKey} onValueChange={setResolutionKey}>
                <SelectTrigger className="mt-1.5" data-testid="resolution-select"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {STANDARD_RESOLUTIONS.filter((r) => r.w).map((r) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentProduct && (
                <div className="mt-2 text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2">
                  Target: {STANDARD_RESOLUTIONS.find((r)=>r.key===resolutionKey)?.w} × {STANDARD_RESOLUTIONS.find((r)=>r.key===resolutionKey)?.h} px
                  <br/>Approx wall: {(effectiveDims.width/1000).toFixed(2)}m × {(effectiveDims.height/1000).toFixed(2)}m
                </div>
              )}
            </div>
          )}

          <Button onClick={compute} disabled={computing} className="w-full h-11" data-testid="compute-btn">
            {computing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Calculator className="w-4 h-4 mr-2"/>}
            Recalculate
          </Button>

          {/* Controller selection */}
          <div className="pt-4 border-t border-border">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Cpu className="w-3 h-3"/> Controller
            </div>
            <Select value={manualControllerId} onValueChange={setManualControllerId}>
              <SelectTrigger data-testid="controller-select"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-select (recommended)</SelectItem>
                {controllers.map((c) => <SelectItem key={c.id} value={c.id}>{c.model} — {c.class}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedController && (
              <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 p-2 text-xs">
                <div className="font-semibold">{selectedController.model}</div>
                <div className="text-muted-foreground">Max {(selectedController.max_pixels/1e6).toFixed(1)}M px · {selectedController.output_ports} ports</div>
              </div>
            )}
          </div>

          {/* Include toggles */}
          <div className="pt-4 border-t border-border">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Include in BOQ</div>
            <div className="space-y-2">
              {Object.keys(INCLUDE_LABELS).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary">
                  <Checkbox checked={!!include[k]} onCheckedChange={(v)=>setInclude((prev)=>({...prev, [k]: !!v}))} data-testid={`include-${k}`}/>
                  <span>{INCLUDE_LABELS[k]}</span>
                </label>
              ))}
            </div>
            {include.spare_modules && (
              <div className="mt-3">
                <Label className="text-xs">Spare %</Label>
                <Input type="number" step="0.1" value={sparePercent} onChange={(e)=>setSparePercent(e.target.value)} className="mt-1.5 h-9" data-testid="spare-percent-input"/>
              </div>
            )}
          </div>
        </Card>

        <div className="xl:col-span-2 space-y-6">
          <LivePreview result={result}/>
          {result && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Cabinets" value={`${result.wall.cabinets_x}×${result.wall.cabinets_y}`} sub={`${result.wall.total_cabinets} total`} testid="stat-cabinets"/>
              <Stat label="Resolution" value={`${result.wall.resolution_w}×${result.wall.resolution_h}`} sub={`${(result.wall.total_pixels/1e6).toFixed(2)} MP`} testid="stat-res"/>
              <Stat label="Display" value={`${result.wall.diagonal_inch}"`} sub={result.wall.aspect_ratio} testid="stat-diag"/>
              <Stat label="LED Area" value={`${result.wall.led_area_sqm} m²`} sub={`${result.wall.weight_kg} kg`} testid="stat-area"/>
              <Stat label="Max Power" value={`${result.wall.power_max_kw} kW`} sub={`${result.wall.power_typical_kw} kW typ`} testid="stat-power"/>
              <Stat label="Weight" value={`${result.wall.weight_kg} kg`}/>
              <Stat label="Dimensions" value={`${(result.wall.total_width_mm/1000).toFixed(2)}×${(result.wall.total_height_mm/1000).toFixed(2)}m`}/>
              <Stat label="Total Pixels" value={result.wall.total_pixels.toLocaleString()}/>
            </div>
          )}
        </div>
      </div>

      {/* Editable BOQ */}
      {result && (
        <Card className="p-6 rounded-2xl border-border">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Editable</div>
              <h2 className="font-display font-bold text-xl">Bill of Materials & Commercial</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={undo} data-testid="undo-btn"><Undo className="w-4 h-4"/></Button>
              <Button variant="outline" size="sm" onClick={redo} data-testid="redo-btn"><Redo className="w-4 h-4"/></Button>
              <div className="text-right ml-4">
                <div className="text-xs text-muted-foreground">Grand Total (incl. GST)</div>
                <div className="font-display text-2xl font-bold text-primary" data-testid="grand-total-display">{money(grandTotal)}</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 text-left font-medium">Description</th>
                  <th className="py-2 text-right font-medium w-24">Qty</th>
                  <th className="py-2 text-left font-medium w-20">Unit</th>
                  <th className="py-2 text-right font-medium w-32">Rate</th>
                  <th className="py-2 text-right font-medium w-32">Amount</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody data-testid="boq-table">
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-1.5"><Input value={it.description} onChange={(e)=>updateItem(i, "description", e.target.value)} className="h-9 border-0 bg-transparent focus-visible:bg-secondary" data-testid={`item-desc-${i}`}/></td>
                    <td className="py-1.5"><Input type="number" step="any" value={it.qty} onChange={(e)=>updateItem(i, "qty", +e.target.value)} className="h-9 border-0 bg-transparent text-right focus-visible:bg-secondary font-mono" data-testid={`item-qty-${i}`}/></td>
                    <td className="py-1.5"><Input value={it.unit} onChange={(e)=>updateItem(i, "unit", e.target.value)} className="h-9 border-0 bg-transparent focus-visible:bg-secondary text-xs w-16"/></td>
                    <td className="py-1.5"><Input type="number" step="any" value={it.unit_price} onChange={(e)=>updateItem(i, "unit_price", +e.target.value)} className="h-9 border-0 bg-transparent text-right focus-visible:bg-secondary font-mono" data-testid={`item-price-${i}`}/></td>
                    <td className="py-1.5 text-right font-mono font-semibold">{money(it.total)}</td>
                    <td className="py-1.5"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={()=>removeItem(i)} data-testid={`item-remove-${i}`}><Trash2 className="w-3.5 h-3.5"/></Button></td>
                  </tr>
                ))}
                <tr><td colSpan={6} className="py-2"><Button variant="ghost" size="sm" onClick={addCustomItem} data-testid="add-item-btn"><Plus className="w-3.5 h-3.5 mr-1"/>Add custom item</Button></td></tr>
                <tr><td colSpan={4} className="py-2 text-right text-xs uppercase text-muted-foreground">Subtotal</td><td className="py-2 text-right font-mono font-semibold" data-testid="subtotal-display">{money(subtotal)}</td><td></td></tr>
                <tr><td colSpan={3}></td><td className="py-2 text-right text-xs uppercase text-muted-foreground">GST %</td><td className="py-2"><Input type="number" step="0.1" value={gstPct} onChange={(e)=>setGstPct(+e.target.value)} className="h-9 border-0 bg-transparent text-right focus-visible:bg-secondary font-mono" data-testid="gst-percent-input"/></td><td></td></tr>
                <tr><td colSpan={4} className="py-2 text-right text-xs uppercase text-muted-foreground">GST Amount</td><td className="py-2 text-right font-mono">{money(gstAmount)}</td><td></td></tr>
                <tr className="border-t-2 border-border"><td colSpan={4} className="py-3 text-right font-semibold uppercase text-xs tracking-widest">Grand Total</td><td className="py-3 text-right font-display font-bold text-lg text-primary">{money(grandTotal)}</td><td></td></tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="mt-1.5" data-testid="quote-customer-select"><SelectValue placeholder="Select customer"/></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Partner</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="mt-1.5" data-testid="quote-partner-select"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Direct (no partner)</SelectItem>
                  {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Sales Rep</Label>
              <Select value={salesRepId} onValueChange={setSalesRepId} disabled={!canOverrideRep}>
                <SelectTrigger className="mt-1.5" data-testid="quote-rep-select"><SelectValue/></SelectTrigger>
                <SelectContent>{salesReps.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Project</Label>
              <Input value={projectName} onChange={(e)=>setProjectName(e.target.value)} placeholder="Boardroom Videowall" className="mt-1.5" data-testid="project-name-input"/>
            </div>
          </div>

          <Button onClick={saveQuote} disabled={saving} className="w-full h-11 mt-6" data-testid="save-quote-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2"/>}
            Generate Quotation <ArrowRight className="w-4 h-4 ml-2"/>
          </Button>
        </Card>
      )}
    </div>
  );
}
