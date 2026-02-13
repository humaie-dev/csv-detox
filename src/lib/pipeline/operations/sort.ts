/**
 * Sort operation - Sort rows by one or more columns
 */

import type { ColumnMetadata, ParseResult } from "@/lib/parsers/types";
import type { SortConfig } from "../types";
import { TransformationError } from "../types";

/**
 * Sort rows by specified columns with configurable direction and null handling
 */
export function sort(
  table: ParseResult,
  config: SortConfig,
): { table: ParseResult; columns: ColumnMetadata[] } {
  const { columns: sortColumns, nullsPosition = "last" } = config;

  // Validate at least one sort column
  if (!sortColumns || sortColumns.length === 0) {
    throw new TransformationError("At least one sort column is required", "", "sort");
  }

  // Validate all columns exist
  for (const sortCol of sortColumns) {
    const exists = table.columns.some((col) => col.name === sortCol.name);
    if (!exists) {
      throw new TransformationError(`Column "${sortCol.name}" not found`, "", "sort");
    }
  }

  // Create a copy of rows array to sort
  const sortedRows = [...table.rows];

  // Sort using multi-column comparator
  sortedRows.sort((a, b) => {
    for (const sortCol of sortColumns) {
      const comparison = compareValues(
        a[sortCol.name],
        b[sortCol.name],
        sortCol.direction || "asc",
        nullsPosition,
      );

      // If not equal, return comparison result
      // If equal (0), continue to next sort column
      if (comparison !== 0) {
        return comparison;
      }
    }

    // All sort columns are equal
    return 0;
  });

  return {
    table: {
      ...table,
      rows: sortedRows,
    },
    columns: table.columns,
  };
}

/**
 * Compare two values for sorting
 * Handles type-aware comparison and null positioning
 */
function compareValues(
  a: unknown,
  b: unknown,
  direction: "asc" | "desc",
  nullsPosition: "first" | "last",
): number {
  // Handle nulls
  const aIsNull = a === null || a === undefined;
  const bIsNull = b === null || b === undefined;

  if (aIsNull && bIsNull) return 0;

  if (aIsNull) {
    // a is null, b is not
    return nullsPosition === "first" ? -1 : 1;
  }

  if (bIsNull) {
    // b is null, a is not
    return nullsPosition === "first" ? 1 : -1;
  }

  // Both values are non-null, do type-aware comparison
  let comparison = 0;

  // Number comparison
  if (typeof a === "number" && typeof b === "number") {
    comparison = a - b;
  }
  // Date comparison
  else if (a instanceof Date && b instanceof Date) {
    comparison = a.getTime() - b.getTime();
  }
  // Boolean comparison (false < true)
  else if (typeof a === "boolean" && typeof b === "boolean") {
    comparison = a === b ? 0 : a ? 1 : -1;
  }
  // String comparison (also works for mixed types)
  else {
    comparison = String(a).localeCompare(String(b));
  }

  // Apply direction
  return direction === "asc" ? comparison : -comparison;
}
