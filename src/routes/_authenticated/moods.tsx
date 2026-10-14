import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Smile, Frown, Zap, Wind, Flame, Heart } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useMoods, useTasks } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorState } from "@/components/ErrorState";
import { SkeletonCard } from "@/components/SkeletonCard";

export const Route = createFileRoute("/_authenticated/moods")({
  head: () => ({ meta: [{ title: "Mood Tracker — LifeSync AI" }] }),
  component: Moods,
});

const MOODS = [
  { k: "motivado", label: "Motivado", icon: Zap, score: 5 },
  { k: "feliz", label: "Feliz", icon: Smile, score: 5 },
  { k: "focado", label: "Focado", icon: Heart, score: 4 },
  { k: "ansioso", label: "Ansioso", icon: Wind, score: 2 },
  { k: "estressado", label: "Estressado", icon: Flame, score: 1 },
  { k: "cansado", label: "Cansado", icon: Frown, score: 2 },
] as const;

function Moods() {
  const { user } = useAuth();
  const { moods, loading, error, refresh } = useMoods(30);
  const { tasks } = useTasks();
  const [note, setNote] = useState("");

  const log = async (mood: typeof MOODS[number]["k"]) => {
    if (!user) return;
    const { error } = await supabase.from("moods").insert({ user_id: user.id, mood, note: note.trim() || null });
    if (error) { toast.error(error.message); return; }
    setNote("");
    toast.success("Humor registrado");
  };

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; humor: number; tarefas: number; n: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      map.set(d, { date: d.slice(5), humor: 0, tarefas: 0, n: 0 });
    }
    for (const m of moods) {
      const d = m.created_at.slice(0, 10);
      const e = map.get(d);
      if (!e) continue;
      const score = MOODS.find((x) => x.k === m.mood)?.score ?? 3;
      e.humor += score; e.n += 1;
    }
    for (const t of tasks) {
      if (!t.done) continue;
      const d = t.updated_at.slice(0, 10);
      const e = map.get(d);
      if (e) e.tarefas += 1;
    }
    return Array.from(map.values()).map((e) => ({
      date: e.date,
      humor: e.n ? +(e.humor / e.n).toFixed(2) : null,
      tarefas: e.tarefas,
    }));
  }, [moods, tasks]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-primary"><Heart className="w-4 h-4" /> Mood Tracker</div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Como você está hoje?</h1>
        <p className="text-muted-foreground mt-1">Registre seu humor e veja como ele se relaciona com sua produtividade.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card-grad p-5">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {MOODS.map((m) => (
            <button key={m.k} onClick={() => log(m.k)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background/40 border border-border hover:border-primary/40 transition">
              <m.icon className="w-6 h-6 text-primary" />
              <span className="text-xs">{m.label}</span>
            </button>
          ))}
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anote algo (opcional)..."
          className="mt-4 w-full px-4 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      <div className="rounded-2xl border border-border bg-card-grad p-5">
        <div className="text-sm font-medium mb-4">Humor x Produtividade (14 dias)</div>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="humor" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="tarefas" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={refresh} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card-grad p-5">
          <div className="text-sm font-medium mb-3">Histórico recente</div>
          {moods.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registros ainda.</p>
          ) : (
            <div className="space-y-2">
              {moods.slice(0, 10).map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border">
                  <div>
                    <div className="text-sm font-medium capitalize">{m.mood}</div>
                    {m.note && <div className="text-xs text-muted-foreground">{m.note}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
