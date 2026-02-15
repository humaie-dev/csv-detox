import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import type Database from "better-sqlite3";
import { type NextRequest, NextResponse } from "next/server";
import { downloadFileFromConvex, getConvexClient, getUpload } from "@/lib/convex/client";
import { parseCSV } from "@/lib/parsers/csv";
import { parseExcel } from "@/lib/parsers/excel";
import type { ColumnMetadata, ParseOptions, ParseResult } from "@/lib/parsers/types";
import { executePipeline } from "@/lib/pipeline/executor";
import type { TransformationStep } from "@/lib/pipeline/types";
import {
  ensureLocalDatabase,
  finalizeDatabaseForArtifact,
  storeDatabaseArtifact,
} from "@/lib/sqlite/artifacts";
import { getColumns, getDatabase, getRawData, getRowCount } from "@/lib/sqlite/database";
import { isProjectDataInitialized } from "@/lib/sqlite/parser";
import { createPipelineTables, dropPipelineTables, getParseConfig } from "@/lib/sqlite/schema";

/**
 * Execute full pipeline and store results in SQLite
 * POST /api/projects/[projectId]/pipelines/[pipelineId]/execute
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; pipelineId: string }> },
) {
  const startTime = Date.now();

  try {
    const { projectId, pipelineId } = await params;

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
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Verify pipeline belongs to project
    if (pipeline.projectId !== projectId) {
      return NextResponse.json(
        { error: "Pipeline does not belong to this project" },
        { status: 400 },
      );
    }

    // Get database
    const projectIdTyped = projectId as Id<"projects">;
    const initialized = await isProjectDataInitialized(projectIdTyped);
    if (!initialized) {
      return NextResponse.json(
        { error: "Project data not initialized. Please parse the file first." },
        { status: 400 },
      );
    }

    await ensureLocalDatabase(projectIdTyped);
    const db = getDatabase(projectId);

    // Get current project parse config
    const currentParseConfig = getParseConfig(db);

    // Check if pipeline has custom parseConfig that differs from project default
    const needsCustomParse =
      pipeline.parseConfig && pipeline.parseConfig.sheetName !== currentParseConfig?.sheetName;

    let parseResult: ParseResult;

    if (needsCustomParse && pipeline.parseConfig) {
      // Re-parse with pipeline-specific config (full data, not preview)
      const upload = await getUpload(project.uploadId);
      if (!upload) {
        return NextResponse.json({ error: "Upload not found" }, { status: 404 });
      }

      // Download file from Convex Storage
      const fileBuffer = await downloadFileFromConvex(upload.convexStorageId);

      // Parse with pipeline's custom config
      const parseOptions: ParseOptions = {
        ...upload.parseConfig,
        ...pipeline.parseConfig,
      };

      // Determine file type and parse
      const isExcel =
        upload.mimeType?.includes("spreadsheet") || upload.originalName?.match(/\.(xlsx?|xls)$/i);

      parseResult = isExcel
        ? await parseExcel(fileBuffer, parseOptions)
        : await parseCSV(new TextDecoder().decode(fileBuffer), parseOptions);
    } else {
      // Load raw data from SQLite (all rows for full execution)
      const totalRows = getRowCount(db);
      const rawDataRows = getRawData(db, 0, totalRows);
      const columns = getColumns(db);

      // Convert SQLite format to ParseResult format
      parseResult = {
        rows: rawDataRows.map((row) => row.data),
        columns: columns.map((col) => ({
          name: col.name,
          type: col.type as "string" | "number" | "boolean" | "date" | "null",
          nonNullCount: totalRows - col.nullCount,
          nullCount: col.nullCount,
          sampleValues: col.sampleValues || [],
        })),
        rowCount: totalRows,
        warnings: [],
      };
    }

    // If no steps, just store the raw data
    if (pipeline.steps.length === 0) {
      // Create pipeline tables
      createPipelineTables(db, pipelineId);

      // Store raw data as pipeline result
      storePipelineResults(db, pipelineId, parseResult.rows, parseResult.columns);

      const duration = Date.now() - startTime;

      finalizeDatabaseForArtifact(projectIdTyped, db);
      await storeDatabaseArtifact({
        projectId: projectIdTyped,
        uploadId: project.uploadId,
        parseOptions: undefined,
        databaseProjectId: projectId,
      });

      return NextResponse.json({
        success: true,
        rowCount: parseResult.rowCount,
        columnCount: parseResult.columns.length,
        duration,
        warnings: parseResult.warnings,
        stepResults: [],
      });
    }

    // Convert Convex steps to TransformationStep format
    const transformationSteps: TransformationStep[] = pipeline.steps.map((step) => ({
      id: step.id,
      type: step.type as TransformationStep["type"],
      config: step.config as TransformationStep["config"],
    }));

    // Execute full pipeline
    const executionResult = executePipeline(parseResult, transformationSteps);

    // Check for execution errors
    const failedSteps = executionResult.stepResults.filter((s) => !s.success);
    if (failedSteps.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Pipeline execution failed",
          failedSteps: failedSteps.map((s) => ({
            stepId: s.stepId,
            error: s.error,
          })),
          duration: Date.now() - startTime,
        },
        { status: 400 },
      );
    }

    // Create or replace pipeline tables
    dropPipelineTables(db, pipelineId);
    createPipelineTables(db, pipelineId);

    // Store results in SQLite
    storePipelineResults(db, pipelineId, executionResult.table.rows, executionResult.table.columns);

    finalizeDatabaseForArtifact(projectIdTyped, db);
    await storeDatabaseArtifact({
      projectId: projectIdTyped,
      uploadId: project.uploadId,
      parseOptions: undefined,
      databaseProjectId: projectId,
    });

    const duration = Date.now() - startTime;

    // Return execution metadata
    return NextResponse.json({
      success: true,
      rowCount: executionResult.table.rowCount,
      columnCount: executionResult.table.columns.length,
      duration,
      warnings: executionResult.table.warnings,
      stepResults: executionResult.stepResults.map((s) => ({
        stepId: s.stepId,
        success: s.success,
        rowsAffected: s.rowsAffected,
      })),
    });
  } catch (error) {
    console.error("Error executing pipeline:", error);
    return NextResponse.json(
      {
        error: "Failed to execute pipeline",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Helper function to store pipeline results in SQLite
 */
function storePipelineResults(
  db: Database.Database,
  pipelineId: string,
  rows: Array<Record<string, unknown>>,
  columns: ColumnMetadata[],
): void {
  const sanitized = pipelineId.replace(/-/g, "_");
  const resultTableName = `pipeline_${sanitized}_result`;
  const columnsTableName = `pipeline_${sanitized}_columns`;

  // Insert rows in batches for better performance
  const insertRow = db.prepare(`
    INSERT INTO ${resultTableName} (data)
    VALUES (?)
  `);

  const insertRowsBatch = db.transaction((rows: Array<Record<string, unknown>>) => {
    for (const row of rows) {
      insertRow.run(JSON.stringify(row));
    }
  });

  // Store rows
  insertRowsBatch(rows);

  // Insert column metadata
  const insertColumn = db.prepare(`
    INSERT OR REPLACE INTO ${columnsTableName} (name, type, null_count, sample_values)
    VALUES (?, ?, ?, ?)
  `);

  const insertColumnsBatch = db.transaction((cols: ColumnMetadata[]) => {
    for (const col of cols) {
      insertColumn.run(
        col.name,
        col.type,
        col.nullCount,
        col.sampleValues ? JSON.stringify(col.sampleValues) : null,
      );
    }
  });

  insertColumnsBatch(columns);
}
