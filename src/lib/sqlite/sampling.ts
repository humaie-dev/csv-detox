/**
 * AI Assistant sampling utilities for SQLite data
 * Provides tools for LLM to understand and query data
 */

import type { Database } from "better-sqlite3";
import type { ColumnMetadata } from "./types";

/**
 * Get a sample of rows from a table
 */
export function sampleRows(
  db: Database,
  tableName: string,
  limit: number = 10,
): Array<Record<string, unknown>> {
  const stmt = db.prepare(`
    SELECT data
    FROM ${tableName}
    ORDER BY RANDOM()
    LIMIT ?
  `);

  const rows = stmt.all(limit) as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data));
}

/**
 * Get column statistics for AI context
 */
export function getColumnStats(db: Database, tableName: string = "raw_data"): ColumnMetadata[] {
  const isRawData = tableName === "raw_data";
  const columnsTable = isRawData ? "columns" : tableName.replace("_result", "_columns");

  const stmt = db.prepare(`
    SELECT name, type, null_count, sample_values
    FROM ${columnsTable}
  `);

  const rows = stmt.all() as Array<{
    name: string;
    type: string;
    null_count: number;
    sample_values: string | null;
  }>;

  return rows.map((row) => ({
    name: row.name,
    type: row.type as "string" | "number" | "boolean" | "date",
    nullCount: row.null_count,
    sampleValues: row.sample_values ? JSON.parse(row.sample_values) : undefined,
  }));
}

/**
 * Get unique values for a column (for categorical analysis)
 */
export function getUniqueValues(
  db: Database,
  tableName: string,
  columnName: string,
  limit: number = 50,
): Array<{ value: unknown; count: number }> {
  // Get all rows
  const stmt = db.prepare(`
    SELECT data
    FROM ${tableName}
  `);

  const rows = stmt.all() as Array<{ data: string }>;

  // Count values
  const valueCounts = new Map<string, number>();
  for (const row of rows) {
    const data = JSON.parse(row.data);
    const value = data[columnName];
    const key = JSON.stringify(value);
    valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
  }

  // Sort by count and take top N
  return Array.from(valueCounts.entries())
    .map(([key, count]) => ({
      value: JSON.parse(key),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get table row count
 */
export function getRowCount(db: Database, tableName: string): number {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Search for rows matching a pattern in a column
 */
export function searchColumn(
  db: Database,
  tableName: string,
  columnName: string,
  searchTerm: string,
  limit: number = 20,
): Array<Record<string, unknown>> {
  const stmt = db.prepare(`
    SELECT data
    FROM ${tableName}
    WHERE json_extract(data, '$.${columnName}') LIKE ?
    LIMIT ?
  `);

  const rows = stmt.all(`%${searchTerm}%`, limit) as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data));
}

/**
 * Get data summary for AI context
 */
export interface DataSummary {
  tableName: string;
  rowCount: number;
  columns: ColumnMetadata[];
  sampleRows: Array<Record<string, unknown>>;
}

export function getDataSummary(
  db: Database,
  tableName: string,
  sampleSize: number = 5,
): DataSummary {
  return {
    tableName,
    rowCount: getRowCount(db, tableName),
    columns: getColumnStats(db, tableName),
    sampleRows: sampleRows(db, tableName, sampleSize),
  };
}
