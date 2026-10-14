import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Você é o assistente inteligente do LifeSync AI, especializado em produtividade, organização, hábitos e gerenciamento de rotina. Sua função é ajudar o usuário a organizar tarefas, melhorar produtividade, reduzir procrastinação e criar rotinas inteligentes baseadas nos dados reais do sistema.

Diretrizes:
- Responda em português do Brasil, de forma clara, motivadora e prática.
- Use markdown: **negrito**, listas, títulos curtos quando útil, blocos de código quando fizer sentido.
- Quando sugerir uma rotina, use lista com horários (HH:MM).
- Adapte o conselho ao nível de energia (cansado, normal, produtivo).
- Use os dados reais (tarefas, hábitos, metas, humor) que aparecem no contexto. Não invente dados.
- Seja conciso. Vá direto ao ponto. Evite preâmbulos longos.`;

type Ctx = {
  energy?: string;
  mood?: string;
  tasks?: { title: string; priority?: string; time?: string | null; done?: boolean; category?: string | null }[];
  habits?: { name: string; streak?: number }[];
  goals?: { title: string; progress?: number; target?: number; type?: string }[];
};

function buildContext(ctx: Ctx): string {
  const parts: string[] = [];
  if (ctx.energy) parts.push(`Energia atual: ${ctx.energy}`);
  if (ctx.mood) parts.push(`Humor recente: ${ctx.mood}`);
  if (ctx.tasks?.length) {
    const open = ctx.tasks.filter((t) => !t.done).slice(0, 15);
    const done = ctx.tasks.filter((t) => t.done).length;
    parts.push(
      `Tarefas abertas (${open.length}, ${done} concluídas hoje):\n` +
        open.map((t) => `- ${t.title} | prioridade=${t.priority ?? "media"}${t.time ? ` | ${t.time}` : ""}${t.category ? ` | ${t.category}` : ""}`).join("\n"),
    );
  }
  if (ctx.habits?.length) {
    parts.push(`Hábitos (${ctx.habits.length}):\n` + ctx.habits.slice(0, 10).map((h) => `- ${h.name}${h.streak ? ` (streak ${h.streak})` : ""}`).join("\n"));
  }
  if (ctx.goals?.length) {
    parts.push(`Metas ativas:\n` + ctx.goals.slice(0, 10).map((g) => `- ${g.title} (${g.progress ?? 0}/${g.target ?? 1}${g.type ? `, ${g.type}` : ""})`).join("\n"));
  }
  return parts.length ? `\n\n--- DADOS DO USUÁRIO ---\n${parts.join("\n\n")}\n--- FIM DOS DADOS ---` : "";
}

type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const body = (await request.json()) as { messages?: AIMessage[]; context?: Ctx };
          const messages = Array.isArray(body.messages) ? body.messages : [];
          if (!messages.length) return new Response("messages required", { status: 400 });

          const ctxBlock = buildContext(body.context ?? {});

          // Resolve user + load memories
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.replace(/^Bearer\s+/i, "");
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const anon = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          let userId: string | null = null;
          let memoryBlock = "";
          let supabaseUser: SupabaseClient | null = null;
          if (token && supabaseUrl && anon) {
            supabaseUser = createClient(supabaseUrl, anon, {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { persistSession: false },
            });
            const { data: u } = await supabaseUser.auth.getUser();
            userId = u?.user?.id ?? null;
            if (userId) {
              const { data: mems } = await supabaseUser.from("ai_memory")
                .select("key, value").order("updated_at", { ascending: false }).limit(10);
              if (mems?.length) {
                memoryBlock = `\n\n## O que você sabe sobre este usuário:\n${(mems as { key: string; value: string }[]).map((m) => `- ${m.key}: ${m.value}`).join("\n")}`;
              }
            }
          }

          const upstream = await fetch(LOVABLE_AI_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro",
              stream: true,
              messages: [
                { role: "system", content: SYSTEM_PROMPT + ctxBlock + memoryBlock },
                ...messages.slice(-20),
              ],
            }),
          });

          if (!upstream.ok || !upstream.body) {
            const text = await upstream.text().catch(() => "");
            if (upstream.status === 429) return new Response("Limite de requisições atingido. Tente em instantes.", { status: 429 });
            if (upstream.status === 402) return new Response("Créditos de IA esgotados.", { status: 402 });
            return new Response(text || "Erro IA", { status: upstream.status });
          }

          // Parse SSE from gateway, re-emit only text deltas as plain text stream
          let assistantText = "";
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const reader = upstream.body!.getReader();
              const decoder = new TextDecoder();
              const encoder = new TextEncoder();
              let buf = "";
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  const lines = buf.split("\n");
                  buf = lines.pop() ?? "";
                  for (const line of lines) {
                    const l = line.trim();
                    if (!l.startsWith("data:")) continue;
                    const data = l.slice(5).trim();
                    if (!data || data === "[DONE]") continue;
                    try {
                      const json = JSON.parse(data);
                      const delta = json.choices?.[0]?.delta?.content;
                      if (delta) { assistantText += delta; controller.enqueue(encoder.encode(delta)); }
                    } catch { /* skip */ }
                  }
                }
              } catch (e) {
                controller.error(e);
                return;
              }
              controller.close();

              // Fire-and-forget memory extraction
              if (userId && supabaseUser && assistantText.length > 50) {
                (async () => {
                  try {
                    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
                    const r = await fetch(LOVABLE_AI_URL, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
                      body: JSON.stringify({
                        model: "google/gemini-2.5-flash-lite", stream: false, max_tokens: 300,
                        messages: [
                          { role: "system", content: 'Dado o contexto desta conversa, extraia até 3 fatos relevantes sobre o usuário para personalizar futuras interações. Responda APENAS com JSON no formato: {"facts": [{"key": "string_snake_case", "value": "string descritiva"}]}. Se não houver fatos relevantes, responda {"facts": []}.' },
                          { role: "user", content: `Usuário: ${lastUser}\n\nAssistente: ${assistantText}` },
                        ],
                      }),
                    });
                    if (!r.ok) return;
                    const j = await r.json();
                    const raw: string = j.choices?.[0]?.message?.content ?? "";
                    const match = raw.match(/\{[\s\S]*\}/);
                    if (!match) return;
                    const parsed = JSON.parse(match[0]) as { facts?: { key: string; value: string }[] };
                    const facts = (parsed.facts ?? []).filter((f) => f.key && f.value).slice(0, 3);
                    if (!facts.length) return;
                    await supabaseUser!.from("ai_memory").upsert(
                      facts.map((f) => ({ user_id: userId!, key: f.key, value: f.value, updated_at: new Date().toISOString() })),
                      { onConflict: "user_id,key" },
                    );
                  } catch (err) { console.error("[chat memory]", err); }
                })();
              }
            },
          });

          return new Response(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              "X-Accel-Buffering": "no",
            },
          });
        } catch (e) {
          console.error("[/api/chat] error", e);
          return new Response("Erro interno", { status: 500 });
        }
      },
    },
  },
});
