// Pure helpers used across dashboard/reports — easy to unit-test.

export function greeting(date = new Date()): "Bom dia" | "Boa tarde" | "Boa noite" {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export const MOOD_SCORE: Record<string, number> = {
  feliz: 5, motivado: 5, focado: 4, ansioso: 2, cansado: 2, estressado: 1,
};

export type ScoreInput = {
  tasks: { done: boolean }[];
  habits: { streak: number }[];
  goals: { progress: number; target: number }[];
};

export function productivityScore({ tasks, habits, goals }: ScoreInput): number {
  const done = tasks.filter((t) => t.done).length;
  const taskScore = tasks.length ? (done / tasks.length) * 50 : 25;
  const maxStreak = habits.length ? Math.max(...habits.map((h) => h.streak)) : 0;
  const habitScore = habits.length ? Math.min(30, (maxStreak / 7) * 30) : 0;
  const goalScore = goals.length
    ? Math.min(20, (goals.reduce((a, g) => a + Math.min(1, g.progress / Math.max(1, g.target)), 0) / goals.length) * 20)
    : 0;
  return Math.round(taskScore + habitScore + goalScore);
}

export type RolloverTask = { done: boolean; due_date: string | null };

export function filterRolloverTasks<T extends RolloverTask>(tasks: T[], today = new Date()): T[] {
  const todayIso = today.toISOString().slice(0, 10);
  return tasks.filter((t) => !t.done && t.due_date !== null && t.due_date < todayIso);
}

export type WeekTask = { done: boolean; updated_at: string };

export function weekData<T extends WeekTask>(tasks: T[], now = Date.now()) {
  const days: { day: string; date: string; done: number; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const dayTasks = tasks.filter((t) => t.updated_at.slice(0, 10) === iso);
    days.push({
      day: label,
      date: iso,
      done: dayTasks.filter((t) => t.done).length,
      total: dayTasks.length,
    });
  }
  return days;
}
