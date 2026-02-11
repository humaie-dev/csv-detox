/**
 * Convex functions for project management
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * List all projects globally (sorted by creation date, newest first)
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_created")
      .order("desc")
      .collect();

    // Enrich with upload information
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const upload = await ctx.db.get(project.uploadId);
        return {
          ...project,
          upload: upload
            ? {
                originalName: upload.originalName,
                size: upload.size,
                mimeType: upload.mimeType,
              }
            : null,
        };
      })
    );

    return enrichedProjects;
  },
});

/**
 * Get a single project by ID with upload details
 */
export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) {
      return null;
    }

    const upload = await ctx.db.get(project.uploadId);

    return {
      ...project,
      upload: upload
        ? {
            _id: upload._id,
            originalName: upload.originalName,
            sanitizedName: upload.sanitizedName,
            size: upload.size,
            mimeType: upload.mimeType,
            convexStorageId: upload.convexStorageId,
            parseConfig: upload.parseConfig,
          }
        : null,
    };
  },
});

/**
 * Create a new project
 */
export const create = mutation({
  args: {
    name: v.string(),
    uploadId: v.id("uploads"),
  },
  handler: async (ctx, args) => {
    // Validate name
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Project name is required");
    }
    if (trimmedName.length > 100) {
      throw new Error("Project name must be 100 characters or less");
    }

    // Verify upload exists
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) {
      throw new Error(`Upload ${args.uploadId} not found`);
    }

    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      name: trimmedName,
      uploadId: args.uploadId,
      createdAt: now,
      updatedAt: now,
    });

    return projectId;
  },
});

/**
 * Update project name
 */
export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate name
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Project name is required");
    }
    if (trimmedName.length > 100) {
      throw new Error("Project name must be 100 characters or less");
    }

    // Verify project exists
    const project = await ctx.db.get(args.id);
    if (!project) {
      throw new Error(`Project ${args.id} not found`);
    }

    await ctx.db.patch(args.id, {
      name: trimmedName,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a project (cascading delete all pipelines)
 */
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    // Verify project exists
    const project = await ctx.db.get(args.id);
    if (!project) {
      throw new Error(`Project ${args.id} not found`);
    }

    // Find and delete all pipelines for this project
    const pipelines = await ctx.db
      .query("pipelines")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    for (const pipeline of pipelines) {
      await ctx.db.delete(pipeline._id);
    }

    // Delete the project
    await ctx.db.delete(args.id);

    return { success: true, pipelinesDeleted: pipelines.length };
  },
});

/**
 * Get pipeline count for a project
 */
export const getPipelineCount = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const pipelines = await ctx.db
      .query("pipelines")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return pipelines.length;
  },
});
