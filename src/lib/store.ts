import { useEffect, useState } from "react";

export type Priority = "baixa" | "media" | "alta";
export type Task = {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  time?: string;
  done: boolean;
  createdAt: number;
};

export type Habit = {
  id: string;
  name: string;
  icon?: string;
  streak: number;
  history: Record<string, boolean>; // ISO date -> done
  createdAt: number;
};

export type EnergyMode = "cansado" | "normal" | "produtivo";

export type Profile = {
  name: string;
  email: string;
  avatar?: string;
  goal: string;
  energy: EnergyMode;
};

const KEYS = {
  tasks: "ls_tasks",
  habits: "ls_habits",
  profile: "ls_profile",
  auth: "ls_auth",
  chat: "ls_chat",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

export function useLocal<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setVal(read(key, initial));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (hydrated) write(key, val);
  }, [key, val, hydrated]);
  return [val, setVal, hydrated] as const;
}

export const STORAGE_KEYS = KEYS;

export const seedTasks: Task[] = [
  { id: "t1", title: "Revisar metas da semana", category: "Trabalho", priority: "alta", time: "09:00", done: true, createdAt: Date.now() },
  { id: "t2", title: "Treino de força", category: "Saúde", priority: "media", time: "11:00", done: true, createdAt: Date.now() },
  { id: "t3", title: "Estudar React avançado", category: "Estudo", priority: "alta", time: "14:00", done: false, createdAt: Date.now() },
  { id: "t4", title: "Reunião com equipe", category: "Trabalho", priority: "media", time: "16:00", done: false, createdAt: Date.now() },
  { id: "t5", title: "Ler 20 páginas", category: "Pessoal", priority: "baixa", time: "21:00", done: false, createdAt: Date.now() },
];

export const seedHabits: Habit[] = [
  { id: "h1", name: "Beber 2L de água", icon: "💧", streak: 12, history: {}, createdAt: Date.now() },
  { id: "h2", name: "Meditar 10 min", icon: "🧘", streak: 7, history: {}, createdAt: Date.now() },
  { id: "h3", name: "Exercício diário", icon: "🏃", streak: 21, history: {}, createdAt: Date.now() },
  { id: "h4", name: "Leitura", icon: "📖", streak: 5, history: {}, createdAt: Date.now() },
];

export const defaultProfile: Profile = {
  name: "Alex Souza",
  email: "alex@lifesync.ai",
  goal: "Aumentar produtividade em 30%",
  energy: "normal",
};
