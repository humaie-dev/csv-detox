/**
 * Pivot (Long → Wide) transformation
 * Converts rows into columns
 *
 * Example:
 *   Input:
 *     {Name: "Alice", Month: "Jan", Sales: 100}
 *     {Name: "Alice", Month: "Feb", Sales: 200}
 *   Config: indexColumns: ["Name"], columnSource: "Month", valueSource: "Sales"
 *   Output: {Name: "Alice", Jan: 100, Feb: 200}
 */

import type { ParseResult, ColumnMetadata } from "@/lib/parsers/types";
import type { PivotConfig } from "@/lib/pipeline/types";

export function pivot(table: ParseResult, config: PivotConfig): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate configuration
  validateConfig(table, config);

  const { indexColumns, columnSource, valueSource, aggregation = "last" } =
    config;

  // Step 1: Collect unique values from column source (these become new columns)
  const uniqueColumnValues = new Set<string>();
  for (const row of table.rows) {
    const colValue = row[columnSource];
    // Convert to string for column name
    const colName = colValue === null ? "null" : String(colValue);
    uniqueColumnValues.add(colName);
  }

  const newColumnNames = Array.from(uniqueColumnValues).sort();

  // Step 2: Group rows by index columns
  const grouped = new Map<string, Record<string, unknown>[]>();

  for (const row of table.rows) {
    // Create key from index columns
    const key = indexColumns.map((col) => String(row[col] ?? "null")).join("|");

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  }

  // Step 3: Build new rows
  const newRows: Record<string, unknown>[] = [];

  for (const [key, rows] of grouped) {
    const newRow: Record<string, unknown> = {};

    // Add index column values (from first row in group)
    const firstRow = rows[0];
    for (const indexCol of indexColumns) {
      newRow[indexCol] = firstRow[indexCol];
    }

    // For each new column, find matching row and extract value
    for (const newColName of newColumnNames) {
      // Find row(s) where columnSource equals newColName
      const matchingRows = rows.filter((r) => {
        const colValue = r[columnSource];
        const colName = colValue === null ? "null" : String(colValue);
        return colName === newColName;
      });

      if (matchingRows.length === 0) {
        // No matching row - fill with null
        newRow[newColName] = null;
      } else if (matchingRows.length === 1) {
        // Single matching row - use value
        newRow[newColName] = matchingRows[0][valueSource];
      } else {
        // Multiple matching rows - apply aggregation
        newRow[newColName] = aggregateValues(
          matchingRows.map((r) => r[valueSource]),
          aggregation
        );
      }
    }

    newRows.push(newRow);
  }

  // Step 4: Build new columns metadata
  const newColumns: ColumnMetadata[] = [];

  // Add index columns (preserve original types)
  for (const indexCol of indexColumns) {
    const originalCol = table.columns.find((c) => c.name === indexCol);
    if (originalCol) {
      newColumns.push(originalCol);
    }
  }

  // Add new columns from pivot (infer type from value source)
  const valueSourceCol = table.columns.find((c) => c.name === valueSource);
  const valueType = valueSourceCol?.type ?? "string";

  for (const newColName of newColumnNames) {
    newColumns.push({
      name: newColName,
      type: valueType,
      nonNullCount: 0, // Would need to calculate from actual data
      nullCount: 0,
      sampleValues: [],
    });
  }

  const result = {
    rows: newRows,
    columns: newColumns,
    rowCount: newRows.length,
    warnings: table.warnings,
  };
  
  return {
    table: result,
    columns: newColumns,
  };
}

/**
 * Validate pivot configuration
 */
function validateConfig(table: ParseResult, config: PivotConfig): void {
  const { indexColumns, columnSource, valueSource } = config;

  // Check index columns exist
  if (indexColumns.length === 0) {
    throw new Error("At least one index column must be specified");
  }

  for (const indexCol of indexColumns) {
    if (!table.columns.find((c) => c.name === indexCol)) {
      throw new Error(`Index column "${indexCol}" does not exist`);
    }
  }

  // Check column source exists
  if (!table.columns.find((c) => c.name === columnSource)) {
    throw new Error(`Column source "${columnSource}" does not exist`);
  }

  // Check value source exists
  if (!table.columns.find((c) => c.name === valueSource)) {
    throw new Error(`Value source "${valueSource}" does not exist`);
  }

  // Check column source is not in index columns
  if (indexColumns.includes(columnSource)) {
    throw new Error("Column source cannot be an index column");
  }

  // Check value source is not in index columns
  if (indexColumns.includes(valueSource)) {
    throw new Error("Value source cannot be an index column");
  }

  // Check column source and value source are different
  if (columnSource === valueSource) {
    throw new Error("Column source and value source must be different");
  }
}

/**
 * Aggregate multiple values based on aggregation strategy
 */
function aggregateValues(
  values: unknown[],
  aggregation: "first" | "last" | "sum" | "mean" | "count"
): unknown {
  if (values.length === 0) {
    return null;
  }

  switch (aggregation) {
    case "first":
      return values[0];

    case "last":
      return values[values.length - 1];

    case "count":
      return values.length;

    case "sum": {
      // Only sum numeric values
      const numericValues = values.filter(
        (v) => typeof v === "number"
      ) as number[];
      if (numericValues.length === 0) return null;
      return numericValues.reduce((sum, val) => sum + val, 0);
    }

    case "mean": {
      // Only average numeric values
      const numericValues = values.filter(
        (v) => typeof v === "number"
      ) as number[];
      if (numericValues.length === 0) return null;
      const sum = numericValues.reduce((sum, val) => sum + val, 0);
      return sum / numericValues.length;
    }

    default:
      return values[values.length - 1]; // Default to last
  }
}
