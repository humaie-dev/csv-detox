/**
 * Remove columns from table
 */

import type { ColumnMetadata, ParseResult } from "@/lib/parsers/types";
import type { RemoveColumnConfig } from "../types";

export function removeColumn(
  table: ParseResult,
  config: RemoveColumnConfig,
): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate columns exist
  const columnNames = table.columns.map((c) => c.name);
  const invalidColumns = config.columns.filter((col) => !columnNames.includes(col));

  if (invalidColumns.length > 0) {
    throw new Error(`Columns not found: ${invalidColumns.join(", ")}`);
  }

  // Remove from column metadata
  const newColumns = table.columns.filter((col) => !config.columns.includes(col.name));

  // Remove from rows
  const newRows = table.rows.map((row) => {
    const newRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!config.columns.includes(key)) {
        newRow[key] = value;
      }
    }
    return newRow;
  });

  const result = {
    ...table,
    columns: newColumns,
    rows: newRows,
  };

  return {
    table: result,
    columns: newColumns,
  };
}
