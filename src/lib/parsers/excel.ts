/**
 * Excel parser implementation using xlsx library
 */

import * as XLSX from "xlsx";
import type { ParseResult, ParseOptions } from "./types";
import { ParseError } from "./types";
import { inferColumnTypes } from "./type-inference";

/**
 * Parse Excel content into structured data
 */
export function parseExcel(
  buffer: ArrayBuffer,
  options: ParseOptions = {}
): ParseResult {
  const { maxRows = Infinity, inferTypes = true, sheet: sheetOption } = options;

  try {
    // Parse workbook
    const workbook = XLSX.read(buffer, { type: "array" });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new ParseError("No sheets found in Excel file", "NO_SHEETS");
    }

    // Determine which sheet to use
    let sheetName: string;
    if (sheetOption === undefined) {
      // Use first sheet
      sheetName = workbook.SheetNames[0];
    } else if (typeof sheetOption === "number") {
      // Use sheet by index
      if (
        sheetOption < 0 ||
        sheetOption >= workbook.SheetNames.length
      ) {
        throw new ParseError(
          `Sheet index ${sheetOption} out of range. Available: 0-${workbook.SheetNames.length - 1}`,
          "INVALID_SHEET_INDEX"
        );
      }
      sheetName = workbook.SheetNames[sheetOption];
    } else {
      // Use sheet by name
      if (!workbook.SheetNames.includes(sheetOption)) {
        throw new ParseError(
          `Sheet "${sheetOption}" not found. Available: ${workbook.SheetNames.join(", ")}`,
          "SHEET_NOT_FOUND"
        );
      }
      sheetName = sheetOption;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new ParseError(`Failed to read sheet "${sheetName}"`, "READ_ERROR");
    }

    // Convert to JSON (array of objects)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false, // Format values as strings
    }) as Record<string, unknown>[];

    if (jsonData.length === 0) {
      throw new ParseError("Sheet is empty", "EMPTY_SHEET");
    }

    // Extract headers from first row
    const headers = Object.keys(jsonData[0]);

    if (headers.length === 0) {
      throw new ParseError("No columns found in sheet", "NO_COLUMNS");
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

    // Limit rows if maxRows specified
    const rows = jsonData.slice(0, maxRows);

    // Normalize data: convert empty strings to null
    const normalizedRows = rows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const key of headers) {
        const value = row[key];
        normalized[key] = value === "" ? null : value;
      }
      return normalized;
    });

    // Add warning if multiple sheets available
    if (workbook.SheetNames.length > 1) {
      warnings.push(
        `This workbook contains ${workbook.SheetNames.length} sheets. ` +
          `Currently parsing: "${sheetName}". ` +
          `Available sheets: ${workbook.SheetNames.join(", ")}`
      );
    }

    // Infer column types if requested
    const columns = inferTypes
      ? inferColumnTypes(normalizedRows, headers)
      : headers.map((name) => ({
          name,
          type: "string" as const,
          nonNullCount: 0,
          nullCount: 0,
          sampleValues: [],
        }));

    return {
      rows: normalizedRows,
      columns,
      rowCount: normalizedRows.length,
      warnings,
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(
      `Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`,
      "PARSE_ERROR",
      error
    );
  }
}
