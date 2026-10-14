import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: "baixa" | "media" | "alta";
  time: string | null;
  due_date: string | null;
  done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  recurrence: "none" | "daily" | "weekly" | "monthly" | "custom";
  recurrence_days: number[];
  duration_min: number | null;
  energy: "baixa" | "media" | "alta";
  parent_task_id: string | null;
};

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  frequency: string;
  goal_per_week: number;
  streak: number;
  created_at: string;
};

export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  goal: string | null;
  energy: "cansado" | "normal" | "produtivo";
  notifications: boolean;
  ai_suggestions: boolean;
  onboarded: boolean;
  username: string | null;
  bio: string | null;
  profession: string | null;
  banner_url: string | null;
  motivational_quote: string | null;
  motivation_cache: string | null;
  motivation_cached_at: string | null;
  peak_hour: string | null;
  auto_rollover: boolean;
};

function notifyError(label: string, message: string) {
  toast.error(`Erro ao carregar ${label}`, { description: message });
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError(null);
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      notifyError("tarefas", error.message);
    } else if (data) setTasks(data as Task[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("tasks_rt").on("postgres_changes",
      { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
      () => refresh()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  return { tasks, loading, error, refresh };
}

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<{ habit_id: string; completed_on: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError(null);
    const [{ data: h, error: he }, { data: c, error: ce }] = await Promise.all([
      supabase.from("habits").select("*").order("created_at", { ascending: false }),
      supabase.from("habit_completions").select("habit_id, completed_on").gte("completed_on", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
    ]);
    const err = he ?? ce;
    if (err) {
      setError(err.message);
      notifyError("hábitos", err.message);
    } else {
      if (h) setHabits(h as Habit[]);
      if (c) setCompletions(c as { habit_id: string; completed_on: string }[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("habits_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "habits", filter: `user_id=eq.${user.id}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "habit_completions", filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  return { habits, completions, loading, error, refresh };
}

export type Goal = {
  id: string; user_id: string; title: string;
  type: "diaria" | "semanal" | "mensal";
  target: number; progress: number;
  period_start: string; period_end: string | null;
  archived: boolean; created_at: string; updated_at: string;
};

export type Mood = {
  id: string; user_id: string;
  mood: "motivado" | "cansado" | "ansioso" | "focado" | "estressado" | "feliz";
  note: string | null; created_at: string;
};

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!user) return;
    setError(null);
    const { data, error } = await supabase.from("goals").select("*").eq("archived", false).order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      notifyError("metas", error.message);
    } else if (data) setGoals(data as Goal[]);
    setLoading(false);
  }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("goals_rt").on("postgres_changes",
      { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${user.id}` },
      () => refresh()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);
  return { goals, loading, error, refresh };
}

export function useMoods(days = 30) {
  const { user } = useAuth();
  const [moods, setMoods] = useState<Mood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!user) return;
    setError(null);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await supabase.from("moods").select("*").gte("created_at", since).order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      notifyError("humores", error.message);
    } else if (data) setMoods(data as Mood[]);
    setLoading(false);
  }, [user, days]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("moods_rt").on("postgres_changes",
      { event: "*", schema: "public", table: "moods", filter: `user_id=eq.${user.id}` },
      () => refresh()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);
  return { moods, loading, error, refresh };
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError(null);
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) {
      setError(error.message);
      notifyError("perfil", error.message);
    } else if (data) setProfile(data as Profile);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const update = async (patch: Partial<Profile>) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    refresh();
  };

  return { profile, loading, error, refresh, update };
}
