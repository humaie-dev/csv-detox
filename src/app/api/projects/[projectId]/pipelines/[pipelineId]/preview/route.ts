import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { downloadFileFromConvex, getConvexClient, getUpload } from "@/lib/convex/client";
import { parseCSV } from "@/lib/parsers/csv";
import { parseExcel } from "@/lib/parsers/excel";
import type { ParseOptions, ParseResult } from "@/lib/parsers/types";
import { executePipeline, executeUntilStep } from "@/lib/pipeline/executor";
import type { ExecutionResult, TransformationStep } from "@/lib/pipeline/types";
import { getColumns, getDatabase, getRawData, getRowCount } from "@/lib/sqlite/database";
import { getParseConfig, isInitialized } from "@/lib/sqlite/schema";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  upToStep: z.number().int().min(-1).nullable().optional(), // -1 means raw data, null/undefined means all steps
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; pipelineId: string }> },
) {
  try {
    const { projectId, pipelineId } = await params;

    // Parse request body
    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { upToStep } = validation.data;

    // Normalize null to undefined (both mean "execute all steps")
    const normalizedUpToStep = upToStep === null ? undefined : upToStep;

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
    const db = getDatabase(projectId);

    // Check if data is initialized
    const initialized = isInitialized(db);
    if (!initialized) {
      return NextResponse.json(
        { error: "Project data not initialized. Please parse the file first." },
        { status: 400 },
      );
    }

    // Get current project parse config
    const currentParseConfig = getParseConfig(db);

    // Check if pipeline has custom parseConfig that differs from project default
    const needsCustomParse =
      pipeline.parseConfig && pipeline.parseConfig.sheetName !== currentParseConfig?.sheetName;

    let parseResult: ParseResult;

    if (needsCustomParse && pipeline.parseConfig) {
      // Re-parse with pipeline-specific config
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

      const parsedData = isExcel
        ? await parseExcel(fileBuffer, parseOptions)
        : await parseCSV(new TextDecoder().decode(fileBuffer), parseOptions);

      // Limit to first 1000 rows for preview
      parseResult = {
        ...parsedData,
        rows: parsedData.rows.slice(0, 1000),
      };
    } else {
      // Load raw data from SQLite (first 1000 rows for preview)
      const rawDataRows = getRawData(db, 0, 1000);
      const columns = getColumns(db);
      const totalRows = getRowCount(db);

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

    // If normalizedUpToStep is -1 or no steps, return raw data
    if (normalizedUpToStep === -1 || pipeline.steps.length === 0) {
      return NextResponse.json({
        data: parseResult.rows.slice(0, 100), // Return only first 100 for preview
        columns: parseResult.columns,
        upToStep: -1,
        rowCount: parseResult.rowCount,
      });
    }

    // Convert Convex steps to TransformationStep format
    const transformationSteps: TransformationStep[] = pipeline.steps.map((step) => ({
      id: step.id,
      type: step.type as TransformationStep["type"],
      config: step.config as TransformationStep["config"],
    }));

    // Execute pipeline
    let executionResult: ExecutionResult;
    if (normalizedUpToStep !== undefined && normalizedUpToStep < transformationSteps.length) {
      executionResult = executeUntilStep(parseResult, transformationSteps, normalizedUpToStep);
    } else {
      executionResult = executePipeline(parseResult, transformationSteps);
    }

    // Return preview data (first 100 rows)
    return NextResponse.json({
      data: executionResult.table.rows.slice(0, 100),
      columns: executionResult.table.columns,
      upToStep: normalizedUpToStep ?? transformationSteps.length - 1,
      rowCount: executionResult.table.rowCount,
      stepResults: executionResult.stepResults,
    });
  } catch (error) {
    console.error("Error generating pipeline preview:", error);
    return NextResponse.json(
      {
        error: "Failed to generate pipeline preview",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
