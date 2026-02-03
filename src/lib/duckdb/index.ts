/**
 * DuckDB-WASM export module
 * Main exports for client-side full file export
 */

export { exportWithDuckDB } from "./exporter";
export { initDuckDB, clearDuckDBCache } from "./init";
export { translatePipeline, escapeIdentifier, escapeLiteral } from "./sql-translator";
export type {
  DuckDBInstance,
  ExportStage,
  ExportProgress,
  ExportOptions,
  ExportResult,
  SQLTranslationError,
  DuckDBExecutionError,
  BrowserOOMError,
} from "./types";
