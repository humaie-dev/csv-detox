/**
 * Fill Across transformation
 * Fill empty cells with the last non-empty value from left (horizontal)
 */

import type { ColumnMetadata, ParseResult } from "@/lib/parsers/types";
import type { FillAcrossConfig } from "../types";

export function fillAcross(
  table: ParseResult,
  config: FillAcrossConfig,
): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate configuration
  validateConfig(table, config);

  const { columns, treatWhitespaceAsEmpty = false } = config;

  // Clone rows to avoid mutation
  const newRows: Record<string, unknown>[] = [];

  // Process each row independently
  for (const row of table.rows) {
    const newRow = { ...row };
    let lastValue: unknown = null;

    // Process columns left to right (order from config.columns)
    for (const col of columns) {
      const value = newRow[col];

      if (isEmpty(value, treatWhitespaceAsEmpty)) {
        // Cell is empty, fill with last value from left
        newRow[col] = lastValue;
      } else {
        // Cell has value, update last value
        lastValue = value;
      }
    }

    newRows.push(newRow);
  }

  const result: ParseResult = {
    rows: newRows,
    columns: table.columns,
    rowCount: newRows.length,
    warnings: table.warnings,
  };

  return {
    table: result,
    columns: table.columns,
  };
}

/**
 * Helper function to determine if a cell value is empty
 */
function isEmpty(value: unknown, treatWhitespaceAsEmpty: boolean): boolean {
  if (value === null || value === undefined) return true;
  if (value === "") return true;
  if (treatWhitespaceAsEmpty && typeof value === "string") {
    return value.trim() === "";
  }
  return false;
}

/**
 * Validates the fill across configuration
 */
function validateConfig(table: ParseResult, config: FillAcrossConfig): void {
  const { columns } = config;

  if (columns.length === 0) {
    throw new Error("At least one column must be specified for fill across");
  }

  const columnNames = table.columns.map((c) => c.name);
  for (const col of columns) {
    if (!columnNames.includes(col)) {
      throw new Error(`Column "${col}" does not exist`);
    }
  }
}
