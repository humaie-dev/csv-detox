/**
 * Type definitions for DuckDB-WASM export functionality
 */

import type { TransformationStep } from "@/lib/pipeline/types";
import type { ParseOptions } from "@/lib/parsers/types";

/**
 * DuckDB instance wrapper
 * Uses dynamic type import to avoid bundling DuckDB-WASM at build time
 */
export interface DuckDBInstance {
  db: import("@duckdb/duckdb-wasm").AsyncDuckDB;
  version: string;
}

/**
 * Export progress stages
 */
export type ExportStage =
  | "initializing"
  | "downloading"
  | "loading"
  | "transforming"
  | "generating"
  | "ready"
  | "error";

/**
 * Progress information for export operation
 */
export interface ExportProgress {
  stage: ExportStage;
  message: string;
  /** Download progress in bytes (for downloading stage) */
  bytesDownloaded?: number;
  /** Total file size in bytes (for downloading stage) */
  totalBytes?: number;
  /** Current transformation step (for transforming stage) */
  currentStep?: number;
  /** Total transformation steps (for transforming stage) */
  totalSteps?: number;
  /** Error message (for error stage) */
  error?: string;
}

/**
 * Options for export operation
 */
export interface ExportOptions {
  /** Upload ID from database */
  uploadId: string;
  /** URL to download file from Convex storage */
  fileUrl: string;
  /** MIME type of the file */
  mimeType: string;
  /** Original filename */
  fileName: string;
  /** Pipeline transformation steps */
  steps: TransformationStep[];
  /** Parse configuration (row/column ranges, sheet selection) */
  parseConfig?: ParseOptions;
  /** Progress callback */
  onProgress?: (progress: ExportProgress) => void;
}

/**
 * Result of export operation
 */
export interface ExportResult {
  /** CSV blob ready for download */
  blob: Blob;
  /** Suggested filename for download */
  fileName: string;
  /** Number of rows in final result */
  rowCount: number;
}

/**
 * SQL translation error
 */
export class SQLTranslationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly config: unknown
  ) {
    super(message);
    this.name = "SQLTranslationError";
  }
}

/**
 * DuckDB execution error
 */
export class DuckDBExecutionError extends Error {
  constructor(
    message: string,
    public readonly sql: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DuckDBExecutionError";
  }
}

/**
 * Browser out-of-memory error
 */
export class BrowserOOMError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "BrowserOOMError";
  }
}
