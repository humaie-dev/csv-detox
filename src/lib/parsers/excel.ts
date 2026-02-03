/**
 * Excel parser implementation using xlsx library
 */

import * as XLSX from "xlsx";
import type { ParseResult, ParseOptions } from "./types";
import { ParseError } from "./types";
import { inferColumnTypes } from "./type-inference";

/**
 * List all sheet names in an Excel workbook
 */
export function listSheets(buffer: ArrayBuffer): string[] {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    return workbook.SheetNames || [];
  } catch (error) {
    throw new ParseError(
      `Failed to read Excel file: ${error instanceof Error ? error.message : String(error)}`,
      "PARSE_ERROR",
      error
    );
  }
}

/**
 * Parse Excel content into structured data
 */
export function parseExcel(
  buffer: ArrayBuffer,
  options: ParseOptions = {}
): ParseResult {
  const {
    maxRows = Infinity,
    inferTypes = true,
    sheetName: sheetNameOption,
    sheetIndex: sheetIndexOption,
    startRow = 1,
    endRow,
    startColumn = 1,
    endColumn,
    hasHeaders = true,
  } = options;

  try {
    // Parse workbook
    const workbook = XLSX.read(buffer, { type: "array" });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new ParseError("No sheets found in Excel file", "NO_SHEETS");
    }

    // Determine which sheet to use
    let sheetName: string;
    if (sheetNameOption !== undefined) {
      // Use sheet by name (priority over index)
      if (!workbook.SheetNames.includes(sheetNameOption)) {
        throw new ParseError(
          `Sheet "${sheetNameOption}" not found. Available: ${workbook.SheetNames.join(", ")}`,
          "SHEET_NOT_FOUND"
        );
      }
      sheetName = sheetNameOption;
    } else if (sheetIndexOption !== undefined) {
      // Use sheet by index
      if (sheetIndexOption < 0 || sheetIndexOption >= workbook.SheetNames.length) {
        throw new ParseError(
          `Sheet index ${sheetIndexOption} out of range. Available: 0-${workbook.SheetNames.length - 1}`,
          "INVALID_SHEET_INDEX"
        );
      }
      sheetName = workbook.SheetNames[sheetIndexOption];
    } else {
      // Use first sheet
      sheetName = workbook.SheetNames[0];
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new ParseError(`Failed to read sheet "${sheetName}"`, "READ_ERROR");
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

    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Apply row range (convert to 0-based for xlsx)
    range.s.r = Math.max(range.s.r, startRow - 1);
    if (endRow !== undefined) {
      range.e.r = Math.min(range.e.r, endRow - 1);
    }

    // Apply column range (convert to 0-based for xlsx)
    range.s.c = Math.max(range.s.c, startColumn - 1);
    if (endColumn !== undefined) {
      range.e.c = Math.min(range.e.c, endColumn - 1);
    }

    // Check if range is valid
    if (range.s.r > range.e.r || range.s.c > range.e.c) {
      throw new ParseError("No data in specified range", "EMPTY_RANGE");
    }

    // Convert range to array of arrays
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      range: range,
      header: 1, // Return array of arrays
      defval: null,
      raw: true, // Keep original types (numbers, dates, etc.)
    }) as unknown[][];

    if (rawData.length === 0) {
      throw new ParseError("No data in specified range", "EMPTY_RANGE");
    }

    // Determine headers
    let headers: string[];
    let dataStartIndex: number;

    if (hasHeaders) {
      // First row is headers
      const headerRow = rawData[0] as unknown[];
      headers = headerRow.map((h, i) => 
        h !== null && h !== undefined && h !== "" ? String(h) : `Column${i + 1}`
      );
      dataStartIndex = 1;
    } else {
      // Generate column headers: Column1, Column2, etc.
      const columnCount = rawData[0]?.length || 0;
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

    // Convert array of arrays to array of objects
    const dataRows = rawData.slice(dataStartIndex, Math.min(rawData.length, dataStartIndex + maxRows));
    const rows: Record<string, unknown>[] = dataRows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < headers.length; i++) {
        const value = row[i];
        obj[headers[i]] = value === "" ? null : value;
      }
      return obj;
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
      `Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`,
      "PARSE_ERROR",
      error
    );
  }
}
