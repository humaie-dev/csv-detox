/**
 * Transformation operations registry
 */

import type { OperationFn, TransformationConfig, TransformationType } from "../types";
import { castColumn } from "./cast-column";
import { deduplicate } from "./deduplicate";
import { fillAcross } from "./fill-across";
import { fillDown } from "./fill-down";
import { filter } from "./filter";
import { lowercase } from "./lowercase";
import { mergeColumns } from "./merge-columns";
import { pivot } from "./pivot";
import { removeColumn } from "./remove-column";
import { renameColumn } from "./rename-column";
import { sort } from "./sort";
import { splitColumn } from "./split-column";
import { trim } from "./trim";
import { unpivot } from "./unpivot";
import { uppercase } from "./uppercase";

/**
 * Registry of all available operations
 */
export const operations: Record<TransformationType, OperationFn<TransformationConfig>> = {
  trim,
  uppercase,
  lowercase,
  deduplicate,
  filter,
  rename_column: renameColumn,
  remove_column: removeColumn,
  unpivot,
  pivot,
  split_column: splitColumn,
  merge_columns: mergeColumns,
  cast_column: castColumn,
  fill_down: fillDown,
  fill_across: fillAcross,
  sort,
} as Record<TransformationType, OperationFn<TransformationConfig>>;

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
export {
  trim,
  uppercase,
  lowercase,
  deduplicate,
  filter,
  renameColumn,
  removeColumn,
  unpivot,
  pivot,
  splitColumn,
  mergeColumns,
  castColumn,
  fillDown,
  fillAcross,
  sort,
};
