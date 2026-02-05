/**
 * File loading into DuckDB-WASM
 */

import type { ParseOptions } from "@/lib/parsers/types";
import { parseCSV } from "@/lib/parsers/csv";
import { parseExcel } from "@/lib/parsers/excel";

/**
 * Download file from URL with progress tracking
 */
export async function downloadFile(
  url: string,
  onProgress?: (bytesDownloaded: number, totalBytes: number) => void
): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesDownloaded = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    bytesDownloaded += value.length;

    if (onProgress) {
      onProgress(bytesDownloaded, totalBytes);
    }
  }

  // Combine chunks into single ArrayBuffer
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

/**
 * Load CSV or Excel file into DuckDB table named "data"
 * Applies parseOptions for row/column ranges
 */
export async function loadFileIntoDuckDB(
  db: import("@duckdb/duckdb-wasm").AsyncDuckDB,
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  parseConfig?: ParseOptions
): Promise<void> {
  const conn = await db.connect();

  try {
    // Ensure a clean slate for the target tables on re-runs
    // DuckDB keeps state across connections; dropping avoids "table already exists" errors
    await conn.query("DROP TABLE IF EXISTS data");
    await conn.query("DROP TABLE IF EXISTS data_filtered");

    // For Excel files, we need to parse and convert to CSV first
    // DuckDB-WASM doesn't have native Excel support
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      // Parse Excel to get data
      const result = await parseExcel(fileBuffer, parseConfig);

      // Convert to CSV format for DuckDB
      const csvContent = convertToCSV(result.rows, result.columns.map((c) => c.name));

      // Register CSV in virtual filesystem
      await db.registerFileText("data.csv", csvContent);

      // Load into DuckDB
      await conn.query(`CREATE OR REPLACE TABLE data AS SELECT * FROM read_csv_auto('data.csv')`);
    } else {
      // CSV files can be loaded directly
      // Register file in virtual filesystem
      await db.registerFileBuffer("data.csv", new Uint8Array(fileBuffer));

      // Load into DuckDB with read_csv_auto
      // Apply row/column range filtering if specified
      let sql = "CREATE OR REPLACE TABLE data AS SELECT * FROM read_csv_auto('data.csv'";

      // Apply parseConfig options
      if (parseConfig) {
        const options: string[] = [];

        // Handle header
        if (parseConfig.hasHeaders !== undefined) {
          options.push(`header=${parseConfig.hasHeaders}`);
        }

        // Handle delimiter
        if (parseConfig.delimiter) {
          options.push(`delim='${parseConfig.delimiter}'`);
        }

        if (options.length > 0) {
          sql += `, ${options.join(", ")}`;
        }
      }

      sql += ")";

      // Create/replace table
      await conn.query(sql);

      // Apply row range filtering if specified
      if (parseConfig?.startRow || parseConfig?.endRow) {
        const startRow = parseConfig.startRow || 1;
        const endRow = parseConfig.endRow;

        // Add ROWID for filtering (DuckDB has implicit ROWID)
        if (endRow) {
          await conn.query(
            `DELETE FROM data WHERE ROWID < ${startRow} OR ROWID > ${endRow}`
          );
        } else {
          await conn.query(`DELETE FROM data WHERE ROWID < ${startRow}`);
        }
      }

      // Apply column range filtering if specified
      if (parseConfig?.startColumn || parseConfig?.endColumn) {
        // Get all columns
        const columnsResult = await conn.query("DESCRIBE data");
        const columns = columnsResult.toArray().map((row: { column_name: string }) => row.column_name);

        const startCol = (parseConfig.startColumn || 1) - 1; // 0-based
        const endCol = parseConfig.endColumn ? parseConfig.endColumn - 1 : columns.length - 1;

        // Keep only columns in range
        const columnsToKeep = columns.slice(startCol, endCol + 1);
        const columnsToKeepEscaped = columnsToKeep.map((c: string) => `"${c.replace(/"/g, '""')}"`).join(", ");

        // Replace table with filtered columns
        await conn.query(
          `CREATE OR REPLACE TABLE data_filtered AS SELECT ${columnsToKeepEscaped} FROM data`
        );
        await conn.query("DROP TABLE data");
        await conn.query("ALTER TABLE data_filtered RENAME TO data");
      }
    }
  } finally {
    await conn.close();
  }
}

/**
 * Convert parsed data to CSV string
 */
function convertToCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const lines: string[] = [];

  // Header row
  lines.push(columns.map(escapeCSVField).join(","));

  // Data rows
  for (const row of rows) {
    const values = columns.map((col) => {
      const value = row[col];
      return escapeCSVField(value == null ? "" : String(value));
    });
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

/**
 * Escape a CSV field (wrap in quotes if needed)
 */
function escapeCSVField(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
