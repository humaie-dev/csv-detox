import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/sqlite/database";
import { getConvexClient } from "@/lib/convex/client";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";
import Database from "better-sqlite3";
import type { ColumnMetadata, RawDataRow } from "@/lib/sqlite/types";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Get stored pipeline execution results
 * GET /api/projects/[projectId]/pipelines/[pipelineId]/results?limit=100&offset=0
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; pipelineId: string }> }
) {
  try {
    const { projectId, pipelineId } = await params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const validation = querySchema.safeParse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { limit, offset } = validation.data;

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

    // Check if pipeline results exist
    const sanitized = pipelineId.replace(/-/g, "_");
    const resultTableName = `pipeline_${sanitized}_result`;
    const columnsTableName = `pipeline_${sanitized}_columns`;

    const tableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      )
      .get(resultTableName);

    if (!tableExists) {
      return NextResponse.json(
        { 
          error: "Pipeline results not found. Please execute the pipeline first.",
          executed: false,
        },
        { status: 404 }
      );
    }

    // Get pipeline results
    const results = getPipelineResults(db, pipelineId, offset, limit);
    const columns = getPipelineColumns(db, pipelineId);
    const totalRows = getPipelineResultRowCount(db, pipelineId);

    return NextResponse.json({
      data: results.map((row) => row.data),
      columns: columns.map((col) => ({
        name: col.name,
        type: col.type,
      })),
      pagination: {
        offset,
        limit,
        total: totalRows,
      },
    });
  } catch (error) {
    console.error("Error fetching pipeline results:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch pipeline results",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get pipeline results with pagination
 */
function getPipelineResults(
  db: Database.Database,
  pipelineId: string,
  offset: number,
  limit: number
): RawDataRow[] {
  const sanitized = pipelineId.replace(/-/g, "_");
  const tableName = `pipeline_${sanitized}_result`;
  
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
 * Helper: Get pipeline column metadata
 */
function getPipelineColumns(
  db: Database.Database,
  pipelineId: string
): ColumnMetadata[] {
  const sanitized = pipelineId.replace(/-/g, "_");
  const tableName = `pipeline_${sanitized}_columns`;
  
  const stmt = db.prepare(`
    SELECT name, type, null_count, sample_values
    FROM ${tableName}
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
 * Helper: Get pipeline result row count
 */
function getPipelineResultRowCount(
  db: Database.Database,
  pipelineId: string
): number {
  const sanitized = pipelineId.replace(/-/g, "_");
  const tableName = `pipeline_${sanitized}_result`;
  
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
  const result = stmt.get() as { count: number };
  return result.count;
}
