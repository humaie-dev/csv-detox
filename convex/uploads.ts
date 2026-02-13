import { v } from "convex/values";
import {
  getMaxFileSize,
  sanitizeFilename,
  validateFileSize,
  validateFileType,
} from "../src/lib/validation.js";
import { internalQuery, mutation, query } from "./_generated/server";

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
      originalName: upload?.originalName,
      sanitizedName: upload?.sanitizedName,
      size: upload?.size,
      mimeType: upload?.mimeType,
      uploadedAt: upload?.uploadedAt,
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
      startRow: v.optional(v.number()),
      endRow: v.optional(v.number()),
      startColumn: v.optional(v.number()),
      endColumn: v.optional(v.number()),
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
    if (args.parseConfig.startRow !== undefined && args.parseConfig.startRow < 1) {
      throw new Error("startRow must be >= 1");
    }
    if (args.parseConfig.endRow !== undefined && args.parseConfig.startRow !== undefined) {
      if (args.parseConfig.endRow < args.parseConfig.startRow) {
        throw new Error("endRow must be >= startRow");
      }
    }
    if (args.parseConfig.startColumn !== undefined && args.parseConfig.startColumn < 1) {
      throw new Error("startColumn must be >= 1");
    }
    if (args.parseConfig.endColumn !== undefined && args.parseConfig.startColumn !== undefined) {
      if (args.parseConfig.endColumn < args.parseConfig.startColumn) {
        throw new Error("endColumn must be >= startColumn");
      }
    }
    if (args.parseConfig.sheetIndex !== undefined && args.parseConfig.sheetIndex < 0) {
      throw new Error("sheetIndex must be >= 0");
    }

    // Update the upload with the new parse config
    await ctx.db.patch(args.uploadId, {
      parseConfig: args.parseConfig,
    });

    return { success: true };
  },
});
