import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function normalizeOAuthSecret(raw: string | undefined) {
  if (!raw) return null;

  let value = raw.trim();
  const envAssignment = value.match(/^[A-Z0-9_]+\s*=\s*(.+)$/s);
  if (envAssignment) value = envAssignment[1].trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value || null;
}

export function getOAuthConfig() {
  const clientId = normalizeOAuthSecret(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = normalizeOAuthSecret(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  if (!clientId || !clientSecret) throw new Error("Google OAuth não configurado");
  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID inválido");
  }
  return { clientId, clientSecret };
}

export function getRedirectUri(request: Request) {
  const url = new URL(request.url);
  return `${url.origin}/api/google/callback`;
}

const STATE_SECRET = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.GOOGLE_OAUTH_CLIENT_SECRET || "fallback";

export function signState(userId: string) {
  const payload = `${userId}.${Date.now()}`;
  const sig = createHmac("sha256", STATE_SECRET()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [userId, ts, sig] = decoded.split(".");
    if (!userId || !ts || !sig) return null;
    const expected = createHmac("sha256", STATE_SECRET()).update(`${userId}.${ts}`).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (Date.now() - Number(ts) > 10 * 60 * 1000) return null; // 10min
    return userId;
  } catch {
    return null;
  }
}

export async function exchangeCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getOAuthConfig();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(`Token exchange falhou: ${await r.text()}`);
  return r.json() as Promise<{
    access_token: string; refresh_token?: string; expires_in: number;
    scope: string; token_type: string; id_token?: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getOAuthConfig();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new Error(`Refresh falhou: ${await r.text()}`);
  return r.json() as Promise<{ access_token: string; expires_in: number; scope: string }>;
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const d = await r.json() as { email?: string };
    return d.email ?? null;
  } catch { return null; }
}

/** Returns a valid access token for the user, refreshing if needed. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("google_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const expiresAt = new Date(data.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return data.access_token;
  if (!data.refresh_token) return null;
  const fresh = await refreshAccessToken(data.refresh_token);
  const newExpires = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
  await supabaseAdmin.from("google_tokens").update({
    access_token: fresh.access_token, expires_at: newExpires, updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return fresh.access_token;
}

export async function getAuthedUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7));
  if (error || !data.user) return null;
  return data.user.id;
}
