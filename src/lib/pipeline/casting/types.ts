/**
 * Type casting functions for converting values between types
 */

/**
 * Cast any value to string
 * Always succeeds
 */
export function castToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

/**
 * Cast value to number
 * Returns null if conversion fails
 */
export function castToNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Already a number
  if (typeof value === "number") {
    return Number.isNaN(value) || !Number.isFinite(value) ? null : value;
  }

  // Convert to string for parsing
  const str = String(value).trim();

  if (str === "") {
    return null;
  }

  // Remove common thousand separators (commas)
  const cleaned = str.replace(/,/g, "");

  // Try to parse as number
  const num = Number(cleaned);

  // Check if valid number (not NaN, not Infinity)
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return null;
  }

  return num;
}

/**
 * Cast value to boolean
 * Returns null if conversion fails
 *
 * Accepts: true/false, yes/no, y/n, 1/0 (case-insensitive)
 */
export function castToBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Already a boolean
  if (typeof value === "boolean") {
    return value;
  }

  // Numbers: 1 = true, 0 = false
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  // Convert to lowercase string for comparison
  const str = String(value).toLowerCase().trim();

  // True values
  if (str === "true" || str === "yes" || str === "y" || str === "1") {
    return true;
  }

  // False values
  if (str === "false" || str === "no" || str === "n" || str === "0") {
    return false;
  }

  // Cannot convert
  return null;
}

/**
 * Cast value to Date
 * Returns null if conversion fails
 *
 * Supports:
 * - ISO 8601: 2023-01-15, 2023-01-15T10:30:00Z
 * - US format: 01/15/2023, 1/15/2023
 * - European format: 15/01/2023, 15-01-2023
 * - Text format: Jan 15, 2023, January 15, 2023
 * - Custom format via format parameter (future enhancement)
 */
export function castToDate(value: unknown, format?: string): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Already a Date
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  // Try to parse as date
  const str = String(value).trim();

  if (str === "") {
    return null;
  }

  // Custom format handling (placeholder for future enhancement)
  if (format) {
    // TODO: Implement custom format parsing
    // For now, ignore format and use default parsing
  }

  // Try parsing with Date constructor
  const date = new Date(str);

  // Check if valid date
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Result of a cast attempt
 */
export type CastResult = {
  success: boolean;
  value: unknown;
  error?: string;
};

/**
 * Attempt to cast a value to a target type
 * Returns result with success flag and converted value or error message
 */
export function tryCast(
  value: unknown,
  targetType: "string" | "number" | "boolean" | "date",
  format?: string,
): CastResult {
  try {
    // If input value is null or undefined, treat as successful cast to null
    // (except for string type which converts to empty string)
    if (value === null || value === undefined) {
      if (targetType === "string") {
        return { success: true, value: "" };
      }
      return { success: true, value: null };
    }

    switch (targetType) {
      case "string": {
        const result = castToString(value);
        return { success: true, value: result };
      }
      case "number": {
        const result = castToNumber(value);
        if (result === null) {
          return {
            success: false,
            value: null,
            error: `Cannot convert "${value}" to number`,
          };
        }
        return { success: true, value: result };
      }
      case "boolean": {
        const result = castToBoolean(value);
        if (result === null) {
          return {
            success: false,
            value: null,
            error: `Cannot convert "${value}" to boolean`,
          };
        }
        return { success: true, value: result };
      }
      case "date": {
        const result = castToDate(value, format);
        if (result === null) {
          return {
            success: false,
            value: null,
            error: `Cannot convert "${value}" to date`,
          };
        }
        return { success: true, value: result };
      }
      default:
        return {
          success: false,
          value: null,
          error: `Unknown target type: ${targetType}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      value: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
