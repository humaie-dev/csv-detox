import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  sanitizeFilename,
  validateFileType,
  validateFileSize,
  getMaxFileSize,
} from "../src/lib/validation.js";

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
