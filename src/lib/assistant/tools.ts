/**
 * Tool schemas for AI SDK function calling
 * Defines the tools available to the LLM for pipeline manipulation
 */

import { z } from "zod";

/**
 * Add a transformation step to the pipeline
 */
export const addStepToolSchema = z.object({
  stepType: z.enum([
    "sort",
    "remove_column",
    "rename_column",
    "deduplicate",
    "filter",
    "trim",
    "uppercase",
    "lowercase",
    "split_column",
    "merge_columns",
    "unpivot",
    "pivot",
    "cast_column",
    "fill_down",
    "fill_across",
  ]).describe("The type of transformation to add"),
  config: z.record(z.string(), z.any()).describe("Configuration object for the transformation step. REQUIRED - must be an object containing the operation's parameters. For example, fill_down requires: { columns: [...] }. For deduplicate, use empty object {} to apply to all columns. IMPORTANT: All operation parameters (like 'columns', 'column', 'oldName', etc.) must be INSIDE this config object, not at the top level."),
  position: z.union([z.number(), z.literal("end")]).optional().describe("Position to insert the step (0-based index or 'end')"),
});

/**
 * Remove a step from the pipeline
 */
export const removeStepToolSchema = z.object({
  stepIndex: z.number().describe("Zero-based index of the step to remove"),
});

/**
 * Edit an existing transformation step
 */
export const editStepToolSchema = z.object({
  stepIndex: z.number().describe("Zero-based index of the step to edit"),
  newConfig: z.record(z.string(), z.any()).describe("New configuration object for the step"),
});

/**
 * Reorder steps in the pipeline
 */
export const reorderStepsToolSchema = z.object({
  fromIndex: z.number().describe("Zero-based index of the step to move"),
  toIndex: z.number().describe("Zero-based index of the destination position"),
});

/**
 * Update parse configuration for the uploaded file
 */
export const updateParseConfigToolSchema = z.object({
  sheetName: z.string().optional().describe("Name of the Excel sheet to parse"),
  startRow: z.number().optional().nullable().describe("Starting row number (1-based). Null or 1 means start from the first row."),
  endRow: z.number().optional().nullable().describe("Ending row number (1-based). Null means parse until the last row."),
  startColumn: z.number().optional().nullable().describe("Starting column number (1-based). Null or 1 means start from the first column (A)."),
  endColumn: z.number().optional().nullable().describe("Ending column number (1-based). Null means parse until the last column."),
  hasHeaders: z.boolean().optional().describe("Whether the first row contains column headers"),
});

/**
 * Request a preview of the data at a specific pipeline step
 */
export const previewDataToolSchema = z.object({
  stepIndex: z.number().optional().default(-1).describe("Zero-based index to preview data AFTER that step. -1 = original data (before any steps), 0 = after first step, 1 = after second step, etc. Omit to see final result."),
  maxRows: z.number().optional().default(10).describe("Maximum number of rows to return (default 10, max 50)"),
});

/**
 * Tool descriptions for AI SDK
 */
export const toolDescriptions = {
  addStep: "Add a new transformation step to the pipeline. IMPORTANT: You MUST provide a complete config object with all required fields for the operation type (e.g., fill_down requires { columns: [...] }). If the user's request is missing required information (like which columns to operate on), respond with text asking for clarification instead of calling this tool with incomplete config. Returns the proposed configuration for user confirmation.",
  removeStep: "Remove a transformation step from the pipeline by its index (0-based).",
  editStep: "Edit an existing transformation step by replacing its configuration.",
  reorderSteps: "Move a step from one position to another in the pipeline.",
  updateParseConfig: "Update the parse configuration (sheet selection, row/column ranges, headers) for the uploaded file.",
  previewData: "Preview data at any point in the pipeline. Use stepIndex to see data AFTER a specific step: -1 for original data (default), 0 for data after first step, 1 after second step, etc. Returns column metadata (names, types, sample values) and rows. Useful to understand how data changes through the pipeline.",
} as const;
