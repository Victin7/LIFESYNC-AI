import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Target, Trash2, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useGoals } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorState } from "@/components/ErrorState";
import { SkeletonCard } from "@/components/SkeletonCard";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Metas — LifeSync AI" }] }),
  component: Goals,
});

const TYPES = [
  { k: "diaria", label: "Diária" },
  { k: "semanal", label: "Semanal" },
  { k: "mensal", label: "Mensal" },
] as const;

function Goals() {
  const { user } = useAuth();
  const { goals, loading, error, refresh } = useGoals();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"diaria" | "semanal" | "mensal">("diaria");
  const [target, setTarget] = useState(5);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    const start = new Date();
    const end = new Date(start);
    if (type === "diaria") end.setDate(end.getDate() + 1);
    else if (type === "semanal") end.setDate(end.getDate() + 7);
    else end.setMonth(end.getMonth() + 1);
    const { error } = await supabase.from("goals").insert({
      user_id: user.id, title: title.trim(), type, target,
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
    });
    if (error) { toast.error(error.message); return; }
    setTitle(""); setTarget(5);
    toast.success("Meta criada");
  };

  const inc = async (id: string, current: number, max: number) => {
    const next = Math.min(max, current + 1);
    await supabase.from("goals").update({ progress: next }).eq("id", id);
  };
  const dec = async (id: string, current: number) => {
    const next = Math.max(0, current - 1);
    await supabase.from("goals").update({ progress: next }).eq("id", id);
  };
  const remove = async (id: string) => {
    await supabase.from("goals").update({ archived: true }).eq("id", id);
    toast.success("Meta arquivada");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-primary"><Target className="w-4 h-4" /> Sistema de metas</div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Suas metas</h1>
        <p className="text-muted-foreground mt-1">Crie metas diárias, semanais e mensais. Acompanhe o progresso visualmente.</p>
      </div>

      <form onSubmit={add} className="rounded-2xl border border-border bg-card-grad p-5 grid md:grid-cols-[1fr_140px_120px_auto] gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Estudar 2h por dia"
          className="px-4 py-2.5 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
        <select value={type} onChange={(e) => setType(e.target.value as never)}
          className="px-3 py-2.5 rounded-xl bg-input border border-border text-sm">
          {TYPES.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
        </select>
        <input type="number" min={1} value={target} onChange={(e) => setTarget(Math.max(1, +e.target.value))}
          className="px-3 py-2.5 rounded-xl bg-input border border-border text-sm" placeholder="Meta" />
        <button className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-elegant hover:bg-primary-hover inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </form>

      {error ? (
        <ErrorState description={error} onRetry={refresh} />
      ) : loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {goals.length === 0 && (
            <div className="md:col-span-2 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nenhuma meta ainda. Crie a primeira acima.
            </div>
          )}
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.progress / Math.max(1, g.target)) * 100));
            return (
              <motion.div key={g.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card-grad p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-primary">{g.type}</div>
                    <div className="font-semibold mt-1 truncate">{g.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{g.progress} / {g.target}</div>
                  </div>
                  <button onClick={() => remove(g.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 h-2 rounded-full bg-background/60 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                    className={`h-full ${pct >= 100 ? "bg-success" : "bg-primary"}`} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => dec(g.id, g.progress)} className="p-2 rounded-lg border border-border hover:border-primary/40">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => inc(g.id, g.progress, g.target)} className="p-2 rounded-lg border border-border hover:border-primary/40">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-xs text-muted-foreground ml-auto">{pct}%</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
