import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAuthedUserId, getValidAccessToken } from "@/lib/google-oauth.server";

const GCAL = "https://www.googleapis.com/calendar/v3";

function eventBody(t: { title: string; description: string | null; due_date: string | null; time: string | null }) {
  if (!t.due_date) throw new Error("Task without due_date");
  if (t.time) {
    const start = new Date(`${t.due_date}T${t.time}:00`);
    return {
      summary: t.title,
      description: t.description ?? "Criado via LifeSync AI",
      start: { dateTime: start.toISOString() },
      end: { dateTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString() },
    };
  }
  return {
    summary: t.title,
    description: t.description ?? "Criado via LifeSync AI",
    start: { date: t.due_date },
    end: { date: t.due_date },
  };
}

/** Upsert a single task to Google Calendar (used by frontend right after task save). */
export const Route = createFileRoute("/api/google/sync-task")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await getAuthedUserId(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const accessToken = await getValidAccessToken(userId);
        if (!accessToken) return Response.json({ skipped: "not_connected" });
        try {
          const { taskId, action } = await request.json() as { taskId: string; action?: "upsert" | "delete" };
          const { data: task } = await supabaseAdmin
            .from("tasks").select("id,title,description,due_date,time,google_event_id,done")
            .eq("id", taskId).eq("user_id", userId).maybeSingle();
          if (!task) return new Response("Not found", { status: 404 });

          // Delete from Google if requested or if task done/no due_date
          if (action === "delete" || task.done || !task.due_date) {
            if (task.google_event_id) {
              await fetch(`${GCAL}/calendars/primary/events/${task.google_event_id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              await supabaseAdmin.from("tasks").update({ google_event_id: null }).eq("id", task.id);
            }
            return Response.json({ ok: true, action: "deleted" });
          }

          if (task.google_event_id) {
            const r = await fetch(`${GCAL}/calendars/primary/events/${task.google_event_id}`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(eventBody(task)),
            });
            if (!r.ok) throw new Error(`Google ${r.status}: ${await r.text()}`);
            return Response.json({ ok: true, action: "updated" });
          }

          const r = await fetch(`${GCAL}/calendars/primary/events`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(eventBody(task)),
          });
          if (!r.ok) throw new Error(`Google ${r.status}: ${await r.text()}`);
          const ev = await r.json() as { id: string };
          await supabaseAdmin.from("tasks").update({ google_event_id: ev.id }).eq("id", task.id);
          return Response.json({ ok: true, action: "created" });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "error", { status: 500 });
        }
      },
    },
  },
});
