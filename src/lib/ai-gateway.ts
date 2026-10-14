// Server-only Lovable AI Gateway helper
export const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callLovableAI(messages: AIMessage[], model = "google/gemini-3-flash-preview") {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Response("Missing LOVABLE_API_KEY", { status: 500 });

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Response("Limite de requisições atingido. Tente novamente em alguns instantes.", { status: 429 });
    if (res.status === 402) throw new Response("Créditos de IA esgotados. Adicione créditos no workspace.", { status: 402 });
    throw new Response(`Erro IA: ${text}`, { status: res.status });
  }
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  return content;
}
