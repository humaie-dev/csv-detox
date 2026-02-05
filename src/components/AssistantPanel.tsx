"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  TransformationConfig,
  TransformationStep,
  TransformationType,
} from "@/lib/pipeline/types";
import { parseIntent, type Proposal } from "@/lib/assistant/intent";
import { loadPreviewWithDuckDB } from "@/lib/duckdb/previewer";
import type { ParseOptions, ParseResult } from "@/lib/parsers/types";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type UserMessage = { id: string; role: "user"; text: string };
type AssistantMessage = {
  id: string;
  role: "assistant";
  text: string;
  proposal?: Proposal;
  applyLabel?: string;
};
type ChatMessage = UserMessage | AssistantMessage;

type UndoAction =
  | { kind: "remove_step_at"; index: number }
  | { kind: "reorder_steps"; from: number; to: number }
  | { kind: "restore_parse_config"; previous: ParseOptions | undefined };

interface AssistantPanelProps {
  steps: TransformationStep[];
  onAddStep: (type: TransformationType, config: TransformationConfig) => void;
  onReorderSteps: (from: number, to: number) => void;
  onRemoveStep: (index: number) => void;
  uploadId: Id<"uploads">;
  mimeType: string;
  fileUrl: string;
  fileName: string;
  parseConfig?: ParseOptions;
  availableColumns: string[];
  onParseConfigChanged: () => void;
}

