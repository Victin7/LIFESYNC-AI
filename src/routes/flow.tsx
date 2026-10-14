import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, Home, UserPlus, Sparkles, LayoutDashboard,
  ListChecks, Target, Trophy, CalendarDays, Heart, Bot, BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/flow")({
  head: () => ({
    meta: [
      { title: "Fluxo de Navegação — LifeSync AI" },
      { name: "description", content: "Diagrama interativo do fluxo de navegação do LifeSync AI." },
    ],
  }),
  component: FlowPage,
});

type Node = {
  icon: typeof Home;
  label: string;
  sub?: string;
  active?: boolean;
};

const MAIN_FLOW: Node[] = [
  { icon: Home, label: "Landing Page", sub: "/" },
  { icon: UserPlus, label: "Cadastro", sub: "/register" },
  { icon: Sparkles, label: "Onboarding", sub: "Nome → Objetivo → Horários → Rotina" },
  { icon: LayoutDashboard, label: "Dashboard", sub: "/dashboard", active: true },
];

const BRANCHES: { icon: typeof ListChecks; label: string; action: string }[] = [
  { icon: ListChecks, label: "Tarefas", action: "criar / marcar / excluir" },
  { icon: Target, label: "Hábitos", action: "marcar hábito · streak" },
  { icon: Trophy, label: "Metas", action: "criar · atualizar progresso" },
  { icon: CalendarDays, label: "Calendário", action: "dia / semana / mês" },
  { icon: Heart, label: "Mood Tracker", action: "registrar humor do dia" },
  { icon: Bot, label: "Assistente IA", action: "chat · reorganização" },
  { icon: BarChart3, label: "Relatórios", action: "gráficos e métricas" },
];

function NodeCard({ node, accent }: { node: Node; accent?: boolean }) {
  const Icon = node.icon;
  return (
    <div
      className={`rounded-xl border bg-card-grad p-4 min-w-[180px] text-center transition-colors ${
        node.active || accent
          ? "border-primary/60 shadow-glow"
          : "border-border"
      }`}
    >
      <div className="flex justify-center">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            node.active || accent
              ? "bg-primary/15 text-primary border border-primary/40"
              : "bg-background/40 text-foreground border border-border"
          }`}
        >
          <Icon className="w-5 h-5" aria-hidden />
        </div>
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{node.label}</div>
      {node.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{node.sub}</div>}
    </div>
  );
}

function Arrow({ label, vertical = false }: { label?: string; vertical?: boolean }) {
  if (vertical) {
    return (
      <div className="flex flex-col items-center text-muted-foreground text-xs my-2">
        <div className="w-px h-6 bg-border" />
        <div className="text-primary text-lg leading-none">↓</div>
        {label && <div className="mt-1">{label}</div>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-xs">
      {label && <span>{label}</span>}
      <span className="text-primary text-lg">→</span>
    </div>
  );
}

function FlowPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <header className="mt-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Fluxo de Navegação — LifeSync AI</h1>
          <p className="mt-2 text-muted-foreground">Caminho completo do usuário, da landing até as funcionalidades.</p>
        </header>

        {/* Main flow */}
        <section className="mt-10 rounded-2xl border border-border bg-card/30 p-6 md:p-10">
          {/* Desktop: horizontal */}
          <div className="hidden md:flex items-center justify-between gap-3">
            {MAIN_FLOW.map((node, i) => (
              <div key={node.label} className="flex items-center gap-3 flex-1 last:flex-none">
                <NodeCard node={node} />
                {i < MAIN_FLOW.length - 1 && (
                  <Arrow
                    label={
                      i === 0 ? "Criar conta"
                      : i === 1 ? "cadastro ok"
                      : "concluído"
                    }
                  />
                )}
              </div>
            ))}
          </div>
          {/* Mobile: vertical */}
          <div className="md:hidden flex flex-col items-center">
            {MAIN_FLOW.map((node, i) => (
              <div key={node.label} className="flex flex-col items-center w-full">
                <NodeCard node={node} />
                {i < MAIN_FLOW.length - 1 && (
                  <Arrow
                    vertical
                    label={
                      i === 0 ? "Criar conta"
                      : i === 1 ? "cadastro ok"
                      : "concluído"
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Branches */}
        <section className="mt-8">
          <div className="text-center text-xs text-muted-foreground uppercase tracking-wide">
            A partir do Dashboard
          </div>
          <div className="flex justify-center my-3">
            <div className="w-px h-8 bg-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BRANCHES.map((b) => (
              <div
                key={b.label}
                className="rounded-xl border border-border bg-card-grad p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                    <b.icon className="w-4 h-4" aria-hidden />
                  </div>
                  <div className="text-sm font-semibold">{b.label}</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <span className="text-primary">→</span> {b.action}
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                  retorna ao Dashboard
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-10 text-xs text-muted-foreground text-center">
          Cada funcionalidade do Dashboard é independente e retorna naturalmente ao centro de controle.
        </p>
      </div>
    </div>
  );
}
