/**
 * Cast Column Operation
 * Convert column values to a specific type with validation
 */

import type { ColumnMetadata, InferredType, ParseResult } from "@/lib/parsers/types";
import { tryCast } from "../casting/types";
import type { CastColumnConfig } from "../types";
import { TransformationError } from "../types";

export function castColumn(
  table: ParseResult,
  config: CastColumnConfig,
): { table: ParseResult; columns: ColumnMetadata[] } {
  const { column, targetType, onError, format } = config;

  // Validate column exists
  const columnExists = table.columns.some((col) => col.name === column);
  if (!columnExists) {
    throw new TransformationError(`Column "${column}" not found`, "cast_column", "cast_column", {
      availableColumns: table.columns.map((c) => c.name),
    });
  }

  const newRows: Record<string, unknown>[] = [];
  let castErrors = 0;
  let skippedRows = 0;

  // Process each row
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    const value = row[column];

    // Attempt cast
    const castResult = tryCast(value, targetType, format);

    if (!castResult.success) {
      castErrors++;

      // Handle error based on onError mode
      if (onError === "fail") {
        throw new TransformationError(
          `Failed to cast value in row ${i + 1}: ${castResult.error}`,
          "cast_column",
          "cast_column",
          {
            row: i + 1,
            column,
            value,
            targetType,
            error: castResult.error,
          },
        );
      } else if (onError === "null") {
        // Set to null and continue
        newRows.push({ ...row, [column]: null });
      } else if (onError === "skip") {
        // Skip this row
        skippedRows++;
      }
    } else {
      // Cast succeeded
      newRows.push({ ...row, [column]: castResult.value });
    }
  }

  // Update column metadata
  const newColumns = table.columns.map((col) => {
    if (col.name === column) {
      // Update type for casted column
      const newType: InferredType = targetType as InferredType;

      // Count nulls after casting
      const nullCount = newRows.filter((row) => row[column] === null).length;
      const nonNullCount = newRows.length - nullCount;

      return {
        ...col,
        type: newType,
        nullCount,
        nonNullCount,
        sampleValues: newRows
          .filter((row) => row[column] !== null)
          .slice(0, 5)
          .map((row) => row[column]),
      };
    }
    return col;
  });

  return {
    table: {
      rows: newRows,
      columns: newColumns,
      rowCount: newRows.length,
      warnings: [
        ...(table.warnings || []),
        ...(castErrors > 0
          ? [
              `Cast operation had ${castErrors} error(s). Mode: ${onError}. ${
                skippedRows > 0 ? `Skipped ${skippedRows} row(s).` : ""
              }`,
            ]
          : []),
      ],
    },
    columns: newColumns,
  };
}
