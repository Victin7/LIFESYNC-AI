import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar senha — LifeSync AI" }] }),
  component: Forgot,
});

const schema = z.object({ email: z.string().trim().email("E-mail inválido").max(255) });

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    setSent(true);
    toast.success("E-mail enviado!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold tracking-tight">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground mt-1">Enviaremos um link para redefinir sua senha.</p>
        {sent ? (
          <div className="mt-6 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
            Verifique seu e-mail e siga o link.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">E-mail</label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                  placeholder="voce@email.com" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-elegant hover:bg-primary-hover disabled:opacity-60">
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Voltar para login</Link>
        </p>
      </div>
    </div>
  );
}
