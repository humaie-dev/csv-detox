/**
 * Rule-based intent parser for the AI Assistant (Phase 1)
 * Maps natural-language commands to structured proposals.
 */

import type {
  TransformationConfig,
  TransformationType,
  SortConfig,
  SortColumn,
  RemoveColumnConfig,
  RenameColumnConfig,
  DeduplicateConfig,
  FilterConfig,
} from "@/lib/pipeline/types";
import type { ParseOptions } from "@/lib/parsers/types";

export type ClarifyProposal = {
  kind: "clarify";
  question: string;
};

export interface ProposedStep {
  /** Concrete operation configuration (includes its own `type`) */
  config: TransformationConfig;
  /** Optional insertion position: number = index, "end" = append */
  position?: number | "end";
}

export type AddStepProposal = {
  kind: "add_step";
  step: ProposedStep;
};

export type ReorderStepsProposal = {
  kind: "reorder_steps";
  /** Zero-based source index */
  from: number;
  /** Zero-based destination index */
  to: number;
};

export type UpdateParseConfigProposal = {
  kind: "update_parse_config";
  changes: Partial<Pick<
    ParseOptions,
    "sheetName" | "startRow" | "endRow" | "startColumn" | "endColumn" | "hasHeaders"
  >>;
};

export type Proposal =
  | AddStepProposal
  | ReorderStepsProposal
  | UpdateParseConfigProposal
  | ClarifyProposal;

export interface ParseContext {
  /** Optional known columns to validate against */
  columns?: string[];
}

/**
 * Parse a user message into a single Proposal.
 * Returns a Clarify proposal when no pattern matches or input is incomplete.
 */
export function parseIntent(input: string, ctx?: ParseContext): Proposal {
  const text = normalize(input);

  // Sort
  const sort = parseSort(text, ctx);
  if (sort) return sort;

  // Remove columns
  const remove = parseRemoveColumns(text, ctx);
  if (remove) return remove;

  // Rename column
  const rename = parseRename(text, ctx);
  if (rename) return rename;

  // Deduplicate / remove duplicates
  const dedupe = parseDeduplicate(text, ctx);
  if (dedupe) return dedupe;

  // Filter
  const filter = parseFilter(text, ctx);
  if (filter) return filter;

  // Reorder steps
  const reorder = parseReorder(text);
  if (reorder) return reorder;

  // Parse config updates
  const cfg = parseParseConfig(text);
  if (cfg) return cfg;

  return clarify("I did not understand the request. Try: 'sort by date desc', 'remove column notes', 'rename amount to total'.");
}

function normalize(s: string): string {
  // Keep case for names but normalize whitespace and punctuation spaces
  return s.trim().replace(/\s+/g, " ");
}

function clarify(question: string): ClarifyProposal {
  return { kind: "clarify", question };
}

function parseSort(text: string, ctx?: ParseContext): AddStepProposal | ClarifyProposal | null {
  const sortMatch = /\bsort by\b(.+)/i.exec(text);
  if (!sortMatch) return null;

  const tail = sortMatch[1].trim();

  // Extract optional nulls position at the end (", nulls first|last")
  let nullsPosition: "first" | "last" | undefined;
  const nullsMatch = /,?\s*nulls\s+(first|last)\b/i.exec(tail);
  let itemsPart = tail;
  if (nullsMatch) {
    nullsPosition = (nullsMatch[1].toLowerCase() as "first" | "last");
    itemsPart = tail.slice(0, nullsMatch.index).trim().replace(/[,\s]+$/, "");
  }

  // Split by "then by" or commas
  const parts = splitByThenOrComma(itemsPart);
  const columns: SortColumn[] = [];

  for (const part of parts) {
    const m = /^(?:by\s+)?(.+?)(?:\s+(asc|ascending|desc|descending))?$/i.exec(part.trim());
    if (!m) continue;
    const name = cleanupName(m[1]);
    if (!name) continue;
    const dirToken = m[2]?.toLowerCase();
    const direction: "asc" | "desc" = dirToken?.startsWith("desc") ? "desc" : "asc";
    if (ctx?.columns && !ctx.columns.includes(name)) {
      // Allow unknown columns but ask when nothing matches
      // We'll collect but track invalid; decide after loop
    }
    columns.push({ name, direction });
  }

  if (columns.length === 0) {
    return clarify("Which columns should I sort by? e.g., 'sort by date desc, amount asc'");
  }

  const config: SortConfig = { type: "sort", columns, nullsPosition };
  return { kind: "add_step", step: { config, position: "end" } };
}

