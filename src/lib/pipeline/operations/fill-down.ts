/**
 * Fill Down transformation
 * Fill empty cells with the last non-empty value from above (vertical)
 *
 * Use case: Normalize hierarchical data where parent values span multiple rows
 *
 * Example:
 *   Input:  Product="Apple", Measure="Sales"
 *           Product="",      Measure="Returns"
 *   Output: Product="Apple", Measure="Sales"
 *           Product="Apple", Measure="Returns"
 */

import type { ColumnMetadata, ParseResult } from "@/lib/parsers/types";
import type { FillDownConfig } from "../types";

/**
 * Fill down: propagate non-empty values vertically
 */
export function fillDown(
  table: ParseResult,
  config: FillDownConfig,
): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate configuration
  validateConfig(table, config);

  const { columns, treatWhitespaceAsEmpty = false } = config;

  // Clone rows to avoid mutation
  const newRows: Record<string, unknown>[] = [];

  // Track last non-empty value for each column
  const lastValues: Record<string, unknown> = {};

  // Initialize lastValues with null for each column
  for (const col of columns) {
    lastValues[col] = null;
  }

  // Process rows from top to bottom
  for (const row of table.rows) {
    const newRow = { ...row };

    for (const col of columns) {
      const value = newRow[col];

      if (isEmpty(value, treatWhitespaceAsEmpty)) {
        // Cell is empty, fill with last value
        newRow[col] = lastValues[col];
      } else {
        // Cell has value, update last value
        lastValues[col] = value;
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
 * Check if a value is considered empty for fill purposes
 */
function isEmpty(value: unknown, treatWhitespaceAsEmpty: boolean): boolean {
  // null and undefined are always empty
  if (value === null || value === undefined) {
    return true;
  }

  // Empty string is always empty
  if (value === "") {
    return true;
  }

  // Check whitespace-only strings if configured
  if (treatWhitespaceAsEmpty && typeof value === "string") {
    return value.trim() === "";
  }

  return false;
}

/**
 * Validate fill down configuration
 */
function validateConfig(table: ParseResult, config: FillDownConfig): void {
  const { columns } = config;

  // Check columns are specified
  if (columns.length === 0) {
    throw new Error("At least one column must be specified for fill down");
  }

  // Check all columns exist
  const columnNames = table.columns.map((c) => c.name);
  for (const col of columns) {
    if (!columnNames.includes(col)) {
      throw new Error(`Column "${col}" does not exist`);
    }
  }
}