export function AssistantPanel(props: AssistantPanelProps) {
  const {
    steps,
    onAddStep,
    onReorderSteps,
    onRemoveStep,
    uploadId,
    mimeType,
    fileUrl,
    fileName,
    parseConfig,
    availableColumns,
    onParseConfigChanged,
  } = props;

  const [collapsed, setCollapsed] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "assistant",
      text:
        "Hi! I can help you modify this pipeline. Try: 'sort by date desc', 'remove column notes', or 'move step 3 above 1'.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);
  const undoStack = useRef<UndoAction[]>([]);

  const updateParseConfig = useMutation(api.uploads.updateParseConfig);

  const ctxColumns = useMemo(() => availableColumns, [availableColumns]);

  const appendMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const summarizeProposal = useCallback(
    async (proposal: Proposal): Promise<string> => {
      switch (proposal.kind) {
        case "data_question": {
          // Answer simple questions using the current preview context
          try {
            const preview: ParseResult = await loadPreviewWithDuckDB({
              fileUrl,
              mimeType,
              fileName,
              steps,
              parseConfig: parseConfig,
              maxRows: 1000,
            });
            const cols = preview.columns.map((c) => c.name);
            const rows = preview.rows;
            const q = proposal.question;

            if (q.type === "list_columns") {
              return `Columns (${cols.length}): ${cols.join(", ")}`;
            }
            if (q.type === "column_count") {
              return `There are ${cols.length} columns in the current preview.`;
            }
            if (q.type === "row_count") {
              return `Preview contains ${rows.length} rows (first ${rows.length} loaded).`;
            }
            if ((q.type === "distinct_values" || q.type === "distinct_count") && !q.column) {
              return "Which column? e.g., 'distinct values of status'";
            }
            if (q.type === "distinct_values" && q.column) {
              const limit = q.limit ?? 10;
              const set = new Map<string, number>();
              for (const r of rows) {
                const v = (r as Record<string, unknown>)[q.column as string];
                const key = v === null || v === undefined ? "(null)" : String(v);
                set.set(key, (set.get(key) || 0) + 1);
              }
              const entries = Array.from(set.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
              const parts = entries.map(([val, count]) => `${val} (${count})`);
              return `Top distinct values in ${q.column}: ${parts.join(", ")}`;
            }
            if (q.type === "distinct_count" && q.column) {
              const set = new Set<string>();
              for (const r of rows) {
                const v = (r as Record<string, unknown>)[q.column as string];
                const key = v === null || v === undefined ? "(null)" : String(v);
                set.add(key);
              }
              return `Distinct values in ${q.column}: ${set.size} (preview sample).`;
            }
            if (q.type === "aggregate" && q.column && q.aggregate) {
              const values: number[] = [];
              for (const r of rows) {
                const raw = (r as Record<string, unknown>)[q.column];
                const num = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""));
                if (!Number.isNaN(num)) values.push(num);
              }
              if (values.length === 0) {
                return `No numeric values found in ${q.column} (within preview).`;
              }
              let result: number;
              switch (q.aggregate) {
                case "min":
                  result = Math.min(...values);
                  break;
                case "max":
                  result = Math.max(...values);
                  break;
                case "sum":
                  result = values.reduce((a, b) => a + b, 0);
                  break;
                case "avg":
                  result = values.reduce((a, b) => a + b, 0) / values.length;
                  break;
              }
              const label = q.aggregate === "avg" ? "Average" : q.aggregate.charAt(0).toUpperCase() + q.aggregate.slice(1);
              return `${label} of ${q.column} (preview): ${result}`;
            }
          } catch {
            // fall through
          }
          return "Sorry, I could not compute that right now.";
        }
        case "add_step": {
          const cfg = proposal.step.config;
          const base = `I propose to add a '${cfg.type}' step.`;
          // Try a tiny dry-run sample for preview context
          try {
            if (fileUrl) {
              const preview: ParseResult = await loadPreviewWithDuckDB({
                fileUrl,
                mimeType,
                fileName,
                steps: [...steps, { id: `preview-${Date.now()}`, type: cfg.type, config: cfg } as TransformationStep],
                parseConfig: parseConfig,
                maxRows: 20,
                stopAtStep: steps.length,
              });
              const colNames = preview.columns.slice(0, 10).map((c) => c.name);
              const firstRow = preview.rows[0] || {};
              const rowSnippet = Object.entries(firstRow)
                .slice(0, 5)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(", ");
              return `${base} Columns now: ${colNames.join(", ")}. Example first row → ${rowSnippet || "(no rows)"}. Confirm to apply?`;
            }
          } catch {
            // Ignore preview errors in assistant message
          }
          return `${base} Confirm to apply?`;
        }
        case "reorder_steps": {
          const from = proposal.from + 1;
          const to = proposal.to + 1;
          return `I will move step ${from} to position ${to}. Confirm to apply?`;
        }
        case "update_parse_config": {
          const parts: string[] = [];
          if (proposal.changes.sheetName !== undefined) parts.push(`sheet → ${proposal.changes.sheetName}`);
          if (proposal.changes.startRow !== undefined || proposal.changes.endRow !== undefined)
            parts.push(`rows → ${proposal.changes.startRow || ""}-${proposal.changes.endRow || ""}`);
          if (proposal.changes.startColumn !== undefined || proposal.changes.endColumn !== undefined)
            parts.push(`columns → ${proposal.changes.startColumn || ""}-${proposal.changes.endColumn || ""}`);
          if (proposal.changes.hasHeaders !== undefined)
            parts.push(`has headers → ${proposal.changes.hasHeaders ? "true" : "false"}`);
          return `I propose to update parse config: ${parts.join(", ")}. Confirm to apply?`;
        }
        case "clarify":
          return proposal.question;
      }
    },
    [fileUrl, fileName, mimeType, parseConfig, steps]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    appendMessage({ id: `u-${Date.now()}`, role: "user", text });

    // Built-in undo command
    if (/\b(undo|revert)\b/i.test(text)) {
      const action = undoStack.current.pop();
      if (!action) {
        appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: "Nothing to undo." });
        return;
      }
      if (action.kind === "remove_step_at") {
        onRemoveStep(action.index);
        appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: `Removed step ${action.index + 1}.` });
      } else if (action.kind === "reorder_steps") {
        onReorderSteps(action.from, action.to);
        appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: `Restored step order.` });
      } else if (action.kind === "restore_parse_config") {
        try {
          const prev = {
            sheetName: action.previous?.sheetName,
            sheetIndex: action.previous?.sheetIndex,
            startRow: action.previous?.startRow,
            endRow: action.previous?.endRow,
            startColumn: action.previous?.startColumn,
            endColumn: action.previous?.endColumn,
            hasHeaders: action.previous?.hasHeaders ?? true,
          };
          await updateParseConfig({ uploadId, parseConfig: prev });
          onParseConfigChanged();
          appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: `Restored previous parse configuration.` });
        } catch (err) {
          appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: `Failed to restore parse configuration.` });
        }
      }
      return;
    }

    setBusy(true);
    try {
      const proposal = parseIntent(text, { columns: ctxColumns });
      const summary = await summarizeProposal(proposal);
      const id = `p-${Date.now()}`;
      if (proposal.kind === "data_question") {
        // Answer directly, no confirmation/apply UI
        appendMessage({ id, role: "assistant", text: summary });
      } else {
        setPendingProposalId(id);
        appendMessage({ id, role: "assistant", text: summary, proposal, applyLabel: "Apply" });
      }
    } catch (err) {
      appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: `Sorry, I ran into an error.` });
    } finally {
      setBusy(false);
    }
  }, [appendMessage, busy, ctxColumns, input, onRemoveStep, onReorderSteps, onParseConfigChanged, summarizeProposal, updateParseConfig, uploadId]);

  const handleApply = useCallback(
    async (message: AssistantMessage) => {
      if (!message.proposal) return;
      const p = message.proposal;
      try {
        if (p.kind === "add_step") {
          const beforeLen = steps.length;
          const cfg = p.step.config;
          onAddStep(cfg.type as TransformationType, cfg);
          undoStack.current.push({ kind: "remove_step_at", index: beforeLen });
          appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: `Applied '${cfg.type}' step.` });
        } else if (p.kind === "reorder_steps") {
          onReorderSteps(p.from, p.to);
          undoStack.current.push({ kind: "reorder_steps", from: p.to, to: p.from });
          appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: `Reordered steps.` });
        } else if (p.kind === "update_parse_config") {
          const previous = parseConfig ? { ...parseConfig } : undefined;
          const base = parseConfig
            ? { ...parseConfig, hasHeaders: parseConfig.hasHeaders ?? true }
            : { hasHeaders: true };
          await updateParseConfig({ uploadId, parseConfig: { ...base, ...p.changes } });
          onParseConfigChanged();
          undoStack.current.push({ kind: "restore_parse_config", previous });
          appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: `Updated data source configuration.` });
        } else if (p.kind === "clarify") {
          // no-op
        }
      } catch (err) {
        appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: `Failed to apply change.` });
      } finally {
        setPendingProposalId(null);
      }
    },
    [appendMessage, onAddStep, onReorderSteps, parseConfig, onParseConfigChanged, updateParseConfig, uploadId, steps.length]
  );

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
                <span>{m.text}</span>
                {m.role === "assistant" && (m as AssistantMessage).proposal && pendingProposalId === m.id && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => handleApply(m as AssistantMessage)} disabled={busy}>
                      {(m as AssistantMessage).applyLabel || "Apply"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPendingProposalId(null)} disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                )}
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
              disabled={busy}
            />
            <Button onClick={handleSend} disabled={busy}>
              Send
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
