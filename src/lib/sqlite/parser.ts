/**
 * Server-side file parser for SQLite storage
 * Parses CSV/Excel files and stores results in SQLite database
 */

import type { Id } from "@convex/dataModel";
import { parseCSV } from "../parsers/csv";
import { parseExcel } from "../parsers/excel";
import type { ParseOptions, ParseResult } from "../parsers/types";
import { ParseError } from "../parsers/types";
import {
  finalizeDatabaseForArtifact,
  getLatestArtifact,
  storeDatabaseArtifact,
} from "../sqlite/artifacts";
import {
  clearAllData,
  databaseExists,
  getDatabase,
  insertColumns,
  insertRawData,
} from "../sqlite/database";
import { isInitialized, storeParseConfig } from "../sqlite/schema";
import type { ColumnMetadata as SQLiteColumnMetadata } from "../sqlite/types";

const BATCH_SIZE = 1000; // Process rows in batches for better memory management

/**
 * Convert parser ColumnMetadata to SQLite ColumnMetadata
 */
function convertToSQLiteColumns(result: ParseResult): SQLiteColumnMetadata[] {
  return result.columns.map((col) => {
    // Map InferredType to SQLite type (exclude "null")
    let type: "string" | "number" | "boolean" | "date" = "string";
    if (col.type === "number") type = "number";
    else if (col.type === "boolean") type = "boolean";
    else if (col.type === "date") type = "date";

    return {
      name: col.name,
      type,
      nullCount: col.nullCount,
      sampleValues: col.sampleValues?.slice(0, 5).map((v) => String(v)), // Convert to strings
    };
  });
}

/**
 * Parse file and store in SQLite database
 */
export async function parseAndStoreFile(
  projectId: Id<"projects">,
  fileBuffer: ArrayBuffer,
  originalName: string,
  mimeType: string,
  parseOptions?: ParseOptions,
): Promise<{ rowCount: number; columns: SQLiteColumnMetadata[] }> {
  const db = getDatabase(projectId);

  try {
    // If database already has data, clear it first
    if (isInitialized(db)) {
      clearAllData(db);
    }

    // Determine file type and parse
    let result: ParseResult;
    const isExcel =
      mimeType.includes("spreadsheet") ||
      originalName.endsWith(".xlsx") ||
      originalName.endsWith(".xls");

    if (isExcel) {
      result = parseExcel(fileBuffer, parseOptions);
    } else {
      // Convert ArrayBuffer to string for CSV parsing
      const text = new TextDecoder().decode(fileBuffer);
      result = parseCSV(text, parseOptions);
    }

    // Store parse config
    if (parseOptions) {
      storeParseConfig(db, {
        delimiter: parseOptions.delimiter,
        hasHeaders: parseOptions.hasHeaders ?? true,
        sheetName: parseOptions.sheetName,
        cellRange:
          parseOptions.startRow ||
          parseOptions.endRow ||
          parseOptions.startColumn ||
          parseOptions.endColumn
            ? `R${parseOptions.startRow ?? ""}:${parseOptions.endRow ?? ""} C${parseOptions.startColumn ?? ""}:${parseOptions.endColumn ?? ""}`
            : undefined,
      });
    }

    // Convert to SQLite column format
    const columns = convertToSQLiteColumns(result);

    // Store column metadata
    insertColumns(db, columns);

    // Store data in batches
    const totalRows = result.rows.length;
    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = result.rows.slice(i, i + BATCH_SIZE);
      insertRawData(db, batch);
    }

    return {
      rowCount: totalRows,
      columns,
    };
  } catch (error) {
    // Clean up on error
    clearAllData(db);

    if (error instanceof ParseError) {
      throw error;
    }

    throw new ParseError(
      `Failed to parse file: ${error instanceof Error ? error.message : "Unknown error"}`,
      "UNKNOWN_ERROR",
    );
  }
}

/**
 * Parse file, store in SQLite, and persist database as Convex artifact
 */
export async function parseStoreAndPersist(
  projectId: Id<"projects">,
  uploadId: Id<"uploads">,
  fileBuffer: ArrayBuffer,
  originalName: string,
  mimeType: string,
  parseOptions?: ParseOptions,
): Promise<{ rowCount: number; columns: SQLiteColumnMetadata[] }> {
  const result = await parseAndStoreFile(
    projectId,
    fileBuffer,
    originalName,
    mimeType,
    parseOptions,
  );

  const db = getDatabase(projectId);
  finalizeDatabaseForArtifact(projectId, db);
  await storeDatabaseArtifact({
    projectId,
    uploadId,
    parseOptions,
    databaseProjectId: projectId,
  });

  return result;
}

/**
 * Check if project database has been initialized with data
 */
export async function isProjectDataInitialized(projectId: Id<"projects">): Promise<boolean> {
  if (databaseExists(projectId)) {
    const db = getDatabase(projectId);
    return isInitialized(db);
  }

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return false;
  }

  const artifact = await getLatestArtifact(projectId);
  return Boolean(artifact);
}
