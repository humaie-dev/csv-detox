import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const textParts = (lastUser?.parts ?? [])
    .filter((p) => (p as any).type === "text")
    .map((p: any) => p.text as string);
  const prompt = textParts.join(" ") || "your request";

  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: "text-start", id: "assistant-1" });
      writer.write({ type: "text-delta", id: "assistant-1", delta: `I received: ${prompt}. ` });
      writer.write({ type: "text-delta", id: "assistant-1", delta: "I'll parse this and propose a change for you to confirm." });
      writer.write({ type: "text-end", id: "assistant-1" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
