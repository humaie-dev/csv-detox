/**
 * Convex actions for parsing uploaded files
 */

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { parseCSV } from "@/lib/parsers/csv";
import { parseExcel } from "@/lib/parsers/excel";
import { ParseError } from "@/lib/parsers/types";
import type { ParseResult, ParseOptions } from "@/lib/parsers/types";

/**
 * Parse a CSV or Excel file from Convex storage
 */
export const parseFile = action({
  args: {
    storageId: v.id("_storage"),
    fileType: v.string(),
    options: v.optional(
      v.object({
        maxRows: v.optional(v.number()),
        inferTypes: v.optional(v.boolean()),
        delimiter: v.optional(v.string()),
        sheet: v.optional(v.union(v.string(), v.number())),
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

      // Parse options
      const options: ParseOptions = args.options || {};

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
 * Internal action for parsing (avoids circular reference)
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
        sheet: v.optional(v.union(v.string(), v.number())),
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

      // Parse options
      const options: ParseOptions = args.options || {};

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
