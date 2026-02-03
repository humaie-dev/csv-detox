/**
 * Filter rows based on conditions
 */

import type { ParseResult, ColumnMetadata } from "@/lib/parsers/types";
import type { FilterConfig } from "../types";

export function filter(table: ParseResult, config: FilterConfig): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate column exists
  const columnNames = table.columns.map((c) => c.name);
  if (!columnNames.includes(config.column)) {
    throw new Error(`Column not found: ${config.column}`);
  }

  // Filter rows based on condition
  const filteredRows = table.rows.filter((row) => {
    const value = row[config.column];
    const compareValue = config.value;

    switch (config.operator) {
      case "equals":
        return value === compareValue;

      case "not_equals":
        return value !== compareValue;

      case "contains":
        if (typeof value === "string" && typeof compareValue === "string") {
          return value.includes(compareValue);
        }
        return false;

      case "not_contains":
        if (typeof value === "string" && typeof compareValue === "string") {
          return !value.includes(compareValue);
        }
        return true; // Non-strings don't contain anything

      case "greater_than":
        if (typeof value === "number" && typeof compareValue === "number") {
          return value > compareValue;
        }
        if (typeof value === "string" && typeof compareValue === "string") {
          return value > compareValue;
        }
        return false;

      case "less_than":
        if (typeof value === "number" && typeof compareValue === "number") {
          return value < compareValue;
        }
        if (typeof value === "string" && typeof compareValue === "string") {
          return value < compareValue;
        }
        return false;

      default:
        throw new Error(`Unknown operator: ${config.operator}`);
    }
  });

  const result = {
    ...table,
    rows: filteredRows,
    rowCount: filteredRows.length,
  };
  
  return {
    table: result,
    columns: result.columns,
  };
}
