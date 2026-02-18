import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  uploads: defineTable({
    originalName: v.string(),
    sanitizedName: v.string(),
    size: v.number(),
    mimeType: v.string(),
    convexStorageId: v.id("_storage"),
    uploadedAt: v.string(),
    parseConfig: v.optional(
      v.object({
        sheetName: v.optional(v.string()),
        sheetIndex: v.optional(v.number()),
        startRow: v.optional(v.number()),
        endRow: v.optional(v.number()),
        startColumn: v.optional(v.number()),
        endColumn: v.optional(v.number()),
        hasHeaders: v.boolean(),
      }),
    ),
  }).index("by_uploadedAt", ["uploadedAt"]),

  projects: defineTable({
    name: v.string(), // User-defined project name
    uploadId: v.id("uploads"), // Single file reference
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_upload", ["uploadId"])
    .index("by_created", ["createdAt"]),

  pipelines: defineTable({
    name: v.string(),
    projectId: v.id("projects"), // Changed from uploadId - pipeline belongs to project
    parseConfig: v.optional(
      v.object({
        sheetName: v.optional(v.string()),
        sheetIndex: v.optional(v.number()),
        startRow: v.optional(v.number()),
        endRow: v.optional(v.number()),
        startColumn: v.optional(v.number()),
        endColumn: v.optional(v.number()),
        hasHeaders: v.boolean(),
      }),
    ), // Optional - overrides project/upload defaults
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        config: v.any(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_created", ["createdAt"]),

  sqliteArtifacts: defineTable({
    projectId: v.id("projects"),
    uploadId: v.id("uploads"),
    storageId: v.id("_storage"),
    artifactKey: v.string(),
    parseOptionsJson: v.string(),
    sha256: v.string(),
    size: v.number(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_created", ["projectId", "createdAt"]),
});
