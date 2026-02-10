/**
 * Tool schemas for AI SDK function calling
 * Defines the tools available to the LLM for pipeline manipulation
 */

import { z } from "zod";

/**
 * Discriminated union for step configuration
 * Each stepType has its own precise config schema
 */
const stepConfigUnion = z.discriminatedUnion("stepType", [
  // Sort: Sort data by columns
  z.object({
    stepType: z.literal("sort"),
    config: z.object({
      columns: z.array(z.object({
        name: z.string().describe("Column name"),
        direction: z.enum(["asc", "desc"]).describe("Sort direction"),
      })).describe("Columns to sort by"),
      nullsPosition: z.enum(["first", "last"]).optional().describe("Where to place null values"),
    }),
  }),
  
  // Remove column
  z.object({
    stepType: z.literal("remove_column"),
    config: z.object({
      columns: z.array(z.string()).describe("Column names to remove"),
    }),
  }),
  
  // Rename column
  z.object({
    stepType: z.literal("rename_column"),
    config: z.object({
      oldName: z.string().describe("Current column name"),
      newName: z.string().describe("New column name"),
    }),
  }),
  
  // Deduplicate
  z.object({
    stepType: z.literal("deduplicate"),
    config: z.object({
      columns: z.array(z.string()).optional().describe("Columns to check for duplicates (omit to check all columns)"),
    }),
  }),
  
  // Filter
  z.object({
    stepType: z.literal("filter"),
    config: z.object({
      column: z.string().describe("Column to filter on"),
      operator: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal"]).describe("Filter operator"),
      value: z.any().describe("Value to compare against"),
      mode: z.enum(["keep", "remove"]).optional().describe("Keep or remove matching rows (default: keep)"),
    }),
  }),
  
  // Trim
  z.object({
    stepType: z.literal("trim"),
    config: z.object({
      columns: z.array(z.string()).describe("Columns to trim whitespace from"),
    }),
  }),
  
  // Uppercase
  z.object({
    stepType: z.literal("uppercase"),
    config: z.object({
      columns: z.array(z.string()).describe("Columns to convert to uppercase"),
    }),
  }),
  
  // Lowercase
  z.object({
    stepType: z.literal("lowercase"),
    config: z.object({
      columns: z.array(z.string()).describe("Columns to convert to lowercase"),
    }),
  }),
  
  // Split column
  z.object({
    stepType: z.literal("split_column"),
    config: z.object({
      sourceColumn: z.string().describe("Column to split"),
      method: z.enum(["delimiter", "position", "regex"]).describe("Split method"),
      newColumns: z.array(z.string()).describe("Names for the new columns"),
      delimiter: z.string().optional().describe("Delimiter string (for delimiter method)"),
      positions: z.array(z.number()).optional().describe("Split positions (for position method)"),
      pattern: z.string().optional().describe("Regex pattern (for regex method)"),
      trimResults: z.boolean().optional().describe("Trim whitespace from results"),
    }),
  }),
  
  // Merge columns
  z.object({
    stepType: z.literal("merge_columns"),
    config: z.object({
      sourceColumns: z.array(z.string()).describe("Columns to merge"),
      targetColumn: z.string().describe("Name of the merged column"),
      separator: z.string().optional().describe("Separator between values (default: space)"),
      skipNulls: z.boolean().optional().describe("Skip null values when merging"),
      keepOriginals: z.boolean().optional().describe("Keep original columns after merge"),
    }),
  }),
  
  // Unpivot
  z.object({
    stepType: z.literal("unpivot"),
    config: z.object({
      idColumns: z.array(z.string()).describe("Columns to keep as identifiers"),
      valueColumns: z.array(z.string()).describe("Columns to unpivot"),
      variableColumnName: z.string().optional().describe("Name for the variable column (default: 'variable')"),
      valueColumnName: z.string().optional().describe("Name for the value column (default: 'value')"),
    }),
  }),
  
  // Pivot
  z.object({
    stepType: z.literal("pivot"),
    config: z.object({
      indexColumns: z.array(z.string()).describe("Columns to use as row identifiers"),
      columnSource: z.string().describe("Column containing values that will become column headers"),
      valueSource: z.string().describe("Column containing the values to aggregate"),
      aggregation: z.enum(["sum", "count", "avg", "min", "max"]).optional().describe("Aggregation function (default: sum)"),
    }),
  }),
  
  // Cast column
  z.object({
    stepType: z.literal("cast_column"),
    config: z.object({
      column: z.string().describe("Column to cast"),
      targetType: z.enum(["string", "number", "boolean", "date"]).describe("Target data type"),
      onError: z.enum(["fail", "null", "skip"]).optional().describe("Error handling (default: null)"),
      dateFormat: z.string().optional().describe("Date format string (for date type)"),
    }),
  }),
  
  // Fill down
  z.object({
    stepType: z.literal("fill_down"),
    config: z.object({
      columns: z.array(z.string()).describe("Columns to fill down (replace empty cells with value from above)"),
      treatWhitespaceAsEmpty: z.boolean().optional().describe("Treat whitespace-only cells as empty"),
    }),
  }),
  
  // Fill across
  z.object({
    stepType: z.literal("fill_across"),
    config: z.object({
      columns: z.array(z.string()).describe("Columns to fill across (replace empty cells with value from left)"),
      treatWhitespaceAsEmpty: z.boolean().optional().describe("Treat whitespace-only cells as empty"),
    }),
  }),
]);

/**
 * Add a transformation step to the pipeline
 * Wrapped in z.object() at root level for Azure OpenAI compatibility (requires type: "object")
 * Uses discriminated union inside to provide precise schemas per stepType
 */
export const addStepToolSchema = z.object({
  step: stepConfigUnion.describe("The transformation step configuration with stepType and config"),
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
 * Analyze data for patterns, issues, and SQL readiness
 */
export const analyzeDataToolSchema = z.object({
  focus: z.enum(["sql-readiness", "data-quality", "structure", "all"]).optional().default("all").describe("Focus area for analysis: sql-readiness (check SQL compatibility), data-quality (check for issues), structure (check grouping/headers), or all (comprehensive analysis)"),
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
  previewData: "Preview data at any point in the pipeline. Use stepIndex to see data AFTER a specific step: -1 for original data (default), 0 for data after first step, 1 after second step, etc. Returns column metadata (names, types, sample values), rows, AND automatic analysis of patterns/issues. The analysis includes: header row detection, grouping column detection, SQL compatibility checks, and data quality issues.",
  analyzeData: "Perform comprehensive data analysis to detect structural patterns, data quality issues, and SQL compatibility problems. Use this when the user asks to 'analyze', 'inspect', 'check', or 'prepare for SQL'. Returns detailed findings with specific recommendations. IMPORTANT: After calling this tool, you MUST generate a text response summarizing the findings and proposing specific transformation steps to fix the issues.",
} as const;
