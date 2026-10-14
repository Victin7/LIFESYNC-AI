import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, Circle, Plus, TrendingUp, Flame, Sparkles,
  Battery, BatteryFull, BatteryLow, Quote, Smile, Frown, Zap, Wind, Heart,
  Target, Activity, ArrowRight, Trophy,
} from "lucide-react";
import { useTasks, useHabits, useProfile, useMoods, useGoals } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { greeting, weekData, productivityScore } from "@/lib/insights";
import { ErrorState } from "@/components/ErrorState";
import { SkeletonCard } from "@/components/SkeletonCard";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LifeSync AI" }] }),
  component: Dashboard,
});

const QUICK_MOODS = [
  { k: "motivado", label: "Motivado", icon: Zap },
  { k: "feliz", label: "Feliz", icon: Smile },
  { k: "focado", label: "Focado", icon: Heart },
  { k: "ansioso", label: "Ansioso", icon: Wind },
  { k: "cansado", label: "Cansado", icon: Frown },
] as const;

function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { tasks, loading: lt, error: et, refresh: rt } = useTasks();
  const { habits, completions, loading: lh, error: eh, refresh: rh } = useHabits();
  const { profile, update, error: ep, refresh: rp } = useProfile();
  const { moods } = useMoods(7);
  const { goals } = useGoals();
  const [phrase, setPhrase] = useState<string>("");
  const loading = lt || lh;
  const error = et || eh || ep;
  const retry = () => { rt(); rh(); rp(); };

  useEffect(() => {
    if (profile && !profile.onboarded) nav({ to: "/onboarding" });
  }, [profile, nav]);

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const maxStreak = habits.length ? Math.max(...habits.map((h) => h.streak)) : 0;

  // Last 7 days productivity
  const week = useMemo(() => weekData(tasks), [tasks]);

  // Heatmap last 30 days (habit completions intensity)
  const heatmap = useMemo(() => {
    const cells: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      cells.push({ date: d, count: completions.filter((c) => c.completed_on === d).length });
    }
    return cells;
  }, [completions]);

  const maxHeat = Math.max(1, ...heatmap.map((c) => c.count));

  // Productivity score 0-100
  const score = useMemo(() => productivityScore({ tasks, habits, goals }), [tasks, habits, goals]);

  useEffect(() => {
    if (!profile || !user) return;
    const cachedAt = profile.motivation_cached_at ? new Date(profile.motivation_cached_at).getTime() : 0;
    const fresh = Date.now() - cachedAt < 6 * 3600 * 1000;
    if (fresh && profile.motivation_cache) {
      setPhrase(profile.motivation_cache);
      return;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const doneToday = tasks.filter((t) => t.done && t.updated_at.slice(0, 10) === todayStr).length;
    const doneYesterday = tasks.filter((t) => t.done && t.updated_at.slice(0, 10) === yesterdayStr).length;
    fetch("/api/motivation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doneToday, doneYesterday, streak: maxStreak, mood: moods[0]?.mood, energy: profile.energy }),
    }).then((r) => r.ok ? r.json() : null).then(async (d: { phrase?: string } | null) => {
      if (d?.phrase) {
        setPhrase(d.phrase);
        await supabase.from("profiles")
          .update({ motivation_cache: d.phrase, motivation_cached_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    }).catch(() => { /* silent */ });
    // also kick off pattern analysis silently
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (token) fetch("/api/analyze-patterns", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    });
  }, [profile, tasks, maxStreak, moods, user]);

  const toggle = async (id: string, current: boolean) => {
    await supabase.from("tasks").update({ done: !current }).eq("id", id);
  };

  const setEnergy = async (e: "cansado" | "normal" | "produtivo") => {
    await update({ energy: e });
    if (user) await supabase.from("energy_logs").insert({ user_id: user.id, energy: e });
    toast.success("Modo de energia atualizado");
  };

  const logMood = async (m: typeof QUICK_MOODS[number]["k"]) => {
    if (!user) return;
    await supabase.from("moods").insert({ user_id: user.id, mood: m });
    toast.success("Humor registrado");
  };

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const name = profile?.name || user?.email?.split("@")[0] || "Você";

  const upcoming = tasks.filter((t) => !t.done).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-background p-6 md:p-8 shadow-elegant"
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-primary-glow/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary/80 capitalize">{today}</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1">
              {greeting()}, {name.split(" ")[0]} <span className="inline-block">👋</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              {tasks.length === 0
                ? "Comece criando sua primeira tarefa e deixe a IA te guiar."
                : `Você concluiu ${done} de ${tasks.length} tarefas — ${pct}% do dia.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/ai" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-medium hover:bg-primary/20 transition">
              <Sparkles className="w-4 h-4" /> IA
            </Link>
            <Link to="/tasks" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-elegant hover:bg-primary-hover transition">
              <Plus className="w-4 h-4" /> Nova tarefa
            </Link>
          </div>
        </div>
      </motion.div>

      {phrase && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-5 flex items-start gap-3 backdrop-blur">
          <Quote className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm md:text-base italic">{phrase}</p>
        </motion.div>
      )}

      {error ? (
        <ErrorState description={error} onRetry={retry} />
      ) : loading ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
          </div>
          <SkeletonCard variant="chart" height={120} />
        </>
      ) : (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={CheckCircle2} label="Tarefas hoje" value={`${done}/${tasks.length}`} sub={`${pct}% concluído`} delay={0} />
        <Stat icon={Flame} label="Maior streak" value={`${maxStreak}d`} sub="Hábito ativo" delay={0.05} />
        <Stat icon={Target} label="Metas ativas" value={`${goals.length}`} sub="em progresso" delay={0.1} />
        <Stat icon={TrendingUp} label="Hábitos" value={`${habits.length}`} sub="acompanhados" delay={0.15} />
      </div>
      )}

      {/* Score + chart row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Trophy className="w-4 h-4 text-primary" /> Produtividade</div>
            <span className="text-xs text-muted-foreground">esta semana</span>
          </div>
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: "score", value: score, fill: "var(--primary)" }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "color-mix(in oklab, var(--muted) 30%, transparent)" }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-4xl font-bold">{score}</div>
              <div className="text-xs text-muted-foreground">de 100</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {score >= 80 ? "Excelente ritmo!" : score >= 50 ? "Bom progresso, continue!" : "Vamos começar pequeno hoje."}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Activity className="w-4 h-4 text-primary" /> Últimos 7 dias</div>
            <span className="text-xs text-muted-foreground">tarefas concluídas</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={week} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="done" stroke="var(--primary)" strokeWidth={2} fill="url(#areaP)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Mood + Energy + AI */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium"><Heart className="w-4 h-4 text-primary" /> Humor</div>
            <Link to="/moods" className="text-xs text-primary hover:underline">Histórico</Link>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {QUICK_MOODS.map((m) => (
              <button key={m.k} onClick={() => logMood(m.k)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-background/40 border border-border hover:border-primary/40 hover:bg-primary/5 transition">
                <m.icon className="w-4 h-4 text-primary" />
                <span className="text-[10px]">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium mb-3"><Sparkles className="w-4 h-4 text-primary" /> Energia</div>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { k: "cansado", label: "Cansado", icon: BatteryLow },
              { k: "normal", label: "Normal", icon: Battery },
              { k: "produtivo", label: "Pico", icon: BatteryFull },
            ] as const).map((o) => (
              <button key={o.k} onClick={() => setEnergy(o.k)}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                  profile?.energy === o.k ? "bg-primary/15 border-primary/40" : "bg-background/40 border-border hover:border-primary/30"
                }`}>
                <o.icon className={`w-4 h-4 ${profile?.energy === o.k ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[10px] font-medium">{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Link to="/ai" className="group rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-card p-5 shadow-elegant hover:shadow-glow transition relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="w-4 h-4 text-primary" /> Assistente IA</div>
            <p className="mt-2 text-xs text-muted-foreground">Receba insights personalizados sobre sua rotina e produtividade.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">Conversar <ArrowRight className="w-3.5 h-3.5" /></span>
          </div>
        </Link>
      </div>

      {/* Heatmap */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-medium"><Flame className="w-4 h-4 text-primary" /> Atividade — 30 dias</div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>menos</span>
            {[0.15, 0.35, 0.6, 0.85, 1].map((o) => (
              <span key={o} className="w-3 h-3 rounded-sm" style={{ background: `color-mix(in oklab, var(--primary) ${Math.round(o * 100)}%, transparent)` }} />
            ))}
            <span>mais</span>
          </div>
        </div>
        <div className="grid grid-cols-15 sm:grid-cols-30 gap-1" style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}>
          {heatmap.map((c) => {
            const intensity = c.count === 0 ? 0.08 : 0.2 + (c.count / maxHeat) * 0.8;
            return (
              <div key={c.date} title={`${c.date}: ${c.count} hábito(s)`}
                className="aspect-square rounded-sm hover:ring-2 hover:ring-primary/50 transition"
                style={{ background: `color-mix(in oklab, var(--primary) ${Math.round(intensity * 100)}%, transparent)` }} />
            );
          })}
        </div>
      </motion.div>

      {/* Tasks + Goals */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Próximas tarefas</div>
            <Link to="/tasks" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tudo em dia! <Link to="/tasks" className="text-primary hover:underline">Adicionar tarefa</Link></p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((t, i) => (
                <motion.button key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => toggle(t.id, t.done)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border hover:border-primary/40 hover:bg-primary/5 text-left transition">
                  {t.done ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.time ?? "—"} · {t.category ?? "Geral"}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    t.priority === "alta" ? "border-destructive/40 text-destructive bg-destructive/10" :
                    t.priority === "media" ? "border-warning/40 text-warning bg-warning/10" :
                    "border-border text-muted-foreground"
                  }`}>{t.priority}</span>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Metas em foco</div>
            <Link to="/goals" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Defina sua primeira meta. <Link to="/goals" className="text-primary hover:underline">Criar meta</Link></p>
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 4).map((g, i) => {
                const p = Math.min(100, Math.round((g.progress / Math.max(1, g.target)) * 100));
                return (
                  <motion.div key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{g.title}</span>
                      <span className="text-xs text-muted-foreground">{g.progress}/{g.target}</span>
                    </div>
                    <div className="h-2 mt-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-primary to-primary-glow" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, delay = 0 }: { icon: React.ElementType; label: string; value: string; sub: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="group rounded-2xl border border-border bg-card-grad p-5 backdrop-blur hover:border-primary/40 hover:shadow-elegant transition">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </motion.div>
  );
}
