/**
 * Type definitions for the CSV Detox parsing system
 */

/**
 * Inferred data type for a column
 */
export type InferredType = "string" | "number" | "boolean" | "date" | "null";

/**
 * Metadata about a parsed column
 */
export interface ColumnMetadata {
  /** Original column name from the file */
  name: string;
  /** Inferred data type */
  type: InferredType;
  /** Number of non-null values */
  nonNullCount: number;
  /** Number of null/empty values */
  nullCount: number;
  /** Sample values (first 5 non-null) */
  sampleValues: unknown[];
}

/**
 * Result of parsing a file
 */
export interface ParseResult {
  /** Array of row objects (column name -> value) */
  rows: Record<string, unknown>[];
  /** Metadata for each column */
  columns: ColumnMetadata[];
  /** Total number of rows parsed */
  rowCount: number;
  /** Any warnings encountered during parsing */
  warnings: string[];
  /** Whether default column names (Column1, Column2, etc.) were auto-generated */
  hasDefaultColumnNames?: boolean;
}

/**
 * Options for parsing files
 */
export interface ParseOptions {
  /** Maximum number of rows to parse (for preview) */
  maxRows?: number;
  /** Whether to infer types (default: true) */
  inferTypes?: boolean;
  /** CSV delimiter (default: auto-detect) */
  delimiter?: string;
  /** Excel: Sheet name to parse */
  sheetName?: string;
  /** Excel: Sheet index to parse (0-based, fallback if name unavailable) */
  sheetIndex?: number;
  /** First row to parse (1-based, default: 1) */
  startRow?: number;
  /** Last row to parse (1-based, default: undefined = all rows) */
  endRow?: number;
  /** First column to parse (1-based, default: 1) */
  startColumn?: number;
  /** Last column to parse (1-based, default: undefined = all columns) */
  endColumn?: number;
  /** Whether first row (after startRow) contains headers (default: true) */
  hasHeaders?: boolean;
}

/**
 * Error thrown during parsing
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ParseError";
  }
}
