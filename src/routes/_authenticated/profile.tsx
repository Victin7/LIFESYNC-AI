import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Camera, Trash2, Save, LogOut, Lock, Mail, User as UserIcon, Briefcase,
  Sparkles, Trophy, Flame, CheckCircle2, Target, Calendar as CalIcon, Quote, Loader2, Shield, AtSign,
} from "lucide-react";
import { useProfile, useTasks, useHabits, useGoals } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Perfil — LifeSync AI" }] }),
  component: ProfilePage,
});

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3MB
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

function ProfilePage() {
  const { user, signOut } = useAuth();
  const { profile, update } = useProfile();
  const { tasks } = useTasks();
  const { habits } = useHabits();
  const { goals } = useGoals();
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [profession, setProfession] = useState("");
  const [goal, setGoal] = useState("");
  const [quote, setQuote] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setProfession(profile.profession ?? "");
    setGoal(profile.goal ?? "");
    setQuote(profile.motivational_quote ?? "");
  }, [profile]);

  // ---- Stats ----
  const stats = useMemo(() => {
    const doneTasks = tasks.filter((t) => t.done).length;
    const totalTasks = tasks.length;
    const productivity = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const maxStreak = habits.length ? Math.max(...habits.map((h) => h.streak)) : 0;
    const goalsDone = goals.filter((g) => (g.progress ?? 0) >= (g.target ?? 1)).length;
    // XP: 10 por tarefa concluída + 25 por meta + 5 por dia de streak máximo
    const xp = doneTasks * 10 + goalsDone * 25 + maxStreak * 5;
    const level = Math.max(1, Math.floor(Math.sqrt(xp / 25)) + 1);
    const xpForCurrent = (level - 1) * (level - 1) * 25;
    const xpForNext = level * level * 25;
    const xpInLevel = xp - xpForCurrent;
    const xpNeeded = xpForNext - xpForCurrent;
    const levelPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
    return { doneTasks, totalTasks, productivity, maxStreak, habitsCount: habits.length, goalsDone, goalsTotal: goals.length, xp, level, levelPct, xpInLevel, xpNeeded };
  }, [tasks, habits, goals]);

  const achievements = useMemo(() => [
    { key: "first_task", label: "Primeira tarefa", icon: CheckCircle2, unlocked: stats.doneTasks >= 1 },
    { key: "ten_tasks", label: "10 tarefas concluídas", icon: CheckCircle2, unlocked: stats.doneTasks >= 10 },
    { key: "fifty_tasks", label: "50 tarefas concluídas", icon: Trophy, unlocked: stats.doneTasks >= 50 },
    { key: "streak_7", label: "Streak de 7 dias", icon: Flame, unlocked: stats.maxStreak >= 7 },
    { key: "streak_30", label: "Streak de 30 dias", icon: Flame, unlocked: stats.maxStreak >= 30 },
    { key: "first_goal", label: "Primeira meta batida", icon: Target, unlocked: stats.goalsDone >= 1 },
  ], [stats]);

  // ---- Save profile ----
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { toast.error("Nome muito curto"); return; }
    if (username && !/^[a-z0-9_.]{3,20}$/i.test(username)) {
      toast.error("Username: 3-20 letras, números, _ ou ."); return;
    }
    setSaving(true);
    await update({
      name: name.trim(),
      username: username.trim() || null,
      bio: bio.trim() || null,
      profession: profession.trim() || null,
      goal: goal.trim() || null,
      motivational_quote: quote.trim() || null,
    });
    setSaving(false);
    toast.success("Perfil atualizado ✨");
  };

  // ---- Avatar upload ----
  const onPickFile = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!ACCEPT.includes(file.type)) { toast.error("Use JPG, PNG ou WEBP"); return; }
    if (file.size > MAX_AVATAR_BYTES) { toast.error("Máx 3MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploading(false); toast.error("Erro no upload", { description: upErr.message }); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    // Best-effort cleanup of older avatars
    if (profile?.avatar_url) {
      const old = profile.avatar_url.split("/avatars/")[1]?.split("?")[0];
      if (old && old !== path && old.startsWith(`${user.id}/`)) {
        await supabase.storage.from("avatars").remove([old]).catch(() => {});
      }
    }
    await update({ avatar_url: url });
    setUploading(false);
    toast.success("Foto atualizada");
  };

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_url) return;
    const old = profile.avatar_url.split("/avatars/")[1]?.split("?")[0];
    if (old && old.startsWith(`${user.id}/`)) {
      await supabase.storage.from("avatars").remove([old]).catch(() => {});
    }
    await update({ avatar_url: null });
    toast.success("Foto removida");
  };

  // ---- Password change ----
  const changePassword = async () => {
    if (newPw.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada"); setNewPw(""); setPwOpen(false); }
  };

  const logout = async () => {
    await signOut();
    nav({ to: "/login" });
  };

  const initial = (name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const memberSince = profile ? new Date((profile as unknown as { created_at?: string }).created_at ?? Date.now()).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "—";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* HEADER COM BANNER */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden border border-border bg-card-grad">
        <div className="h-36 md:h-44 bg-gradient-to-br from-primary/40 via-primary/20 to-transparent relative">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)),transparent_60%)]" />
        </div>
        <div className="px-5 md:px-8 pb-6 -mt-14 md:-mt-16 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="relative group">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl border-4 border-card overflow-hidden bg-primary/15 shadow-elegant ring-2 ring-primary/30">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary">{initial}</div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}
            </div>
            <button onClick={onPickFile} disabled={uploading}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary text-primary-foreground shadow-elegant hover:bg-primary-hover transition disabled:opacity-50">
              <Camera className="w-4 h-4" />
            </button>
            {profile?.avatar_url && (
              <button onClick={removeAvatar}
                className="absolute -top-2 -right-2 p-1.5 rounded-lg bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            <input ref={fileRef} type="file" accept={ACCEPT.join(",")} onChange={onFile} className="hidden" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{name || "Seu nome"}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              {username && <span className="flex items-center gap-1"><AtSign className="w-3.5 h-3.5" />{username}</span>}
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user?.email}</span>
              <span className="flex items-center gap-1"><CalIcon className="w-3.5 h-3.5" />Membro desde {memberSince}</span>
            </div>
            {bio && <p className="mt-2 text-sm text-foreground/80 max-w-2xl">{bio}</p>}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-semibold">
              <Trophy className="w-4 h-4" /> Nível {stats.level}
            </div>
            <div className="text-xs text-muted-foreground">{stats.xp} XP</div>
          </div>
        </div>
      </motion.div>

      {/* XP BAR + STATS */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card-grad p-5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-medium"><Sparkles className="w-4 h-4 text-primary" /> Progresso de nível</div>
            <div className="text-muted-foreground text-xs">{stats.xpInLevel} / {stats.xpNeeded} XP</div>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-background/60 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.levelPct}%` }} transition={{ duration: 0.8 }}
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <Stat icon={CheckCircle2} label="Tarefas feitas" value={`${stats.doneTasks}`} sub={`${stats.productivity}% taxa`} />
            <Stat icon={Flame} label="Maior streak" value={`${stats.maxStreak}d`} sub={`${stats.habitsCount} hábitos`} />
            <Stat icon={Target} label="Metas batidas" value={`${stats.goalsDone}`} sub={`de ${stats.goalsTotal}`} />
            <Stat icon={Trophy} label="Nível atual" value={`${stats.level}`} sub={`${stats.xp} XP total`} />
          </div>
        </div>

        {/* Frase motivacional */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5 flex flex-col">
          <div className="flex items-center gap-2 text-sm font-medium"><Quote className="w-4 h-4 text-primary" /> Sua frase</div>
          <p className="mt-3 italic text-sm flex-1">{quote || "Adicione uma frase que te motiva todos os dias."}</p>
        </div>
      </div>

      {/* CONQUISTAS */}
      <div className="rounded-2xl border border-border bg-card-grad p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-medium"><Trophy className="w-4 h-4 text-primary" /> Conquistas</div>
          <div className="text-xs text-muted-foreground">{achievements.filter((a) => a.unlocked).length} / {achievements.length}</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {achievements.map((a) => (
            <div key={a.key}
              className={`p-3 rounded-xl border text-center transition ${
                a.unlocked ? "bg-primary/10 border-primary/40 text-primary" : "bg-background/40 border-border text-muted-foreground opacity-60"
              }`}>
              <a.icon className="w-6 h-6 mx-auto" />
              <div className="text-[11px] mt-2 leading-tight">{a.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* INFO PESSOAL */}
      <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card-grad p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Informações pessoais</h2>
            <p className="text-xs text-muted-foreground">Personalize seu perfil. A IA usa esses dados.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nome" icon={UserIcon}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
              className="input-field" placeholder="Seu nome" />
          </Field>
          <Field label="Username" icon={AtSign}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20}
              className="input-field" placeholder="seu_username" />
          </Field>
          <Field label="Profissão" icon={Briefcase}>
            <input value={profession} onChange={(e) => setProfession(e.target.value)} maxLength={60}
              className="input-field" placeholder="Ex: Estudante, Designer..." />
          </Field>
          <Field label="Meta principal" icon={Target}>
            <input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={120}
              className="input-field" placeholder="Ex: Aumentar produtividade" />
          </Field>
          <Field label="Bio" icon={UserIcon} full>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={2}
              className="input-field resize-none" placeholder="Fale um pouco sobre você (max 200)" />
            <div className="text-[10px] text-muted-foreground mt-1 text-right">{bio.length}/200</div>
          </Field>
          <Field label="Frase motivacional" icon={Quote} full>
            <input value={quote} onChange={(e) => setQuote(e.target.value)} maxLength={140}
              className="input-field" placeholder="A frase que te impulsiona" />
          </Field>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-elegant hover:bg-primary-hover disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </button>
        </div>
      </form>

      {/* SEGURANÇA */}
      <div className="rounded-2xl border border-border bg-card-grad p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">Segurança e conta</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-4 bg-background/30">
            <div className="flex items-center gap-2 text-sm font-medium"><Lock className="w-4 h-4" /> Alterar senha</div>
            {pwOpen ? (
              <div className="mt-3 flex gap-2">
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Nova senha" className="input-field flex-1" />
                <button onClick={changePassword} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Salvar</button>
                <button onClick={() => { setPwOpen(false); setNewPw(""); }} className="px-3 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setPwOpen(true)} className="mt-3 text-sm text-primary hover:underline">Definir nova senha →</button>
            )}
          </div>
          <div className="rounded-xl border border-border p-4 bg-background/30">
            <div className="flex items-center gap-2 text-sm font-medium"><LogOut className="w-4 h-4" /> Sair da conta</div>
            <p className="text-xs text-muted-foreground mt-1">Encerra sua sessão neste dispositivo.</p>
            <button onClick={logout} className="mt-3 text-sm text-destructive hover:underline">Fazer logout →</button>
          </div>
        </div>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.75rem;
          background: hsl(var(--input));
          border: 1px solid hsl(var(--border));
          font-size: 0.875rem;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .input-field:focus {
          border-color: hsl(var(--primary) / 0.5);
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, icon: Icon, full, children }: { label: string; icon: React.ElementType; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5"><Icon className="w-3.5 h-3.5" />{label}</label>
      {children}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="mt-1.5 text-xl font-bold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
