"use client";

import { useChat } from "@ai-sdk/react";
import type { Id } from "@convex/dataModel";
import { DefaultChatTransport, getToolName, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { Loader2, Send, Sparkles } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AssistantChatProps {
  projectId: Id<"projects">;
  pipelineId?: Id<"pipelines">;
  className?: string;
}

/**
 * AI Assistant Chat Component
 * Provides an interactive chat interface for analyzing data and getting pipeline suggestions
 */
export function AssistantChat({ projectId, pipelineId, className }: AssistantChatProps) {
  const [input, setInput] = useState("");
  const projectIdRef = useRef(projectId);
  const pipelineIdRef = useRef(pipelineId);
  const transportRef = useRef<DefaultChatTransport<UIMessage> | null>(null);

  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    pipelineIdRef.current = pipelineId;
  }, [pipelineId]);

  if (!transportRef.current) {
    transportRef.current = new DefaultChatTransport({
      api: "/api/assistant/chat",
      body: () => ({
        projectId: projectIdRef.current,
        pipelineId: pipelineIdRef.current,
      }),
    });
  }

  const { messages, sendMessage, status } = useChat({
    transport: transportRef.current,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  const getMessageText = (message: UIMessage) => {
    const legacyMessage = message as UIMessage & { content?: string };
    if (typeof legacyMessage.content === "string") {
      return legacyMessage.content;
    }
    if (!message.parts) return "";
    return message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join("");
  };

  const getToolNames = (message: UIMessage) => {
    const legacyMessage = message as UIMessage & {
      toolInvocations?: Array<{ toolCallId: string; toolName: string }>;
    };
    if (Array.isArray(legacyMessage.toolInvocations)) {
      return legacyMessage.toolInvocations.map((tool) => tool.toolName);
    }
    if (!message.parts) return [];
    const toolNames = message.parts.filter(isToolUIPart).map((part) => getToolName(part));
    return Array.from(new Set(toolNames));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    await sendMessage({ text: trimmed });
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="border-b px-4 pb-4 pt-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-base font-semibold">AI Assistant</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask questions about your data or get help with transformations
        </p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 text-purple-500 opacity-50" />
              <p className="text-sm mb-4">
                Ask me anything about your data, or request help with transformations!
              </p>
              <div className="space-y-2 text-xs">
                <p className="font-medium">Try asking:</p>
                <ul className="space-y-1 text-left">
                  <li>• "What columns do I have?"</li>
                  <li>• "Show me a sample of the data"</li>
                  <li>• "Suggest a pipeline to clean this data"</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => {
                const messageText = getMessageText(message);
                const toolNames = getToolNames(message);
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {message.role === "assistant" && toolNames.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {toolNames.map((toolName) => (
                            <Badge key={toolName} variant="outline" className="text-xs mr-1">
                              {toolName}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap">{messageText}</div>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-4">
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
