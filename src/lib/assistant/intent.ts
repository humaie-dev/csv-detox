/**
 * AI-powered intent parser for the AI Assistant
 * Maps natural-language commands to structured proposals using Azure OpenAI
 */

import type {
  TransformationConfig,
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

export type RemoveStepProposal = {
  kind: "remove_step";
  /** Zero-based index of the step to remove */
  stepIndex: number;
};

export type EditStepProposal = {
  kind: "edit_step";
  /** Zero-based index of the step to edit */
  stepIndex: number;
  /** New configuration for the step */
  newConfig: TransformationConfig;
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
  | RemoveStepProposal
  | EditStepProposal
  | ReorderStepsProposal
  | UpdateParseConfigProposal
  | ClarifyProposal;

export interface ParseContext {
  /** Optional known columns to validate against */
  columns?: string[];
  /** Current pipeline steps for context */
  currentSteps?: Array<{ type: string; [key: string]: any }>;
  /** Current parse configuration */
  parseConfig?: Partial<Pick<
    ParseOptions,
    "sheetName" | "startRow" | "endRow" | "startColumn" | "endColumn" | "hasHeaders"
  >>;
}

/**
 * Parse a user message into a Proposal using AI.
 * This function is re-exported from ai-intent.ts for convenience.
 * 
 * Note: This is an async function that calls Azure OpenAI.
 * Use via the Convex action in convex/assistant.ts for proper environment variable handling.
 */
export { parseIntentWithAI as parseIntent } from "./ai-intent";
