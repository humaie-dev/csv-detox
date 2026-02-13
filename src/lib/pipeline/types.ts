/**
 * Type definitions for transformation pipeline
 */

import type { ColumnMetadata, ParseResult } from "@/lib/parsers/types";

// Re-export for convenience
export type { ParseResult, ColumnMetadata };

/**
 * Transformation operation types
 */
export type TransformationType =
  | "trim"
  | "uppercase"
  | "lowercase"
  | "deduplicate"
  | "filter"
  | "rename_column"
  | "remove_column"
  | "unpivot"
  | "pivot"
  | "split_column"
  | "merge_columns"
  | "cast_column"
  | "fill_down"
  | "fill_across"
  | "sort";

/**
 * Base transformation step
 */
export interface TransformationStep {
  id: string;
  type: TransformationType;
  config: TransformationConfig;
}

/**
 * Configuration for transformation operations
 */
export type TransformationConfig =
  | TrimConfig
  | UppercaseConfig
  | LowercaseConfig
  | DeduplicateConfig
  | FilterConfig
  | RenameColumnConfig
  | RemoveColumnConfig
  | UnpivotConfig
  | PivotConfig
  | SplitColumnConfig
  | MergeColumnsConfig
  | CastColumnConfig
  | FillDownConfig
  | FillAcrossConfig
  | SortConfig;

export interface TrimConfig {
  type: "trim";
  columns: string[];
}

export interface UppercaseConfig {
  type: "uppercase";
  columns: string[];
}

export interface LowercaseConfig {
  type: "lowercase";
  columns: string[];
}

export interface DeduplicateConfig {
  type: "deduplicate";
  columns?: string[]; // If specified, deduplicate based on these columns only
}

export interface FilterConfig {
  type: "filter";
  column: string;
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than";
  value: string | number | boolean;
}

export interface RenameColumnConfig {
  type: "rename_column";
  oldName: string;
  newName: string;
}

export interface RemoveColumnConfig {
  type: "remove_column";
  columns: string[];
}

/**
 * Unpivot (Wide → Long) transformation
 * Converts columns into rows
 */
export interface UnpivotConfig {
  type: "unpivot";
  idColumns: string[]; // Columns to keep as-is
  valueColumns: string[]; // Columns to unpivot
  variableColumnName: string; // New column for column names
  valueColumnName: string; // New column for values
}

/**
 * Pivot (Long → Wide) transformation
 * Converts rows into columns
 */
export interface PivotConfig {
  type: "pivot";
  indexColumns: string[]; // Group by these columns
  columnSource: string; // Column containing new column names
  valueSource: string; // Column containing values
  aggregation?: "first" | "last" | "sum" | "mean" | "count"; // Handle duplicates (Phase 1: use "last")
}

/**
 * Split Column transformation
 * Splits one column into multiple columns
 */
export interface SplitColumnConfig {
  type: "split_column";
  column: string; // Column to split
  method: "delimiter" | "position" | "regex"; // Split method
  delimiter?: string; // For delimiter method
  positions?: number[]; // For position method (split points)
  pattern?: string; // For regex method
  newColumns: string[]; // Names for new columns
  trim?: boolean; // Trim whitespace (default: true)
  keepOriginal?: boolean; // Keep original column (default: false)
  maxSplits?: number; // Max number of splits (default: unlimited)
}

/**
 * Merge Columns transformation
 * Combines multiple columns into one
 */
export interface MergeColumnsConfig {
  type: "merge_columns";
  columns: string[]; // Columns to merge (in order)
  separator: string; // Separator between values
  newColumn: string; // Name for merged column
  skipNull?: boolean; // Skip null values (default: true)
  keepOriginal?: boolean; // Keep original columns (default: false)
}

/**
 * Cast Column transformation
 * Convert column to a specific type with validation
 */
export interface CastColumnConfig {
  type: "cast_column";
  column: string; // Column to cast
  targetType: "string" | "number" | "boolean" | "date";
  onError: "fail" | "null" | "skip"; // How to handle cast failures
  format?: string; // Optional format string for dates
}

/**
 * Fill Down transformation
 * Fill empty cells with the last non-empty value from above (vertical)
 */
export interface FillDownConfig {
  type: "fill_down";
  columns: string[]; // Columns to fill (top to bottom)
  treatWhitespaceAsEmpty?: boolean; // Treat whitespace-only strings as empty (default: false)
}

/**
 * Fill Across transformation
 * Fill empty cells with the last non-empty value from left (horizontal)
 */
export interface FillAcrossConfig {
  type: "fill_across";
  columns: string[];
  treatWhitespaceAsEmpty?: boolean; // Default: false
}

export interface SortConfig {
  type: "sort";
  columns: SortColumn[];
  nullsPosition?: "first" | "last"; // Default: "last"
}

export interface SortColumn {
  name: string;
  direction: "asc" | "desc"; // Default: "asc"
}

/**
 * Result of executing a single transformation step
 */
export interface StepResult {
  stepId: string;
  success: boolean;
  rowsAffected?: number;
  columnsAfter: ColumnMetadata[]; // Column metadata after this step
  castErrors?: number; // Number of failed casts (for cast operations)
  skippedRows?: number; // Number of rows skipped (for cast/filter operations)
  error?: string;
}

/**
 * Result of executing a pipeline
 */
export interface ExecutionResult {
  table: ParseResult;
  stepResults: StepResult[];
  typeEvolution: ColumnMetadata[][]; // Column types at each step
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  uploadId: string;
  sheetName?: string;
  steps: TransformationStep[];
}

/**
 * Operation function signature
 * Operations now return both the transformed table and updated column metadata
 */
export type OperationFn = (
  table: ParseResult,
  config: TransformationConfig,
) => { table: ParseResult; columns: ColumnMetadata[] };

/**
 * Error thrown during transformation
 */
export class TransformationError extends Error {
  constructor(
    message: string,
    public readonly stepId: string,
    public readonly operation: TransformationType,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "TransformationError";
  }
}
