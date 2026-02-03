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
import { unpivot } from "./unpivot";
import { pivot } from "./pivot";
import { splitColumn } from "./split-column";
import { mergeColumns } from "./merge-columns";
import { castColumn } from "./cast-column";
import { fillDown } from "./fill-down";
import { fillAcross } from "./fill-across";
import { sort } from "./sort";

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
  unpivot,
  pivot,
  split_column: splitColumn,
  merge_columns: mergeColumns,
  cast_column: castColumn,
  fill_down: fillDown,
  fill_across: fillAcross,
  sort,
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
