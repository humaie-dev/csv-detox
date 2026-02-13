import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getConvexClient } from "@/lib/convex/client";
import { getColumns, getDatabase, getRawData, getRowCount } from "@/lib/sqlite/database";
import { isInitialized } from "@/lib/sqlite/schema";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Validate query parameters
    const validation = querySchema.safeParse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.errors },
        { status: 400 },
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

    // Get paginated data
    const rawData = getRawData(db, offset, limit);

    // Get columns
    const columns = getColumns(db);

    // Get total row count
    const totalRows = getRowCount(db);

    // Extract data from RawDataRow format
    const data = rawData.map((row) => row.data);

    return NextResponse.json({
      data,
      columns,
      pagination: {
        offset,
        limit,
        total: totalRows,
        hasMore: offset + limit < totalRows,
      },
    });
  } catch (error) {
    console.error("Error fetching project data:", error);
    return NextResponse.json({ error: "Failed to fetch project data" }, { status: 500 });
  }
}
