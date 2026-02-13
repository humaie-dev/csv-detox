import { type NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex/client";
import { getColumns, getDatabase } from "@/lib/sqlite/database";
import { isInitialized } from "@/lib/sqlite/schema";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
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

    // Get columns
    const columns = getColumns(db);

    return NextResponse.json({ columns });
  } catch (error) {
    console.error("Error fetching project columns:", error);
    return NextResponse.json({ error: "Failed to fetch project columns" }, { status: 500 });
  }
}
