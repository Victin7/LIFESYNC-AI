import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Loader2, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useProfile } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — LifeSync AI" }] }),
  component: Onboarding,
});

const GOALS = ["Aumentar produtividade", "Estudar mais", "Ter uma rotina fitness", "Equilibrar trabalho e vida", "Organizar finanças"];
const SLOTS = ["Manhã (6h–12h)", "Tarde (12h–18h)", "Noite (18h–23h)"];

function Onboarding() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { profile, update } = useProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [energy, setEnergy] = useState<"cansado" | "normal" | "produtivo">("normal");
  const [slots, setSlots] = useState<string[]>(["Manhã (6h–12h)"]);
  const [routine, setRoutine] = useState("");
  const [building, setBuilding] = useState(false);

  const toggleSlot = (s: string) => setSlots((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  const generateAndFinish = async (useFullData: boolean) => {
    if (!user) return;
    setBuilding(true);
    try {
      const payload = useFullData
        ? { goal, slots, routine, energy }
        : { goal, slots: [], routine: "", energy };
      const res = await fetch("/api/generate-routine", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { tasks: { title: string; time?: string; priority?: string; category?: string }[]; habits: { name: string; icon?: string }[] };

      if (data.tasks?.length) {
        await supabase.from("tasks").insert(data.tasks.map((t) => ({
          user_id: user.id, title: t.title, time: t.time ?? null,
          priority: (t.priority === "alta" || t.priority === "baixa" ? t.priority : "media"),
          category: t.category ?? "Geral",
        })));
      }
      if (data.habits?.length) {
        await supabase.from("habits").insert(data.habits.map((h) => ({
          user_id: user.id, name: h.name, icon: h.icon ?? "✨",
        })));
      }
      const patch: Record<string, unknown> = { goal, energy, onboarded: true };
      if (name && !profile?.name) patch.name = name;
      await update(patch);
      toast.success("Rotina criada pela IA!");
      nav({ to: "/dashboard" });
    } catch (e) {
      toast.error("Erro ao gerar rotina", { description: e instanceof Error ? e.message : "" });
      const patch: Record<string, unknown> = { goal, energy, onboarded: true };
      if (name && !profile?.name) patch.name = name;
      await update(patch);
      nav({ to: "/dashboard" });
    } finally {
      setBuilding(false);
    }
  };

  const skipToEnd = () => generateAndFinish(false);
  const finish = () => generateAndFinish(true);

  const steps = [
    {
      title: "Como podemos te chamar?",
      required: true,
      content: (
        <div className="space-y-4">
          <label htmlFor="name-input" className="sr-only">Seu nome</label>
          <input id="name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
            className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
          <div>
            <div className="text-xs text-muted-foreground mb-2">Objetivo principal</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button key={g} onClick={() => setGoal(g)}
                  className={`p-3 rounded-xl border text-left text-sm transition ${goal === g ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Como está sua energia hoje?",
      required: true,
      content: (
        <div className="grid grid-cols-3 gap-2">
          {(["cansado", "normal", "produtivo"] as const).map((e) => (
            <button key={e} onClick={() => setEnergy(e)}
              className={`p-4 rounded-xl border text-sm capitalize transition ${energy === e ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30"}`}>
              {e}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Quando você está disponível? (opcional)",
      required: false,
      content: (
        <div className="space-y-2">
          {SLOTS.map((s) => (
            <button key={s} onClick={() => toggleSlot(s)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border text-sm transition ${slots.includes(s) ? "border-primary/60 bg-primary/10" : "border-border hover:border-primary/30"}`}>
              <span>{s}</span>
              {slots.includes(s) && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Como é sua rotina hoje? (opcional)",
      required: false,
      content: (
        <textarea value={routine} onChange={(e) => setRoutine(e.target.value)} rows={5}
          placeholder="Ex: Acordo 7h, trabalho até 18h, gostaria de estudar à noite..."
          className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
      ),
    },
  ];

  const last = step === steps.length - 1;
  const current = steps[step];
  const canAdvance = step !== 0 || name.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-primary"><Sparkles className="w-4 h-4" /> Onboarding inteligente</div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Vamos montar sua rotina</h1>
      <p className="text-muted-foreground mt-1">Só 2 perguntas obrigatórias. O resto é opcional.</p>

      <div className="mt-6 flex items-center gap-2">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card-grad p-6 min-h-[280px]">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <h2 className="text-lg font-semibold mb-4">{current.title}</h2>
            {current.content}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-between">
        {!current.required && step >= 2 ? (
          <button onClick={skipToEnd} disabled={building}
            className="text-sm text-muted-foreground hover:text-foreground underline">
            Pular configuração avançada e começar agora
          </button>
        ) : <span />}

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="px-4 py-2.5 rounded-xl border border-border text-sm">Voltar</button>
          )}
          {!last ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-elegant inline-flex items-center gap-2 disabled:opacity-50">
              Próximo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={finish} disabled={building}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-elegant inline-flex items-center gap-2 disabled:opacity-60">
              {building ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando rotina...</> : <>Criar minha rotina <Sparkles className="w-4 h-4" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
