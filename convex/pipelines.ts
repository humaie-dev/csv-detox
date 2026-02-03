/**
 * Convex functions for pipeline management
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * List all pipelines globally (sorted by creation date, newest first)
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const pipelines = await ctx.db
      .query("pipelines")
      .withIndex("by_created")
      .order("desc")
      .collect();

    return pipelines;
  },
});

/**
 * Get a single pipeline by ID
 */
export const get = query({
  args: { id: v.id("pipelines") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List all pipelines for a given upload
 */
export const list = query({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    const pipelines = await ctx.db
      .query("pipelines")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();

    return pipelines.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Create a new pipeline
 */
export const create = mutation({
  args: {
    uploadId: v.id("uploads"),
    name: v.string(),
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        config: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Validate name
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Pipeline name is required");
    }
    if (trimmedName.length > 50) {
      throw new Error("Pipeline name must be 50 characters or less");
    }

    // Check for duplicate name within this upload
    const existing = await ctx.db
      .query("pipelines")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();

    if (existing.some((p) => p.name === trimmedName)) {
      throw new Error(`Pipeline "${trimmedName}" already exists for this file`);
    }

    const now = Date.now();
    const pipelineId = await ctx.db.insert("pipelines", {
      name: trimmedName,
      uploadId: args.uploadId,
      steps: args.steps,
      createdAt: now,
      updatedAt: now,
    });

    return pipelineId;
  },
});

/**
 * Delete a pipeline
 */
export const remove = mutation({
  args: { id: v.id("pipelines") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Update a pipeline (change steps, not name)
 */
export const update = mutation({
  args: {
    id: v.id("pipelines"),
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        config: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      steps: args.steps,
      updatedAt: Date.now(),
    });
  },
});
