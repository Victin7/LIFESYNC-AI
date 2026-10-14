import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAuthedUserId } from "@/lib/google-oauth.server";

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Compute next due_date for a recurring task given last due_date
function nextOccurrence(rec: string, days: number[], from: Date): Date | null {
  if (rec === "daily") return addDays(from, 1);
  if (rec === "weekly") {
    if (!days.length) return addDays(from, 7);
    for (let i = 1; i <= 7; i++) {
      const cand = addDays(from, i);
      if (days.includes(cand.getDay())) return cand;
    }
    return null;
  }
  if (rec === "monthly") { const x = new Date(from); x.setMonth(x.getMonth() + 1); return x; }
  return null;
}

export const Route = createFileRoute("/api/rollover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await getAuthedUserId(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const today = ymd(new Date());

        // Skip if already ran today
        const { data: prof } = await supabaseAdmin
          .from("profiles").select("last_rollover_date").eq("id", userId).maybeSingle();
        if (prof?.last_rollover_date === today) {
          return Response.json({ skipped: true });
        }

        let movedCount = 0;
        let createdCount = 0;

        // 1. Move incomplete past tasks (non-recurring) to today
        const { data: pending } = await supabaseAdmin
          .from("tasks")
          .select("id")
          .eq("user_id", userId)
          .eq("done", false)
          .lt("due_date", today)
          .eq("recurrence", "none");
        if (pending?.length) {
          await supabaseAdmin.from("tasks").update({ due_date: today }).in("id", pending.map((t) => t.id));
          movedCount = pending.length;
        }

        // 2. Generate next instances for recurring tasks
        const { data: recs } = await supabaseAdmin
          .from("tasks")
          .select("id,title,description,category,priority,time,due_date,recurrence,recurrence_days,duration_min,energy,parent_task_id")
          .eq("user_id", userId)
          .neq("recurrence", "none");

        for (const t of recs ?? []) {
          // Find latest instance for this recurring chain
          const parentId = t.parent_task_id ?? t.id;
          const { data: latest } = await supabaseAdmin
            .from("tasks").select("id,due_date")
            .eq("user_id", userId)
            .or(`id.eq.${parentId},parent_task_id.eq.${parentId}`)
            .order("due_date", { ascending: false }).limit(1).maybeSingle();
          if (!latest?.due_date) continue;
          const next = nextOccurrence(t.recurrence, t.recurrence_days ?? [], new Date(latest.due_date + "T12:00:00"));
          if (!next) continue;
          if (ymd(next) > today) continue; // not due yet
          // Avoid duplicates
          const { data: exists } = await supabaseAdmin
            .from("tasks").select("id").eq("user_id", userId).eq("parent_task_id", parentId).eq("due_date", ymd(next)).maybeSingle();
          if (exists) continue;
          await supabaseAdmin.from("tasks").insert({
            user_id: userId,
            title: t.title,
            description: t.description,
            category: t.category,
            priority: t.priority,
            time: t.time,
            due_date: ymd(next),
            recurrence: "none", // instance is one-off
            duration_min: t.duration_min,
            energy: t.energy,
            parent_task_id: parentId,
          });
          createdCount++;
        }

        await supabaseAdmin.from("profiles").update({ last_rollover_date: today }).eq("id", userId);
        return Response.json({ moved: movedCount, created: createdCount });
      },
    },
  },
});
