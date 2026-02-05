/**
 * Client-side preview loader using DuckDB-WASM.
 * Keeps Preview and Export on the same flow to avoid drift.
 */

import { initDuckDB } from "./init";
import { downloadFile, loadFileIntoDuckDB } from "./loader";
import { translatePipeline } from "./sql-translator";
import type { ParseResult, ParseOptions } from "@/lib/parsers/types";
import { inferColumnTypes } from "@/lib/parsers/type-inference";
import type { TransformationStep } from "@/lib/pipeline/types";

export interface PreviewOptions {
  fileUrl: string;
  mimeType: string;
  fileName: string;
  steps: TransformationStep[];
  parseConfig?: ParseOptions;
  stopAtStep?: number; // inclusive index; if undefined, all steps
  maxRows?: number; // rows to return to UI (DataTable further limits rendering)
}

export async function loadPreviewWithDuckDB(options: PreviewOptions): Promise<ParseResult> {
  const { fileUrl, mimeType, fileName, steps, parseConfig, stopAtStep, maxRows = 1000 } = options;

  // Initialize DuckDB (cached between calls by initDuckDB)
  const { db } = await initDuckDB();

  // Download file
  const fileBuffer = await downloadFile(fileUrl);

  // Load into DuckDB virtual FS and create table `data`
  await loadFileIntoDuckDB(db, fileBuffer, fileName, mimeType, parseConfig);

  const conn = await db.connect();
  try {
    // Apply subset of transformations using SQL translation
    const effectiveSteps = typeof stopAtStep === "number" && stopAtStep >= 0
      ? steps.slice(0, Math.min(stopAtStep + 1, steps.length))
      : steps;

    if (effectiveSteps.length > 0) {
      const sqlStatements = translatePipeline(effectiveSteps);
      for (const sql of sqlStatements) {
        await conn.query(sql);
      }
    }

    // Fetch first N rows for preview
    const table = await conn.query(`SELECT * FROM data LIMIT ${Math.max(0, Math.floor(maxRows))}`);
    const rows = table.toArray() as Record<string, unknown>[];

    // Determine column order and names from query result
    const columnNames = rows.length > 0 ? Object.keys(rows[0]) : await getColumnNames(conn);

    // Infer column metadata
    const columns = inferColumnTypes(rows, columnNames);

    return {
      rows,
      columns,
      rowCount: rows.length,
      warnings: [],
    };
  } finally {
    await conn.close();
  }
}

async function getColumnNames(conn: import("@duckdb/duckdb-wasm").AsyncDuckDBConnection): Promise<string[]> {
  const describe = await conn.query("DESCRIBE data");
  const arr = describe.toArray() as { column_name: string }[];
  return arr.map((r) => r.column_name);
}
