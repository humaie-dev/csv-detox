/**
 * Common SQLite query patterns for data access
 */

import type { Database } from "better-sqlite3";
import type { ColumnStats, ColumnDistribution } from "./types";

/**
 * Get random sample of rows
 */
export function getRandomSample(
  db: Database,
  tableName: string = "raw_data",
  limit: number = 100
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
 * Get rows by row ID range
 */
export function getRowRange(
  db: Database,
  startRow: number,
  endRow: number,
  tableName: string = "raw_data"
): Array<Record<string, unknown>> {
  const stmt = db.prepare(`
    SELECT data
    FROM ${tableName}
    WHERE row_id >= ? AND row_id <= ?
    ORDER BY row_id
  `);

  const rows = stmt.all(startRow, endRow) as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data));
}

/**
 * Get column statistics
 * Note: This is approximate - we sample data to calculate stats
 */
export function getColumnStats(
  db: Database,
  columnName: string,
  tableName: string = "raw_data",
  sampleSize: number = 10000
): ColumnStats {
  // Get sample of data
  const stmt = db.prepare(`
    SELECT data
    FROM ${tableName}
    ORDER BY RANDOM()
    LIMIT ?
  `);

  const rows = stmt.all(sampleSize) as Array<{ data: string }>;
  const values = rows
    .map((row) => JSON.parse(row.data)[columnName])
    .filter((val) => val !== null && val !== undefined);

  const nullCount = rows.length - values.length;
  const uniqueValues = new Set(values);

  // Determine type
  let type = "string";
  if (values.length > 0) {
    const firstValue = values[0];
    if (typeof firstValue === "number") {
      type = "number";
    } else if (typeof firstValue === "boolean") {
      type = "boolean";
    } else if (firstValue instanceof Date) {
      type = "date";
    }
  }

  // Calculate stats
  const stats: ColumnStats = {
    name: columnName,
    type,
    count: rows.length,
    nullCount,
    uniqueCount: uniqueValues.size,
  };

  // Type-specific stats
  if (type === "number") {
    const numValues = values as number[];
    stats.minValue = Math.min(...numValues);
    stats.maxValue = Math.max(...numValues);
    stats.avgValue = numValues.reduce((a, b) => a + b, 0) / numValues.length;
  } else if (type === "string") {
    const strValues = values as string[];
    stats.minValue = strValues.sort()[0];
    stats.maxValue = strValues.sort()[strValues.length - 1];
  }

  return stats;
}

/**
 * Get column value distribution (top N values)
 */
export function getColumnDistribution(
  db: Database,
  columnName: string,
  tableName: string = "raw_data",
  limit: number = 20,
  sampleSize: number = 10000
): ColumnDistribution {
  // Get sample of data
  const stmt = db.prepare(`
    SELECT data
    FROM ${tableName}
    ORDER BY RANDOM()
    LIMIT ?
  `);

  const rows = stmt.all(sampleSize) as Array<{ data: string }>;
  const values = rows.map((row) => JSON.parse(row.data)[columnName]);

  // Count value frequencies
  const frequencies = new Map<string | number | null, number>();
  for (const value of values) {
    const key = value === null ? null : value;
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  }

  // Sort by frequency and take top N
  const sortedFreqs = Array.from(frequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const total = values.length;
  const distribution = sortedFreqs.map(([value, count]) => ({
    value,
    count,
    percentage: (count / total) * 100,
  }));

  return {
    column: columnName,
    values: distribution,
  };
}

/**
 * Search for rows where column matches pattern
 */
export function searchColumnValues(
  db: Database,
  columnName: string,
  pattern: string,
  tableName: string = "raw_data",
  limit: number = 100
): Array<Record<string, unknown>> {
  // Use JSON extract for searching
  const stmt = db.prepare(`
    SELECT data
    FROM ${tableName}
    WHERE json_extract(data, '$.${columnName}') LIKE ?
    LIMIT ?
  `);

  const rows = stmt.all(`%${pattern}%`, limit) as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data));
}

/**
 * Count rows matching a condition
 */
export function countRowsWhere(
  db: Database,
  columnName: string,
  value: unknown,
  tableName: string = "raw_data"
): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM ${tableName}
    WHERE json_extract(data, '$.${columnName}') = ?
  `);

  const result = stmt.get(value) as { count: number };
  return result.count;
}

/**
 * Get distinct values for a column
 */
export function getDistinctValues(
  db: Database,
  columnName: string,
  tableName: string = "raw_data",
  limit: number = 100
): Array<string | number | null> {
  const stmt = db.prepare(`
    SELECT DISTINCT json_extract(data, '$.${columnName}') as value
    FROM ${tableName}
    LIMIT ?
  `);

  const rows = stmt.all(limit) as Array<{ value: string | number | null }>;
  return rows.map((row) => row.value);
}
