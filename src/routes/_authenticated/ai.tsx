import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Send, Sparkles, Bot, User as UserIcon, Loader2, Plus, Trash2, MessageSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useTasks, useHabits, useGoals, useMoods } from "@/lib/db";
import logoImg from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [{ title: "Assistente IA — LifeSync AI" }] }),
  component: AIChat,
});

type Msg = { id?: string; role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; updated_at: string };

const suggestions = [
  "Organize meu dia",
  "Qual tarefa devo priorizar agora?",
  "Analise minha produtividade da semana",
  "Estou cansado hoje, o que faço?",
  "Sugira hábitos para minha meta",
];

const WELCOME: Msg = {
  role: "assistant",
  content: "Olá! Sou seu assistente do **LifeSync AI** ✨\n\nTenho acesso aos seus dados (tarefas, hábitos, metas, humor, energia) e posso:\n\n- **Reorganizar sua rotina** com base na sua energia\n- Analisar sua produtividade\n- Sugerir hábitos para suas metas\n- Priorizar o que importa agora\n\nComo posso ajudar?",
};

function AIChat() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { tasks } = useTasks();
  const { habits } = useHabits();
  const { goals } = useGoals();
  const { moods } = useMoods(7);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load threads
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("ai_threads")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false });
      const list = (data ?? []) as Thread[];
      setThreads(list);
      if (list.length === 0) {
        // create first thread
        const { data: created } = await supabase
          .from("ai_threads")
          .insert({ user_id: user.id, title: "Nova conversa" })
          .select("id,title,updated_at")
          .single();
        if (created) {
          setThreads([created as Thread]);
          setActiveId(created.id);
        }
      } else {
        setActiveId(list[0].id);
      }
    })();
  }, [user]);

  // Load messages for active thread
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    supabase
      .from("ai_messages")
      .select("id,role,content")
      .eq("thread_id", activeId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (data && data.length) {
          setMessages(data.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
        } else {
          setMessages([WELCOME]);
        }
        setLoadingMsgs(false);
      });
  }, [activeId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);
  useEffect(() => { inputRef.current?.focus(); }, [streaming, activeId]);

  const userContext = useMemo(() => ({
    energy: profile?.energy,
    mood: moods[0]?.mood,
    tasks: tasks.map((t) => ({ title: t.title, priority: t.priority, time: t.time, done: t.done, category: t.category })),
    habits: habits.map((h) => ({ name: h.name, streak: h.streak })),
    goals: goals.map((g) => ({ title: g.title, progress: g.progress, target: g.target, type: g.type })),
  }), [profile, moods, tasks, habits, goals]);

  const newThread = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_threads")
      .insert({ user_id: user.id, title: "Nova conversa" })
      .select("id,title,updated_at")
      .single();
    if (data) {
      const t = data as Thread;
      setThreads((p) => [t, ...p]);
      setActiveId(t.id);
      setMessages([WELCOME]);
    }
  }, [user]);

  const deleteThread = useCallback(async (id: string) => {
    await supabase.from("ai_threads").delete().eq("id", id);
    setThreads((p) => p.filter((t) => t.id !== id));
    if (activeId === id) {
      const remaining = threads.filter((t) => t.id !== id);
      if (remaining.length) setActiveId(remaining[0].id);
      else newThread();
    }
  }, [activeId, threads, newThread]);

  const stopStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  const send = async (text: string) => {
    if (!text.trim() || !user || streaming || !activeId) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages.filter((m) => m.id || m !== WELCOME), userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    // Persist user message
    await supabase.from("ai_messages").insert({ user_id: user.id, thread_id: activeId, role: "user", content: text });

    // If first user message in thread, set title from input
    const isFirst = next.filter((m) => m.role === "user").length === 1;
    if (isFirst) {
      const title = text.slice(0, 60);
      await supabase.from("ai_threads").update({ title, updated_at: new Date().toISOString() }).eq("id", activeId);
      setThreads((p) => p.map((t) => t.id === activeId ? { ...t, title, updated_at: new Date().toISOString() } : t));
    } else {
      await supabase.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", activeId);
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let full = "";
    setMessages((p) => [...p, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: userContext,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        if (res.status === 429) toast.error("Limite de IA atingido. Aguarde alguns instantes.");
        else if (res.status === 402) toast.error("Créditos de IA esgotados. Verifique o plano.");
        else toast.error("Erro IA", { description: errText });
        setMessages((p) => p.slice(0, -1));
        setStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setMessages((p) => {
          const copy = [...p];
          copy[copy.length - 1] = { role: "assistant", content: full };
          return copy;
        });
      }
      if (full) {
        await supabase.from("ai_messages").insert({ user_id: user.id, thread_id: activeId, role: "assistant", content: full });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Erro de conexão");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar de threads */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 rounded-2xl border border-border bg-card-grad p-3">
        <button onClick={newThread}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-elegant hover:bg-primary-hover transition">
          <Plus className="w-4 h-4" /> Nova conversa
        </button>
        <div className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground px-2">Conversas</div>
        <div className="mt-1 flex-1 overflow-y-auto space-y-1 pr-1">
          {threads.length === 0 && <div className="text-xs text-muted-foreground p-2">Nenhuma conversa ainda.</div>}
          {threads.map((t) => (
            <div key={t.id}
              className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer transition ${
                activeId === t.id ? "bg-primary/15 text-primary border border-primary/30" : "hover:bg-background/50 border border-transparent"
              }`}
              onClick={() => setActiveId(t.id)}>
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate">{t.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                aria-label="Excluir conversa">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat principal */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div
                aria-hidden
                className="absolute inset-0 rounded-xl blur-xl"
                style={{ background: "color-mix(in oklab, var(--primary) 50%, transparent)" }}
              />
              <img
                src={logoImg}
                alt=""
                aria-hidden
                className="relative w-10 h-10 object-contain drop-shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-primary"><Sparkles className="w-4 h-4" /> Assistente IA · Gemini 2.5 Pro</div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Como posso te ajudar hoje?</h1>
            </div>
          </div>
          <button onClick={newThread} className="md:hidden p-2 rounded-lg border border-border hover:bg-background/40">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 rounded-2xl border border-border bg-card-grad p-4 md:p-6 overflow-y-auto">
          {loadingMsgs ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando conversa...
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div key={m.id ?? `${i}-${m.role}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      m.role === "assistant" ? "bg-primary/15 border border-primary/30 text-primary" : "bg-background/60 border border-border"
                    }`}>
                      {m.role === "assistant" ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "assistant"
                        ? "bg-background/60 border border-border prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-code:text-primary prose-code:bg-background/80 prose-code:px-1 prose-code:rounded prose-pre:bg-background/80 prose-pre:border prose-pre:border-border"
                        : "bg-primary text-primary-foreground whitespace-pre-line"
                    }`}>
                      {m.role === "assistant"
                        ? (m.content
                            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                            : <span className="inline-flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Pensando...</span>)
                        : m.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={streaming}
              className="px-3 py-1.5 rounded-full text-xs border border-border bg-card hover:border-primary/40 hover:text-primary disabled:opacity-50 transition-colors">
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            aria-label="Mensagem para o assistente"
            placeholder="Pergunte algo... (Enter envia, Shift+Enter quebra linha)"
            disabled={streaming}
            className="flex-1 px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm resize-none max-h-40"
          />
          {streaming ? (
            <button type="button" onClick={stopStream} aria-label="Parar resposta"
              className="h-12 px-5 rounded-xl bg-destructive text-destructive-foreground font-semibold shadow-elegant hover:opacity-90 flex items-center justify-center gap-2">
              <Square className="w-4 h-4" aria-hidden /> Parar
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="Enviar mensagem"
              className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-elegant hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center">
              <Send className="w-4 h-4" aria-hidden />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
