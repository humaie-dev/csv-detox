import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/sqlite/database";
import { getConvexClient } from "@/lib/convex/client";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import Database from "better-sqlite3";
import type { ColumnMetadata, RawDataRow } from "@/lib/sqlite/types";
import archiver from "archiver";
import { Readable } from "node:stream";

/**
 * Export all project data as ZIP file containing:
 * - raw_data.csv (original parsed data)
 * - {pipeline_name}.csv for each executed pipeline
 * 
 * GET /api/projects/[projectId]/export-all
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Verify project exists
    const convex = getConvexClient();
    const project = await convex.query(api.projects.get, {
      id: projectId as Id<"projects">,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all pipelines for this project
    const pipelines = await convex.query(api.pipelines.list, {
      projectId: projectId as Id<"projects">,
    });

    // Get database
    const db = getDatabase(projectId);

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Compression level
    });

    // Create a readable stream from the archive
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Pipe archive to writable stream
    archive.on("data", (chunk) => {
      writer.write(chunk);
    });

    archive.on("end", () => {
      writer.close();
    });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      writer.abort(err);
    });

    // Add raw data CSV
    try {
      const rawColumns = getRawDataColumns(db);
      const rawCsv = generateCSV(db, "raw_data", rawColumns);
      archive.append(rawCsv, { name: "raw_data.csv" });
    } catch (error) {
      console.error("Error adding raw data:", error);
      // Continue even if raw data fails
    }

    // Add each executed pipeline's results
    for (const pipeline of pipelines) {
      try {
        const sanitized = pipeline._id.replace(/-/g, "_");
        const resultTableName = `pipeline_${sanitized}_result`;
        const columnsTableName = `pipeline_${sanitized}_columns`;

        // Check if pipeline has been executed
        const tableExists = db
          .prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          )
          .get(resultTableName);

        if (tableExists) {
          const columns = getPipelineColumns(db, columnsTableName);
          const csv = generateCSV(db, resultTableName, columns);
          const safePipelineName = pipeline.name.replace(/[^a-zA-Z0-9-_]/g, "_");
          archive.append(csv, { name: `${safePipelineName}.csv` });
        }
      } catch (error) {
        console.error(`Error adding pipeline ${pipeline.name}:`, error);
        // Continue with other pipelines
      }
    }

    // Finalize the archive
    archive.finalize();

    // Generate filename
    const projectName = project.name.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `${projectName}_export.zip`;

    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error exporting project:", error);
    return NextResponse.json(
      {
        error: "Failed to export project",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get raw data columns
 */
function getRawDataColumns(db: Database.Database): ColumnMetadata[] {
  const stmt = db.prepare(`
    SELECT name, type, null_count, sample_values
    FROM columns
  `);

  const rows = stmt.all() as Array<{
    name: string;
    type: string;
    null_count: number;
    sample_values: string | null;
  }>;

  return rows.map((row) => ({
    name: row.name,
    type: row.type as "string" | "number" | "boolean" | "date",
    nullCount: row.null_count,
    sampleValues: row.sample_values ? JSON.parse(row.sample_values) : undefined,
  }));
}

/**
 * Helper: Get pipeline columns
 */
function getPipelineColumns(
  db: Database.Database,
  columnsTableName: string
): ColumnMetadata[] {
  const stmt = db.prepare(`
    SELECT name, type, null_count, sample_values
    FROM ${columnsTableName}
  `);

  const rows = stmt.all() as Array<{
    name: string;
    type: string;
    null_count: number;
    sample_values: string | null;
  }>;

  return rows.map((row) => ({
    name: row.name,
    type: row.type as "string" | "number" | "boolean" | "date",
    nullCount: row.null_count,
    sampleValues: row.sample_values ? JSON.parse(row.sample_values) : undefined,
  }));
}

/**
 * Helper: Get rows with pagination
 */
function getRows(
  db: Database.Database,
  tableName: string,
  offset: number,
  limit: number
): RawDataRow[] {
  const stmt = db.prepare(`
    SELECT row_id, data
    FROM ${tableName}
    ORDER BY row_id
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset) as Array<{
    row_id: number;
    data: string;
  }>;

  return rows.map((row) => ({
    row_id: row.row_id,
    data: JSON.parse(row.data),
  }));
}

/**
 * Helper: Get row count
 */
function getRowCount(db: Database.Database, tableName: string): number {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Generate complete CSV string from table
 */
function generateCSV(
  db: Database.Database,
  tableName: string,
  columns: ColumnMetadata[]
): string {
  const lines: string[] = [];

  // Add header
  const headerRow = columns.map((col) => escapeCSVField(col.name)).join(",");
  lines.push(headerRow);

  // Add data rows
  const totalRows = getRowCount(db, tableName);
  const BATCH_SIZE = 1000;

  for (let offset = 0; offset < totalRows; offset += BATCH_SIZE) {
    const rows = getRows(db, tableName, offset, BATCH_SIZE);

    for (const row of rows) {
      const rowData = row.data;
      const csvRow = columns
        .map((col) => {
          const value = rowData[col.name];
          return escapeCSVField(formatCSVValue(value));
        })
        .join(",");
      lines.push(csvRow);
    }
  }

  return lines.join("\r\n") + "\r\n";
}

/**
 * Format value for CSV output
 */
function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Escape CSV field (handle quotes, commas, newlines)
 */
function escapeCSVField(field: string): string {
  if (
    field.includes('"') ||
    field.includes(",") ||
    field.includes("\n") ||
    field.includes("\r")
  ) {
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return field;
}
