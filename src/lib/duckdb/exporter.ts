/**
 * Main DuckDB-WASM export orchestration
 */

import { initDuckDB } from "./init";
import { downloadFile, loadFileIntoDuckDB } from "./loader";
import { translatePipeline } from "./sql-translator";
import type { ExportOptions, ExportResult, ExportProgress } from "./types";
import { BrowserOOMError, DuckDBExecutionError } from "./types";

/**
 * Export file with transformations using DuckDB-WASM
 * 
 * This is the main entry point for client-side export.
 * Processes entire file (not limited to 5000 rows like preview).
 */
export async function exportWithDuckDB(
  options: ExportOptions
): Promise<ExportResult> {
  const { fileUrl, mimeType, fileName, steps, parseConfig, onProgress } = options;

  try {
    // Stage 1: Initialize DuckDB
    onProgress?.({
      stage: "initializing",
      message: "Initializing DuckDB...",
    });

    const { db } = await initDuckDB();

    // Stage 2: Download file
    onProgress?.({
      stage: "downloading",
      message: "Downloading file...",
      bytesDownloaded: 0,
      totalBytes: 0,
    });

    const fileBuffer = await downloadFile(fileUrl, (bytesDownloaded, totalBytes) => {
      onProgress?.({
        stage: "downloading",
        message: `Downloading file... (${formatBytes(bytesDownloaded)} / ${formatBytes(totalBytes)})`,
        bytesDownloaded,
        totalBytes,
      });
    });

    // Stage 3: Load into DuckDB
    onProgress?.({
      stage: "loading",
      message: "Loading file into database...",
    });

    await loadFileIntoDuckDB(db, fileBuffer, fileName, mimeType, parseConfig);

    // Stage 4: Execute transformations
    onProgress?.({
      stage: "transforming",
      message: "Applying transformations...",
      currentStep: 0,
      totalSteps: steps.length,
    });

    if (steps.length > 0) {
      const sqlStatements = translatePipeline(steps);
      const conn = await db.connect();

      try {
        let statementIndex = 0;
        for (const sql of sqlStatements) {
          try {
            await conn.query(sql);
            statementIndex++;

            // Update progress (approximate step progress based on statements)
            const currentStep = Math.floor((statementIndex / sqlStatements.length) * steps.length);
            onProgress?.({
              stage: "transforming",
              message: `Applying transformations... (${currentStep + 1} / ${steps.length})`,
              currentStep,
              totalSteps: steps.length,
            });
          } catch (error) {
            throw new DuckDBExecutionError(
              `Failed to execute SQL: ${error instanceof Error ? error.message : String(error)}`,
              sql,
              error
            );
          }
        }
      } finally {
        await conn.close();
      }
    }

    // Stage 5: Generate CSV
    onProgress?.({
      stage: "generating",
      message: "Generating CSV...",
    });

    const conn = await db.connect();
    let csvContent: string;
    let rowCount: number;

    try {
      // Get row count
      const countResult = await conn.query("SELECT COUNT(*) as count FROM data");
      rowCount = Number(countResult.toArray()[0]?.count || 0);

      // Export to CSV
      // Use COPY TO with CSV format for proper CSV generation
      await conn.query("COPY data TO 'output.csv' (FORMAT CSV, HEADER TRUE)");

      // Read the CSV file from virtual filesystem
      const csvBuffer = await db.copyFileToBuffer("output.csv");
      const decoder = new TextDecoder("utf-8");
      csvContent = decoder.decode(csvBuffer);
    } finally {
      await conn.close();
    }

    // Add UTF-8 BOM for Excel compatibility
    const BOM = "\uFEFF";
    const csvWithBOM = BOM + csvContent;

    // Create blob
    const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });

    // Stage 6: Ready
    onProgress?.({
      stage: "ready",
      message: "Export complete!",
    });

    return {
      blob,
      fileName: generateExportFileName(fileName),
      rowCount,
    };
  } catch (error) {
    // Detect OOM errors
    if (isOOMError(error)) {
      const oomError = new BrowserOOMError(
        "Browser ran out of memory. Try exporting a smaller file or subset of data.",
        error
      );
      
      onProgress?.({
        stage: "error",
        message: oomError.message,
        error: oomError.message,
      });

      throw oomError;
    }

    // Other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    onProgress?.({
      stage: "error",
      message: errorMessage,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Check if error is an OOM error
 */
function isOOMError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("out of memory") ||
    message.includes("memory limit") ||
    message.includes("allocation failed") ||
    error.name === "RangeError" // JavaScript RangeError often indicates OOM
  );
}

/**
 * Generate filename for export
 */
function generateExportFileName(originalFileName: string): string {
  // Remove extension
  const nameWithoutExt = originalFileName.replace(/\.[^.]+$/, "");
  
  // Add timestamp and .csv extension
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  return `${nameWithoutExt}_exported_${timestamp}.csv`;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
