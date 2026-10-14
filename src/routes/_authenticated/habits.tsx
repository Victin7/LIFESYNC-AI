import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Flame, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHabits } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorState } from "@/components/ErrorState";
import { SkeletonCard } from "@/components/SkeletonCard";

export const Route = createFileRoute("/_authenticated/habits")({
  head: () => ({ meta: [{ title: "Hábitos — LifeSync AI" }] }),
  component: Habits,
});

function Habits() {
  const { user } = useAuth();
  const { habits, completions, loading, error, refresh } = useHabits();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    const { error } = await supabase.from("habits").insert({ user_id: user.id, name: name.trim(), icon });
    if (error) toast.error(error.message);
    else { setName(""); toast.success("Hábito criado"); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const isDoneToday = (habitId: string) => completions.some((c) => c.habit_id === habitId && c.completed_on === today);

  const toggleToday = async (habitId: string) => {
    if (!user) return;
    if (isDoneToday(habitId)) {
      await supabase.from("habit_completions").delete().match({ habit_id: habitId, completed_on: today });
    } else {
      await supabase.from("habit_completions").insert({ user_id: user.id, habit_id: habitId, completed_on: today });
    }
  };

  const remove = async (id: string) => { await supabase.from("habits").delete().eq("id", id); };

  // last 7 days grid
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Hábitos</h1>
        <p className="text-muted-foreground mt-1">Construa rotinas com sequências e progresso.</p>
      </div>

      <form onSubmit={add} className="rounded-2xl border border-border bg-card-grad p-4 flex gap-2">
        <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2}
          className="w-14 text-center px-2 py-2.5 rounded-xl bg-input border border-border text-lg" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Novo hábito..." required
          className="flex-1 px-3 py-2.5 rounded-xl bg-input border border-border text-sm" />
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {error ? (
        <ErrorState description={error} onRetry={refresh} />
      ) : loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : (
      <div className="space-y-3">
        {habits.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum hábito ainda.</p>}
        {habits.map((h) => {
          const doneToday = isDoneToday(h.id);
          const weekDone = last7.filter((d) => completions.some((c) => c.habit_id === h.id && c.completed_on === d)).length;
          return (
            <div key={h.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-background/60 border border-border flex items-center justify-center text-xl">{h.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{h.name}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-primary" /> {h.streak} dias</span>
                    <span>{weekDone}/7 esta semana</span>
                  </div>
                </div>
                <button onClick={() => toggleToday(h.id)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
                    doneToday ? "bg-success/15 border-success/40 text-success" : "border-border hover:border-primary/40"
                  }`}>
                  {doneToday ? <><Check className="w-4 h-4 inline mr-1" /> Feito</> : "Marcar hoje"}
                </button>
                <button onClick={() => remove(h.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="mt-4 flex gap-1">
                {last7.map((d) => {
                  const done = completions.some((c) => c.habit_id === h.id && c.completed_on === d);
                  return <div key={d} className={`flex-1 h-2 rounded-full ${done ? "bg-primary" : "bg-border"}`} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
