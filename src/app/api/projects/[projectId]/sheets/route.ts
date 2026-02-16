import type { Id } from "@convex/dataModel";
import { type NextRequest, NextResponse } from "next/server";
import { downloadFileFromConvex, getProject, getUpload } from "@/lib/convex/client";
import { listSheets } from "@/lib/parsers/excel";

export async function GET(_request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = params;

    // Get project metadata from Convex
    const project = await getProject(projectId as Id<"projects">);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get upload metadata
    const upload = await getUpload(project.uploadId);

    if (!upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    // Check if it's an Excel file
    const isExcel =
      upload.mimeType.includes("spreadsheet") || upload.originalName.match(/\.(xlsx?|xls)$/i);

    if (!isExcel) {
      return NextResponse.json({ error: "File is not an Excel file" }, { status: 400 });
    }

    // Download file from Convex Storage
    const fileBuffer = await downloadFileFromConvex(upload.convexStorageId);

    // Get sheet names
    const sheets = listSheets(fileBuffer);

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