function splitByThenOrComma(s: string): string[] {
  // Split on 'then by' boundaries first, then commas
  const thenSplit = s
    .split(/\bthen by\b/i)
    .map((x) => x.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const seg of thenSplit) {
    for (const piece of seg.split(/\s*,\s*/)) {
      const t = piece.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function parseRemoveColumns(text: string, ctx?: ParseContext): AddStepProposal | ClarifyProposal | null {
  const m = /\bremove\s+(?:column|columns)\s+(.+)/i.exec(text);
  if (!m) return null;
  const raw = m[1].trim();
  const names = parseNamesList(raw);
  if (names.length === 0) return clarify("Which column(s) should I remove? e.g., 'remove columns notes, internal id'");
  const config: RemoveColumnConfig = { type: "remove_column", columns: names };
  return { kind: "add_step", step: { config, position: "end" } };
}

function parseRename(text: string, ctx?: ParseContext): AddStepProposal | ClarifyProposal | null {
  const m = /\brename\s+(.+?)\s+to\s+(.+)/i.exec(text);
  if (!m) return null;
  const oldName = cleanupName(m[1]);
  const newName = cleanupName(m[2]);
  if (!oldName || !newName) return clarify("Please specify both old and new column names, e.g., 'rename amount to total_amount'");
  const config: RenameColumnConfig = { type: "rename_column", oldName, newName };
  return { kind: "add_step", step: { config, position: "end" } };
}

function parseDeduplicate(text: string, ctx?: ParseContext): AddStepProposal | null {
  const m1 = /\bdeduplicat(?:e|ion)\b(?:\s+by\s+(.+))?/i.exec(text);
  const m2 = /\bremove\s+duplicates\b(?:\s+by\s+(.+))?/i.exec(text);
  const m = m1 ?? m2;
  if (!m) return null;
  const list = m[1]?.trim();
  const columns = list ? parseNamesList(list) : undefined;
  const config: DeduplicateConfig = { type: "deduplicate", columns };
  return { kind: "add_step", step: { config, position: "end" } };
}

type FilterOperatorToken =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than";

function parseFilter(text: string, ctx?: ParseContext): AddStepProposal | ClarifyProposal | null {
  // Support: "keep rows where <col> <op> <value>", "remove rows where ...", "filter where ..."
  const m = /\b(?:(keep|remove)\s+rows\s+where|filter\s+(?:rows\s+)?where)\s+(.+?)\s+(equals|not equals|contains|not contains|>=|<=|>|<|=|!=)\s+(.+)/i.exec(
    text
  );
  if (!m) return null;

  const mode = m[1]?.toLowerCase(); // keep | remove | undefined (filter)
  const column = cleanupName(m[2]);
  const opToken = m[3].toLowerCase();
  const rawValue = m[4].trim();

  if (!column) return clarify("Which column should I filter? e.g., 'keep rows where age > 21'");

  const parsed = mapOperator(opToken);
  if (!parsed) return clarify("Unsupported operator. Use: equals, not equals, contains, not contains, >, <");

  let operator: FilterOperatorToken = parsed.operator;
  let value: string | number | boolean = coerceValue(rawValue);

  // Invert for "remove rows where"
  if (mode === "remove") {
    operator = invertOperator(operator);
  }

  const config: FilterConfig = { type: "filter", column, operator, value };
  return { kind: "add_step", step: { config, position: "end" } };
}

function mapOperator(token: string): { operator: FilterOperatorToken } | null {
  switch (token) {
    case "=":
    case "==":
    case "equals":
      return { operator: "equals" };
    case "!=":
    case "not equals":
      return { operator: "not_equals" };
    case ">":
      return { operator: "greater_than" };
    case "<":
      return { operator: "less_than" };
    case "contains":
      return { operator: "contains" };
    case "not contains":
      return { operator: "not_contains" };
    default:
      return null;
  }
}

function invertOperator(op: FilterOperatorToken): FilterOperatorToken {
  switch (op) {
    case "equals":
      return "not_equals";
    case "not_equals":
      return "equals";
    case "contains":
      return "not_contains";
    case "not_contains":
      return "contains";
    case "greater_than":
      return "less_than";
    case "less_than":
      return "greater_than";
  }
}

function coerceValue(v: string): string | number | boolean {
  const unquoted = v.replace(/^\"(.+)\"$/s, "$1").replace(/^'(.*)'$/s, "$1");
  const low = unquoted.toLowerCase();
  if (low === "true") return true;
  if (low === "false") return false;
  const num = Number(unquoted);
  if (!Number.isNaN(num) && unquoted.trim() !== "") return num;
  return unquoted;
}

function parseReorder(text: string): ReorderStepsProposal | ClarifyProposal | null {
  const m = /\bmove\s+step\s+(\d+)\s+(up|down|above\s+(\d+)|below\s+(\d+))\b/i.exec(text);
  if (!m) return null;
  const fromHuman = Number(m[1]);
  const from = Math.max(0, fromHuman - 1);
  const token = m[2].toLowerCase();
  let to: number | null = null;
  if (token === "up") to = Math.max(0, from - 1);
  else if (token === "down") to = from + 1;
  else if (token.startsWith("above")) {
    const target = Number(m[3]);
    to = Math.max(0, target - 1);
  } else if (token.startsWith("below")) {
    const target = Number(m[4]);
    to = Math.max(0, target); // below N → index N
  }
  if (to === null || Number.isNaN(to)) return clarify("Where should I move the step? e.g., 'move step 3 above 1'");
  return { kind: "reorder_steps", from, to };
}

function parseParseConfig(text: string): UpdateParseConfigProposal | ClarifyProposal | null {
  // Sheet name
  const sheetMatch = /\b(?:set\s+)?sheet\s+(.+)/i.exec(text);
  if (sheetMatch) {
    const sheetName = cleanupName(sheetMatch[1]);
    if (!sheetName) return clarify("What sheet name should I use? e.g., 'set sheet Transactions'");
    return { kind: "update_parse_config", changes: { sheetName } };
  }

  // Rows range: rows A-B
  const rowsMatch = /\brows\s+(\d+)\s*-\s*(\d+)\b/i.exec(text);
  if (rowsMatch) {
    const startRow = Number(rowsMatch[1]);
    const endRow = Number(rowsMatch[2]);
    return { kind: "update_parse_config", changes: { startRow, endRow } };
  }

  // Columns range: columns A-B
  const colsMatch = /\bcolumns\s+(\d+)\s*-\s*(\d+)\b/i.exec(text);
  if (colsMatch) {
    const startColumn = Number(colsMatch[1]);
    const endColumn = Number(colsMatch[2]);
    return { kind: "update_parse_config", changes: { startColumn, endColumn } };
  }

  // Has headers true/false
  const headersMatch = /\bhas\s+headers\s+(true|false|yes|no|on|off)\b/i.exec(text);
  if (headersMatch) {
    const v = headersMatch[1].toLowerCase();
    const hasHeaders = v === "true" || v === "yes" || v === "on";
    return { kind: "update_parse_config", changes: { hasHeaders } };
  }

  return null;
}

function cleanupName(name: string): string {
  return name.trim().replace(/^\"(.+)\"$/s, "$1").replace(/^'(.*)'$/s, "$1");
}

function parseNamesList(raw: string): string[] {
  // Split by commas and the word 'and'
  const parts = raw
    .split(/\s*,\s*|\s+and\s+/i)
    .map((p) => cleanupName(p))
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts;
}
