import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — LifeSync AI" }] }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The recovery link sets a session via hash. Wait for auth state.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada!");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold tracking-tight">Nova senha</h1>
        <p className="text-sm text-muted-foreground mt-1">Defina uma nova senha para sua conta.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Senha</label>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input required type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={loading || !ready}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-elegant hover:bg-primary-hover disabled:opacity-60">
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}
