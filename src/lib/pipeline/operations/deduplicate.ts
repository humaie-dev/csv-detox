/**
 * Remove duplicate rows
 */

import type { ParseResult } from "@/lib/parsers/types";
import type { DeduplicateConfig } from "../types";

export function deduplicate(
  table: ParseResult,
  config: DeduplicateConfig
): ParseResult {
  const columnsToCheck = config.columns || table.columns.map((c) => c.name);

  // Validate columns exist
  const columnNames = table.columns.map((c) => c.name);
  const invalidColumns = columnsToCheck.filter(
    (col) => !columnNames.includes(col)
  );

  if (invalidColumns.length > 0) {
    throw new Error(
      `Columns not found: ${invalidColumns.join(", ")}`
    );
  }

  // Use Set to track unique row signatures
  const seen = new Set<string>();
  const uniqueRows: typeof table.rows = [];

  for (const row of table.rows) {
    // Create signature based on specified columns
    const signature = columnsToCheck
      .map((col) => {
        const value = row[col];
        // Convert to string for comparison
        return JSON.stringify(value);
      })
      .join("|");

    if (!seen.has(signature)) {
      seen.add(signature);
      uniqueRows.push(row);
    }
  }

  return {
    ...table,
    rows: uniqueRows,
    rowCount: uniqueRows.length,
  };
}
