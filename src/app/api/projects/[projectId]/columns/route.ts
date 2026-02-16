import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { type NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex/client";
import { ensureLocalDatabase } from "@/lib/sqlite/artifacts";
import { getColumns, getDatabase } from "@/lib/sqlite/database";
import { isProjectDataInitialized } from "@/lib/sqlite/parser";

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

    // Get columns
    const columns = getColumns(db);

    return NextResponse.json({ columns });
  } catch (error) {
    console.error("Error fetching project columns:", error);
    return NextResponse.json({ error: "Failed to fetch project columns" }, { status: 500 });
  }
}
