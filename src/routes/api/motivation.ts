import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { callLovableAI } from "@/lib/ai-gateway";

export const Route = createFileRoute("/api/motivation")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json() as {
            doneToday?: number; doneYesterday?: number; streak?: number; mood?: string; energy?: string;
          };
          const ctx = `Tarefas concluídas hoje: ${body.doneToday ?? 0}
Tarefas concluídas ontem: ${body.doneYesterday ?? 0}
Maior streak de hábito: ${body.streak ?? 0}
Humor atual: ${body.mood ?? "não informado"}
Energia: ${body.energy ?? "normal"}`;

          const reply = await callLovableAI([
            { role: "system", content: "Você gera UMA frase motivacional curta (até 18 palavras), personalizada e calorosa, em português do Brasil. Sem aspas, sem emojis no início. Seja específico ao contexto." },
            { role: "user", content: ctx },
          ]);

          return new Response(JSON.stringify({ phrase: reply.trim().replace(/^["']|["']$/g, "") }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          if (e instanceof Response) return e;
          return new Response("Erro", { status: 500 });
        }
      },
    },
  },
});
