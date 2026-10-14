import { supabase } from "@/integrations/supabase/client";

/** Fire-and-forget single-task sync to Google Calendar (no-op if not connected). */
export async function syncTaskToGoogle(taskId: string, action: "upsert" | "delete" = "upsert") {
  try {
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) return;
    await fetch("/api/google/sync-task", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, action }),
    });
  } catch {
    // silent
  }
}
