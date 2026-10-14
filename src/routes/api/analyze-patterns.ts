import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/analyze-patterns")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.replace(/^Bearer\s+/i, "");
          if (!token) return new Response("unauthorized", { status: 401 });

          const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const anon = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (!url || !anon) return new Response("misconfigured", { status: 500 });

          const supabase = createClient(url, anon, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false },
          });

          const { data: u } = await supabase.auth.getUser();
          const userId = u?.user?.id;
          if (!userId) return new Response("unauthorized", { status: 401 });

          const today = new Date().toISOString().slice(0, 10);
          const since3d = new Date(Date.now() - 3 * 86400000).toISOString();

          const [{ data: tasks }, { data: habits }, { data: completions }, { data: moods }, { data: existing }] = await Promise.all([
            supabase.from("tasks").select("id,done,due_date").eq("user_id", userId).eq("done", false),
            supabase.from("habits").select("id,name").eq("user_id", userId),
            supabase.from("habit_completions").select("habit_id, completed_on").eq("user_id", userId).gte("completed_on", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
            supabase.from("moods").select("mood, created_at").eq("user_id", userId).gte("created_at", since3d),
            supabase.from("notifications").select("type").eq("user_id", userId).gte("created_at", today),
          ]);

          const existingTypes = new Set((existing ?? []).map((n) => n.type));
          const inserts: { user_id: string; type: string; title: string; body: string }[] = [];

          // 1. overload
          const dueToday = (tasks ?? []).filter((t) => t.due_date === today).length;
          if (dueToday > 8 && !existingTypes.has("overload")) {
            inserts.push({ user_id: userId, type: "overload", title: "Agenda sobrecarregada",
              body: `Você tem ${dueToday} tarefas para hoje. Considere reorganizar com a IA.` });
          }

          // 2. habit at risk
          const moodMap: Record<string, number> = { feliz: 5, motivado: 5, focado: 4, ansioso: 2, cansado: 2, estressado: 1 };
          for (const h of habits ?? []) {
            const last = (completions ?? []).filter((c) => c.habit_id === h.id).map((c) => c.completed_on).sort().pop();
            const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : 999;
            if (daysSince >= 3 && !existingTypes.has(`habit_risk_${h.id}`)) {
              inserts.push({ user_id: userId, type: `habit_risk_${h.id}`, title: "Risco de quebrar sequência",
                body: `O hábito "${h.name}" não é completado há ${daysSince} dias.` });
              break; // one at a time
            }
          }

          // 3. low mood
          const recentMoods = moods ?? [];
          if (recentMoods.length >= 2) {
            const avg = recentMoods.reduce((a, m) => a + (moodMap[m.mood] ?? 3), 0) / recentMoods.length;
            if (avg < 2 && !existingTypes.has("low_mood")) {
              inserts.push({ user_id: userId, type: "low_mood", title: "Semana difícil detectada",
                body: "Seu humor médio está baixo. A IA pode sugerir uma rotina mais leve." });
            }
          }

          if (inserts.length) {
            await supabase.from("notifications").insert(inserts);
          }

          return new Response(JSON.stringify({ created: inserts.length }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("[analyze-patterns]", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
