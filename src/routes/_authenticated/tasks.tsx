import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Search } from "lucide-react";
import { toast } from "sonner";
import { useTasks } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { syncTaskToGoogle } from "@/lib/google-sync";
import { ErrorState } from "@/components/ErrorState";
import { SkeletonCard } from "@/components/SkeletonCard";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tarefas — LifeSync AI" }] }),
  component: Tasks,
});

function Tasks() {
  const { user } = useAuth();
  const { tasks, loading, error, refresh } = useTasks();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Geral");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta">("media");
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [duration, setDuration] = useState<string>("");
  const [energy, setEnergy] = useState<"baixa" | "media" | "alta">("media");
  const [search, setSearch] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    const due_date = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from("tasks")
      .insert({
        user_id: user.id, title: title.trim(), category, priority,
        time: time || null, due_date,
        recurrence, duration_min: duration ? parseInt(duration, 10) : null, energy,
      })
      .select("id").single();
    if (error) { toast.error(error.message); return; }
    setTitle(""); setTime(""); setDuration("");
    toast.success(recurrence === "none" ? "Tarefa criada" : `Tarefa ${recurrence === "daily" ? "diária" : recurrence === "weekly" ? "semanal" : "mensal"} criada`);
    if (data?.id) syncTaskToGoogle(data.id, "upsert");
  };

  const toggle = async (id: string, done: boolean) => {
    await supabase.from("tasks").update({ done: !done }).eq("id", id);
    syncTaskToGoogle(id, !done ? "delete" : "upsert");
  };
  const remove = async (id: string) => {
    syncTaskToGoogle(id, "delete");
    await supabase.from("tasks").delete().eq("id", id);
    toast.success("Tarefa excluída");
  };

  const filtered = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tarefas</h1>
        <p className="text-muted-foreground mt-1">Organize seu dia com prioridades, recorrência e energia.</p>
      </div>

      <form onSubmit={add} className="rounded-2xl border border-border bg-card-grad p-4 space-y-2">
        <div className="grid sm:grid-cols-12 gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova tarefa..." required
            className="sm:col-span-6 px-3 py-2.5 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria"
            className="sm:col-span-3 px-3 py-2.5 rounded-xl bg-input border border-border text-sm" />
          <select value={priority} onChange={(e) => setPriority(e.target.value as "baixa" | "media" | "alta")}
            className="sm:col-span-2 px-3 py-2.5 rounded-xl bg-input border border-border text-sm">
            <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
          </select>
          <button type="submit" className="sm:col-span-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="grid sm:grid-cols-12 gap-2">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="Horário"
            className="sm:col-span-3 px-3 py-2.5 rounded-xl bg-input border border-border text-sm" />
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
            className="sm:col-span-3 px-3 py-2.5 rounded-xl bg-input border border-border text-sm">
            <option value="none">Sem recorrência</option>
            <option value="daily">Diária</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
          <select value={energy} onChange={(e) => setEnergy(e.target.value as typeof energy)}
            className="sm:col-span-3 px-3 py-2.5 rounded-xl bg-input border border-border text-sm">
            <option value="baixa">Energia baixa</option>
            <option value="media">Energia média</option>
            <option value="alta">Energia alta</option>
          </select>
          <input type="number" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duração (min)"
            className="sm:col-span-3 px-3 py-2.5 rounded-xl bg-input border border-border text-sm" />
        </div>
      </form>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tarefas..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input border border-border text-sm" />
      </div>

      {error ? (
        <ErrorState description={error} onRetry={refresh} />
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : (
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma tarefa.</p>}
        {filtered.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-card-hover">
            <button onClick={() => toggle(t.id, t.done)}>
              {t.done ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>{t.time ?? "—"} · {t.category ?? "Geral"}</span>
                {t.recurrence !== "none" && (
                  <span className="px-1.5 py-0.5 rounded-md border border-primary/40 bg-primary/10 text-primary text-[10px]">
                    ↻ {t.recurrence === "daily" ? "diária" : t.recurrence === "weekly" ? "semanal" : t.recurrence === "monthly" ? "mensal" : "personalizada"}
                  </span>
                )}
                {t.duration_min && <span className="text-[10px]">{t.duration_min}min</span>}
                {t.energy !== "media" && <span className="text-[10px]">⚡{t.energy}</span>}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              t.priority === "alta" ? "border-destructive/40 text-destructive bg-destructive/10" :
              t.priority === "media" ? "border-warning/40 text-warning bg-warning/10" :
              "border-border text-muted-foreground"
            }`}>{t.priority}</span>
            <button onClick={() => remove(t.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
