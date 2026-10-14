import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { exchangeCode, getRedirectUri, getUserEmail, verifyState } from "@/lib/google-oauth.server";

export const Route = createFileRoute("/api/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const back = (status: string): Response => Response.redirect(`${url.origin}/settings?google=${status}`, 302) as Response;
        if (error) return back(`error_${encodeURIComponent(error)}`);
        if (!code || !state) return back("error_missing");
        const userId = verifyState(state);
        if (!userId) return back("error_state");
        try {
          const redirectUri = getRedirectUri(request);
          const tok = await exchangeCode(code, redirectUri);
          const email = await getUserEmail(tok.access_token);
          const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();
          const { error: dbErr } = await supabaseAdmin.from("google_tokens").upsert({
            user_id: userId,
            access_token: tok.access_token,
            refresh_token: tok.refresh_token ?? null,
            expires_at: expiresAt,
            scope: tok.scope,
            google_email: email,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
          if (dbErr) throw dbErr;
          return back("connected");
        } catch (e) {
          console.error("OAuth callback error:", e);
          return back(`error_${encodeURIComponent(e instanceof Error ? e.message : "unknown")}`);
        }
      },
    },
  },
});
