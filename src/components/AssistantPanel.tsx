"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export function AssistantPanel() {
  const [collapsed, setCollapsed] = useState(false);

  const { messages, sendMessage, status, error } = useChat({
    // Uses the default Next.js API route for chat (added separately)
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: [
      {
        id: "m1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text:
              "Hi! I can help you modify this pipeline. Try: 'sort by date desc', 'remove column notes', or 'move step 3 above 1'.",
          },
        ],
      },
    ],
  });

  const [input, setInput] = useState("");

  const handleSend = () => {
    const text = input.trim();
    if (!text || status !== "ready") return;
    void sendMessage({ text });
    setInput("");
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex items-center justify-between py-3">
        <CardTitle className="text-base">Assistant</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? "Show" : "Hide"}
        </Button>
      </CardHeader>
      {!collapsed && (
        <>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-medium mr-2 text-muted-foreground">
                  {m.role === "assistant" ? "Assistant" : "You"}:
                </span>
                <span>
                  {m.parts
                    ?.map((p) => (p.type === "text" ? p.text : ""))
                    .join("")}
                </span>
              </div>
            ))}
            {error && <div className="text-sm text-red-600">Something went wrong.</div>}
          </CardContent>
          <div className="p-4 border-t flex gap-2">
            <Input
              placeholder="Ask to modify the pipeline…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              disabled={status !== "ready"}
            />
            <Button onClick={handleSend} disabled={status !== "ready"}>
              Send
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
