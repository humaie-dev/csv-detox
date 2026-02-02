/**
 * Type inference for parsed data columns
 */

import type { ColumnMetadata, InferredType } from "./types";

/**
 * Check if a value looks like a number
 */
function isNumber(value: unknown): boolean {
  if (typeof value === "number") return true;
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (trimmed === "") return false;

  // Check for common number formats
  // Examples: 123, -123, 123.45, -123.45, 1,234.56, 1e10, -1.23e-4
  // Pattern breakdown:
  // ^-? - optional minus sign at start
  // (?:[\d,]+\.?\d*|\d*\.?\d+) - number with optional commas and decimal
  // (?:[eE][+-]?\d+)? - optional scientific notation
  const numberPattern = /^-?(?:[\d,]+\.?\d*|\d*\.?\d+)(?:[eE][+-]?\d+)?$/;
  return numberPattern.test(trimmed);
}

/**
 * Check if a value looks like a boolean
 */
function isBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  if (typeof value !== "string") return false;

  const lower = value.trim().toLowerCase();
  return ["true", "false", "yes", "no", "y", "n", "1", "0"].includes(lower);
}

/**
 * Check if a value looks like a date
 */
function isDate(value: unknown): boolean {
  if (value instanceof Date) return true;
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (trimmed === "") return false;

  // Check for common date patterns first
  // ISO: 2023-01-15, 2023-01-15T10:30:00, 2023-01-15T10:30:00Z
  // US: 01/15/2023, 1/15/2023
  // Text: Jan 15, 2023, 15 Jan 2023, January 15, 2023
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // ISO
    /^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
    /^\d{1,2}\/\d{1,2}\/\d{4}/, // MM/DD/YYYY or DD/MM/YYYY
    /^\w{3,9}\s+\d{1,2},?\s+\d{4}/, // Month DD, YYYY
    /^\d{1,2}\s+\w{3,9}\s+\d{4}/, // DD Month YYYY
  ];

  const matchesPattern = datePatterns.some((pattern) => pattern.test(trimmed));
  if (!matchesPattern) return false;

  // Try parsing as date to confirm it's valid
  const parsed = new Date(trimmed);
  return !isNaN(parsed.getTime());
}

/**
 * Infer the type of a single value
 */
function inferValueType(value: unknown): InferredType {
  if (value === null || value === undefined || value === "") {
    return "null";
  }

  // Check in order of specificity
  // Check number before boolean because "0" and "1" can be both
  if (isNumber(value)) return "number";
  if (isBoolean(value)) return "boolean";
  if (isDate(value)) return "date";

  return "string";
}

/**
 * Infer the type for a column based on its values
 *
 * Strategy:
 * - If all non-null values have the same type, use that type
 * - If mixed types, use the most general type (string)
 * - Prioritize more specific types (boolean > number > date > string)
 */
function inferColumnType(values: unknown[]): InferredType {
  const nonNullValues = values.filter(
    (v) => v !== null && v !== undefined && v !== ""
  );

  if (nonNullValues.length === 0) {
    return "string"; // Default to string for all-null columns
  }

  // Count types
  const typeCounts = new Map<InferredType, number>();
  for (const value of nonNullValues) {
    const type = inferValueType(value);
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  }

  // Remove null type from consideration
  typeCounts.delete("null");

  if (typeCounts.size === 0) {
    return "string";
  }

  // If all values have the same type, use that
  if (typeCounts.size === 1) {
    return Array.from(typeCounts.keys())[0];
  }

  // Mixed types: check for common patterns
  // If >80% of values are a specific type, use that type
  const totalNonNull = nonNullValues.length;
  for (const [type, count] of typeCounts.entries()) {
    if (count / totalNonNull >= 0.8) {
      return type;
    }
  }

  // Otherwise, default to string for mixed types
  return "string";
}

/**
 * Infer types for all columns in a dataset
 */
export function inferColumnTypes(
  rows: Record<string, unknown>[],
  headers: string[]
): ColumnMetadata[] {
  return headers.map((name) => {
    // Extract all values for this column
    const values = rows.map((row) => row[name]);

    // Infer type
    const type = inferColumnType(values);

    // Count nulls
    const nullCount = values.filter(
      (v) => v === null || v === undefined || v === ""
    ).length;
    const nonNullCount = values.length - nullCount;

    // Get sample values (first 5 non-null)
    const sampleValues = values
      .filter((v) => v !== null && v !== undefined && v !== "")
      .slice(0, 5);

    return {
      name,
      type,
      nonNullCount,
      nullCount,
      sampleValues,
    };
  });
}
