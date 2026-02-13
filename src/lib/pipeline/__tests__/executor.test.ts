import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ParseResult } from "@/lib/parsers/types";
import { executePipeline, executeUntilStep } from "../executor";
import type { TransformationStep } from "../types";

describe("executePipeline", () => {
  it("should execute empty pipeline (no-op)", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice", age: 30 }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const steps: TransformationStep[] = [];
    const result = executePipeline(table, steps);

    assert.equal(result.table.rowCount, 1);
    assert.equal(result.table.rows[0].name, "Alice");
    assert.equal(result.stepResults.length, 0);
    assert.equal(result.typeEvolution.length, 1); // Original columns only
    assert.equal(result.typeEvolution[0].length, 2); // name and age columns
  });

  it("should execute single step successfully", () => {
    const table: ParseResult = {
      rows: [{ name: "  Alice  " }],
      columns: [{ name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name"],
        },
      },
    ];

    const result = executePipeline(table, steps);

    assert.equal(result.table.rows[0].name, "Alice");
    assert.equal(result.stepResults.length, 1);
    assert.equal(result.stepResults[0].stepId, "step-1");
    assert.equal(result.stepResults[0].success, true);
    assert.equal(result.stepResults[0].rowsAffected, 0);
    assert.equal(result.stepResults[0].columnsAfter.length, 1); // Track columns after step
    assert.equal(result.typeEvolution.length, 2); // Original + after step 1
  });

  it("should execute multiple steps in sequence", () => {
    const table: ParseResult = {
      rows: [
        { name: "  alice  ", age: 30 },
        { name: "  bob  ", age: 25 },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name"],
        },
      },
      {
        id: "step-2",
        type: "uppercase",
        config: {
          type: "uppercase",
          columns: ["name"],
        },
      },
      {
        id: "step-3",
        type: "remove_column",
        config: {
          type: "remove_column",
          columns: ["age"],
        },
      },
    ];

    const result = executePipeline(table, steps);

    assert.equal(result.table.rows[0].name, "ALICE");
    assert.equal(result.table.rows[1].name, "BOB");
    assert.equal(result.table.rows[0].age, undefined);
    assert.equal(result.table.columns.length, 1);
    assert.equal(result.stepResults.length, 3);
    assert.equal(result.stepResults[0].success, true);
    assert.equal(result.stepResults[1].success, true);
    assert.equal(result.stepResults[2].success, true);
    assert.equal(result.typeEvolution.length, 4); // Original + 3 steps
    assert.equal(result.stepResults[2].columnsAfter.length, 1); // Only name column after remove
  });

  it("should track rowsAffected for filter operations", () => {
    const table: ParseResult = {
      rows: [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 35 },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "filter",
        config: {
          type: "filter",
          column: "age",
          operator: "greater_than",
          value: 28,
        },
      },
    ];

    const result = executePipeline(table, steps);

    assert.equal(result.table.rowCount, 2);
    assert.equal(result.stepResults[0].rowsAffected, 1);
  });

  it("should stop execution on error and report failed step", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice" }],
      columns: [{ name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name"],
        },
      },
      {
        id: "step-2",
        type: "uppercase",
        config: {
          type: "uppercase",
          columns: ["nonexistent"],
        },
      },
      {
        id: "step-3",
        type: "lowercase",
        config: {
          type: "lowercase",
          columns: ["name"],
        },
      },
    ];

    const result = executePipeline(table, steps);

    // First step should succeed
    assert.equal(result.stepResults[0].stepId, "step-1");
    assert.equal(result.stepResults[0].success, true);

    // Second step should fail
    assert.equal(result.stepResults[1].stepId, "step-2");
    assert.equal(result.stepResults[1].success, false);
    assert.match(result.stepResults[1].error!, /Column not found|not found/);

    // Third step should not execute
    assert.equal(result.stepResults.length, 2);
  });

  it("should handle error with invalid operation config", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice", age: 30 }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "rename_column",
        config: {
          type: "rename_column",
          oldName: "name",
          newName: "age", // Already exists
        },
      },
    ];

    const result = executePipeline(table, steps);

    assert.equal(result.stepResults[0].success, false);
    assert.match(result.stepResults[0].error!, /Column already exists/);
  });

  it("should track rowsAffected for deduplicate operations", () => {
    const table: ParseResult = {
      rows: [
        { name: "Alice", age: 30 },
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "deduplicate",
        config: {
          type: "deduplicate",
        },
      },
    ];

    const result = executePipeline(table, steps);

    assert.equal(result.table.rowCount, 2);
    assert.equal(result.stepResults[0].rowsAffected, 1);
  });
});

