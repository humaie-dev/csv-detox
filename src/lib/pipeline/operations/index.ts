/**
 * Transformation operations registry
 */

import type { OperationFn, TransformationType } from "../types";
import { trim } from "./trim";
import { uppercase } from "./uppercase";
import { lowercase } from "./lowercase";
import { deduplicate } from "./deduplicate";
import { filter } from "./filter";
import { renameColumn } from "./rename-column";
import { removeColumn } from "./remove-column";

/**
 * Registry of all available operations
 */
export const operations: Record<TransformationType, OperationFn> = {
  trim,
  uppercase,
  lowercase,
  deduplicate,
  filter,
  rename_column: renameColumn,
  remove_column: removeColumn,
};

/**
 * Get operation function by type
 */
export function getOperation(type: TransformationType): OperationFn {
  const operation = operations[type];
  if (!operation) {
    throw new Error(`Unknown operation type: ${type}`);
  }
  return operation;
}

// Re-export all operations
export { trim, uppercase, lowercase, deduplicate, filter, renameColumn, removeColumn };
