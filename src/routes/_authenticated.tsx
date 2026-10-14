import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, ListChecks, Target, Bot, BarChart3, User, Settings,
  Menu, X, LogOut, Trophy, Heart, CalendarDays,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { LoadingScreen } from "@/components/LoadingScreen";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_authenticated")({
  component: ProtectedLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendário", icon: CalendarDays },
  { to: "/tasks", label: "Tarefas", icon: ListChecks },
  { to: "/habits", label: "Hábitos", icon: Target },
  { to: "/goals", label: "Metas", icon: Trophy },
  { to: "/moods", label: "Mood Tracker", icon: Heart },
  { to: "/ai", label: "Assistente IA", icon: Bot },
  { to: "/reports", label: "Relatórios", icon: BarChart3 },
  { to: "/profile", label: "Perfil", icon: User },
  { to: "/settings", label: "Configurações", icon: Settings },
];

function ProtectedLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <LoadingScreen label="Sincronizando sua rotina..." />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed md:sticky top-0 h-screen z-40 w-64 flex flex-col border-r border-border bg-sidebar transition-transform ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="h-20 flex items-center justify-between px-5 border-b border-border bg-sidebar/80 backdrop-blur">
          <Logo size="sidebar" animated />
          <button className="md:hidden" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            return (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}>
                <n.icon className="w-4 h-4 shrink-0" aria-hidden /><span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={async () => { await signOut(); navigate({ to: "/" }); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6">
          <button className="md:hidden" onClick={() => setOpen(true)}><Menu className="w-5 h-5" /></button>
          <div className="md:hidden">
            <Logo size="mobile" compact />
          </div>
          <div className="flex-1" />
          <NotificationsBell />
          <Link to="/profile" className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-semibold text-sm shadow-glow hover:scale-105 transition-transform">
            {(user.email?.[0] ?? "U").toUpperCase()}
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
