/**
 * Validation preview for type casting operations
 * Allows users to preview cast results before applying
 */

import { tryCast } from "./types.js";

export type ValidationSample = {
  value: unknown;
  error: string;
};

export type ValidationResult = {
  total: number;
  valid: number;
  invalid: number;
  invalidSamples: ValidationSample[];
  recommendedMode: "fail" | "null" | "skip";
  failureRate: number; // Percentage (0-100)
};

/**
 * Validate that a column's values can be cast to target type
 *
 * @param values - Array of values to validate (typically a column's data)
 * @param targetType - Target type to cast to (string, number, boolean, or date)
 * @param format - Optional format string for date parsing
 * @param maxSamples - Maximum number of invalid samples to return (default: 5)
 * @param maxRows - Maximum number of rows to validate (default: 1000 for performance)
 * @returns Validation result with statistics and recommendations
 */
export function validateCast(
  values: unknown[],
  targetType: "string" | "number" | "boolean" | "date",
  format?: string,
  maxSamples: number = 5,
  maxRows: number = 1000,
): ValidationResult {
  // Sample data for performance (use first N rows)
  const sample = values.slice(0, Math.min(maxRows, values.length));

  let validCount = 0;
  let invalidCount = 0;
  const invalidSamples: ValidationSample[] = [];

  for (const value of sample) {
    const result = tryCast(value, targetType, format);

    if (result.success) {
      validCount++;
    } else {
      invalidCount++;

      // Collect sample failures (up to maxSamples)
      if (invalidSamples.length < maxSamples) {
        invalidSamples.push({
          value,
          error: result.error || "Cast failed",
        });
      }
    }
  }

  const total = sample.length;
  const failureRate = total > 0 ? (invalidCount / total) * 100 : 0;

  // Recommend error handling mode based on failure rate
  let recommendedMode: "fail" | "null" | "skip";

  if (invalidCount === 0) {
    // No failures - any mode works, but "fail" is safest
    recommendedMode = "fail";
  } else if (failureRate <= 5) {
    // Low failure rate (≤5%) - probably data quality issues, skip rows
    recommendedMode = "skip";
  } else if (failureRate <= 20) {
    // Medium failure rate (≤20%) - might be intentional nulls or missing data
    recommendedMode = "null";
  } else {
    // High failure rate (>20%) - likely wrong type choice, fail to prevent data loss
    recommendedMode = "fail";
  }

  return {
    total,
    valid: validCount,
    invalid: invalidCount,
    invalidSamples,
    recommendedMode,
    failureRate,
  };
}
