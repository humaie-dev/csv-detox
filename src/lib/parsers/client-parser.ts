/**
 * Client-side file parsing utilities
 * Avoids Convex action memory limits by running parsing in the browser
 */

import { parseCSV } from "./csv";
import { parseExcel, listSheets } from "./excel";
import { ParseError } from "./types";
import type { ParseResult, ParseOptions } from "./types";

/**
 * Download and parse a file from a URL (CSV or Excel)
 * @param fileUrl - URL to download the file from
 * @param mimeType - MIME type of the file
 * @param options - Parse options
 * @returns Parsed data
 */
export async function parseFileFromUrl(
  fileUrl: string,
  mimeType: string,
  options: ParseOptions = {}
): Promise<ParseResult> {
  try {
    // Fetch file from URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    // Get file as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // Parse based on file type
    let result: ParseResult;
    if (mimeType === "text/csv" || mimeType === "text/plain") {
      // Convert ArrayBuffer to string for CSV
      const decoder = new TextDecoder("utf-8");
      const content = decoder.decode(arrayBuffer);
      result = parseCSV(content, options);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      result = parseExcel(arrayBuffer, options);
    } else {
      throw new ParseError(
        `Unsupported file type: ${mimeType}`,
        "UNSUPPORTED_TYPE"
      );
    }

    return result;
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(
      `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`,
      "PARSE_ERROR",
      error
    );
  }
}

/**
 * Download file from URL and list Excel sheets
 * @param fileUrl - URL to download the Excel file from
 * @returns Array of sheet names
 */
export async function listSheetsFromUrl(fileUrl: string): Promise<string[]> {
  try {
    // Fetch file from URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    // Get file as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // List sheets using the Excel parser utility
    const sheets = listSheets(arrayBuffer);

    return sheets;
  } catch (error) {
    throw new Error(
      `Failed to list sheets: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
