import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Boxes, FileText, Users as UsersIcon, Handshake,
  Settings, LogOut, BarChart3, Sparkles, Moon, Sun, Monitor,
  Cpu, Wrench, KanbanSquare, ImageIcon, Shield, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/api";

const NAV = [
  { section: "Overview", items: [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", key: "dashboard-nav" },
  ]},
  { section: "Configurator", items: [
    { to: "/configurator", icon: Monitor, label: "Configurator", key: "configurator-nav" },
    { to: "/controllers", icon: Cpu, label: "Controllers", key: "controllers-nav" },
    { to: "/engineering", icon: Wrench, label: "Engineering", key: "engineering-nav" },
  ]},
  { section: "Sales", items: [
    { to: "/quotes", icon: FileText, label: "Quotations", key: "quotes-nav" },
    { to: "/projects", icon: KanbanSquare, label: "Projects", key: "projects-nav" },
    { to: "/customers", icon: UsersIcon, label: "Customers", key: "customers-nav" },
    { to: "/partners", icon: Handshake, label: "Partners", key: "partners-nav" },
  ]},
  { section: "AI Studio", items: [
    { to: "/ai-assistant", icon: Sparkles, label: "Advisor", key: "ai-nav" },
    { to: "/ai-render", icon: ImageIcon, label: "Renders", key: "ai-render-nav" },
    { to: "/ai-content", icon: FileText, label: "Content", key: "ai-content-nav" },
  ]},
  { section: "Admin", items: [
    { to: "/products", icon: Package, label: "Products", key: "products-nav" },
    { to: "/users", icon: Shield, label: "Users & Access", key: "users-nav" },
    { to: "/reports", icon: BarChart3, label: "Reports", key: "reports-nav" },
    { to: "/settings", icon: Settings, label: "Settings", key: "settings-nav" },
  ]},
];

export default function DashboardLayout({ children }) {
  const { user, logout, dark, setDark } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col">
        <div className="px-6 py-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-sm">
              <Boxes className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-bold text-base tracking-tight">LOGIC</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Active LED Suite</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {NAV.map((sec) => (
            <div key={sec.section}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-1.5">{sec.section}</div>
              <div className="space-y-0.5">
                {sec.items.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === "/"} data-testid={item.key}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`
                    }>
                    <item.icon className="w-4 h-4"/>
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {ROLES[user?.role] || user?.role}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="flex-1" data-testid="theme-toggle-btn" onClick={() => setDark(!dark)}>
              {dark ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" data-testid="logout-btn"
              onClick={async () => { await logout(); nav("/login"); }}>
              <LogOut className="w-4 h-4"/>
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
