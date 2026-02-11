/**
 * TypeScript types for SQLite database operations
 */

export interface ColumnMetadata {
  name: string;
  type: "string" | "number" | "boolean" | "date";
  nullCount: number;
  sampleValues?: string[]; // JSON array of sample values
  minValue?: string;
  maxValue?: string;
}

export interface RawDataRow {
  row_id: number;
  data: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

export interface ParseConfig {
  delimiter?: string;
  hasHeaders?: boolean;
  encoding?: string;
  sheetName?: string;
  cellRange?: string;
}

export interface DataPreviewResult {
  data: Record<string, unknown>[];
  columns: ColumnMetadata[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
  };
}

export interface PipelineExecutionResult {
  pipelineId: string;
  rowCount: number;
  columnCount: number;
  executionTimeMs: number;
  warnings?: string[];
}

export interface SamplingOptions {
  type: "random" | "distribution" | "stats" | "search" | "range";
  limit?: number;
  column?: string;
  pattern?: string;
  startRow?: number;
  endRow?: number;
}

export interface ColumnStats {
  name: string;
  type: string;
  count: number;
  nullCount: number;
  uniqueCount?: number;
  minValue?: string | number;
  maxValue?: string | number;
  avgValue?: number;
}

export interface ColumnDistribution {
  column: string;
  values: Array<{
    value: string | number | null;
    count: number;
    percentage: number;
  }>;
}
