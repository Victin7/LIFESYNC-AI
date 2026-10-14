import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import logoImg from "@/assets/logo.png";
import { motion } from "framer-motion";
import { GoogleButton } from "@/components/GoogleButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — LifeSync AI" }] }),
  component: Login,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function Login() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password: pass });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao entrar", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta!");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex relative bg-card-grad border-r border-border p-10 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-hero" />
        {/* floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute rounded-full bg-primary/40 blur-[1px]"
            style={{
              width: 4 + (i % 3) * 2,
              height: 4 + (i % 3) * 2,
              left: `${15 + i * 13}%`,
              top: `${20 + (i * 11) % 60}%`,
            }}
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          />
        ))}
        <div className="relative"><Logo /></div>
        <div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative mb-6"
          >
            <div
              aria-hidden
              className="absolute inset-0 -m-10 rounded-full blur-3xl"
              style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 55%, transparent), transparent 70%)" }}
            />
            <motion.img
              src={logoImg}
              alt="LifeSync AI"
              className="relative w-[160px] h-[160px] object-contain drop-shadow-[0_0_40px_color-mix(in_oklab,var(--primary)_75%,transparent)]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <h2 className="text-[52px] leading-tight font-bold tracking-tight">LifeSync<span className="text-primary"> AI</span></h2>
          <p className="mt-3 text-muted-foreground max-w-sm">
            Planeje sua rotina com Inteligência Artificial.
          </p>
        </div>
        <div className="relative text-xs text-muted-foreground">© 2026 LifeSync AI</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8"><Logo /></div>
          <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesse sua conta para continuar.</p>

          <div className="mt-6"><GoogleButton /></div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />ou<div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">E-mail</label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-sm"
                  placeholder="voce@email.com" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground">Senha</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Esqueceu senha?</Link>
              </div>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input required type={show ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-sm"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-elegant hover:bg-primary-hover transition-colors disabled:opacity-60">
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta? <Link to="/register" className="text-primary hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
