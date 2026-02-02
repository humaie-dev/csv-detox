/**
 * Convex mutations, queries, and actions for pipeline management
 */

import { mutation, query, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { parseCSV } from "@/lib/parsers/csv";
import { parseExcel } from "@/lib/parsers/excel";
import { ParseError } from "@/lib/parsers/types";
import type { ParseResult, ParseOptions } from "@/lib/parsers/types";
import { executePipeline, executeUntilStep } from "@/lib/pipeline/executor";
import type { TransformationStep } from "@/lib/pipeline/types";

/**
 * Create a new pipeline
 */
export const createPipeline = mutation({
  args: {
    uploadId: v.id("uploads"),
    sheetName: v.optional(v.string()),
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        config: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const pipelineId = await ctx.db.insert("pipelines", {
      uploadId: args.uploadId,
      sheetName: args.sheetName,
      steps: args.steps,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return pipelineId;
  },
});

/**
 * Update an existing pipeline
 */
export const updatePipeline = mutation({
  args: {
    pipelineId: v.id("pipelines"),
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        config: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pipelineId, {
      steps: args.steps,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a pipeline
 */
export const deletePipeline = mutation({
  args: {
    pipelineId: v.id("pipelines"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.pipelineId);
    return { success: true };
  },
});

/**
 * Get a single pipeline by ID
 */
export const getPipeline = query({
  args: {
    pipelineId: v.id("pipelines"),
  },
  handler: async (ctx, args) => {
    const pipeline = await ctx.db.get(args.pipelineId);
    return pipeline;
  },
});

/**
 * Get all pipelines for an upload
 */
export const getPipelinesByUpload = query({
  args: {
    uploadId: v.id("uploads"),
  },
  handler: async (ctx, args) => {
    const pipelines = await ctx.db
      .query("pipelines")
      .withIndex("by_upload", (q) => q.eq("uploadId", args.uploadId))
      .collect();

    return pipelines;
  },
});

/**
 * Execute a pipeline and return the result
 */
export const executePipelineAction = action({
  args: {
    pipelineId: v.id("pipelines"),
    stopAtStep: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Dynamically import api to avoid circular reference at module level
    const { api } = await import("./_generated/api");
    
    const pipeline = await ctx.runQuery(api.pipelines.getPipeline, {
      pipelineId: args.pipelineId,
    });

    if (!pipeline) {
      throw new Error("Pipeline not found");
    }

    // Get upload metadata
    const uploads = await ctx.runQuery(api.pipelines.getUploadForPipeline, {
      uploadId: pipeline.uploadId,
    });

    if (!uploads) {
      throw new Error("Upload metadata not found");
    }

    // Fetch file from storage
    const file = await ctx.storage.get(uploads.convexStorageId);
    if (!file) {
      throw new Error("File not found in storage");
    }

    // Read file content as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Parse options
    const options: ParseOptions = {
      sheet: pipeline.sheetName,
    };

    // Parse based on file type
    let parseResult: ParseResult;
    if (uploads.mimeType === "text/csv" || uploads.mimeType === "text/plain") {
      // Convert ArrayBuffer to string for CSV
      const decoder = new TextDecoder("utf-8");
      const content = decoder.decode(arrayBuffer);
      parseResult = parseCSV(content, options);
    } else if (
      uploads.mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      uploads.mimeType === "application/vnd.ms-excel"
    ) {
      parseResult = parseExcel(arrayBuffer, options);
    } else {
      throw new ParseError(
        `Unsupported file type: ${uploads.mimeType}`,
        "UNSUPPORTED_TYPE"
      );
    }

    // Execute pipeline
    const steps = pipeline.steps as TransformationStep[];
    const executionResult =
      args.stopAtStep !== undefined
        ? executeUntilStep(parseResult, steps, args.stopAtStep)
        : executePipeline(parseResult, steps);

    return executionResult;
  },
});

/**
 * Helper query to get upload for pipeline
 */
export const getUploadForPipeline = query({
  args: {
    uploadId: v.id("uploads"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.uploadId);
  },
});
