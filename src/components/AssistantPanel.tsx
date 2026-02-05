"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function AssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      role: "assistant",
      content:
        "Hi! I can help you modify this pipeline. Try: 'sort by date desc', 'remove column notes', or 'move step 3 above 1'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Placeholder assistant response for Phase 1 scaffolding
    const reply: Message = {
      id: `a-${Date.now() + 1}`,
      role: "assistant",
      content:
        "Thanks! I parsed your request but this prototype only scaffolds the chat. In the next iteration I'll propose a concrete step change for you to confirm.",
    };
    setMessages((prev) => [...prev, reply]);
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
                <span>{m.content}</span>
              </div>
            ))}
          </CardContent>
          <div className="p-4 border-t flex gap-2">
            <Input
              placeholder="Ask to modify the pipeline…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </>
      )}
    </Card>
  );
}
