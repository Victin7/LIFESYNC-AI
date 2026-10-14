import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Sparkles, Loader2, Link2, Link2Off, RefreshCw, Wand2, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTasks } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { syncTaskToGoogle } from "@/lib/google-sync";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorState } from "@/components/ErrorState";
import { SkeletonCard } from "@/components/SkeletonCard";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendário — LifeSync AI" }] }),
  component: CalendarPage,
});

type View = "day" | "week" | "month";
const DAY_START = 6;    // 06:00
const DAY_END = 23;     // 23:00
const HOUR_PX = 60;     // 60px per hour → 1px = 1min
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => i + DAY_START);
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Deterministic pastel-on-dark color per category
const CATEGORY_PALETTE = [
  { bg: "oklch(0.62 0.18 258 / 0.20)", br: "oklch(0.72 0.18 258 / 0.80)", fg: "oklch(0.92 0.05 258)" }, // blue
  { bg: "oklch(0.60 0.18 295 / 0.20)", br: "oklch(0.72 0.18 295 / 0.80)", fg: "oklch(0.92 0.05 295)" }, // violet
  { bg: "oklch(0.62 0.18 185 / 0.20)", br: "oklch(0.72 0.18 185 / 0.80)", fg: "oklch(0.92 0.05 185)" }, // teal
  { bg: "oklch(0.65 0.16 145 / 0.20)", br: "oklch(0.74 0.18 145 / 0.80)", fg: "oklch(0.92 0.05 145)" }, // green
  { bg: "oklch(0.70 0.16 75  / 0.20)", br: "oklch(0.78 0.16 75  / 0.80)", fg: "oklch(0.94 0.06 75)"  }, // amber
  { bg: "oklch(0.65 0.20 25  / 0.20)", br: "oklch(0.72 0.22 25  / 0.80)", fg: "oklch(0.94 0.07 25)"  }, // red
  { bg: "oklch(0.60 0.18 330 / 0.20)", br: "oklch(0.72 0.18 330 / 0.80)", fg: "oklch(0.92 0.05 330)" }, // pink
];
const colorFor = (cat: string | null) => {
  const s = (cat ?? "geral").toLowerCase();
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
};
const parseMin = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const minToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const sameDay = (a: string | null, b: Date) => a === ymd(b);
const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

