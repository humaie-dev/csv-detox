import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  sanitizeFilename,
  validateFileType,
  validateFileSize,
  getMaxFileSize,
} from "../src/lib/validation.js";
import { start } from "node:repl";

/**
 * Upload a file and store its metadata in the database.
 */
export const uploadFile = mutation({
  args: {
    storageId: v.id("_storage"),
    originalName: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate file size
    if (!validateFileSize(args.size)) {
      throw new Error(`File size must be between 1 byte and ${getMaxFileSize() / (1024 * 1024)}MB`);
    }

    // Validate file type
    if (!validateFileType(args.originalName, args.mimeType)) {
      throw new Error("Invalid file type. Only CSV and XLSX files are allowed");
    }

    // Sanitize filename
    const sanitizedName = sanitizeFilename(args.originalName);

    // Store metadata in database
    const uploadId = await ctx.db.insert("uploads", {
      originalName: args.originalName,
      sanitizedName,
      size: args.size,
      mimeType: args.mimeType,
      convexStorageId: args.storageId,
      uploadedAt: new Date().toISOString(),
    });

    // Return the upload record
    const upload = await ctx.db.get(uploadId);
    
    return {
      fileId: uploadId,
      originalName: upload!.originalName,
      sanitizedName: upload!.sanitizedName,
      size: upload!.size,
      mimeType: upload!.mimeType,
      uploadedAt: upload!.uploadedAt,
    };
  },
});

/**
 * Generate a URL for uploading a file to Convex storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get an upload by ID
 */
export const getUpload = query({
  args: {
    uploadId: v.id("uploads"),
  },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    return upload;
  },
});

/**
 * Get a public URL for a file in storage
 */
export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});

/**
 * Internal query to get upload (avoids circular reference)
 */
export const getUploadInternal = internalQuery({
  args: {
    uploadId: v.id("uploads"),
  },
  handler: async (ctx, args) => {
    const upload = await ctx.db.get(args.uploadId);
    return upload;
  },
});

/**
 * Update parse configuration for an upload
 */
export const updateParseConfig = mutation({
  args: {
    uploadId: v.id("uploads"),
    parseConfig: v.object({
      sheetName: v.optional(v.string()),
      sheetIndex: v.optional(v.number()),
      startRow: v.nullable(v.number()),
      endRow: v.nullable(v.number()),
      startColumn: v.nullable(v.number()),
      endColumn: v.nullable(v.number()),
      hasHeaders: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    // Validate that the upload exists
    const upload = await ctx.db.get(args.uploadId);
    if (!upload) {
      throw new Error(`Upload ${args.uploadId} not found`);
    }

    // Validate range values if provided
    if (args.parseConfig.startRow !== null && args.parseConfig.startRow !== undefined && args.parseConfig.startRow < 1) {
      throw new Error("startRow must be >= 1");
    }
    if (args.parseConfig.endRow !== null && args.parseConfig.endRow !== undefined && args.parseConfig.startRow !== null && args.parseConfig.startRow !== undefined) {
      if (args.parseConfig.endRow < args.parseConfig.startRow) {
        throw new Error("endRow must be >= startRow");
      }
    }
    if (args.parseConfig.startColumn !== null && args.parseConfig.startColumn !== undefined && args.parseConfig.startColumn < 1) {
      throw new Error("startColumn must be >= 1");
    }
    if (args.parseConfig.endColumn !== null && args.parseConfig.endColumn !== undefined && args.parseConfig.startColumn !== null && args.parseConfig.startColumn !== undefined) {
      if (args.parseConfig.endColumn < args.parseConfig.startColumn) {
        throw new Error("endColumn must be >= startColumn");
      }
    }
    if (args.parseConfig.sheetIndex !== undefined && args.parseConfig.sheetIndex < 0) {
      throw new Error("sheetIndex must be >= 0");
    }

    // Update the upload with the new parse config
    await ctx.db.patch(args.uploadId, {
      parseConfig: {
        ...args.parseConfig,
        startRow: args.parseConfig.startRow ?? undefined,
        endRow: args.parseConfig.endRow ?? undefined,
        startColumn: args.parseConfig.startColumn ??undefined,
        endColumn: args.parseConfig.endColumn ?? undefined,
      },
    });

    return { success: true };
  },
});
