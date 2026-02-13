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
 * List all pipelines for a given project
 */
export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const pipelines = await ctx.db
      .query("pipelines")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return pipelines.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Create a new pipeline
 */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        config: v.any(),
      }),
    ),
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

    // Check for duplicate name within this project
    const existing = await ctx.db
      .query("pipelines")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    if (existing.some((p) => p.name === trimmedName)) {
      throw new Error(`Pipeline "${trimmedName}" already exists for this project`);
    }

    const now = Date.now();
    const pipelineId = await ctx.db.insert("pipelines", {
      name: trimmedName,
      projectId: args.projectId,
      steps: args.steps,
      parseConfig: args.parseConfig,
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
 * Update a pipeline (change steps or parseConfig)
 */
export const update = mutation({
  args: {
    id: v.id("pipelines"),
    steps: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.string(),
          config: v.any(),
        }),
      ),
    ),
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
  },
  handler: async (ctx, args) => {
    const updateData: {
      steps?: typeof args.steps;
      parseConfig?: typeof args.parseConfig;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.steps !== undefined) {
      updateData.steps = args.steps;
    }

    if (args.parseConfig !== undefined) {
      updateData.parseConfig = args.parseConfig;
    }

    await ctx.db.patch(args.id, updateData);
  },
});
