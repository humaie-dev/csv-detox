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
  /** Sheet name or index for Excel files (default: first sheet) */
  sheet?: string | number;
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
