"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Proposal, AddStepProposal, RemoveStepProposal, EditStepProposal, ReorderStepsProposal, UpdateParseConfigProposal } from "@/lib/assistant/intent";
import type { TransformationStep, ColumnMetadata } from "@/lib/pipeline/types";
import type { ParseOptions, ParseResult } from "@/lib/parsers/types";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";

export interface AssistantPanelProps {
  availableColumns: string[];
  currentSteps: TransformationStep[];
  parseConfig?: Partial<ParseOptions>;
  previewData?: ParseResult | null;
  originalData?: ParseResult | null;
  typeEvolution?: ColumnMetadata[][];
  availableSheets?: string[];
  onApplyProposal: (proposal: Proposal) => void;
  disabled?: boolean;
}

export function AssistantPanel({
  availableColumns,
  currentSteps,
  parseConfig,
  previewData,
  originalData,
  typeEvolution,
  availableSheets,
  onApplyProposal,
  disabled = false,
}: AssistantPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Memoize context data - recomputes when deps change
  const contextData = useMemo(() => ({
    columns: availableColumns,
    currentSteps: currentSteps.map(s => s.config),
    parseConfig,
    previewData: previewData ? {
      columns: previewData.columns,
      rows: previewData.rows.slice(0, 100),
    } : null,
    originalData: originalData ? {
      columns: originalData.columns,
      rows: originalData.rows,
    } : null,
    typeEvolution,
    availableSheets: availableSheets || [],
  }), [availableColumns, currentSteps, parseConfig, previewData, originalData, typeEvolution, availableSheets]);
  
  const { messages, status, error, sendMessage, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  // Memoize welcome message to avoid recreating on every render
  const welcomeMessage = useMemo(() => ({
    id: "welcome",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Hi! I can help you modify this pipeline using natural language. Try commands like:\n• 'sort by date desc'\n• 'remove column notes'\n• 'move step 3 up'\n• 'keep rows where age > 21'",
      },
    ],
  }), []);

  // Show welcome message if no messages yet
  const displayMessages = messages.length === 0 ? [welcomeMessage] : messages;

  // Helper to get tool calls from message parts
  const getToolCalls = useCallback((message: any): any[] => {
    // Azure OpenAI returns tool parts with type like 'tool-{toolName}' instead of 'tool-call'
    const toolCalls = message.parts.filter((part: any) => {
      // Check for standard AI SDK format
      if (part.type === 'tool-call') return true;
      
      // Check for Azure OpenAI format: 'tool-addStep', 'tool-updateParseConfig', etc.
      if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
        // Convert Azure format to standard format
        const toolName = part.type.replace('tool-', '');
        part.toolName = toolName;
        part.args = part.args || {}; // Azure includes args in the part
        return true;
      }
      
      return false;
    });
    
    return toolCalls;
  }, []);

  const convertToolCallToProposal = useCallback((toolCall: any): Proposal | null => {
    const toolName = toolCall.toolName;
    // Azure OpenAI puts arguments in 'input' field, not 'args'
    const args = toolCall.input || toolCall.args || {};
    
    switch (toolName) {
      case "addStep":
        return {
          kind: "add_step",
          step: {
            config: { type: args.stepType, ...args.config },
            position: args.position ?? "end",
          },
        };
      case "removeStep":
        return {
          kind: "remove_step",
          stepIndex: args.stepIndex,
        };
      case "editStep":
        return {
          kind: "edit_step",
          stepIndex: args.stepIndex,
          newConfig: args.newConfig,
        };
      case "reorderSteps":
        return {
          kind: "reorder_steps",
          from: args.fromIndex,
          to: args.toIndex,
        };
      case "updateParseConfig":
        const proposal: UpdateParseConfigProposal = {
          kind: "update_parse_config",
          changes: {
            // Only include fields that are actually provided in the args
            ...(args.sheetName !== undefined && { sheetName: args.sheetName }),
            ...(args.startRow !== undefined && { startRow: args.startRow }),
            ...(args.endRow !== undefined && { endRow: args.endRow }),
            ...(args.startColumn !== undefined && { startColumn: args.startColumn }),
            ...(args.endColumn !== undefined && { endColumn: args.endColumn }),
            ...(args.hasHeaders !== undefined && { hasHeaders: args.hasHeaders }),
          },
        };
        return proposal;
      default:
        console.warn('[AssistantPanel] Unknown tool:', toolName);
        return null;
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Memoize message proposals to avoid recalculating on every render
  const messageProposals = useMemo(() => {
    const proposalMap = new Map<string, Proposal[]>();
    
    displayMessages.forEach((message) => {
      if (message.role === "assistant" && message.parts) {
        const toolCalls = getToolCalls(message);
        if (toolCalls.length > 0) {
          const proposals = toolCalls
            .map(tc => convertToolCallToProposal(tc))
            .filter(Boolean) as Proposal[];
          if (proposals.length > 0) {
            proposalMap.set(message.id, proposals);
          }
        }
      }
    });
    
    return proposalMap;
  }, [displayMessages, getToolCalls, convertToolCallToProposal]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || status === "streaming" || disabled) return;

    setInputValue("");
    
    // Send context data with each message (request-level configuration)
    await sendMessage({ text }, { body: { data: contextData } });
  };

  const handleApply = (toolCall: any) => {
    // Convert tool call to proposal format
    const proposal = convertToolCallToProposal(toolCall);
    if (proposal) {
      onApplyProposal(proposal);
    }
  };

  const handleApplyAll = (toolCalls: any[]) => {
    // Apply all tool calls in sequence
    toolCalls.forEach((toolCall) => {
      const proposal = convertToolCallToProposal(toolCall);
      if (proposal) {
        onApplyProposal(proposal);
      }
    });
  };

  const formatProposal = (proposal: Proposal): string => {
    switch (proposal.kind) {
      case "add_step": {
        const p = proposal as AddStepProposal;
        const config = p.step.config;
        const type = config.type;
        const position = p.step.position === "end" ? "at the end" : `at position ${(p.step.position as number) + 1}`;
        return `I'll add a "${formatOperationType(type)}" step ${position}.\n\n${formatConfigDetails(config)}`;
      }
      
      case "remove_step": {
        const p = proposal as RemoveStepProposal;
        return `I'll remove step ${p.stepIndex + 1}.`;
      }
      
      case "edit_step": {
        const p = proposal as EditStepProposal;
        return `I'll update step ${p.stepIndex + 1} with the following configuration:\n\n${formatConfigDetails(p.newConfig)}`;
      }
      
      case "reorder_steps": {
        const p = proposal as ReorderStepsProposal;
        return `I'll move step ${p.from + 1} to position ${p.to + 1}.`;
      }
      
      case "update_parse_config": {
        const p = proposal as UpdateParseConfigProposal;
        const changes = Object.entries(p.changes)
          .map(([key, value]) => `  • ${key}: ${value}`)
          .join("\n");
        return `I'll update the parse configuration:\n${changes}`;
      }
      
      case "clarify":
        return proposal.question;
      
      default:
        return "I understood your request.";
    }
  };

  const formatOperationType = (type: string): string => {
    const typeMap: Record<string, string> = {
      sort: "Sort",
      remove_column: "Remove Column",
      rename_column: "Rename Column",
      deduplicate: "Deduplicate",
      filter: "Filter",
      trim: "Trim",
      uppercase: "Uppercase",
      lowercase: "Lowercase",
      split_column: "Split Column",
      merge_columns: "Merge Columns",
      unpivot: "Unpivot",
      pivot: "Pivot",
      cast_column: "Cast Column",
      fill_down: "Fill Down",
      fill_across: "Fill Across",
    };
    return typeMap[type] || type;
  };

  const formatConfigDetails = (config: any): string => {
    const lines: string[] = [];
    
    // Show key configuration details based on operation type
    if (config.columns) {
      if (Array.isArray(config.columns)) {
        if (config.type === "sort") {
          lines.push("Columns: " + config.columns.map((c: any) => 
            `${c.name} (${c.direction})`
          ).join(", "));
          if (config.nullsPosition) {
            lines.push(`Nulls: ${config.nullsPosition}`);
          }
        } else {
          lines.push("Columns: " + config.columns.join(", "));
        }
      }
    }
    
    if (config.oldName && config.newName) {
      lines.push(`Rename: "${config.oldName}" → "${config.newName}"`);
    }
    
    if (config.column && config.operator && config.value !== undefined) {
      lines.push(`Filter: ${config.column} ${config.operator} ${config.value}`);
    }
    
    if (config.sourceColumn && config.newColumns) {
      lines.push(`Split: ${config.sourceColumn} → ${config.newColumns.join(", ")}`);
    }
    
    if (config.targetType) {
      lines.push(`Cast ${config.column} to ${config.targetType}`);
    }
    
    return lines.length > 0 ? lines.join("\n") : "Configuration loaded";
  };

  // Helper to get text content from message parts
  const getMessageText = (message: any): string => {
    if (!message.parts || message.parts.length === 0) {
      return "";
    }
    
    const textContent = message.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("");
    
    // If no text but has tool calls, show a default message
    if (!textContent && message.role === "assistant") {
      const toolCalls = getToolCalls(message);
      if (toolCalls.length > 0) {
        return ""; // Return empty, we'll show the proposal instead
      }
    }
    
    return textContent;
  };

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between py-3 px-4 border-b">
        <CardTitle className="text-base">AI Assistant</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? "Show" : "Hide"}
        </Button>
      </CardHeader>
      
      {!collapsed && (
        <>
          <CardContent className="flex-1 overflow-y-auto space-y-4 px-4 py-2 min-h-0">
            {displayMessages.map((m) => {
              const isUser = m.role === "user";
              const isAssistant = m.role === "assistant";
              
              return (
              <div 
                key={m.id} 
                className={`text-sm ${isUser ? "ml-4" : ""}`}
              >
                <div className="font-medium mb-1 text-xs text-muted-foreground">
                  {isAssistant ? "🤖 Assistant" : "👤 You"}
                </div>
                <div className={`${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-lg px-3 py-2"
                    : "bg-muted rounded-lg px-3 py-2"
                }`}>
                  {getMessageText(m) && (
                    <div className="whitespace-pre-wrap">{getMessageText(m)}</div>
                  )}
                  
                  {/* Show Apply buttons for tool calls */}
                  {(() => {
                    // Don't show proposals while streaming - arguments are incomplete
                    if (status === "streaming") return null;
                    
                    const proposals = messageProposals.get(m.id);
                    if (!proposals || proposals.length === 0) return null;
                    
                    const toolCalls = getToolCalls(m);
                    
                    return (
                      <div className="mt-3 space-y-2">
                        {proposals.map((proposal, idx) => (
                          <div key={idx} className="p-2 bg-background/50 rounded border border-border">
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Step {idx + 1} of {proposals.length}
                            </div>
                            <div className="text-sm whitespace-pre-wrap">{formatProposal(proposal)}</div>
                          </div>
                        ))}
                        
                        {proposals.length > 1 ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApplyAll(toolCalls)}
                              disabled={disabled}
                              className="flex-1"
                            >
                              Apply All ({proposals.length} changes)
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleApply(toolCalls[0])}
                            disabled={disabled}
                          >
                            Apply
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
            })}
            
            {status === "streaming" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                <span>Thinking...</span>
              </div>
            )}
            
            {error && (
              <div className="text-sm text-red-500">
                Error: {error.message}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </CardContent>
          
          <form onSubmit={handleSend} className="flex-shrink-0 p-4 border-t flex gap-2 bg-background">
            <Input
              placeholder="Ask me to modify the pipeline…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={status === "streaming" || disabled}
            />
            <Button 
              type="submit"
              disabled={status === "streaming" || disabled || !inputValue.trim()}
            >
              {status === "streaming" ? <Spinner className="size-4" /> : "Send"}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
