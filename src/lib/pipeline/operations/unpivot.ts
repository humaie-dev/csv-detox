/**
 * Unpivot (Wide → Long) transformation
 * Converts columns into rows
 *
 * Example:
 *   Input:  {Name: "Alice", Jan: 100, Feb: 200, Mar: 150}
 *   Config: idColumns: ["Name"], valueColumns: ["Jan", "Feb", "Mar"],
 *           variableColumnName: "Month", valueColumnName: "Sales"
 *   Output:
 *     {Name: "Alice", Month: "Jan", Sales: 100}
 *     {Name: "Alice", Month: "Feb", Sales: 200}
 *     {Name: "Alice", Month: "Mar", Sales: 150}
 */

import type { ParseResult, ColumnMetadata } from "@/lib/parsers/types";
import type { UnpivotConfig } from "@/lib/pipeline/types";

export function unpivot(
  table: ParseResult,
  config: UnpivotConfig
): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate configuration
  validateConfig(table, config);

  const { idColumns, valueColumns, variableColumnName, valueColumnName } =
    config;

  // Build new column list: id columns + variable column + value column
  const newColumns: ColumnMetadata[] = [];

  // Add id columns (preserve original types)
  for (const idCol of idColumns) {
    const originalCol = table.columns.find((c) => c.name === idCol);
    if (originalCol) {
      newColumns.push(originalCol);
    }
  }

  // Add variable column (always string type - contains column names)
  newColumns.push({
    name: variableColumnName,
    type: "string",
    nonNullCount: table.rowCount * valueColumns.length,
    nullCount: 0,
    sampleValues: valueColumns.slice(0, 5),
  });

  // Add value column (infer type from value columns)
  const valueColumnType = inferValueColumnType(table, valueColumns);
  newColumns.push({
    name: valueColumnName,
    type: valueColumnType,
    nonNullCount: 0, // Will be calculated from actual data
    nullCount: 0,
    sampleValues: [],
  });

  // Build new rows
  const newRows: Record<string, unknown>[] = [];

  for (const row of table.rows) {
    // For each value column, create a new row
    for (const valueCol of valueColumns) {
      const newRow: Record<string, unknown> = {};

      // Copy id column values
      for (const idCol of idColumns) {
        newRow[idCol] = row[idCol];
      }

      // Set variable column (column name)
      newRow[variableColumnName] = valueCol;

      // Set value column (cell value)
      newRow[valueColumnName] = row[valueCol];

      newRows.push(newRow);
    }
  }

  const result = {
    rows: newRows,
    columns: newColumns,
    rowCount: newRows.length,
    warnings: table.warnings, // Preserve existing warnings
  };
  
  return {
    table: result,
    columns: newColumns,
  };
}

/**
 * Validate unpivot configuration
 */
function validateConfig(table: ParseResult, config: UnpivotConfig): void {
  const { idColumns, valueColumns, variableColumnName, valueColumnName } =
    config;

  // Check id columns exist
  for (const idCol of idColumns) {
    if (!table.columns.find((c) => c.name === idCol)) {
      throw new Error(`ID column "${idCol}" does not exist`);
    }
  }

  // Check value columns exist
  if (valueColumns.length === 0) {
    throw new Error("At least one value column must be specified");
  }

  for (const valueCol of valueColumns) {
    if (!table.columns.find((c) => c.name === valueCol)) {
      throw new Error(`Value column "${valueCol}" does not exist`);
    }
  }

  // Check for duplicate columns in id and value columns
  const allColumns = [...idColumns, ...valueColumns];
  const uniqueColumns = new Set(allColumns);
  if (uniqueColumns.size !== allColumns.length) {
    throw new Error("ID columns and value columns must not overlap");
  }

  // Check new column names don't conflict with id columns
  if (idColumns.includes(variableColumnName)) {
    throw new Error(
      `Variable column name "${variableColumnName}" conflicts with an ID column`
    );
  }

  if (idColumns.includes(valueColumnName)) {
    throw new Error(
      `Value column name "${valueColumnName}" conflicts with an ID column`
    );
  }

  // Check variable and value column names are different
  if (variableColumnName === valueColumnName) {
    throw new Error("Variable column and value column must have different names");
  }

  // Check variable and value column names are not empty
  if (!variableColumnName.trim()) {
    throw new Error("Variable column name cannot be empty");
  }

  if (!valueColumnName.trim()) {
    throw new Error("Value column name cannot be empty");
  }
}

/**
 * Infer type for the value column based on value columns
 * Uses the same logic as type inference: if majority (>80%) of non-null values
 * are the same type, use that type
 */
function inferValueColumnType(
  table: ParseResult,
  valueColumns: string[]
): "string" | "number" | "boolean" | "date" {
  const valueColumnInfos = valueColumns
    .map((name) => table.columns.find((c) => c.name === name))
    .filter((c): c is ColumnMetadata => c !== undefined);

  // Count types
  const typeCounts: Record<string, number> = {
    string: 0,
    number: 0,
    boolean: 0,
    date: 0,
  };

  for (const col of valueColumnInfos) {
    typeCounts[col.type]++;
  }

  // Find majority type (>80% threshold, same as type-inference.ts)
  const threshold = valueColumnInfos.length * 0.8;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count >= threshold) {
      return type as "string" | "number" | "boolean" | "date";
    }
  }

  // Default to string if no majority
  return "string";
}
