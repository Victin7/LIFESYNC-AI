import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Palette, Type, LayoutDashboard, Eye, Sparkles, ArrowLeft,
  CheckCircle2, Loader2, AlertTriangle, MousePointer2, Wand2,
} from "lucide-react";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "Design System — LifeSync AI" },
      { name: "description", content: "Justificativa do design do LifeSync AI: paleta, tipografia, navegação e hierarquia." },
    ],
  }),
  component: DesignPage,
});

const SWATCHES = [
  { name: "Background", hex: "#0F172A" },
  { name: "Card", hex: "#1E293B" },
  { name: "Primary", hex: "#3B82F6" },
  { name: "Success", hex: "#22C55E" },
  { name: "Warning", hex: "#F59E0B" },
  { name: "Destructive", hex: "#EF4444" },
];

const TYPE_SCALE = [
  { label: "Labels", size: "12px" },
  { label: "Corpo", size: "14px" },
  { label: "Subtítulos", size: "16px" },
  { label: "Títulos", size: "20–24px" },
  { label: "Hero", size: "32–48px" },
];

const FEEDBACK = [
  { icon: CheckCircle2, text: "Toast de sucesso/erro em cada ação (Sonner)." },
  { icon: Loader2, text: "Skeleton durante carregamento — sem tela em branco." },
  { icon: AlertTriangle, text: "ErrorState com botão de retry para falhas de rede." },
  { icon: MousePointer2, text: "Hover e focus visíveis em todos os elementos." },
  { icon: Wand2, text: "Animações sutis com Framer Motion — nunca distrativas." },
];

function Section({ icon: Icon, title, children }: { icon: typeof Palette; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card-grad p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
          <Icon className="w-5 h-5" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="mt-4 text-sm text-muted-foreground space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

function DesignPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <header className="mt-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Design System — LifeSync AI</h1>
          <p className="mt-2 text-muted-foreground">Decisões visuais e a justificativa por trás de cada escolha.</p>
        </header>

        <div className="mt-10 grid gap-5">
          <Section icon={Palette} title="Por que Midnight Blue?">
            <p>O fundo escuro reduz fadiga ocular para usuários que usam o app à noite — contexto comum em ferramentas de produtividade pessoal.</p>
            <p>O azul primário <span className="text-primary font-medium">#3B82F6</span> é associado a confiança, foco e tecnologia, criando uma identidade calma e profissional.</p>
            <p>Verde, amarelo e vermelho seguem o padrão universal de semáforo: sucesso, aviso e erro — reconhecíveis sem precisar de explicação.</p>
            <div className="mt-5 grid grid-cols-3 md:grid-cols-6 gap-3">
              {SWATCHES.map((s) => (
                <div key={s.name} className="flex flex-col items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-lg border border-border shadow-elegant"
                    style={{ background: s.hex }}
                    aria-label={`Swatch ${s.name} ${s.hex}`}
                  />
                  <div className="text-xs font-medium text-foreground">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{s.hex}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={Type} title="Inter + Poppins: legibilidade primeiro">
            <p><span className="text-foreground font-medium">Inter</span>: fonte humanista otimizada para telas, com alta legibilidade em tamanhos pequenos — ideal para listas densas de tarefas e métricas.</p>
            <p><span className="text-foreground font-medium">Poppins</span> como fallback: geométrica e moderna, mantém o caráter dos headings caso Inter não carregue.</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              {TYPE_SCALE.map((t) => (
                <div key={t.label} className="rounded-lg border border-border bg-background/40 p-3 text-center">
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                  <div className="text-sm font-semibold text-foreground mt-1">{t.size}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={LayoutDashboard} title="Sidebar: por que à esquerda?">
            <p>Padrão mental estabelecido pelos principais SaaS (Notion, Linear, Slack) — o usuário já sabe onde procurar.</p>
            <p>Permite escaneamento rápido de navegação sem mover o olhar da área de conteúdo principal.</p>
            <p>No mobile, vira hambúrguer com overlay — evita consumir espaço vertical valioso em telas pequenas.</p>
            <p><code className="text-primary">aria-current</code> garante que o usuário (e leitores de tela) sempre saibam em qual seção estão.</p>
          </Section>

          <Section icon={Eye} title="O que o usuário vê primeiro">
            <p>A hierarquia do <span className="text-foreground font-medium">Dashboard</span> foi pensada para responder, em ordem: <em>como estou hoje?</em>, <em>como estou na semana?</em>, <em>o que faço agora?</em></p>
            <ul className="mt-2 space-y-2 list-disc list-inside">
              <li><span className="text-foreground">Score de produtividade</span> (RadialBar) no topo — número mais importante do dia.</li>
              <li><span className="text-foreground">Gráfico semanal</span> abaixo — contexto histórico imediato.</li>
              <li><span className="text-foreground">Tarefas pendentes</span> — ação imediata, sem rolagem extra.</li>
              <li><span className="text-foreground">Mood tracker rápido</span> — input de 1 clique para não interromper o fluxo.</li>
            </ul>
          </Section>

          <Section icon={Sparkles} title="O app sempre responde">
            <ul className="space-y-3">
              {FEEDBACK.map((f) => (
                <li key={f.text} className="flex gap-3 items-start">
                  <f.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