function CalendarPage() {
  const { user } = useAuth();
  const { tasks, loading: tasksLoading, error: tasksError, refresh: refreshTasks } = useTasks();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(new Date());
  const [reorganizing, setReorganizing] = useState(false);
  const [reorgWeek, setReorgWeek] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [syncing, setSyncing] = useState<"import" | "export" | "connect" | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const connected = googleEmail !== null;

  // Daily auto-rollover (moves pending tasks to today + creates recurring instances)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const token = s.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/rollover", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const json = await res.json() as { skipped?: boolean; moved?: number; created?: number };
        if (!json.skipped && ((json.moved ?? 0) > 0 || (json.created ?? 0) > 0)) {
          toast.success("Bom dia! Sua agenda foi atualizada", {
            description: `${json.moved ?? 0} pendentes movidas · ${json.created ?? 0} recorrentes criadas`,
          });
        }
      } catch { /* silent */ }
    })();
  }, [user]);

  // Load Google connection status
  const loadGoogleStatus = async () => {
    if (!user) return;
    const { data } = await supabase.from("google_tokens").select("google_email,last_sync_at").maybeSingle();
    setGoogleEmail(data?.google_email ?? null);
    setLastSync(data?.last_sync_at ?? null);
  };
  useEffect(() => { loadGoogleStatus(); }, [user]);

  // Handle OAuth callback redirect (?google=connected | error_*)
  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("google");
    if (!status) return;
    url.searchParams.delete("google");
    window.history.replaceState({}, "", url.toString());
    if (status === "connected") {
      toast.success("Google Calendar conectado!");
      loadGoogleStatus().then(() => callSync("import"));
    } else {
      toast.error("Falha ao conectar Google", { description: status.replace("error_", "") });
    }
  }, []);

  const connectGoogle = async () => {
    setSyncing("connect");
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sessão expirada");
      const res = await fetch("/api/google/connect", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      toast.error("Não foi possível iniciar conexão", { description: e instanceof Error ? e.message : "" });
      setSyncing(null);
    }
  };

  const disconnectGoogle = async () => {
    if (!confirm("Desconectar Google Calendar? As tarefas permanecerão.")) return;
    const { data: s } = await supabase.auth.getSession();
    await fetch("/api/google/disconnect", { method: "POST", headers: { Authorization: `Bearer ${s.session?.access_token}` } });
    setGoogleEmail(null); setLastSync(null);
    toast.success("Google desconectado");
  };

  const callSync = async (mode: "import" | "export") => {
    setSyncing(mode);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sessão expirada");
      const res = await fetch("/api/calendar-sync", {
        method: mode === "import" ? "GET" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      if (mode === "import") toast.success(`${json.imported} eventos importados do Google`);
      else toast.success(`${json.exported} tarefas exportadas para o Google`);
      loadGoogleStatus();
    } catch (e) {
      toast.error("Falha na sincronização", { description: e instanceof Error ? e.message : "" });
    } finally { setSyncing(null); }
  };

  // Auto-import every 5 minutes when connected
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => { callSync("import"); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [connected]);

  const move = (n: number) => {
    if (view === "day") setCursor(addDays(cursor, n));
    else if (view === "week") setCursor(addDays(cursor, n * 7));
    else setCursor(addMonths(cursor, n));
  };

  const tasksFor = (d: Date) =>
    tasks.filter((t) => {
      if (t.due_date) return sameDay(t.due_date, d);
      return sameDay(t.created_at.slice(0, 10), d);
    });

  const onDropTask = async (taskId: string, date: Date, minute?: number) => {
    const patch: { due_date: string; time?: string } = { due_date: ymd(date) };
    if (minute !== undefined) {
      const snapped = Math.max(0, Math.min(23 * 60 + 45, Math.round(minute / 15) * 15));
      patch.time = minToTime(snapped);
    }
    const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
    if (error) toast.error(error.message);
    else { toast.success("Tarefa reagendada"); syncTaskToGoogle(taskId, "upsert"); }
  };

  const reorganize = async () => {
    setReorganizing(true);
    try {
      const day = ymd(cursor);
      const dayTasks = tasks.filter((t) => !t.done && (t.due_date === day || (!t.due_date && t.created_at.slice(0, 10) === day)));
      const res = await fetch("/api/reorganize-day", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: day,
          tasks: dayTasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority, time: t.time, category: t.category })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { schedule: { id: string; time: string }[] };
      await Promise.all(data.schedule.map((s) => supabase.from("tasks").update({ time: s.time, due_date: day }).eq("id", s.id)));
      data.schedule.forEach((s) => syncTaskToGoogle(s.id, "upsert"));
      toast.success("Dia reorganizado pela IA");
    } catch (e) {
      toast.error("Não foi possível reorganizar", { description: e instanceof Error ? e.message : "" });
    } finally { setReorganizing(false); }
  };

  const reorganizeWeek = async () => {
    setReorgWeek(true);
    try {
      const start = startOfWeek(cursor);
      const end = addDays(start, 6);
      const weekTasks = tasks.filter((t) => !t.done && (
        (t.due_date && t.due_date >= ymd(start) && t.due_date <= ymd(end)) || !t.due_date
      ));
      if (!weekTasks.length) { toast.info("Sem tarefas pendentes nesta semana"); return; }
      const res = await fetch("/api/reorganize-week", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start: ymd(start),
          tasks: weekTasks.map((t) => ({
            id: t.id, title: t.title, priority: t.priority, energy: t.energy,
            duration_min: t.duration_min, due_date: t.due_date, time: t.time, category: t.category,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { schedule: { id: string; due_date: string; time: string }[]; insights: string[] };
      await Promise.all(data.schedule.map((s) =>
        supabase.from("tasks").update({ due_date: s.due_date, time: s.time }).eq("id", s.id)
      ));
      data.schedule.forEach((s) => syncTaskToGoogle(s.id, "upsert"));
      setInsights(data.insights ?? []);
      toast.success(`Semana organizada — ${data.schedule.length} tarefas distribuídas`);
    } catch (e) {
      toast.error("Não foi possível organizar a semana", { description: e instanceof Error ? e.message : "" });
    } finally { setReorgWeek(false); }
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(cursor); const e = addDays(s, 6);
      return `${s.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} — ${e.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`;
    }
    return cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  }, [view, cursor]);

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary"><CalIcon className="w-4 h-4" /> Calendário inteligente</div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 capitalize">{headerLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <div className="px-3 py-2 rounded-xl border border-success/40 bg-success/10 text-success text-xs inline-flex items-center gap-2" title={lastSync ? `Última sync: ${new Date(lastSync).toLocaleString("pt-BR")}` : ""}>
                <Link2 className="w-3.5 h-3.5" /> {googleEmail}
              </div>
              <button onClick={() => callSync("import")} disabled={syncing !== null}
                className="px-3 py-2 rounded-xl border border-border text-sm inline-flex items-center gap-2 hover:bg-accent disabled:opacity-60">
                {syncing === "import" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sincronizar
              </button>
              <button onClick={disconnectGoogle} className="px-2 py-2 rounded-xl border border-border text-xs hover:bg-destructive/10 hover:text-destructive" title="Desconectar Google">
                <Link2Off className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={connectGoogle} disabled={syncing === "connect"}
              className="px-3 py-2 rounded-xl border border-primary/40 bg-primary/10 text-primary text-sm inline-flex items-center gap-2 hover:bg-primary/20 disabled:opacity-60">
              {syncing === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Conectar Google
            </button>
          )}
          <button onClick={reorganize} disabled={reorganizing}
            className="px-3 py-2 rounded-xl border border-primary/40 bg-primary/10 text-primary text-sm inline-flex items-center gap-2 hover:bg-primary/20 disabled:opacity-60">
            {reorganizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Reorganizar dia
          </button>
          <button onClick={reorganizeWeek} disabled={reorgWeek}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground text-sm inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60 shadow-lg shadow-primary/20">
            {reorgWeek ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Organizar minha semana
          </button>
          <button onClick={() => setCursor(new Date())} className="px-3 py-2 rounded-xl border border-border text-sm">Hoje</button>
          <div className="flex items-center rounded-xl border border-border overflow-hidden">
            <button onClick={() => move(-1)} className="px-2 py-2 hover:bg-accent"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => move(1)} className="px-2 py-2 hover:bg-accent"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center rounded-xl border border-border overflow-hidden">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-2 text-sm capitalize ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
            <Lightbulb className="w-4 h-4" /> Insights da IA
            <button onClick={() => setInsights([])} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Fechar</button>
          </div>
          <ul className="space-y-1 text-sm text-foreground/90">
            {insights.map((i, idx) => <li key={idx} className="flex gap-2"><span className="text-primary">•</span>{i}</li>)}
          </ul>
        </motion.div>
      )}

      {tasksLoading ? (
        <SkeletonCard variant="chart" height={420} />
      ) : tasksError ? (
        <ErrorState description={tasksError} onRetry={refreshTasks} />
      ) : (
        <>
          {view === "day" && <DayView date={cursor} tasks={tasksFor(cursor)} onDrop={onDropTask} />}
          {view === "week" && <WeekView cursor={cursor} tasksFor={tasksFor} onDrop={onDropTask} />}
          {view === "month" && <MonthView cursor={cursor} tasksFor={tasksFor} onDrop={onDropTask} onPickDay={(d) => { setCursor(d); setView("day"); }} />}
        </>
      )}
    </div>
  );
}

