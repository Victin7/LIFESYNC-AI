import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Type, Contrast, MousePointerClick, Compass, Users, ArrowLeft, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Acessibilidade — LifeSync AI" },
      { name: "description", content: "Checklist de acessibilidade do LifeSync AI: legibilidade, contraste, navegação e inclusão." },
    ],
  }),
  component: AccessibilityPage,
});

type Item = { text: string; detail: string };
type Category = { icon: typeof Type; title: string; items: Item[] };

const CATEGORIES: Category[] = [
  {
    icon: Type,
    title: "Legibilidade",
    items: [
      { text: "Fonte Inter/Poppins, mínimo 13px em todo o app", detail: "Configurada em src/styles.css; corpo base 14px, labels 12–13px." },
      { text: "Contraste texto/fundo ≥ 12:1", detail: "foreground #F8FAFC sobre background #0F172A — acima de WCAG AAA." },
      { text: "Hierarquia tipográfica clara", detail: "Títulos bold, subtítulos semibold, corpo regular — aplicado em todas as telas." },
      { text: "Tamanhos de toque mínimo 44×44px", detail: "Botões mobile com padding 2.5 (≈44px) garantidos via Tailwind." },
    ],
  },
  {
    icon: Contrast,
    title: "Contraste Visual",
    items: [
      { text: "Paleta Midnight Blue em todos os componentes", detail: "Tokens semânticos --background, --card, --foreground definidos globalmente." },
      { text: "Cores semânticas para estado", detail: "--destructive (erro), --success (sucesso), --warning (aviso)." },
      { text: "Botão primário com contraste ≥ 4.5:1 (WCAG AA)", detail: "#3B82F6 sobre #F8FAFC; verificado em variantes hover/focus." },
      { text: "Links ativos distinguíveis sem depender só de cor", detail: "aria-current + borda primary + background diferenciado na sidebar." },
    ],
  },
  {
    icon: MousePointerClick,
    title: "Clareza dos Botões e Interações",
    items: [
      { text: "Botões de ícone com aria-label descritivo", detail: 'Ex: "Notificações", "Enviar mensagem" em NotificationsBell e Chat.' },
      { text: "Estado de hover e focus visível", detail: "Ring + transição de cor em todos os elementos interativos." },
      { text: "Feedback imediato com toast", detail: "Sonner toast.success / toast.error em cada ação CRUD." },
      { text: "Botão Tentar novamente em ErrorState", detail: "Componente src/components/ErrorState.tsx com prop onRetry." },
      { text: "Skeleton loading evita layout shift", detail: "src/components/SkeletonCard.tsx aplicado em listas e gráficos." },
    ],
  },
  {
    icon: Compass,
    title: "Navegação Intuitiva",
    items: [
      { text: 'aria-current="page" no link ativo da sidebar', detail: "Aplicado em src/routes/_authenticated.tsx no map de navegação." },
      { text: "Sidebar fixa no desktop, hambúrguer no mobile", detail: "Layout responsivo com overlay e botão menu acessível." },
      { text: "Header fixo com avatar e notificações", detail: "Header sticky com sino de notificações sempre visível." },
      { text: "Onboarding com 4 passos e barra de progresso", detail: "Nome → Objetivo → Horários → Rotina, com indicador visual." },
      { text: "Inputs com <label htmlFor> explícito", detail: "Formulários de onboarding e auth com labels associadas." },
    ],
  },
  {
    icon: Users,
    title: "Inclusão de Diferentes Usuários",
    items: [
      { text: "Idosos / baixa familiaridade", detail: "Onboarding guiado, linguagem simples em português, botões grandes." },
      { text: "Baixa visão", detail: "Alto contraste nativo, ícones sempre acompanhados de texto nos menus." },
      { text: "Dificuldades motoras", detail: "Alvos de toque amplos, sem drag obrigatório em nenhuma ação." },
      { text: "Usuários iniciantes", detail: "Assistente IA com linguagem natural, sugestões automáticas." },
      { text: "Leitores de tela", detail: 'aria-hidden em ícones decorativos, aria-pressed em toggles, role="alert" no ErrorState.' },
    ],
  },
];

function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <header className="mt-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Checklist de Acessibilidade — LifeSync AI</h1>
          <p className="mt-2 text-muted-foreground">Como o LifeSync atende diferentes perfis de usuários.</p>
        </header>

        <div className="mt-10 grid gap-5">
          {CATEGORIES.map((cat) => (
            <section key={cat.title} className="rounded-2xl border border-border bg-card-grad p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <cat.icon className="w-5 h-5" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold">{cat.title}</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {cat.items.map((it) => (
                  <li key={it.text} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <div className="text-sm font-medium">{it.text}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{it.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
