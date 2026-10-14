import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { callLovableAI } from "@/lib/ai-gateway";

const SYSTEM = `Você é um assistente de produtividade. Receba uma lista de tarefas e devolva ESTRITAMENTE um JSON válido (sem markdown), no formato:
{ "schedule": [{ "id": "string", "due_date": "YYYY-MM-DD", "time": "HH:MM" }], "insights": ["string"] }

Distribua as tarefas ao longo da semana indicada (7 dias) considerando:
- prioridade alta em horários de pico (manhã 8h-11h ou tarde 14h-17h);
- energia exigida da tarefa vs energia provável do usuário (manhã = alta, tarde = média, fim do dia = baixa);
- duração estimada (não empilhe tarefas longas no mesmo dia);
- balanceie a carga entre os dias — evite sobrecarga;
- inclua pausas implícitas (não agende tarefas adjacentes sem respiro);
- respeite hábitos típicos: estudo de manhã, exercícios fim do dia.

Em "insights", devolva 2 a 4 frases curtas em português destacando: melhores horários, dias sobrecarregados, recomendações de descanso.`;

function extractJson(s: string) {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const a = s.indexOf("{"); const b = s.lastIndexOf("}");
  return a !== -1 && b !== -1 ? s.slice(a, b + 1) : s;
}

export const Route = createFileRoute("/api/reorganize-week")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json() as {
            week_start: string;
            tasks: { id: string; title: string; priority?: string; energy?: string; duration_min?: number | null; due_date?: string | null; time?: string | null; category?: string | null }[];
          };
          if (!body.tasks?.length) {
            return new Response(JSON.stringify({ schedule: [], insights: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
          }
          const list = body.tasks.map((t) =>
            `- id=${t.id} | ${t.title} | prio=${t.priority ?? "media"} | energia=${t.energy ?? "media"} | duracao=${t.duration_min ?? "?"}min | atual=${t.due_date ?? "—"} ${t.time ?? ""} | cat=${t.category ?? "Geral"}`
          ).join("\n");
          const reply = await callLovableAI([
            { role: "system", content: SYSTEM },
            { role: "user", content: `Semana iniciando em: ${body.week_start}\nTarefas:\n${list}` },
          ]);
          let parsed: { schedule?: { id: string; due_date: string; time: string }[]; insights?: string[] };
          try { parsed = JSON.parse(extractJson(reply)); }
          catch { return new Response("Resposta inválida da IA", { status: 502 }); }

          const validIds = new Set(body.tasks.map((t) => t.id));
          const schedule = (parsed.schedule ?? []).filter(
            (s) => validIds.has(s.id) && /^\d{4}-\d{2}-\d{2}$/.test(s.due_date) && /^\d{2}:\d{2}$/.test(s.time)
          );
          return new Response(JSON.stringify({ schedule, insights: parsed.insights ?? [] }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          if (e instanceof Response) return e;
          console.error("[reorganize-week]", e);
          return new Response("Erro interno", { status: 500 });
        }
      },
    },
  },
});
