/**
 * CSV parser implementation
 */

import type { ParseResult, ParseOptions } from "./types";
import { ParseError } from "./types";
import { inferColumnTypes } from "./type-inference";

/**
 * Detect the delimiter used in a CSV file
 */
function detectDelimiter(sample: string): string {
  const delimiters = [",", ";", "\t", "|"];
  const counts = delimiters.map((delim) => {
    const lines = sample.split("\n").slice(0, 5);
    const counts = lines.map((line) => line.split(delim).length);
    // Check if all lines have the same count and count > 1
    const allSame = counts.every((c) => c === counts[0]);
    return { delimiter: delim, count: counts[0], consistent: allSame };
  });

  // Find delimiter with highest consistent count
  const best = counts
    .filter((c) => c.consistent && c.count > 1)
    .sort((a, b) => b.count - a.count)[0];

  return best?.delimiter || ",";
}

/**
 * Parse a CSV value, handling quotes and escapes
 */
function parseCSVValue(value: string): string {
  // Remove leading/trailing whitespace
  value = value.trim();

  // Handle quoted values
  if (value.startsWith('"') && value.endsWith('"')) {
    // Remove quotes and unescape doubled quotes
    value = value.slice(1, -1).replace(/""/g, '"');
  }

  return value;
}

/**
 * Parse a single CSV line, handling quoted fields with delimiters
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      fields.push(parseCSVValue(currentField));
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Add last field
  fields.push(parseCSVValue(currentField));

  return fields;
}

/**
 * Parse CSV content into structured data
 */
export function parseCSV(
  content: string,
  options: ParseOptions = {}
): ParseResult {
  const {
    maxRows = Infinity,
    inferTypes = true,
    delimiter: userDelimiter,
    startRow = 1,
    endRow,
    startColumn = 1,
    endColumn,
    hasHeaders = true,
  } = options;

  try {
    // Detect delimiter if not provided
    const delimiter = userDelimiter || detectDelimiter(content);

    // Split into lines
    const allLines = content.split(/\r?\n/).filter((line) => line.trim());

    if (allLines.length === 0) {
      throw new ParseError("File is empty", "EMPTY_FILE");
    }

    // Validate row range
    if (startRow < 1) {
      throw new ParseError("startRow must be >= 1", "INVALID_RANGE");
    }
    if (endRow !== undefined && endRow < startRow) {
      throw new ParseError("endRow must be >= startRow", "INVALID_RANGE");
    }

    // Validate column range
    if (startColumn < 1) {
      throw new ParseError("startColumn must be >= 1", "INVALID_RANGE");
    }
    if (endColumn !== undefined && endColumn < startColumn) {
      throw new ParseError("endColumn must be >= startColumn", "INVALID_RANGE");
    }

    // Extract lines in the specified row range (convert to 0-based indexing)
    const firstLineIndex = startRow - 1;
    const lastLineIndex = endRow !== undefined ? endRow : allLines.length;
    const lines = allLines.slice(firstLineIndex, lastLineIndex);

    if (lines.length === 0) {
      throw new ParseError("No data in specified row range", "EMPTY_RANGE");
    }

    // Determine headers
    let headers: string[];
    let dataStartIndex: number;

    if (hasHeaders) {
      // First line is headers
      const headerLine = lines[0];
      const allHeaders = parseCSVLine(headerLine, delimiter);
      
      // Apply column range to headers
      headers = applyColumnRange(allHeaders, startColumn, endColumn);
      dataStartIndex = 1;
    } else {
      // Generate column headers: Column1, Column2, etc.
      const firstLine = lines[0];
      const allValues = parseCSVLine(firstLine, delimiter);
      const columnCount = endColumn !== undefined 
        ? Math.min(endColumn, allValues.length) - (startColumn - 1)
        : allValues.length - (startColumn - 1);
      
      headers = Array.from({ length: columnCount }, (_, i) => `Column${i + 1}`);
      dataStartIndex = 0;
    }

    if (headers.length === 0) {
      throw new ParseError("No columns found in specified range", "NO_COLUMNS");
    }

    // Check for duplicate headers
    const headerSet = new Set<string>();
    const duplicates: string[] = [];
    headers.forEach((header) => {
      if (headerSet.has(header)) {
        duplicates.push(header);
      }
      headerSet.add(header);
    });

    const warnings: string[] = [];
    if (duplicates.length > 0) {
      warnings.push(
        `Duplicate column names found: ${duplicates.join(", ")}. ` +
          `Later columns will overwrite earlier ones.`
      );
    }

    // Parse data rows
    const rows: Record<string, unknown>[] = [];
    const dataLines = lines.slice(dataStartIndex, Math.min(lines.length, dataStartIndex + maxRows));

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const allValues = parseCSVLine(line, delimiter);
      
      // Apply column range to values
      const values = applyColumnRange(allValues, startColumn, endColumn);

      if (values.length !== headers.length) {
        warnings.push(
          `Row ${firstLineIndex + dataStartIndex + i + 1} has ${values.length} columns in range but expected ${headers.length}. ` +
            `This row may be malformed.`
        );
      }

      const row: Record<string, unknown> = {};
      for (let j = 0; j < headers.length; j++) {
        const value = values[j] || "";
        row[headers[j]] = value === "" ? null : value;
      }
      rows.push(row);
    }

    // Infer column types if requested
    const columns = inferTypes
      ? inferColumnTypes(rows, headers)
      : headers.map((name) => ({
          name,
          type: "string" as const,
          nonNullCount: 0,
          nullCount: 0,
          sampleValues: [],
        }));

    return {
      rows,
      columns,
      rowCount: rows.length,
      warnings,
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(
      `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`,
      "PARSE_ERROR",
      error
    );
  }
}

/**
 * Apply column range to an array of values
 */
function applyColumnRange<T>(values: T[], startColumn: number, endColumn?: number): T[] {
  const startIndex = startColumn - 1; // Convert to 0-based
  const endIndex = endColumn !== undefined ? endColumn : values.length;
  return values.slice(startIndex, endIndex);
}
