import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, ImageIcon, FileText, Loader2, Download } from "lucide-react";

export function AiRender() {
  const [scenes, setScenes] = useState([]);
  const [scene, setScene] = useState("meeting_room");
  const [w, setW] = useState(4);
  const [h, setH] = useState(2.25);
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [render, setRender] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);

  useEffect(() => { api.get("/ai/render/scenes").then((r) => setScenes(r.data)); }, []);
  useEffect(() => {
    if (!render?.url) return;
    api.get(render.url.replace("/api", ""), { responseType: "blob" }).then((r) => {
      const u = URL.createObjectURL(r.data);
      setImageBlob(u);
    });
    return () => imageBlob && URL.revokeObjectURL(imageBlob);
    // eslint-disable-next-line
  }, [render]);

  const run = async () => {
    setLoading(true); setRender(null); setImageBlob(null);
    try {
      const { data } = await api.post("/ai/render", {
        scene, wall_width_m: +w, wall_height_m: +h, extra_prompt: extra,
      });
      if (data.data_url) {
        setImageBlob(data.data_url);
        setRender(data);
      } else {
        setRender(data);
      }
      toast.success("Render generated");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Render failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6" data-testid="ai-render-page">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
          <ImageIcon className="w-3 h-3"/> Nano Banana
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">AI Room Renders</h1>
        <p className="text-sm text-muted-foreground mt-1">Photorealistic mockups of your LED wall in real environments.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 rounded-2xl border-border space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Scene</Label>
            <Select value={scene} onValueChange={setScene}>
              <SelectTrigger className="mt-1.5" data-testid="scene-select"><SelectValue/></SelectTrigger>
              <SelectContent>
                {scenes.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Wall Width (m)</Label><Input type="number" step="0.1" value={w} onChange={(e)=>setW(e.target.value)} className="mt-1.5"/></div>
            <div><Label className="text-xs">Wall Height (m)</Label><Input type="number" step="0.1" value={h} onChange={(e)=>setH(e.target.value)} className="mt-1.5"/></div>
          </div>
          <div>
            <Label className="text-xs">Extra style hints (optional)</Label>
            <Textarea value={extra} onChange={(e)=>setExtra(e.target.value)} className="mt-1.5" placeholder="e.g. warm sunset lighting, gold accent branding"/>
          </div>
          <Button onClick={run} disabled={loading} className="w-full h-11" data-testid="render-btn">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2"/>}
            Generate render
          </Button>
        </Card>

        <div className="lg:col-span-2">
          {loading && (
            <Card className="aspect-video rounded-2xl border-border flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary"/>
                <div className="text-sm text-muted-foreground">Painting your videowall into the scene…</div>
              </div>
            </Card>
          )}
          {!loading && !imageBlob && (
            <Card className="aspect-video rounded-2xl border-border border-dashed flex items-center justify-center text-muted-foreground">
              <div className="text-center"><ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50"/>Render preview appears here</div>
            </Card>
          )}
          {imageBlob && (
            <Card className="rounded-2xl border-border overflow-hidden" data-testid="render-result">
              <img src={imageBlob} alt="render" className="w-full h-auto"/>
              <div className="p-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Scene: {scene}</div>
                <a href={imageBlob} download="logic-led-render.png"><Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2"/>Download</Button></a>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiContent() {
  const [types, setTypes] = useState([]);
  const [ct, setCt] = useState("tender_spec");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("professional");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/ai/content/types").then((r) => setTypes(r.data)); }, []);

  const run = async () => {
    if (!context.trim()) { toast.error("Add context first"); return; }
    setLoading(true); setOut("");
    try {
      const { data } = await api.post("/ai/content", { content_type: ct, context, tone });
      setOut(data.content);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl" data-testid="ai-content-page">
      <header>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
          <FileText className="w-3 h-3"/> Content Studio
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">AI Content Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Tender specs · datasheets · LinkedIn posts · proposals · brochures · emails.</p>
      </header>

      <Card className="p-6 rounded-2xl border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Content type</Label>
            <Select value={ct} onValueChange={setCt}>
              <SelectTrigger className="mt-1.5" data-testid="content-type-select"><SelectValue/></SelectTrigger>
              <SelectContent>
                {types.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="marketing">Marketing / Sales</SelectItem>
                <SelectItem value="technical">Deeply Technical</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Context / project details</Label>
          <Textarea rows={5} value={context} onChange={(e)=>setContext(e.target.value)}
                    placeholder="e.g. Boardroom videowall for HDFC Bank Mumbai. 4m × 2.25m, P1.5, VX600 controller, brand: professional finance."
                    className="mt-1.5" data-testid="content-context-input"/>
        </div>
        <Button onClick={run} disabled={loading} className="w-full h-11" data-testid="content-run-btn">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2"/>}
          Generate
        </Button>
      </Card>

      {out && (
        <Card className="p-6 rounded-2xl border-primary/30 bg-primary/5" data-testid="content-output">
          <div className="text-xs uppercase tracking-widest text-primary mb-3">Generated draft</div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{out}</div>
          <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
            <Button variant="outline" size="sm" onClick={()=>navigator.clipboard.writeText(out) && toast.success("Copied")}>Copy</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
