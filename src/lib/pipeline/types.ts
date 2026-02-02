/**
 * Type definitions for transformation pipeline
 */

import type { ParseResult } from "@/lib/parsers/types";

// Re-export ParseResult for convenience
export type { ParseResult };

/**
 * Transformation operation types
 */
export type TransformationType =
  | "trim"
  | "uppercase"
  | "lowercase"
  | "deduplicate"
  | "filter"
  | "rename_column"
  | "remove_column";

/**
 * Base transformation step
 */
export interface TransformationStep {
  id: string;
  type: TransformationType;
  config: TransformationConfig;
}

/**
 * Configuration for transformation operations
 */
export type TransformationConfig =
  | TrimConfig
  | UppercaseConfig
  | LowercaseConfig
  | DeduplicateConfig
  | FilterConfig
  | RenameColumnConfig
  | RemoveColumnConfig;

export interface TrimConfig {
  type: "trim";
  columns: string[];
}

export interface UppercaseConfig {
  type: "uppercase";
  columns: string[];
}

export interface LowercaseConfig {
  type: "lowercase";
  columns: string[];
}

export interface DeduplicateConfig {
  type: "deduplicate";
  columns?: string[]; // If specified, deduplicate based on these columns only
}

export interface FilterConfig {
  type: "filter";
  column: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than";
  value: string | number | boolean;
}

export interface RenameColumnConfig {
  type: "rename_column";
  oldName: string;
  newName: string;
}

export interface RemoveColumnConfig {
  type: "remove_column";
  columns: string[];
}

/**
 * Result of executing a single transformation step
 */
export interface StepResult {
  stepId: string;
  success: boolean;
  rowsAffected?: number;
  error?: string;
}

/**
 * Result of executing a pipeline
 */
export interface ExecutionResult {
  table: ParseResult;
  stepResults: StepResult[];
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  uploadId: string;
  sheetName?: string;
  steps: TransformationStep[];
}

/**
 * Operation function signature
 * Uses 'any' for config to allow different config types per operation
 */
export type OperationFn = (
  table: ParseResult,
  config: any
) => ParseResult;

/**
 * Error thrown during transformation
 */
export class TransformationError extends Error {
  constructor(
    message: string,
    public readonly stepId: string,
    public readonly operation: TransformationType,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "TransformationError";
  }
}
