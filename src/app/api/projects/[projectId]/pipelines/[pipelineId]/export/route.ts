import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/sqlite/database";
import { getConvexClient } from "@/lib/convex/client";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";
import Database from "better-sqlite3";
import type { ColumnMetadata, RawDataRow } from "@/lib/sqlite/types";

/**
 * Export pipeline results or raw data as CSV
 * GET /api/projects/[projectId]/pipelines/[pipelineId]/export
 * 
 * Query params:
 * - raw=true: Export raw data instead of pipeline results
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; pipelineId: string }> }
) {
  try {
    const { projectId, pipelineId } = await params;
    const { searchParams } = new URL(request.url);
    const exportRaw = searchParams.get("raw") === "true";

    // Verify project exists
    const convex = getConvexClient();
    const project = await convex.query(api.projects.get, {
      id: projectId as Id<"projects">,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify pipeline exists
    const pipeline = await convex.query(api.pipelines.get, {
      id: pipelineId as Id<"pipelines">,
    });

    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      );
    }

    // Verify pipeline belongs to project
    if (pipeline.projectId !== projectId) {
      return NextResponse.json(
        { error: "Pipeline does not belong to this project" },
        { status: 400 }
      );
    }

    // Get database
    const db = getDatabase(projectId);

    // Determine table name and columns
    let tableName: string;
    let columns: ColumnMetadata[];
    let fileName: string;

    if (exportRaw) {
      // Export raw data
      tableName = "raw_data";
      columns = getRawDataColumns(db);
      fileName = `${project.name.replace(/[^a-zA-Z0-9-_]/g, "_")}_raw.csv`;
    } else {
      // Export pipeline results
      const sanitized = pipelineId.replace(/-/g, "_");
      tableName = `pipeline_${sanitized}_result`;
      const columnsTableName = `pipeline_${sanitized}_columns`;

      // Check if pipeline has been executed
      const tableExists = db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        )
        .get(tableName);

      if (!tableExists) {
        return NextResponse.json(
          {
            error: "Pipeline results not found. Please execute the pipeline first.",
            executed: false,
          },
          { status: 404 }
        );
      }

      columns = getPipelineColumns(db, columnsTableName);
      fileName = `${project.name.replace(/[^a-zA-Z0-9-_]/g, "_")}_${pipeline.name.replace(/[^a-zA-Z0-9-_]/g, "_")}.csv`;
    }

    // Stream CSV response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        try {
          // Write CSV header row
          const headerRow = columns.map((col) => escapeCSVField(col.name)).join(",");
          controller.enqueue(encoder.encode(headerRow + "\r\n"));

          // Stream data in batches
          const BATCH_SIZE = 1000;
          const totalRows = getRowCount(db, tableName);
          
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
              controller.enqueue(encoder.encode(csvRow + "\r\n"));
            }
          }

          controller.close();
        } catch (error) {
          console.error("Error streaming CSV:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return NextResponse.json(
      {
        error: "Failed to export CSV",
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
 * Helper: Get row count
 */
function getRowCount(db: Database.Database, tableName: string): number {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
  const result = stmt.get() as { count: number };
  return result.count;
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
    // Stringify objects/arrays
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Escape CSV field (handle quotes, commas, newlines)
 */
function escapeCSVField(field: string): string {
  // Fields containing quotes, commas, or newlines must be quoted
  if (field.includes('"') || field.includes(",") || field.includes("\n") || field.includes("\r")) {
    // Escape quotes by doubling them
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return field;
}
