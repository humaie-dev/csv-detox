/**
 * Server-side Convex client for API routes
 * This allows API routes to fetch data from Convex
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// Get Convex URL from environment
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is required");
}

// Create singleton client
let convexClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    if (!CONVEX_URL) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not defined");
    }
    convexClient = new ConvexHttpClient(CONVEX_URL);
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
