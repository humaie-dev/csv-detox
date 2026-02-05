/**
 * Client-side utility to list Excel sheets
 * Avoids Convex action memory limits by running in the browser
 */

import { listSheets } from "./excel";

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
