import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { callLovableAI } from "@/lib/ai-gateway";

const SYSTEM = `Você é um assistente de produtividade. Receba uma lista de tarefas e devolva ESTRITAMENTE um JSON válido com esta estrutura, sem markdown ou texto extra:
{ "schedule": [{ "id": "string", "time": "HH:MM" }] }

Distribua as tarefas entre 06:00 e 22:00 considerando:
- prioridade alta vai para horários de pico (manhã 8h-11h ou tarde 14h-17h)
- prioridade baixa em janelas mais soltas
- evite conflitos: cada tarefa em horário único
- respeite o horário existente quando fizer sentido`;

function extractJson(s: string) {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const a = s.indexOf("{"); const b = s.lastIndexOf("}");
  return a !== -1 && b !== -1 ? s.slice(a, b + 1) : s;
}

export const Route = createFileRoute("/api/reorganize-day")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json() as {
            date: string;
            tasks: { id: string; title: string; priority?: string; time?: string | null; category?: string | null }[];
          };
          if (!body.tasks?.length) return new Response(JSON.stringify({ schedule: [] }), { status: 200, headers: { "Content-Type": "application/json" } });

          const list = body.tasks.map((t) => `- id=${t.id} | ${t.title} | prioridade=${t.priority ?? "media"} | atual=${t.time ?? "—"} | cat=${t.category ?? "Geral"}`).join("\n");
          const reply = await callLovableAI([
            { role: "system", content: SYSTEM },
            { role: "user", content: `Data: ${body.date}\nTarefas:\n${list}` },
          ]);

          let parsed: { schedule?: { id: string; time: string }[] };
          try { parsed = JSON.parse(extractJson(reply)); }
          catch { return new Response("Resposta inválida da IA", { status: 502 }); }

          const validIds = new Set(body.tasks.map((t) => t.id));
          const schedule = (parsed.schedule ?? []).filter((s) => validIds.has(s.id) && /^\d{2}:\d{2}$/.test(s.time));

          return new Response(JSON.stringify({ schedule }), { status: 200, headers: { "Content-Type": "application/json" } });
        } catch (e) {
          if (e instanceof Response) return e;
          console.error("[reorganize-day]", e);
          return new Response("Erro interno", { status: 500 });
        }
      },
    },
  },
});
