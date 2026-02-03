/**
 * Merge Columns transformation
 * Combines multiple columns into one
 *
 * Example:
 *   Input:  {FirstName: "John", LastName: "Doe"}
 *   Config: Merge ["FirstName", "LastName"] with " " into "FullName"
 *   Output: {FullName: "John Doe"}
 */

import type { ParseResult, ColumnMetadata } from "@/lib/parsers/types";
import type { MergeColumnsConfig } from "@/lib/pipeline/types";

export function mergeColumns(
  table: ParseResult,
  config: MergeColumnsConfig
): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate configuration
  validateConfig(table, config);

  const {
    columns,
    separator,
    newColumn,
    skipNull = true,
    keepOriginal = false,
  } = config;

  // Build new rows
  const newRows: Record<string, unknown>[] = [];

  for (const row of table.rows) {
    const newRow: Record<string, unknown> = { ...row };

    // Collect values from columns to merge
    const valuesToMerge: string[] = [];

    for (const col of columns) {
      const value = row[col];

      // Skip null values if configured
      if (value === null || value === undefined) {
        if (!skipNull) {
          valuesToMerge.push("");
        }
      } else {
        valuesToMerge.push(String(value));
      }
    }

    // Merge values with separator
    newRow[newColumn] = valuesToMerge.join(separator);

    // Remove original columns if configured (but never remove the new merged column)
    if (!keepOriginal) {
      for (const col of columns) {
        // Don't delete the new column even if it has the same name as one of the merged columns
        if (col !== newColumn) {
          delete newRow[col];
        }
      }
    }

    newRows.push(newRow);
  }

  // Build new columns metadata
  const newColumnsMetadata: ColumnMetadata[] = [];

  // Find the position of the first column to merge
  const firstColumnIndex = table.columns.findIndex((c) =>
    columns.includes(c.name)
  );

  // Add columns in order, replacing the first merged column with the new merged column
  let mergedColumnAdded = false;
  for (let i = 0; i < table.columns.length; i++) {
    const col = table.columns[i];

    if (columns.includes(col.name)) {
      // This is one of the columns being merged
      if (!mergedColumnAdded) {
        // Add the new merged column at the position of the first merged column
        newColumnsMetadata.push({
          name: newColumn,
          type: "string",
          nonNullCount: 0,
          nullCount: 0,
          sampleValues: [],
        });
        mergedColumnAdded = true;
      }
      // Skip the original column (unless keeping originals)
      if (keepOriginal) {
        newColumnsMetadata.push(col);
      }
    } else {
      // This is not being merged, keep it
      newColumnsMetadata.push(col);
    }
  }

  const result = {
    rows: newRows,
    columns: newColumnsMetadata,
    rowCount: newRows.length,
    warnings: table.warnings,
  };
  
  return {
    table: result,
    columns: newColumnsMetadata,
  };
}

/**
 * Validate merge columns configuration
 */
function validateConfig(table: ParseResult, config: MergeColumnsConfig): void {
  const { columns, newColumn } = config;

  // Check columns are specified
  if (columns.length === 0) {
    throw new Error("At least one column must be specified for merging");
  }

  // Check all columns exist
  for (const col of columns) {
    if (!table.columns.find((c) => c.name === col)) {
      throw new Error(`Column "${col}" does not exist`);
    }
  }

  // Check new column name is not empty
  if (!newColumn.trim()) {
    throw new Error("New column name cannot be empty");
  }

  // Check new column doesn't conflict with existing columns (unless it's one of the columns being merged)
  const existingColumn = table.columns.find((c) => c.name === newColumn);
  if (existingColumn && !columns.includes(newColumn)) {
    throw new Error(`New column "${newColumn}" already exists`);
  }

  // Check duplicate columns in merge list
  const uniqueColumns = new Set(columns);
  if (uniqueColumns.size !== columns.length) {
    throw new Error("Columns to merge must be unique");
  }
}
