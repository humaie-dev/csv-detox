/**
 * Convert string columns to lowercase
 */

import type { ColumnMetadata, ParseResult } from "@/lib/parsers/types";
import type { LowercaseConfig } from "../types";

export function lowercase(
  table: ParseResult,
  config: LowercaseConfig,
): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate columns exist
  const columnNames = table.columns.map((c) => c.name);
  const invalidColumns = config.columns.filter((col) => !columnNames.includes(col));

  if (invalidColumns.length > 0) {
    throw new Error(`Columns not found: ${invalidColumns.join(", ")}`);
  }

  // Only process string-type columns
  const columnsToProcess = config.columns.filter((colName) => {
    const column = table.columns.find((c) => c.name === colName);
    return column && column.type === "string";
  });

  // Transform rows
  const newRows = table.rows.map((row) => {
    const newRow = { ...row };
    for (const colName of columnsToProcess) {
      const value = newRow[colName];
      if (typeof value === "string") {
        newRow[colName] = value.toLowerCase();
      }
    }
    return newRow;
  });

  const result = {
    ...table,
    rows: newRows,
  };

  return {
    table: result,
    columns: result.columns,
  };
}
