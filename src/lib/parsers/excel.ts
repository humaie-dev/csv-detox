/**
 * Excel parser implementation using xlsx library
 */

import * as XLSX from "xlsx";
import { inferColumnTypes } from "./type-inference";
import type { ParseOptions, ParseResult } from "./types";
import { ParseError } from "./types";

/**
 * List all sheet names in an Excel workbook
 */
export function listSheets(buffer: ArrayBuffer): string[] {
  try {
    // Read only workbook metadata to avoid loading sheet data into memory
    const workbook = XLSX.read(buffer, { type: "array", bookSheets: true });
    return workbook.SheetNames || [];
  } catch (error) {
    throw new ParseError(
      `Failed to read Excel file: ${error instanceof Error ? error.message : String(error)}`,
      "PARSE_ERROR",
      error,
    );
  }
}

/**
 * Fill merged cell values from top-left cell to all covered cells
 * Handles both dense (array-based) and sparse (object-based) worksheet formats
 */
function fillMergedCells(worksheet: XLSX.WorkSheet, range: XLSX.Range): void {
  // Check if there are any merged ranges
  if (!worksheet["!merges"] || worksheet["!merges"].length === 0) {
    return;
  }

  // Check if worksheet is in dense mode (array-based) or sparse mode (object-based)
  const isDense = Array.isArray(worksheet);

  // Process each merge range
  for (const merge of worksheet["!merges"]) {
    // Check if merge intersects with the current data range
    if (
      merge.s.r > range.e.r ||
      merge.e.r < range.s.r ||
      merge.s.c > range.e.c ||
      merge.e.c < range.s.c
    ) {
      continue; // Skip merges outside the range
    }

    // Get the top-left cell value
    const topLeftCell = isDense
      ? (worksheet as unknown[][])[merge.s.r]?.[merge.s.c]
      : worksheet[XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })];

    // If top-left cell has no value, skip this merge
    // (we can't fill covered cells with an empty/undefined value)
    if (!topLeftCell) {
      continue;
    }

    // Fill all cells in the merge range with the top-left cell value
    // Only fill empty cells - don't overwrite existing values
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        // Skip the top-left cell itself
        if (r === merge.s.r && c === merge.s.c) {
          continue;
        }

        // Check if the cell already has a value
        const existingCell = isDense
          ? (worksheet as unknown[][])[r]?.[c]
          : worksheet[XLSX.utils.encode_cell({ r, c })];

        // Only fill if the cell is empty or has an empty string value
        if (
          !existingCell ||
          existingCell.v === "" ||
          existingCell.v === null ||
          existingCell.v === undefined
        ) {
          // Copy the top-left cell to this position
          // Create a new object to avoid reference issues
          if (isDense) {
            // In dense mode, ensure the row array exists
            const ws = worksheet as unknown[][];
            if (!ws[r]) ws[r] = [];
            ws[r][c] = { ...topLeftCell };
          } else {
            // In sparse mode, use cell address
            const cellAddr = XLSX.utils.encode_cell({ r, c });
            worksheet[cellAddr] = { ...topLeftCell };
          }
        }
      }
    }
  }
}

/**
 * Parse Excel content into structured data
 */
export function parseExcel(buffer: ArrayBuffer, options: ParseOptions = {}): ParseResult {
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
    // Compute a safe upper bound for rows to materialize from the sheet.
    // This caps memory usage on large workbooks in constrained environments (e.g. Convex actions).
    const sheetRows: number | undefined = (() => {
      if (endRow !== undefined) return endRow; // respect explicit endRow
      if (Number.isFinite(maxRows)) {
        const mr = maxRows as number;
        // Include preceding rows to reach startRow, since XLSX cannot skip directly
        return Math.max(1, startRow - 1 + mr);
      }
      return undefined;
    })();

    // Parse workbook with memory-friendly options
    const workbook = XLSX.read(buffer, {
      type: "array",
      dense: true, // more memory-efficient sheet representation
    });

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
          "SHEET_NOT_FOUND",
        );
      }
      sheetName = sheetNameOption;
    } else if (sheetIndexOption !== undefined) {
      // Use sheet by index
      if (sheetIndexOption < 0 || sheetIndexOption >= workbook.SheetNames.length) {
        throw new ParseError(
          `Sheet index ${sheetIndexOption} out of range. Available: 0-${workbook.SheetNames.length - 1}`,
          "INVALID_SHEET_INDEX",
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
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

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

    // Fill merged cells with values from top-left cell
    fillMergedCells(worksheet, range);

    // Convert range to array of arrays
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      range: range,
      header: 1, // Return array of arrays
      defval: null,
      raw: true, // Keep original types (numbers, dates, etc.)
      // Limit materialized rows to reduce memory
      ...(sheetRows !== undefined ? { sheetRows } : {}),
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
        h !== null && h !== undefined && h !== "" ? String(h) : `Column${i + 1}`,
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

    // Deduplicate headers by adding suffixes (_1, _2, etc.)
    const headerCounts = new Map<string, number>();
    const warnings: string[] = [];
    const duplicates: string[] = [];

    headers = headers.map((header) => {
      const count = headerCounts.get(header) || 0;
      headerCounts.set(header, count + 1);

      if (count > 0) {
        duplicates.push(header);
        return `${header}_${count}`;
      }
      return header;
    });

    if (duplicates.length > 0) {
      warnings.push(
        `Duplicate column names found and disambiguated: ${[...new Set(duplicates)].join(", ")}`,
      );
    }

    // Convert array of arrays to array of objects
    const dataRows = rawData.slice(
      dataStartIndex,
      Math.min(rawData.length, dataStartIndex + maxRows),
    );
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
          `Available sheets: ${workbook.SheetNames.join(", ")}`,
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
      error,
    );
  }
}
