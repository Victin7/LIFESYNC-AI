import { createFileRoute } from "@tanstack/react-router";
import { getAuthedUserId, getOAuthConfig, getRedirectUri, signState, GOOGLE_SCOPES } from "@/lib/google-oauth.server";

export const Route = createFileRoute("/api/google/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userId = await getAuthedUserId(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });
        try {
          const { clientId } = getOAuthConfig();
          const redirectUri = getRedirectUri(request);
          const state = signState(userId);
          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: GOOGLE_SCOPES,
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: "true",
            state,
          });
          const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
          return Response.json({ url });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "error", { status: 500 });
        }
      },
    },
  },
});
