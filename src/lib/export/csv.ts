/**
 * CSV Export Generator
 * Generates CSV files from ParseResult with proper escaping and UTF-8 BOM for Excel compatibility.
 */

import type { ParseResult } from "@/lib/parsers/types";

/**
 * Escapes a CSV field value by:
 * - Wrapping in quotes if it contains comma, quote, or newline
 * - Escaping quotes by doubling them
 */
function escapeCSVField(value: string | number | boolean | null): string {
  // Convert null to empty string
  if (value === null || value === undefined) {
    return "";
  }

  // Convert to string
  const str = String(value);

  // Check if field needs quoting (contains comma, quote, newline, or carriage return)
  const needsQuoting = /[",\n\r]/.test(str);

  if (needsQuoting) {
    // Escape quotes by doubling them, then wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates a CSV string from a ParseResult.
 * 
 * Features:
 * - UTF-8 with BOM for Excel compatibility
 * - Proper CSV escaping (quotes, commas, newlines)
 * - Null values converted to empty strings
 * - CRLF line endings (\r\n) for Windows/Excel compatibility
 * 
 * @param result - The ParseResult to export
 * @returns CSV string with UTF-8 BOM
 */
export function generateCSV(result: ParseResult): string {
  const lines: string[] = [];

  // Add header row
  const headerRow = result.columns.map((col) => escapeCSVField(col.name)).join(",");
  lines.push(headerRow);

  // Add data rows
  for (const row of result.rows) {
    const rowValues = result.columns.map((col) => {
      const value = row[col.name] as string | number | boolean | null;
      return escapeCSVField(value);
    });
    lines.push(rowValues.join(","));
  }

  // Join with CRLF and add UTF-8 BOM
  const csvContent = lines.join("\r\n");
  const bom = "\uFEFF"; // UTF-8 BOM
  
  return bom + csvContent;
}

/**
 * Sanitizes a filename for safe download.
 * Removes path traversal, special characters, and ensures valid extension.
 * 
 * @param filename - Original filename
 * @param suffix - Suffix to add before extension (default: "_transformed")
 * @returns Sanitized filename
 */
export function sanitizeExportFilename(filename: string, suffix: string = "_transformed"): string {
  // Remove path components
  let name = filename.replace(/^.*[/\\]/, "");

  // Remove extension
  const lastDot = name.lastIndexOf(".");
  let baseName: string;
  
  if (lastDot > 0) {
    // Normal file with extension: "file.txt" → "file"
    baseName = name.substring(0, lastDot);
  } else if (lastDot === 0) {
    // Dot file: ".csv" → "" (no base name)
    baseName = "";
  } else {
    // No extension: "file" → "file"
    baseName = name;
  }

  // Remove/replace invalid characters - only keep alphanumeric, hyphens, and underscores
  let sanitized = baseName
    .replace(/[^a-zA-Z0-9_-]/g, "_") // Replace anything that's not alphanumeric, underscore, or hyphen
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_+|_+$/g, ""); // Trim underscores from start/end

  // Ensure not empty
  if (!sanitized) {
    sanitized = "export";
  }

  return sanitized + suffix;
}
