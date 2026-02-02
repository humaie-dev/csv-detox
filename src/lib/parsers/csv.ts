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
  } = options;

  try {
    // Detect delimiter if not provided
    const delimiter = userDelimiter || detectDelimiter(content);

    // Split into lines
    const lines = content.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length === 0) {
      throw new ParseError("File is empty", "EMPTY_FILE");
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine, delimiter);

    if (headers.length === 0) {
      throw new ParseError("No columns found in header", "NO_COLUMNS");
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
    const dataLines = lines.slice(1, Math.min(lines.length, maxRows + 1));

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const values = parseCSVLine(line, delimiter);

      if (values.length !== headers.length) {
        warnings.push(
          `Row ${i + 2} has ${values.length} columns but header has ${headers.length}. ` +
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
