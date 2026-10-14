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

export const Route = createFileRoute("/api/calendar-sync")({
  server: {
    handlers: {
      // Import upcoming events from user's Google Calendar -> tasks
      GET: async ({ request }) => {
        const userId = await getAuthedUserId(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const accessToken = await getValidAccessToken(userId);
        if (!accessToken) return new Response("Google não conectado", { status: 412 });
        try {
          const timeMin = new Date().toISOString();
          const timeMax = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString();
          const url = `${GCAL}/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`;
          const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!r.ok) throw new Error(`Google API ${r.status}: ${await r.text()}`);
          const data = await r.json() as { items?: Array<{ id: string; summary?: string; description?: string; start?: { dateTime?: string; date?: string } }> };
          const items = data.items ?? [];
          let imported = 0;
          for (const ev of items) {
            const title = ev.summary?.trim();
            if (!title) continue;
            const startStr = ev.start?.dateTime ?? ev.start?.date;
            if (!startStr) continue;
            const d = new Date(startStr);
            const due_date = d.toISOString().slice(0, 10);
            const time = ev.start?.dateTime ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : null;
            const { data: existing } = await supabaseAdmin
              .from("tasks").select("id").eq("user_id", userId).eq("google_event_id", ev.id).maybeSingle();
            if (existing) continue;
            const { error } = await supabaseAdmin.from("tasks").insert({
              user_id: userId, title, due_date, time,
              category: "Google Calendar", priority: "media",
              google_event_id: ev.id,
              description: ev.description ?? null,
            });
            if (!error) imported++;
          }
          await supabaseAdmin.from("google_tokens").update({ last_sync_at: new Date().toISOString() }).eq("user_id", userId);
          return Response.json({ imported, total: items.length });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "error", { status: 500 });
        }
      },
      // Export all upcoming tasks (with due_date) -> Google Calendar
      POST: async ({ request }) => {
        const userId = await getAuthedUserId(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const accessToken = await getValidAccessToken(userId);
        if (!accessToken) return new Response("Google não conectado", { status: 412 });
        try {
          const today = new Date().toISOString().slice(0, 10);
          const { data: tasks, error } = await supabaseAdmin
            .from("tasks").select("id,title,description,due_date,time,google_event_id")
            .eq("user_id", userId).eq("done", false).gte("due_date", today).limit(100);
          if (error) throw error;
          let exported = 0;
          for (const t of tasks ?? []) {
            if (!t.due_date) continue;
            if (t.google_event_id) continue; // already synced
            const r = await fetch(`${GCAL}/calendars/primary/events`, {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(eventBody(t)),
            });
            if (r.ok) {
              const ev = await r.json() as { id: string };
              await supabaseAdmin.from("tasks").update({ google_event_id: ev.id }).eq("id", t.id);
              exported++;
            }
          }
          await supabaseAdmin.from("google_tokens").update({ last_sync_at: new Date().toISOString() }).eq("user_id", userId);
          return Response.json({ exported, total: tasks?.length ?? 0 });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "error", { status: 500 });
        }
      },
    },
  },
});
