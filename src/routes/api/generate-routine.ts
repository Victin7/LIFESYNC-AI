import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { callLovableAI } from "@/lib/ai-gateway";

const SYSTEM = `Você é um assistente de produtividade. Receba o objetivo, horários disponíveis, rotina atual e energia do usuário e retorne ESTRITAMENTE um JSON válido com este formato (sem texto antes/depois, sem markdown):
{
  "tasks": [{ "title": "string", "time": "HH:MM", "priority": "alta|media|baixa", "category": "string" }],
  "habits": [{ "name": "string", "icon": "emoji" }]
}
Crie 4 a 6 tarefas iniciais realistas e 3 a 5 hábitos relevantes ao objetivo. Em português do Brasil.`;

function extractJson(s: string) {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = s.indexOf("{"); const end = s.lastIndexOf("}");
  return start !== -1 && end !== -1 ? s.slice(start, end + 1) : s;
}

export const Route = createFileRoute("/api/generate-routine")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json() as { goal?: string; slots?: string[]; routine?: string; energy?: string };
          const userMsg = `Objetivo: ${body.goal ?? "produtividade"}
Horários disponíveis: ${(body.slots ?? []).join(", ") || "flexível"}
Rotina atual: ${body.routine || "não informada"}
Energia atual: ${body.energy ?? "normal"}`;

          const reply = await callLovableAI([
            { role: "system", content: SYSTEM },
            { role: "user", content: userMsg },
          ]);

          let parsed: unknown;
          try { parsed = JSON.parse(extractJson(reply)); }
          catch { return new Response("Resposta inválida da IA", { status: 502 }); }

          return new Response(JSON.stringify(parsed), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          if (e instanceof Response) return e;
          console.error("[generate-routine]", e);
          return new Response("Erro interno", { status: 500 });
        }
      },
    },
  },
});
