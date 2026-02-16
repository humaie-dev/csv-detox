import type { Id } from "@convex/dataModel";
import { type NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/convex/client";
import { listUploadSheets } from "@/lib/services/sheets";

export async function GET(_request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = params;

    // Get project metadata from Convex
    const project = await getProject(projectId as Id<"projects">);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const sheets = await listUploadSheets(project.uploadId);

    return NextResponse.json({ sheets });
  } catch (error) {
    console.error("Error fetching sheet names:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch sheet names",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
