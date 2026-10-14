import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAuthedUserId } from "@/lib/google-oauth.server";

export const Route = createFileRoute("/api/google/disconnect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await getAuthedUserId(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        await supabaseAdmin.from("google_tokens").delete().eq("user_id", userId);
        return Response.json({ ok: true });
      },
    },
  },
});
