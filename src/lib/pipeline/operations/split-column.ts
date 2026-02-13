/**
 * Split Column transformation
 * Splits one column into multiple columns
 *
 * Example (delimiter):
 *   Input:  {Name: "John Doe"}
 *   Config: Split "Name" by " " into ["FirstName", "LastName"]
 *   Output: {FirstName: "John", LastName: "Doe"}
 */

import type { ColumnMetadata, ParseResult } from "@/lib/parsers/types";
import type { SplitColumnConfig } from "@/lib/pipeline/types";

export function splitColumn(
  table: ParseResult,
  config: SplitColumnConfig,
): { table: ParseResult; columns: ColumnMetadata[] } {
  // Validate configuration
  validateConfig(table, config);

  const {
    column,
    method,
    delimiter,
    positions,
    pattern,
    newColumns,
    trim = true,
    keepOriginal = false,
    maxSplits,
  } = config;

  // Build new rows
  const newRows: Record<string, unknown>[] = [];

  for (const row of table.rows) {
    const newRow: Record<string, unknown> = { ...row };
    const value = row[column];

    // Convert value to string for splitting
    const stringValue = value === null ? "" : String(value);

    // Split the value based on method
    let parts: string[];
    switch (method) {
      case "delimiter":
        if (!delimiter) {
          throw new Error("Delimiter is required for delimiter method");
        }
        parts = splitByDelimiter(stringValue, delimiter, maxSplits);
        break;
      case "position":
        if (!positions) {
          throw new Error("Positions are required for position method");
        }
        parts = splitByPosition(stringValue, positions);
        break;
      case "regex":
        if (!pattern) {
          throw new Error("Pattern is required for regex method");
        }
        parts = splitByRegex(stringValue, pattern, maxSplits);
        break;
      default:
        throw new Error(`Unknown split method: ${method}`);
    }

    // Trim parts if configured
    if (trim) {
      parts = parts.map((p) => p.trim());
    }

    // Assign parts to new columns
    for (let i = 0; i < newColumns.length; i++) {
      // Fill with null if fewer parts than new columns
      newRow[newColumns[i]] = i < parts.length ? parts[i] : null;
    }

    // Remove original column if configured
    if (!keepOriginal) {
      delete newRow[column];
    }

    newRows.push(newRow);
  }

  // Build new columns metadata
  const newColumnsMetadata: ColumnMetadata[] = [];

  // Add existing columns (except original if not keeping)
  for (const col of table.columns) {
    if (keepOriginal || col.name !== column) {
      newColumnsMetadata.push(col);
    }
  }

  // Add new columns (all string type)
  for (const newColName of newColumns) {
    // Insert new columns at the position of the original column
    const originalIndex = table.columns.findIndex((c) => c.name === column);
    newColumnsMetadata.splice(originalIndex + newColumns.indexOf(newColName), 0, {
      name: newColName,
      type: "string",
      nonNullCount: 0,
      nullCount: 0,
      sampleValues: [],
    });
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
 * Split string by delimiter
 */
function splitByDelimiter(value: string, delimiter: string, maxSplits?: number): string[] {
  if (!value) return [""];

  if (maxSplits === undefined) {
    return value.split(delimiter);
  }

  // Split with max splits limit
  const parts: string[] = [];
  let remaining = value;
  let splitCount = 0;

  while (splitCount < maxSplits) {
    const index = remaining.indexOf(delimiter);
    if (index === -1) {
      break;
    }
    parts.push(remaining.substring(0, index));
    remaining = remaining.substring(index + delimiter.length);
    splitCount++;
  }

  // Add remaining part
  parts.push(remaining);

  return parts;
}

/**
 * Split string by positions (extract substrings at fixed positions)
 */
function splitByPosition(value: string, positions: number[]): string[] {
  if (!value) return [""];

  const parts: string[] = [];
  const sortedPositions = [...positions].sort((a, b) => a - b);

  for (let i = 0; i < sortedPositions.length; i++) {
    const start = sortedPositions[i];
    const end = i < sortedPositions.length - 1 ? sortedPositions[i + 1] : undefined;
    parts.push(value.substring(start, end));
  }

  return parts;
}

/**
 * Split string by regex pattern
 */
function splitByRegex(value: string, pattern: string, maxSplits?: number): string[] {
  if (!value) return [""];

  try {
    const regex = new RegExp(pattern);
    if (maxSplits === undefined) {
      return value.split(regex);
    }

    // Split with max splits limit
    const parts: string[] = [];
    let remaining = value;
    let splitCount = 0;

    while (splitCount < maxSplits) {
      const match = remaining.match(regex);
      if (!match || match.index === undefined) {
        break;
      }
      parts.push(remaining.substring(0, match.index));
      remaining = remaining.substring(match.index + match[0].length);
      splitCount++;
    }

    // Add remaining part
    parts.push(remaining);

    return parts;
  } catch (error) {
    throw new Error(
      `Invalid regex pattern "${pattern}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Validate split column configuration
 */
function validateConfig(table: ParseResult, config: SplitColumnConfig): void {
  const { column, method, delimiter, positions, pattern, newColumns } = config;

  // Check column exists
  if (!table.columns.find((c) => c.name === column)) {
    throw new Error(`Column "${column}" does not exist`);
  }

  // Check new columns are specified
  if (newColumns.length === 0) {
    throw new Error("At least one new column must be specified");
  }

  // Check new columns don't conflict with existing columns
  for (const newCol of newColumns) {
    if (table.columns.find((c) => c.name === newCol)) {
      throw new Error(`New column "${newCol}" already exists`);
    }
  }

  // Check new column names are not empty
  for (const newCol of newColumns) {
    if (!newCol.trim()) {
      throw new Error("New column names cannot be empty");
    }
  }

  // Check duplicate new column names
  const uniqueNewColumns = new Set(newColumns);
  if (uniqueNewColumns.size !== newColumns.length) {
    throw new Error("New column names must be unique");
  }

  // Validate method-specific configuration
  switch (method) {
    case "delimiter":
      if (delimiter === undefined) {
        throw new Error("Delimiter must be specified for delimiter method");
      }
      if (delimiter === "") {
        throw new Error("Delimiter cannot be empty");
      }
      break;

    case "position":
      if (!positions || positions.length === 0) {
        throw new Error("Positions must be specified for position method");
      }
      // Check positions are non-negative
      for (const pos of positions) {
        if (pos < 0) {
          throw new Error("Positions must be non-negative");
        }
      }
      break;

    case "regex":
      if (!pattern) {
        throw new Error("Pattern must be specified for regex method");
      }
      // Validate regex pattern is valid
      try {
        new RegExp(pattern);
      } catch (error) {
        throw new Error(
          `Invalid regex pattern "${pattern}": ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      break;

    default:
      throw new Error(`Unknown split method: ${method}`);
  }
}
