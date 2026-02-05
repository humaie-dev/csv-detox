/**
 * Convex actions for parsing uploaded files
 */

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { parseCSV } from "@/lib/parsers/csv";
import { parseExcel, listSheets as listSheetsUtil } from "@/lib/parsers/excel";
import { ParseError } from "@/lib/parsers/types";
import type { ParseResult, ParseOptions } from "@/lib/parsers/types";
import { validateCast as validateCastFn } from "@/lib/pipeline/casting/validate";

/**
 * Parse a CSV or Excel file from Convex storage using uploadId
 */
export const parseFile = action({
  args: {
    uploadId: v.id("uploads"),
  },
  handler: async (ctx, args): Promise<ParseResult> => {
    try {
      // Fetch upload record to get storage ID, file type, and parse config
      const upload = await ctx.runQuery(internal.uploads.getUploadInternal, {
        uploadId: args.uploadId,
      });

      if (!upload) {
        throw new ParseError("Upload not found", "FILE_NOT_FOUND");
      }

      // Hard guard: avoid reading very large files into Convex memory (64MB limit)
      // We set a conservative cap to prevent OOM before parsing begins.
      const MAX_PREVIEW_BYTES = 25 * 1024 * 1024; // 25MB
      if (upload.size !== undefined && upload.size > MAX_PREVIEW_BYTES) {
        const mb = (upload.size / (1024 * 1024)).toFixed(1);
        throw new ParseError(
          `File too large for server preview (${mb} MB > 25 MB). Use Export to process client-side or reduce preview range.`,
          "FILE_TOO_LARGE"
        );
      }

      // Fetch file from storage
      const file = await ctx.storage.get(upload.convexStorageId);
      if (!file) {
        throw new ParseError("File not found in storage", "FILE_NOT_FOUND");
      }

      // Read file content as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Build parse options from upload's parseConfig
      // IMPORTANT: Limit to 5000 rows for preview to prevent OOM in Convex (64MB limit)
      // Users can export full data via pipeline execution which uses streaming
      const options: ParseOptions = {
        inferTypes: true, // Always infer types
        maxRows: 5000, // Limit for memory efficiency in Convex
      };

      // Apply parseConfig if it exists
      if (upload.parseConfig) {
        if (upload.parseConfig.sheetName !== undefined) {
          options.sheetName = upload.parseConfig.sheetName;
        }
        if (upload.parseConfig.sheetIndex !== undefined) {
          options.sheetIndex = upload.parseConfig.sheetIndex;
        }
        if (upload.parseConfig.startRow !== undefined) {
          options.startRow = upload.parseConfig.startRow;
        }
        if (upload.parseConfig.endRow !== undefined) {
          options.endRow = upload.parseConfig.endRow;
          
          // Cap the row range to 5000 rows max to prevent OOM
          if (upload.parseConfig.startRow !== undefined) {
            const requestedRows = upload.parseConfig.endRow - upload.parseConfig.startRow + 1;
            if (requestedRows > 5000) {
              options.endRow = upload.parseConfig.startRow + 5000 - 1;
              // Add warning to result later
            }
          }
        }
        if (upload.parseConfig.startColumn !== undefined) {
          options.startColumn = upload.parseConfig.startColumn;
        }
        if (upload.parseConfig.endColumn !== undefined) {
          options.endColumn = upload.parseConfig.endColumn;
        }
        options.hasHeaders = upload.parseConfig.hasHeaders;
      } else {
        // Default: hasHeaders = true if no parseConfig
        options.hasHeaders = true;
      }

      // Parse based on file type
      let result: ParseResult;
      if (upload.mimeType === "text/csv" || upload.mimeType === "text/plain") {
        // Convert ArrayBuffer to string for CSV
        const decoder = new TextDecoder("utf-8");
        const content = decoder.decode(arrayBuffer);
        result = parseCSV(content, options);
      } else if (
        upload.mimeType ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        upload.mimeType === "application/vnd.ms-excel"
      ) {
        result = parseExcel(arrayBuffer, options);
      } else {
        throw new ParseError(
          `Unsupported file type: ${upload.mimeType}`,
          "UNSUPPORTED_TYPE"
        );
      }

      // Add warning if we capped the preview to 5000 rows
      if (result.rowCount === 5000) {
        result.warnings.push(
          "Preview limited to 5000 rows due to memory constraints. Full data available in pipeline execution and export."
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }
      throw new ParseError(
        `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`,
        "PARSE_ERROR",
        error
      );
    }
  },
});

/**
 * Internal action for parsing (avoids circular reference)
 * This version is kept for backward compatibility and pipeline execution
 */
export const parseFileInternal = internalAction({
  args: {
    storageId: v.id("_storage"),
    fileType: v.string(),
    options: v.optional(
      v.object({
        maxRows: v.optional(v.number()),
        inferTypes: v.optional(v.boolean()),
        delimiter: v.optional(v.string()),
        sheetName: v.optional(v.string()),
        sheetIndex: v.optional(v.number()),
        startRow: v.optional(v.number()),
        endRow: v.optional(v.number()),
        startColumn: v.optional(v.number()),
        endColumn: v.optional(v.number()),
        hasHeaders: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args): Promise<ParseResult> => {
    try {
      // Fetch file from storage
      const file = await ctx.storage.get(args.storageId);
      if (!file) {
        throw new ParseError("File not found in storage", "FILE_NOT_FOUND");
      }

      // Read file content as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Parse options (with defaults)
      const options: ParseOptions = {
        inferTypes: args.options?.inferTypes !== false,
        maxRows: args.options?.maxRows,
        delimiter: args.options?.delimiter,
        sheetName: args.options?.sheetName,
        sheetIndex: args.options?.sheetIndex,
        startRow: args.options?.startRow,
        endRow: args.options?.endRow,
        startColumn: args.options?.startColumn,
        endColumn: args.options?.endColumn,
        hasHeaders: args.options?.hasHeaders !== false, // default true
      };

      // Parse based on file type
      let result: ParseResult;
      if (args.fileType === "text/csv" || args.fileType === "text/plain") {
        // Convert ArrayBuffer to string for CSV
        const decoder = new TextDecoder("utf-8");
        const content = decoder.decode(arrayBuffer);
        result = parseCSV(content, options);
      } else if (
        args.fileType ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        args.fileType === "application/vnd.ms-excel"
      ) {
        result = parseExcel(arrayBuffer, options);
      } else {
        throw new ParseError(
          `Unsupported file type: ${args.fileType}`,
          "UNSUPPORTED_TYPE"
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }
      throw new ParseError(
        `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`,
        "PARSE_ERROR",
        error
      );
    }
  },
});

/**
 * List all sheet names in an Excel workbook
 */
export const listSheets = action({
  args: {
    uploadId: v.id("uploads"),
  },
  handler: async (ctx, args): Promise<string[]> => {
    try {
      // Fetch upload record to get storage ID
      const upload = await ctx.runQuery(internal.uploads.getUploadInternal, {
        uploadId: args.uploadId,
      });

      if (!upload) {
        throw new Error("Upload not found");
      }

      // Only works for Excel files
      if (
        upload.mimeType !==
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
        upload.mimeType !== "application/vnd.ms-excel"
      ) {
        throw new Error("Not an Excel file");
      }

      // Guard against loading very large files into Convex memory
      const MAX_PREVIEW_BYTES = 25 * 1024 * 1024; // 25MB
      if (upload.size !== undefined && upload.size > MAX_PREVIEW_BYTES) {
        const mb = (upload.size / (1024 * 1024)).toFixed(1);
        throw new Error(
          `File too large to list sheets on server (${mb} MB > 25 MB). Reduce file size or list after client-side download during Export.`
        );
      }

      // Fetch file from storage
      const file = await ctx.storage.get(upload.convexStorageId);
      if (!file) {
        throw new Error("File not found in storage");
      }

      // Read file content as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // List sheets using the Excel parser utility
      const sheets = listSheetsUtil(arrayBuffer);

      return sheets;
    } catch (error) {
      throw new Error(
        `Failed to list sheets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

/**
 * Validate that a column can be cast to a target type
 * Returns statistics about cast success/failure and sample errors
 * 
 * NOTE: This uses a memory-efficient approach by only parsing the first 500 rows
 * to prevent OOM errors on large files in Convex's 64MB memory limit.
 */
export const validateCast = action({
  args: {
    uploadId: v.id("uploads"),
    column: v.string(),
    targetType: v.union(
      v.literal("string"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("date")
    ),
    format: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Fetch upload record to get storage ID and file type
      const upload = await ctx.runQuery(internal.uploads.getUploadInternal, {
        uploadId: args.uploadId,
      });

      if (!upload) {
        throw new Error("Upload not found");
      }

      // Guard against loading very large files into Convex memory for validation
      const MAX_VALIDATION_BYTES = 25 * 1024 * 1024; // 25MB
      if (upload.size !== undefined && upload.size > MAX_VALIDATION_BYTES) {
        const mb = (upload.size / (1024 * 1024)).toFixed(1);
        throw new Error(
          `File too large for server-side validation (${mb} MB > 25 MB). Export handles large files client-side; reduce file size or narrow the range.`
        );
      }

      // Build parse options from upload's parseConfig
      // Use VERY conservative limits to prevent OOM in Convex (64MB limit)
      const parseOptions: any = {
        inferTypes: false, // Skip type inference to save memory
        maxRows: 500, // Hard limit - only parse 500 rows for validation
      };

      if (upload.parseConfig) {
        if (upload.parseConfig.sheetName) parseOptions.sheetName = upload.parseConfig.sheetName;
        if (upload.parseConfig.sheetIndex !== undefined) parseOptions.sheetIndex = upload.parseConfig.sheetIndex;
        
        // Apply startRow but ensure we don't parse more than 500 rows total
        if (upload.parseConfig.startRow) {
          parseOptions.startRow = upload.parseConfig.startRow;
          // If endRow is set, cap it to startRow + 500
          if (upload.parseConfig.endRow !== undefined) {
            const maxEndRow = upload.parseConfig.startRow + 500;
            parseOptions.endRow = Math.min(upload.parseConfig.endRow, maxEndRow);
          }
        }
        
        if (upload.parseConfig.startColumn) parseOptions.startColumn = upload.parseConfig.startColumn;
        if (upload.parseConfig.endColumn) parseOptions.endColumn = upload.parseConfig.endColumn;
        parseOptions.hasHeaders = upload.parseConfig.hasHeaders;
      } else {
        parseOptions.hasHeaders = true;
      }

      // Parse file using internal action with strict memory limits
      const parseResult = await ctx.runAction(internal.parsers.parseFileInternal, {
        storageId: upload.convexStorageId,
        fileType: upload.mimeType,
        options: parseOptions,
      });

      // Check if column exists
      if (!parseResult.rows[0] || !(args.column in parseResult.rows[0])) {
        throw new Error(`Column "${args.column}" not found in the data`);
      }

      // Extract column values
      const columnValues = parseResult.rows.map((row) => row[args.column]);

      // Validate cast with the sampled data
      const result = validateCastFn(
        columnValues,
        args.targetType,
        args.format,
        5, // maxSamples
        500 // maxRows (matches parse limit)
      );

      return result;
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }
      throw new Error(
        `Failed to validate cast: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});
