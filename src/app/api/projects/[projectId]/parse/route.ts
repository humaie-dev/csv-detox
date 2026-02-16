/**
 * API Route: POST /api/projects/[projectId]/parse
 * Parse uploaded file and store in SQLite database
 */

import type { Id } from "@convex/dataModel";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { downloadFileFromConvex, getProject, getUpload } from "@/lib/convex/client";
import type { ParseOptions } from "@/lib/parsers/types";
import { ensureLocalDatabase } from "@/lib/sqlite/artifacts";
import { getColumns, getDatabase, getRowCount } from "@/lib/sqlite/database";
import { isProjectDataInitialized, parseStoreAndPersist } from "@/lib/sqlite/parser";
import { getParseConfig } from "@/lib/sqlite/schema";

// Validation schema for request body
const ParseRequestSchema = z.object({
  force: z.boolean().optional(), // Force re-parse even if data exists
  parseOptions: z
    .object({
      maxRows: z.number().optional(),
      inferTypes: z.boolean().optional(),
      delimiter: z.string().optional(),
      sheetName: z.string().optional(),
      sheetIndex: z.number().optional(),
      startRow: z.number().optional(),
      endRow: z.number().optional(),
      startColumn: z.number().optional(),
      endColumn: z.number().optional(),
      hasHeaders: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = params;
    const projectIdTyped = projectId as Id<"projects">;

    // Parse and validate request body
    const body = await request.json();
    const parsed = ParseRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { force, parseOptions } = parsed.data;
    const normalizedParseOptions =
      parseOptions?.sheetIndex !== undefined && parseOptions.sheetName === undefined
        ? { ...parseOptions, sheetName: `sheet:${parseOptions.sheetIndex}` }
        : parseOptions;

    // Check if parse config has changed (auto-force re-parse if so)
    let shouldForce = force || false;
    if (normalizedParseOptions && (await isProjectDataInitialized(projectIdTyped))) {
      try {
        await ensureLocalDatabase(projectIdTyped);
        const db = getDatabase(projectId);
        const currentConfig = getParseConfig(db);
        const parseConfigKeys: Array<keyof typeof normalizedParseOptions> = [
          "sheetName",
          "sheetIndex",
          "startRow",
          "endRow",
          "startColumn",
          "endColumn",
          "hasHeaders",
          "delimiter",
        ];
        shouldForce = parseConfigKeys.some((key) => {
          const currentValue = currentConfig?.[key as keyof typeof currentConfig];
          const nextValue = normalizedParseOptions[key];
          return currentValue !== nextValue;
        });
      } catch (error) {
        // If we can't read config, proceed normally
        console.warn("Could not check sheet change:", error);
      }
    }

    // Check if already initialized (unless force=true or sheet changed)
    if (!shouldForce && (await isProjectDataInitialized(projectIdTyped))) {
      await ensureLocalDatabase(projectIdTyped);
      return NextResponse.json(
        {
          success: true,
          message: "Project data already initialized",
          alreadyInitialized: true,
        },
        { status: 200 },
      );
    }

    // Get project metadata from Convex
    const project = await getProject(projectIdTyped);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get upload metadata
    const upload = await getUpload(project.uploadId);

    if (!upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    // Download file from Convex Storage
    const fileBuffer = await downloadFileFromConvex(upload.convexStorageId);

    // Merge parse options (request options override upload options)
    const finalParseOptions: ParseOptions = {
      ...upload.parseConfig,
      ...normalizedParseOptions,
    };

    // Parse and store in SQLite
    const startTime = Date.now();
    await parseStoreAndPersist(
      projectIdTyped,
      project.uploadId,
      fileBuffer,
      upload.originalName,
      upload.mimeType,
      finalParseOptions,
    );
    const duration = Date.now() - startTime;

    await ensureLocalDatabase(projectIdTyped);
    const db = getDatabase(projectId);
    const columns = getColumns(db);
    const rowCount = getRowCount(db);

    return NextResponse.json({
      success: true,
      rowCount,
      columnCount: columns.length,
      columns,
      parseTimeMs: duration,
    });
  } catch (error) {
    console.error("Parse error:", error);

    return NextResponse.json(
      {
        error: "Failed to parse file",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check parse status
export async function GET(_request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = params;
    const projectIdTyped = projectId as Id<"projects">;

    const initialized = await isProjectDataInitialized(projectIdTyped);
    if (initialized) {
      await ensureLocalDatabase(projectIdTyped);
    }

    return NextResponse.json({
      initialized,
    });
  } catch (error) {
    console.error("Status check error:", error);

    return NextResponse.json(
      {
        error: "Failed to check status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
