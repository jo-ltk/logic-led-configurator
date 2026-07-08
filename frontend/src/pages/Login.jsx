import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Boxes, Loader2, ArrowRight } from "lucide-react";
import { formatApiErrorDetail } from "@/lib/api";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@logic.com");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user && user !== null && user !== false) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left */}
      <div className="hidden md:flex relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <div className="absolute inset-0 subtle-grid opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display font-bold text-lg">LOGIC</div>
              <div className="text-[10px] uppercase tracking-widest text-white/60">LED Displays</div>
            </div>
          </div>
          <div className="space-y-6 max-w-md">
            <div className="text-xs uppercase tracking-widest text-blue-300/80">Enterprise Videowall Suite</div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold leading-[1.05] tracking-tight">
              Configure. Quote.<br/>Close deals faster.
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              A premium platform for LOGIC's sales & presales teams — engineer LED videowalls,
              generate quotations, and manage the entire pipeline from one place.
            </p>
            <div className="flex items-center gap-6 pt-4 text-sm text-white/60">
              <div><div className="text-2xl font-display font-bold text-white">P0.9→P10</div><div className="text-xs">Pixel Pitches</div></div>
              <div className="w-px h-10 bg-white/20"/>
              <div><div className="text-2xl font-display font-bold text-white">6+</div><div className="text-xs">Categories</div></div>
              <div className="w-px h-10 bg-white/20"/>
              <div><div className="text-2xl font-display font-bold text-white">AI</div><div className="text-xs">Powered</div></div>
            </div>
          </div>
          <div className="text-xs text-white/40">© 2026 LOGIC LED Displays. Enterprise Edition.</div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Sign In</div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Access your videowall configurator dashboard.</p>
          </div>

          <Card className="p-6 border-border shadow-sm rounded-2xl">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
                <Input
                  id="email" type="email" data-testid="login-email-input"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-11" required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs uppercase tracking-wide text-muted-foreground">Password</Label>
                <Input
                  id="password" type="password" data-testid="login-password-input"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-11" required
                />
              </div>
              {err && (
                <div data-testid="login-error" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
                  {err}
                </div>
              )}
              <Button
                type="submit" data-testid="login-submit-btn"
                className="w-full h-11 group"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : (
                  <>Sign In <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform"/></>
                )}
              </Button>
            </form>
          </Card>

          <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Demo credentials</div>
            <div className="text-xs text-muted-foreground space-y-1 font-mono">
              <div>admin@logic.com / admin123 (super admin)</div>
              <div>sales@logic.com / sales123 (sales manager)</div>
              <div>presales@logic.com / presales123 (presales)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
