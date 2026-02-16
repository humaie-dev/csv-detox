import { z } from "zod";
import { TRANSFORMATION_TYPES } from "./types";

// Tool-facing schemas for assistant pipeline step validation.
// Keep these aligned with src/lib/pipeline/types.ts.

export const transformationTypeSchema = z.enum(TRANSFORMATION_TYPES);

const trimConfigSchema = z.object({
  type: z.literal("trim"),
  columns: z.array(z.string()).min(1),
});

const uppercaseConfigSchema = z.object({
  type: z.literal("uppercase"),
  columns: z.array(z.string()).min(1),
});

const lowercaseConfigSchema = z.object({
  type: z.literal("lowercase"),
  columns: z.array(z.string()).min(1),
});

const deduplicateConfigSchema = z.object({
  type: z.literal("deduplicate"),
  columns: z.array(z.string()).min(1).optional(),
});

const filterConfigSchema = z.object({
  type: z.literal("filter"),
  column: z.string(),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "greater_than",
    "less_than",
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const renameColumnConfigSchema = z.object({
  type: z.literal("rename_column"),
  oldName: z.string(),
  newName: z.string(),
});

const removeColumnConfigSchema = z.object({
  type: z.literal("remove_column"),
  columns: z.array(z.string()).min(1),
});

const unpivotConfigSchema = z.object({
  type: z.literal("unpivot"),
  idColumns: z.array(z.string()).min(1),
  valueColumns: z.array(z.string()).min(1),
  variableColumnName: z.string(),
  valueColumnName: z.string(),
});

const pivotConfigSchema = z.object({
  type: z.literal("pivot"),
  indexColumns: z.array(z.string()).min(1),
  columnSource: z.string(),
  valueSource: z.string(),
  aggregation: z.enum(["first", "last", "sum", "mean", "count"]).optional(),
});

const splitColumnConfigSchema = z.object({
  type: z.literal("split_column"),
  column: z.string(),
  method: z.enum(["delimiter", "position", "regex"]),
  delimiter: z.string().optional(),
  positions: z.array(z.number().int()).min(1).optional(),
  pattern: z.string().optional(),
  newColumns: z.array(z.string()).min(1),
  trim: z.boolean().optional(),
  keepOriginal: z.boolean().optional(),
  maxSplits: z.number().int().positive().optional(),
});

const mergeColumnsConfigSchema = z.object({
  type: z.literal("merge_columns"),
  columns: z.array(z.string()).min(1),
  separator: z.string(),
  newColumn: z.string(),
  skipNull: z.boolean().optional(),
  keepOriginal: z.boolean().optional(),
});

const castColumnConfigSchema = z.object({
  type: z.literal("cast_column"),
  column: z.string(),
  targetType: z.enum(["string", "number", "boolean", "date"]),
  onError: z.enum(["fail", "null", "skip"]),
  format: z.string().optional(),
});

const fillDownConfigSchema = z.object({
  type: z.literal("fill_down"),
  columns: z.array(z.string()).min(1),
  treatWhitespaceAsEmpty: z.boolean().optional(),
});

const fillAcrossConfigSchema = z.object({
  type: z.literal("fill_across"),
  columns: z.array(z.string()).min(1),
  treatWhitespaceAsEmpty: z.boolean().optional(),
});

const sortConfigSchema = z.object({
  type: z.literal("sort"),
  columns: z
    .array(
      z.object({
        name: z.string(),
        direction: z.enum(["asc", "desc"]),
      }),
    )
    .min(1),
  nullsPosition: z.enum(["first", "last"]).optional(),
});

export const transformationConfigSchema = z.discriminatedUnion("type", [
  trimConfigSchema,
  uppercaseConfigSchema,
  lowercaseConfigSchema,
  deduplicateConfigSchema,
  filterConfigSchema,
  renameColumnConfigSchema,
  removeColumnConfigSchema,
  unpivotConfigSchema,
  pivotConfigSchema,
  splitColumnConfigSchema,
  mergeColumnsConfigSchema,
  castColumnConfigSchema,
  fillDownConfigSchema,
  fillAcrossConfigSchema,
  sortConfigSchema,
]);

export const transformationStepSchema = z
  .object({
    id: z.string(),
    type: transformationTypeSchema,
    config: transformationConfigSchema,
  })
  .superRefine((step, ctx) => {
    if (step.type !== step.config.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Step type "${step.type}" must match config.type "${step.config.type}"`,
        path: ["type"],
      });
    }
  });

export const transformationStepsSchema = z.array(transformationStepSchema);
