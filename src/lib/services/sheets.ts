import type { Id } from "@convex/dataModel";
import { downloadFileFromConvex, getUpload } from "@/lib/convex/client";
import { listSheets as listSheetsParser } from "@/lib/parsers/excel";

export async function listUploadSheets(uploadId: Id<"uploads">) {
  let uploadInfo: {
    originalName?: string;
    mimeType?: string;
    size?: number;
  } | null = null;

  try {
    const upload = await getUpload(uploadId);
    if (!upload) {
      throw new Error("Upload not found");
    }
    uploadInfo = {
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      size: upload.size,
    };

    const isExcel =
      upload.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      upload.mimeType === "application/vnd.ms-excel" ||
      Boolean(upload.originalName?.match(/\.(xlsx?|xls)$/i));

    if (!isExcel) {
      throw new Error("Not an Excel file");
    }

    const fileBuffer = await downloadFileFromConvex(upload.convexStorageId);
    return listSheetsParser(fileBuffer);
  } catch (error) {
    console.error("Error listing sheets for upload:", {
      uploadId,
      uploadInfo,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
