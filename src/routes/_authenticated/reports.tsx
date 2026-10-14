import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, ComposedChart, Line, Legend,
} from "recharts";
import { Sparkles, TrendingUp, Flame, Smile, Trophy } from "lucide-react";
import { useTasks, useHabits, useMoods, useGoals } from "@/lib/db";
import { productivityScore, MOOD_SCORE } from "@/lib/insights";
import { ErrorState } from "@/components/ErrorState";
import { SkeletonCard } from "@/components/SkeletonCard";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Relatórios — LifeSync AI" }] }),
  component: Reports,
});

function Reports() {
  const { tasks, loading: lt, error: et, refresh: rt } = useTasks();
  const { habits, completions, loading: lh, error: eh, refresh: rh } = useHabits();
  const { moods, loading: lm, error: em, refresh: rm } = useMoods(30);
  const { goals, loading: lg, error: eg, refresh: rg } = useGoals();
  const loading = lt || lh || lm || lg;
  const error = et || eh || em || eg;
  const retry = () => { rt(); rh(); rm(); rg(); };

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const maxStreak = habits.length ? Math.max(...habits.map((h) => h.streak)) : 0;
  const score = productivityScore({ tasks, habits, goals });

  // Average mood last 7 days
  const avgMood7 = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    const recent = moods.filter((m) => new Date(m.created_at).getTime() >= since);
    if (!recent.length) return 0;
    const sum = recent.reduce((a, m) => a + (MOOD_SCORE[m.mood] ?? 3), 0);
    return Math.round((sum / recent.length) * 10) / 10;
  }, [moods]);

  // Tasks done per day, last 30 days
  const dailyDone = useMemo(() => {
    const days: { day: string; done: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const c = tasks.filter((t) => t.done && t.updated_at.slice(0, 10) === iso).length;
      days.push({ day: label, done: c });
    }
    return days;
  }, [tasks]);

  // Top habits by completions in last 30d
  const topHabits = useMemo(() => {
    return habits.map((h) => ({
      name: h.name.length > 18 ? h.name.slice(0, 18) + "…" : h.name,
      completions: completions.filter((c) => c.habit_id === h.id).length,
    })).sort((a, b) => b.completions - a.completions).slice(0, 5);
  }, [habits, completions]);

  // Mood vs tasks last 14 days
  const moodVsTasks = useMemo(() => {
    const days: { day: string; mood: number | null; tasks: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const dayMoods = moods.filter((m) => m.created_at.slice(0, 10) === iso);
      const moodAvg = dayMoods.length
        ? dayMoods.reduce((a, m) => a + (MOOD_SCORE[m.mood] ?? 3), 0) / dayMoods.length
        : null;
      const t = tasks.filter((tt) => tt.done && tt.updated_at.slice(0, 10) === iso).length;
      days.push({ day: label, mood: moodAvg, tasks: t });
    }
    return days;
  }, [moods, tasks]);

  // Insights
  const insights = useMemo(() => {
    const list: string[] = [];
    if (tasks.length > 0 && pct < 50) list.push("Sua taxa de conclusão está abaixo de 50%. Tente reduzir o número de tarefas por dia.");
    if (maxStreak > 14) {
      const top = habits.find((h) => h.streak === maxStreak);
      list.push(`Incrível: ${maxStreak} dias de sequência no hábito "${top?.name ?? "ativo"}". Mantenha o ritmo.`);
    }
    if (avgMood7 > 0 && avgMood7 < 3) list.push("Seu humor médio esta semana está baixo. A IA pode reorganizar seu dia para tarefas mais leves.");
    if (!list.length) list.push("Tudo equilibrado por aqui. Continue o bom trabalho!");
    return list.slice(0, 3);
  }, [pct, maxStreak, habits, avgMood7, tasks.length]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Acompanhe sua produtividade e padrões.</p>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={retry} />
      ) : loading ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
          </div>
          <SkeletonCard variant="chart" height={240} />
          <div className="grid lg:grid-cols-2 gap-4">
            <SkeletonCard variant="chart" height={240} />
            <SkeletonCard variant="chart" height={240} />
          </div>
        </>
      ) : (
      <>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={TrendingUp} label="Conclusão" value={`${pct}%`} sub={`${done} de ${tasks.length}`} />
        <MetricCard icon={Flame} label="Maior streak" value={`${maxStreak}d`} sub="hábito ativo" />
        <MetricCard icon={Smile} label="Humor médio 7d" value={avgMood7 ? `${avgMood7}/5` : "—"} sub="últimos 7 dias" />
        <MetricCard icon={Trophy} label="Score" value={`${score}`} sub="de 100" />
      </div>

      <div className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
        <div className="text-sm font-medium mb-3">Tarefas concluídas — últimos 30 dias</div>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={dailyDone}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} interval={3} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="done" stroke="var(--primary)" strokeWidth={2} fill="url(#rg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
          <div className="text-sm font-medium mb-3">Top 5 hábitos por consistência</div>
          <div className="h-64">
            {topHabits.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhum hábito ainda.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={topHabits} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={120} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="completions" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
          <div className="text-sm font-medium mb-3">Humor vs. tarefas — últimos 14 dias</div>
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={moodVsTasks}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} interval={1} />
                <YAxis yAxisId="left" domain={[0, 5]} stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="mood" stroke="var(--primary-glow)" strokeWidth={2} name="Humor" connectNulls dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="tasks" stroke="var(--primary)" strokeWidth={2} name="Tarefas" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <Sparkles className="w-4 h-4 text-primary" /> Insights automáticos
        </div>
        <ul className="space-y-2">
          {insights.map((i, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </div>
      </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card-grad p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
