/**
 * Rename a column
 */

import type { ColumnMetadata, ParseResult } from "@/lib/parsers/types";
import type { RenameColumnConfig } from "../types";

export function renameColumn(
  table: ParseResult,
  config: RenameColumnConfig,
): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate old column exists
  const columnNames = table.columns.map((c) => c.name);
  if (!columnNames.includes(config.oldName)) {
    throw new Error(`Column not found: ${config.oldName}`);
  }

  // Check new name doesn't already exist
  if (columnNames.includes(config.newName) && config.newName !== config.oldName) {
    throw new Error(`Column already exists: ${config.newName}`);
  }

  // Update column metadata
  const newColumns = table.columns.map((col) =>
    col.name === config.oldName ? { ...col, name: config.newName } : col,
  );

  // Update rows
  const newRows = table.rows.map((row) => {
    const newRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const newKey = key === config.oldName ? config.newName : key;
      newRow[newKey] = value;
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
