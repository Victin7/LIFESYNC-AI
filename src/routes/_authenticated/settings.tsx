import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2, LogOut, Calendar as CalIcon, CheckCircle2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProfile, useTasks, useHabits, useGoals, useMoods } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — LifeSync AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const { profile, update } = useProfile();
  const { tasks } = useTasks();
  const { habits, completions } = useHabits();
  const { goals } = useGoals();
  const { moods } = useMoods(365);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [peakHour, setPeakHour] = useState("");
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setGoal(profile.goal ?? "");
      setPeakHour(profile.peak_hour ?? "");
    }
  }, [profile]);

  useEffect(() => {
    const t = (typeof window !== "undefined" && localStorage.getItem("ls_theme")) as "dark" | "light" | "system" | null;
    if (t) setTheme(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("google_tokens").select("user_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setGoogleConnected(!!data));
  }, [user]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const googleStatus = url.searchParams.get("google");
    if (googleStatus === "connected") {
      setGoogleConnected(true);
      toast.success("Google Calendar conectado com sucesso!");
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
    } else if (googleStatus?.startsWith("error")) {
      toast.error("Falha ao conectar Google Calendar", {
        description: decodeURIComponent(googleStatus.replace("error_", "").replace(/_/g, " ")),
      });
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const applyTheme = (t: "dark" | "light" | "system") => {
    setTheme(t);
    localStorage.setItem("ls_theme", t);
    const root = document.documentElement;
    const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", dark);
  };

  const saveProfile = async () => {
    await update({ name, goal, peak_hour: peakHour });
    toast.success("Perfil atualizado");
  };

  const exportData = () => {
    const payload = { exported_at: new Date().toISOString(), profile, tasks, habits, completions, goals, moods };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lifesync-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Dados exportados");
  };

  const deleteAccount = async () => {
    if (!user) return;
    // best-effort wipe of user data; auth user must be removed by support
    await Promise.all([
      supabase.from("tasks").delete().eq("user_id", user.id),
      supabase.from("habits").delete().eq("user_id", user.id),
      supabase.from("goals").delete().eq("user_id", user.id),
      supabase.from("moods").delete().eq("user_id", user.id),
      supabase.from("ai_memory").delete().eq("user_id", user.id),
      supabase.from("notifications").delete().eq("user_id", user.id),
    ]);
    await signOut();
    toast.success("Dados removidos. Entre em contato com o suporte para excluir o login.");
    nav({ to: "/" });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Personalize sua experiência.</p>
      </div>

      {/* Profile */}
      <Section title="Perfil">
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
        </Field>
        <Field label="Objetivo principal">
          <input value={goal} onChange={(e) => setGoal(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
        </Field>
        <Field label="Horário de pico de energia">
          <input type="time" value={peakHour} onChange={(e) => setPeakHour(e.target.value)}
            className="px-3 py-2 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm" />
        </Field>
        <button onClick={saveProfile}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-elegant hover:bg-primary-hover transition">
          Salvar
        </button>
      </Section>

      {/* Preferences */}
      <Section title="Preferências">
        <Toggle label="Notificações" desc="Receba lembretes de tarefas e hábitos."
          value={profile?.notifications ?? true}
          onChange={(v) => { update({ notifications: v }); toast.success("Salvo"); }} />
        <Toggle label="Sugestões da IA" desc="Permitir que a IA reorganize sua rotina."
          value={profile?.ai_suggestions ?? true}
          onChange={(v) => { update({ ai_suggestions: v }); toast.success("Salvo"); }} />
        <Toggle label="Rollover automático" desc="Tarefas pendentes migram para o dia seguinte."
          value={profile?.auto_rollover ?? true}
          onChange={(v) => { update({ auto_rollover: v }); toast.success("Salvo"); }} />
        <Field label="Tema">
          <div className="flex gap-2">
            {(["dark", "light", "system"] as const).map((t) => (
              <button key={t} onClick={() => applyTheme(t)} aria-pressed={theme === t}
                className={`px-3 py-2 rounded-xl border text-sm capitalize ${theme === t ? "border-primary bg-primary/15 text-primary" : "border-border hover:border-primary/30"}`}>
                {t}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* Integrations */}
      <Section title="Integrações">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <CalIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">Google Calendar</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {googleConnected ? <><CheckCircle2 className="w-3 h-3 text-success" /> Conectado</> : "Não conectado"}
              </div>
            </div>
          </div>
          {googleConnected ? (
            <button onClick={async () => {
              const { data } = await supabase.auth.getSession();
              const token = data.session?.access_token;
              if (!token) return;
              await fetch("/api/google/disconnect", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
              setGoogleConnected(false);
              toast.success("Desconectado");
            }} className="px-3 py-2 rounded-xl border border-border text-sm hover:border-destructive/40 hover:text-destructive transition">
              Desconectar
            </button>
          ) : (
            <button onClick={async () => {
              const { data } = await supabase.auth.getSession();
              const token = data.session?.access_token;
              if (!token) return;
              const res = await fetch("/api/google/connect", { headers: { Authorization: `Bearer ${token}` } });
              if (!res.ok) {
                const text = await res.text();
                toast.error("Não foi possível conectar ao Google", {
                  description: text.includes("não configurado")
                    ? "Credenciais OAuth não configuradas no servidor."
                    : "Tente novamente em alguns instantes.",
                });
                return;
              }
              const { url } = await res.json();
              if (url) window.location.href = url;
              else toast.error("URL de autenticação não retornada pelo servidor.");
            }} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition">
              Conectar
            </button>
          )}
        </div>
      </Section>

      {/* Data & account */}
      <Section title="Dados e conta">
        <button onClick={exportData}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-background/40 hover:border-primary/30 transition text-left">
          <Download className="w-4 h-4 text-primary" />
          <div className="flex-1">
            <div className="text-sm font-medium">Exportar meus dados</div>
            <div className="text-xs text-muted-foreground">Baixar tarefas, hábitos, metas e humores em JSON.</div>
          </div>
        </button>

        <button onClick={async () => { await signOut(); nav({ to: "/" }); }}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-background/40 hover:border-primary/30 transition text-left">
          <LogOut className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm font-medium">Sair da conta</div>
            <div className="text-xs text-muted-foreground">Você precisará entrar novamente.</div>
          </div>
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition text-left">
              <Trash2 className="w-4 h-4 text-destructive" />
              <div className="flex-1">
                <div className="text-sm font-medium text-destructive">Excluir conta</div>
                <div className="text-xs text-muted-foreground">Remove todos os seus dados permanentemente.</div>
              </div>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir todos os seus dados?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação remove permanentemente tarefas, hábitos, metas, humores e memória da IA. Para excluir o login em si, contate o suporte. Não é possível desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card-grad p-6 space-y-4">
      <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full relative transition-colors ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
