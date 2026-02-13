/**
 * Pipeline execution engine
 */

import type { ColumnMetadata, ParseResult } from "@/lib/parsers/types";
import { getOperation } from "./operations";
import type { ExecutionResult, StepResult, TransformationStep } from "./types";

/**
 * Execute a complete pipeline
 */
export function executePipeline(table: ParseResult, steps: TransformationStep[]): ExecutionResult {
  let currentTable = table;
  const stepResults: StepResult[] = [];
  const typeEvolution: ColumnMetadata[][] = [table.columns]; // Start with original columns

  for (const step of steps) {
    try {
      const operation = getOperation(step.type);
      const previousRowCount = currentTable.rowCount;

      // Operations now return { table, columns }
      const result = operation(currentTable, step.config);
      currentTable = result.table;
      const columnsAfter = result.columns;

      const rowsAffected = Math.abs(currentTable.rowCount - previousRowCount);

      // Track column metadata after this step
      typeEvolution.push(columnsAfter);

      stepResults.push({
        stepId: step.id,
        success: true,
        rowsAffected,
        columnsAfter,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      stepResults.push({
        stepId: step.id,
        success: false,
        columnsAfter: currentTable.columns, // Use current columns on error
        error: errorMessage,
      });

      // Stop execution on error
      break;
    }
  }

  return {
    table: currentTable,
    stepResults,
    typeEvolution,
  };
}

/**
 * Execute pipeline up to a specific step (for preview)
 */
export function executeUntilStep(
  table: ParseResult,
  steps: TransformationStep[],
  stopAtIndex: number,
): ExecutionResult {
  // If stopAtIndex is -1, return original table
  if (stopAtIndex < 0) {
    return {
      table,
      stepResults: [],
      typeEvolution: [table.columns],
    };
  }

  // Execute only steps up to stopAtIndex (inclusive)
  const stepsToExecute = steps.slice(0, stopAtIndex + 1);
  return executePipeline(table, stepsToExecute);
}