describe("executeUntilStep", () => {
  it("should return original table when stopAtIndex is -1", () => {
    const table: ParseResult = {
      rows: [{ name: "  Alice  " }],
      columns: [{ name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name"],
        },
      },
    ];

    const result = executeUntilStep(table, steps, -1);

    assert.equal(result.table.rows[0].name, "  Alice  ");
    assert.equal(result.stepResults.length, 0);
    assert.equal(result.typeEvolution.length, 1); // Original columns only
  });

  it("should execute only first step when stopAtIndex is 0", () => {
    const table: ParseResult = {
      rows: [{ name: "  alice  " }],
      columns: [{ name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name"],
        },
      },
      {
        id: "step-2",
        type: "uppercase",
        config: {
          type: "uppercase",
          columns: ["name"],
        },
      },
    ];

    const result = executeUntilStep(table, steps, 0);

    assert.equal(result.table.rows[0].name, "alice");
    assert.equal(result.stepResults.length, 1);
    assert.equal(result.stepResults[0].stepId, "step-1");
  });

  it("should execute up to specified step (inclusive)", () => {
    const table: ParseResult = {
      rows: [{ name: "  alice  ", age: 30 }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name"],
        },
      },
      {
        id: "step-2",
        type: "uppercase",
        config: {
          type: "uppercase",
          columns: ["name"],
        },
      },
      {
        id: "step-3",
        type: "remove_column",
        config: {
          type: "remove_column",
          columns: ["age"],
        },
      },
    ];

    const result = executeUntilStep(table, steps, 1);

    assert.equal(result.table.rows[0].name, "ALICE");
    assert.equal(result.table.rows[0].age, 30); // Should still exist
    assert.equal(result.stepResults.length, 2);
    assert.equal(result.stepResults[0].stepId, "step-1");
    assert.equal(result.stepResults[1].stepId, "step-2");
  });

  it("should execute all steps when stopAtIndex equals steps length - 1", () => {
    const table: ParseResult = {
      rows: [{ name: "  alice  " }],
      columns: [{ name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name"],
        },
      },
      {
        id: "step-2",
        type: "uppercase",
        config: {
          type: "uppercase",
          columns: ["name"],
        },
      },
    ];

    const result = executeUntilStep(table, steps, 1);

    assert.equal(result.table.rows[0].name, "ALICE");
    assert.equal(result.stepResults.length, 2);
  });

  it("should stop at error even if stopAtIndex is higher", () => {
    const table: ParseResult = {
      rows: [{ name: "Alice" }],
      columns: [{ name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const steps: TransformationStep[] = [
      {
        id: "step-1",
        type: "trim",
        config: {
          type: "trim",
          columns: ["name"],
        },
      },
      {
        id: "step-2",
        type: "uppercase",
        config: {
          type: "uppercase",
          columns: ["nonexistent"],
        },
      },
      {
        id: "step-3",
        type: "lowercase",
        config: {
          type: "lowercase",
          columns: ["name"],
        },
      },
    ];

    const result = executeUntilStep(table, steps, 2);

    // Should stop at step-2 due to error
    assert.equal(result.stepResults.length, 2);
    assert.equal(result.stepResults[1].success, false);
  });
});
