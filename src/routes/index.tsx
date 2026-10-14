import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import {
  Sparkles, Brain, Calendar, Target, BarChart3, Bot, ArrowRight,
  CheckCircle2, Battery, Zap, Star, Quote
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LifeSync AI — Produtividade com IA" },
      { name: "description", content: "Organize tarefas, hábitos e rotina com inteligência artificial. Plataforma SaaS premium de produtividade." },
      { property: "og:title", content: "LifeSync AI" },
      { property: "og:description", content: "Produtividade inteligente com IA." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
          <Logo size="sidebar" animated />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#beneficios" className="hover:text-foreground">Benefícios</a>
            <a href="#depoimentos" className="hover:text-foreground">Depoimentos</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm px-3 py-2 hover:text-primary">Entrar</Link>
            <Link to="/register" className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors">
              Começar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-hero" />
        {[...Array(10)].map((_, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute rounded-full bg-primary/50 blur-[1px] pointer-events-none"
            style={{
              width: 3 + (i % 4),
              height: 3 + (i % 4),
              left: `${8 + i * 9}%`,
              top: `${15 + (i * 7) % 60}%`,
            }}
            animate={{ y: [0, -24, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          />
        ))}
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex justify-center mb-8"
          >
            <Logo size="hero" animated compact />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs">
            <Sparkles className="w-3 h-3" /> Powered by AI · Lovable Cloud
          </motion.div>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            Sua rotina, <span className="text-primary">otimizada por IA</span>.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Planeje sua rotina com Inteligência Artificial. Tarefas, hábitos e horários
            organizados automaticamente para o seu melhor desempenho.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-elegant hover:bg-primary-hover transition-colors">
              Criar conta <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card hover:bg-card-hover transition-colors">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tudo o que você precisa em um só lugar</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Tarefas inteligentes, hábitos com streak, IA conversacional e relatórios em tempo real.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Bot, title: "Assistente IA", desc: "Chat inteligente que reorganiza sua agenda e sugere melhorias." },
            { icon: Target, title: "Hábitos & Streaks", desc: "Crie hábitos diários e acompanhe sua sequência." },
            { icon: Calendar, title: "Tarefas + Drag&Drop", desc: "CRUD completo, prioridades, categorias, horários." },
            { icon: Battery, title: "Modo Energia", desc: "Cansado, normal ou produtivo — a IA adapta seu dia." },
            { icon: BarChart3, title: "Relatórios", desc: "Gráficos de produtividade e foco semanal." },
            { icon: Brain, title: "Sugestões IA", desc: "Insights personalizados sobre sua rotina." },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card-grad p-6 hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="beneficios" className="bg-card-grad border-y border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Mais que um app de tarefas</h2>
            <p className="mt-4 text-muted-foreground">
              LifeSync AI aprende sua rotina e identifica padrões. Sabe quando você é mais produtivo,
              quando precisa descansar, e adapta tudo automaticamente.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Sincronização em tempo real",
                "Login com Google em 1 clique",
                "Dados seguros e privados",
                "Funciona em todos os dispositivos",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success" /> {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="rounded-2xl glass p-6 shadow-elegant">
              <div className="flex items-center gap-2 text-sm text-primary"><Zap className="w-4 h-4" /> Sugestão da IA</div>
              <p className="mt-3 text-sm">Você está mais produtivo das 14h às 17h. Movi suas tarefas de prioridade alta para esse intervalo. ✨</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {["Cansado","Normal","Produtivo"].map((m, i) => (
                  <div key={m} className={`p-2 rounded-lg border ${i === 2 ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{m}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight">Quem usa, recomenda</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            { name: "Marina S.", role: "Designer", text: "Aumentei minha produtividade em 40%. A IA realmente entende meu ritmo." },
            { name: "João P.", role: "Dev Sênior", text: "O modo energia mudou meu dia. Quando estou cansado, ele simplifica tudo." },
            { name: "Ana C.", role: "Estudante", text: "Os hábitos com streak me deram disciplina que eu nunca tive antes." },
          ].map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-card-grad p-6">
              <Quote className="w-5 h-5 text-primary" />
              <p className="mt-3 text-sm">{t.text}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30" />
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-warning text-warning" />)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
        <div className="mt-8 space-y-3">
          {[
            { q: "É grátis?", a: "Sim, você pode começar grátis e testar todos os recursos." },
            { q: "Meus dados estão seguros?", a: "Sim. Cada usuário tem acesso somente aos próprios dados, com criptografia de ponta." },
            { q: "Como a IA funciona?", a: "A IA analisa seu histórico, energia e padrões para sugerir reorganizações em tempo real." },
            { q: "Funciona no celular?", a: "Sim, é 100% responsivo — desktop, tablet e mobile." },
          ].map((f) => (
            <details key={f.q} className="rounded-xl border border-border bg-card p-4 group">
              <summary className="cursor-pointer font-medium flex justify-between items-center">{f.q}<span className="text-primary group-open:rotate-45 transition-transform">+</span></summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl border border-primary/30 bg-primary-grad p-12 text-center shadow-elegant">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">Pronto para transformar sua rotina?</h2>
          <p className="mt-3 text-primary-foreground/80">Comece grátis hoje. Sem cartão de crédito.</p>
          <Link to="/register" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-background text-foreground font-semibold hover:bg-card transition-colors">
            Criar conta <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-4">
            <Link to="/accessibility" className="text-xs text-muted-foreground hover:text-foreground">Acessibilidade</Link>
            <Link to="/design" className="text-xs text-muted-foreground hover:text-foreground">Design System</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 LifeSync AI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
