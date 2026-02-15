import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getLatest = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const artifacts = await ctx.db
      .query("sqliteArtifacts")
      .withIndex("by_project_created", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    return artifacts[0] ?? null;
  },
});

export const upsert = mutation({
  args: {
    projectId: v.id("projects"),
    uploadId: v.id("uploads"),
    storageId: v.id("_storage"),
    artifactKey: v.string(),
    parseOptionsJson: v.string(),
    sha256: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sqliteArtifacts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const match = existing.find((artifact) => artifact.artifactKey === args.artifactKey);
    const now = Date.now();

    if (match) {
      await ctx.db.patch(match._id, {
        uploadId: args.uploadId,
        storageId: args.storageId,
        parseOptionsJson: args.parseOptionsJson,
        sha256: args.sha256,
        size: args.size,
        createdAt: now,
      });

      return { artifactId: match._id, updated: true };
    }

    const artifactId = await ctx.db.insert("sqliteArtifacts", {
      projectId: args.projectId,
      uploadId: args.uploadId,
      storageId: args.storageId,
      artifactKey: args.artifactKey,
      parseOptionsJson: args.parseOptionsJson,
      sha256: args.sha256,
      size: args.size,
      createdAt: now,
    });

    return { artifactId, updated: false };
  },
});
