/**
 * Pipeline execution engine
 */

import type { ParseResult } from "@/lib/parsers/types";
import type {
  TransformationStep,
  ExecutionResult,
  StepResult,
  TransformationError,
} from "./types";
import { getOperation } from "./operations";

/**
 * Execute a complete pipeline
 */
export function executePipeline(
  table: ParseResult,
  steps: TransformationStep[]
): ExecutionResult {
  let currentTable = table;
  const stepResults: StepResult[] = [];

  for (const step of steps) {
    try {
      const operation = getOperation(step.type);
      const previousRowCount = currentTable.rowCount;
      currentTable = operation(currentTable, step.config);
      const rowsAffected = Math.abs(currentTable.rowCount - previousRowCount);

      stepResults.push({
        stepId: step.id,
        success: true,
        rowsAffected,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      stepResults.push({
        stepId: step.id,
        success: false,
        error: errorMessage,
      });

      // Stop execution on error
      break;
    }
  }

  return {
    table: currentTable,
    stepResults,
  };
}

/**
 * Execute pipeline up to a specific step (for preview)
 */
export function executeUntilStep(
  table: ParseResult,
  steps: TransformationStep[],
  stopAtIndex: number
): ExecutionResult {
  // If stopAtIndex is -1, return original table
  if (stopAtIndex < 0) {
    return {
      table,
      stepResults: [],
    };
  }

  // Execute only steps up to stopAtIndex (inclusive)
  const stepsToExecute = steps.slice(0, stopAtIndex + 1);
  return executePipeline(table, stepsToExecute);
}
