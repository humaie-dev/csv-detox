/**
 * Trim whitespace from string columns
 */

import type { ParseResult } from "@/lib/parsers/types";
import type { TrimConfig } from "../types";

export function trim(table: ParseResult, config: TrimConfig): ParseResult {
  // Validate columns exist
  const columnNames = table.columns.map((c) => c.name);
  const invalidColumns = config.columns.filter(
    (col) => !columnNames.includes(col)
  );

  if (invalidColumns.length > 0) {
    throw new Error(
      `Columns not found: ${invalidColumns.join(", ")}`
    );
  }

  // Only trim string-type columns
  const columnsToTrim = config.columns.filter((colName) => {
    const column = table.columns.find((c) => c.name === colName);
    return column && column.type === "string";
  });

  // Transform rows
  const newRows = table.rows.map((row) => {
    const newRow = { ...row };
    for (const colName of columnsToTrim) {
      const value = newRow[colName];
      if (typeof value === "string") {
        newRow[colName] = value.trim();
      }
    }
    return newRow;
  });

  return {
    ...table,
    rows: newRows,
  };
}
