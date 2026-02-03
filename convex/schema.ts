import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
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
      })
    ),
  }).index("by_uploadedAt", ["uploadedAt"]),

  pipelines: defineTable({
    name: v.string(),
    uploadId: v.id("uploads"), // Required - pipeline needs a file
    sheetName: v.optional(v.string()),
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        config: v.any(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_upload", ["uploadId"])
    .index("by_created", ["createdAt"]),
});
