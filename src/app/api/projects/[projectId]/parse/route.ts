/**
 * API Route: POST /api/projects/[projectId]/parse
 * Parse uploaded file and store in SQLite database
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProject, downloadFileFromConvex, getUpload } from "@/lib/convex/client";
import { parseAndStoreFile, isProjectDataInitialized } from "@/lib/sqlite/parser";
import { getDatabase } from "@/lib/sqlite/database";
import { getParseConfig } from "@/lib/sqlite/schema";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import type { ParseOptions } from "@/lib/parsers/types";

// Validation schema for request body
const ParseRequestSchema = z.object({
  force: z.boolean().optional(), // Force re-parse even if data exists
  parseOptions: z.object({
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
  }).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const params = await context.params;
    const projectId = params.projectId as Id<"projects">;

    // Parse and validate request body
    const body = await request.json();
    const parsed = ParseRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { force, parseOptions } = parsed.data;

    // Check if sheet has changed (auto-force re-parse if so)
    let shouldForce = force || false;
    if (parseOptions?.sheetName && isProjectDataInitialized(projectId)) {
      try {
        const db = getDatabase(projectId);
        const currentConfig = getParseConfig(db);
        if (currentConfig && currentConfig.sheetName !== parseOptions.sheetName) {
          shouldForce = true;
        }
      } catch (error) {
        // If we can't read config, proceed normally
        console.warn("Could not check sheet change:", error);
      }
    }

    // Check if already initialized (unless force=true or sheet changed)
    if (!shouldForce && isProjectDataInitialized(projectId)) {
      return NextResponse.json(
        {
          success: true,
          message: "Project data already initialized",
          alreadyInitialized: true,
        },
        { status: 200 }
      );
    }

    // Get project metadata from Convex
    const project = await getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get upload metadata
    const upload = await getUpload(project.uploadId);

    if (!upload) {
      return NextResponse.json(
        { error: "Upload not found" },
        { status: 404 }
      );
    }

    // Download file from Convex Storage
    const fileBuffer = await downloadFileFromConvex(upload.convexStorageId);

    // Merge parse options (request options override upload options)
    const finalParseOptions: ParseOptions = {
      ...upload.parseConfig,
      ...parseOptions,
    };

    // Parse and store in SQLite
    const startTime = Date.now();
    const result = await parseAndStoreFile(
      projectId,
      fileBuffer,
      upload.originalName,
      upload.mimeType,
      finalParseOptions
    );
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      rowCount: result.rowCount,
      columnCount: result.columns.length,
      columns: result.columns,
      parseTimeMs: duration,
    });
  } catch (error) {
    console.error("Parse error:", error);

    return NextResponse.json(
      {
        error: "Failed to parse file",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check parse status
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const params = await context.params;
    const projectId = params.projectId as Id<"projects">;

    const initialized = isProjectDataInitialized(projectId);

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
      { status: 500 }
    );
  }
}