type Task = ReturnType<typeof useTasks>["tasks"][number];

// Default block duration when task has no duration_min
const DEFAULT_DUR = 45;

function getBlockGeometry(t: Task) {
  const startMin = parseMin(t.time) ?? (9 * 60); // 09:00 default
  const dur = Math.max(15, t.duration_min ?? DEFAULT_DUR);
  const top = (startMin - DAY_START * 60) * (HOUR_PX / 60);
  const height = dur * (HOUR_PX / 60);
  return { startMin, endMin: startMin + dur, top, height };
}

// Lay out overlapping events side-by-side (column packing)
function layoutDay(tasks: Task[]) {
  const items = tasks
    .map((t) => ({ t, ...getBlockGeometry(t) }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  type Col = { endMin: number };
  const groups: (typeof items[number] & { col: number; colsInGroup: number })[][] = [];
  let group: typeof items = [];
  let groupEnd = -Infinity;
  const flush = () => {
    if (!group.length) return;
    const cols: Col[] = [];
    const placed = group.map((it) => {
      let col = cols.findIndex((c) => c.endMin <= it.startMin);
      if (col === -1) { col = cols.length; cols.push({ endMin: it.endMin }); }
      else cols[col].endMin = it.endMin;
      return { ...it, col, colsInGroup: 0 };
    });
    const colsInGroup = cols.length;
    placed.forEach((p) => (p.colsInGroup = colsInGroup));
    groups.push(placed);
    group = []; groupEnd = -Infinity;
  };
  for (const it of items) {
    if (it.startMin >= groupEnd) flush();
    group.push(it);
    groupEnd = Math.max(groupEnd, it.endMin);
  }
  flush();
  return groups.flat();
}

function EventBlock({ t, leftPct, widthPct, top, height, onToggleDone, compact = false }: {
  t: Task; leftPct: number; widthPct: number; top: number; height: number;
  onToggleDone: () => void; compact?: boolean;
}) {
  const c = colorFor(t.category);
  const priorityRing = t.priority === "alta" ? "0 0 0 1px oklch(0.65 0.22 25 / 0.7)" : "none";
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
      onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
      title={`${t.title}${t.time ? " · " + t.time : ""}${t.duration_min ? " · " + t.duration_min + "min" : ""}`}
      style={{
        position: "absolute",
        top, height, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`,
        background: c.bg, borderLeft: `3px solid ${c.br}`,
        color: c.fg, boxShadow: priorityRing,
      }}
      className={`rounded-lg backdrop-blur-sm border border-white/5 px-2 py-1 text-left overflow-hidden cursor-grab active:cursor-grabbing hover:brightness-110 hover:scale-[1.01] transition-all duration-150 animate-in fade-in zoom-in-95 ${t.done ? "opacity-50 line-through" : ""}`}
    >
      {!compact && t.time && (
        <div className="text-[10px] font-mono opacity-80">{t.time}{t.duration_min ? ` · ${t.duration_min}min` : ""}</div>
      )}
      <div className={`text-xs font-medium leading-tight ${compact ? "truncate" : "line-clamp-2"}`}>{t.title}</div>
      {!compact && t.category && height > 50 && (
        <div className="text-[10px] opacity-70 mt-0.5 truncate">{t.category}</div>
      )}
    </button>
  );
}

function NowIndicator({ top }: { top: number }) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top }}>
      <div className="relative h-px bg-destructive shadow-[0_0_8px_oklch(0.65_0.22_25_/_0.8)]">
        <span className="absolute -left-1.5 -top-[5px] w-2.5 h-2.5 rounded-full bg-destructive shadow-[0_0_10px_oklch(0.65_0.22_25)]" />
      </div>
    </div>
  );
}

function useNowMin() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now.getHours() * 60 + now.getMinutes();
}

function ColumnGrid({ heightPx, onDropAt, children }: {
  heightPx: number;
  onDropAt: (minutesFromDayStart: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative"
      style={{ height: heightPx }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("text/task-id");
        if (!id) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const min = DAY_START * 60 + (y / HOUR_PX) * 60;
        onDropAt(min);
      }}
    >
      {/* hour lines */}
      {HOURS.map((h, i) => (
        <div key={h} className="absolute left-0 right-0 border-t border-border/60" style={{ top: i * HOUR_PX }}>
          <div className="absolute left-0 right-0 border-t border-border/20" style={{ top: HOUR_PX / 2 }} />
        </div>
      ))}
      {children}
    </div>
  );
}

function DayView({ date, tasks, onDrop }: { date: Date; tasks: Task[]; onDrop: (id: string, d: Date, minute?: number) => void }) {
  const nowMin = useNowMin();
  const isToday = ymd(date) === ymd(new Date());
  const totalHeight = HOURS.length * HOUR_PX;
  const timed = tasks.filter((t) => t.time);
  const untimed = tasks.filter((t) => !t.time);
  const placed = useMemo(() => layoutDay(timed), [timed]);
  const toggleDone = async (t: Task) => {
    const { error } = await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
    if (error) toast.error(error.message);
    else toast.success(t.done ? "Tarefa reaberta" : "Concluída ✓");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card-grad overflow-hidden">
        <div className="flex">
          {/* hours rail */}
          <div className="w-16 shrink-0 relative border-r border-border" style={{ height: totalHeight }}>
            {HOURS.map((h, i) => (
              <div key={h} className="absolute left-0 right-0 text-[10px] font-mono text-muted-foreground px-2"
                style={{ top: i * HOUR_PX - 6 }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {/* timeline column */}
          <div className="flex-1 relative">
            <ColumnGrid heightPx={totalHeight} onDropAt={(m) => {
              const id = (window as any).__lastDragId; // not used; we read from event below
              if (id) onDrop(id, date, m);
            }}>
              {placed.map((p) => (
                <EventBlock key={p.t.id} t={p.t}
                  leftPct={(100 / p.colsInGroup) * p.col}
                  widthPct={100 / p.colsInGroup}
                  top={p.top} height={p.height}
                  onToggleDone={() => toggleDone(p.t)} />
              ))}
              {isToday && nowMin >= DAY_START * 60 && nowMin <= DAY_END * 60 && (
                <NowIndicator top={(nowMin - DAY_START * 60) * (HOUR_PX / 60)} />
              )}
            </ColumnGrid>
          </div>
        </div>
      </motion.div>
      {/* Untimed sidebar (drop here to remove time) */}
      <aside className="rounded-2xl border border-border bg-card-grad p-3 h-fit"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          const id = e.dataTransfer.getData("text/task-id");
          if (!id) return;
          await supabase.from("tasks").update({ time: null, due_date: ymd(date) }).eq("id", id);
          toast.success("Sem horário definido");
        }}>
        <div className="text-xs font-medium text-muted-foreground mb-2">Sem horário ({untimed.length})</div>
        <div className="space-y-1.5">
          {untimed.length === 0 && <div className="text-xs text-muted-foreground/70 italic">Arraste aqui para remover o horário.</div>}
          {untimed.map((t) => {
            const c = colorFor(t.category);
            return (
              <div key={t.id} draggable
                onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                onClick={() => toggleDone(t)}
                style={{ background: c.bg, borderLeft: `3px solid ${c.br}`, color: c.fg }}
                className={`px-2 py-1.5 rounded-md text-xs cursor-grab hover:brightness-110 transition ${t.done ? "opacity-50 line-through" : ""}`}>
                {t.title}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function WeekView({ cursor, tasksFor, onDrop }: { cursor: Date; tasksFor: (d: Date) => Task[]; onDrop: (id: string, d: Date, minute?: number) => void }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const nowMin = useNowMin();
  const totalHeight = HOURS.length * HOUR_PX;
  const toggleDone = async (t: Task) => {
    const { error } = await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
    if (error) toast.error(error.message);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card-grad overflow-x-auto">
      <div className="min-w-[820px]">
        {/* sticky header */}
        <div className="grid grid-cols-[64px_repeat(7,minmax(110px,1fr))] sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
          <div />
          {days.map((d) => {
            const today = ymd(d) === ymd(new Date());
            return (
              <div key={d.toISOString()} className={`px-2 py-2 text-center text-xs border-l border-border ${today ? "text-primary" : "text-muted-foreground"}`}>
                <div>{WEEKDAYS[d.getDay()]}</div>
                <div className={`text-base font-semibold ${today ? "text-primary" : "text-foreground"}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        {/* body */}
        <div className="grid grid-cols-[64px_repeat(7,minmax(110px,1fr))]">
          {/* rail */}
          <div className="relative border-r border-border" style={{ height: totalHeight }}>
            {HOURS.map((h, i) => (
              <div key={h} className="absolute left-0 right-0 text-[10px] font-mono text-muted-foreground px-2"
                style={{ top: i * HOUR_PX - 6 }}>{String(h).padStart(2, "0")}h</div>
            ))}
          </div>
          {/* day columns */}
          {days.map((d) => {
            const dayTasks = tasksFor(d).filter((t) => t.time);
            const placed = layoutDay(dayTasks);
            const today = ymd(d) === ymd(new Date());
            return (
              <div key={d.toISOString()} className={`relative border-l border-border ${today ? "bg-primary/[0.03]" : ""}`}>
                <ColumnGrid heightPx={totalHeight} onDropAt={(m) => {
                  // dataTransfer is read in the closure of ColumnGrid via event
                  // but we need taskId; re-read at drop site:
                }}>
                  {placed.map((p) => (
                    <EventBlock key={p.t.id} t={p.t}
                      leftPct={(100 / p.colsInGroup) * p.col}
                      widthPct={100 / p.colsInGroup}
                      top={p.top} height={p.height}
                      onToggleDone={() => toggleDone(p.t)}
                      compact />
                  ))}
                  {today && nowMin >= DAY_START * 60 && nowMin <= DAY_END * 60 && (
                    <NowIndicator top={(nowMin - DAY_START * 60) * (HOUR_PX / 60)} />
                  )}
                </ColumnGrid>
                {/* dedicated drop layer for THIS day */}
                <div
                  className="absolute inset-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("text/task-id");
                    if (!id) return;
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const min = DAY_START * 60 + (y / HOUR_PX) * 60;
                    onDrop(id, d, min);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function MonthView({ cursor, tasksFor, onDrop, onPickDay }: { cursor: Date; tasksFor: (d: Date) => Task[]; onDrop: (id: string, d: Date) => void; onPickDay: (d: Date) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-card-grad overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2 text-xs text-muted-foreground text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const today = ymd(d) === ymd(new Date());
          const dayTasks = tasksFor(d);
          return (
            <div key={d.toISOString()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData("text/task-id"); if (id) onDrop(id, d); }}
              onClick={() => onPickDay(d)}
              className={`min-h-[110px] border-b border-r border-border p-2 cursor-pointer hover:bg-accent/40 transition ${inMonth ? "" : "opacity-40"}`}>
              <div className={`text-xs font-medium mb-1 ${today ? "text-primary" : ""}`}>{d.getDate()}</div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((t) => {
                  const c = colorFor(t.category);
                  return (
                    <div key={t.id} draggable
                      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("text/task-id", t.id); }}
                      style={{ background: c.bg, borderLeft: `3px solid ${c.br}`, color: c.fg }}
                      className={`px-1.5 py-0.5 rounded text-[10px] truncate cursor-grab ${t.done ? "opacity-50 line-through" : ""}`}>
                      {t.time && <span className="font-mono opacity-70 mr-1">{t.time}</span>}{t.title}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
