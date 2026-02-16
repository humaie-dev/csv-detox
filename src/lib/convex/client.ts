/**
 * Server-side Convex client for API routes
 * This allows API routes to fetch data from Convex
 */

import { api } from "@convex/api";
import type { Id } from "@convex/dataModel";
import { ConvexHttpClient } from "convex/browser";

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is required");
  }
  return url;
}

// Create singleton client
let convexClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    const url = getConvexUrl();
    convexClient = new ConvexHttpClient(url);
  }
  return convexClient;
}

/**
 * Download a file from Convex Storage
 */
export async function downloadFileFromConvex(storageId: Id<"_storage">): Promise<ArrayBuffer> {
  const client = getConvexClient();

  // Get the file URL
  const url = await client.query(api.uploads.getFileUrl, { storageId });

  if (!url) {
    throw new Error("File not found in storage");
  }

  // Download the file
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  return response.arrayBuffer();
}

/**
 * Store a file in Convex Storage
 */
export async function storeFileInConvex(
  fileBuffer: ArrayBuffer,
  contentType: string,
  _sha256?: string,
): Promise<Id<"_storage">> {
  const client = getConvexClient();

  const uploadUrl = await client.mutation(api.uploads.generateUploadUrl, {});
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`);
  }

  const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

/**
 * Get upload metadata
 */
export async function getUpload(uploadId: Id<"uploads">) {
  const client = getConvexClient();
  return client.query(api.uploads.getUpload, { uploadId });
}

/**
 * Get project metadata
 */
export async function getProject(projectId: Id<"projects">) {
  const client = getConvexClient();
  return client.query(api.projects.get, { id: projectId });
}
