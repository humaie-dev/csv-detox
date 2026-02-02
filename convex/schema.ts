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
  }).index("by_uploadedAt", ["uploadedAt"]),
});
