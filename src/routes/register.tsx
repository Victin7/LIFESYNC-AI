import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, Lock, User } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { GoogleButton } from "@/components/GoogleButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Criar conta — LifeSync AI" }] }),
  component: Register,
});

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(60),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function Register() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, password: pass });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { name: parsed.data.name },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
      return;
    }
    toast.success("Conta criada!", { description: "Confirme seu e-mail e faça login." });
    nav({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground mt-1">Comece grátis em menos de 1 minuto.</p>

        <div className="mt-6"><GoogleButton label="Cadastrar com Google" /></div>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />ou<div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field icon={<User className="w-4 h-4" />} label="Nome" value={name} onChange={setName} placeholder="Seu nome" />
          <Field icon={<Mail className="w-4 h-4" />} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@email.com" />
          <Field icon={<Lock className="w-4 h-4" />} label="Senha" type="password" value={pass} onChange={setPass} placeholder="••••••••" />
          <button type="submit" disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-elegant hover:bg-primary-hover transition-colors disabled:opacity-60">
            {submitting ? "Criando..." : "Criar conta"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, label, value, onChange, type = "text", placeholder }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <input required type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-sm" />
      </div>
    </div>
  );
}
