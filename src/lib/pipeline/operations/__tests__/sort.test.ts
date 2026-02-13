/**
 * Tests for sort operation
 */

import * as assert from "node:assert";
import { describe, it } from "node:test";
import type { ParseResult } from "@/lib/parsers/types";
import type { SortConfig } from "../../types";
import { sort } from "../sort";

describe("sort", () => {
  it("should sort single column ascending", () => {
    const table: ParseResult = {
      rows: [
        { name: "Charlie", age: 30 },
        { name: "Alice", age: 25 },
        { name: "Bob", age: 35 },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "name", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows[0].name, "Alice");
    assert.strictEqual(result.table.rows[1].name, "Bob");
    assert.strictEqual(result.table.rows[2].name, "Charlie");
  });

  it("should sort single column descending", () => {
    const table: ParseResult = {
      rows: [
        { name: "Charlie", age: 30 },
        { name: "Alice", age: 25 },
        { name: "Bob", age: 35 },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "age", direction: "desc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows[0].age, 35);
    assert.strictEqual(result.table.rows[1].age, 30);
    assert.strictEqual(result.table.rows[2].age, 25);
  });

  it("should sort numbers correctly (not lexicographic)", () => {
    const table: ParseResult = {
      rows: [{ value: 100 }, { value: 2 }, { value: 20 }, { value: 1 }],
      columns: [{ name: "value", type: "number", nonNullCount: 4, nullCount: 0, sampleValues: [] }],
      rowCount: 4,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows[0].value, 1);
    assert.strictEqual(result.table.rows[1].value, 2);
    assert.strictEqual(result.table.rows[2].value, 20);
    assert.strictEqual(result.table.rows[3].value, 100);
  });

  it("should sort dates chronologically", () => {
    const table: ParseResult = {
      rows: [
        { date: new Date("2023-06-15") },
        { date: new Date("2023-01-10") },
        { date: new Date("2023-12-25") },
      ],
      columns: [{ name: "date", type: "date", nonNullCount: 3, nullCount: 0, sampleValues: [] }],
      rowCount: 3,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "date", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(
      (result.table.rows[0].date as Date).toISOString(),
      new Date("2023-01-10").toISOString(),
    );
    assert.strictEqual(
      (result.table.rows[1].date as Date).toISOString(),
      new Date("2023-06-15").toISOString(),
    );
    assert.strictEqual(
      (result.table.rows[2].date as Date).toISOString(),
      new Date("2023-12-25").toISOString(),
    );
  });

  it("should sort booleans (false < true)", () => {
    const table: ParseResult = {
      rows: [{ active: true }, { active: false }, { active: true }, { active: false }],
      columns: [
        { name: "active", type: "boolean", nonNullCount: 4, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 4,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "active", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows[0].active, false);
    assert.strictEqual(result.table.rows[1].active, false);
    assert.strictEqual(result.table.rows[2].active, true);
    assert.strictEqual(result.table.rows[3].active, true);
  });

  it("should handle nulls last by default", () => {
    const table: ParseResult = {
      rows: [{ value: 20 }, { value: null }, { value: 10 }, { value: null }, { value: 30 }],
      columns: [{ name: "value", type: "number", nonNullCount: 3, nullCount: 2, sampleValues: [] }],
      rowCount: 5,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows[0].value, 10);
    assert.strictEqual(result.table.rows[1].value, 20);
    assert.strictEqual(result.table.rows[2].value, 30);
    assert.strictEqual(result.table.rows[3].value, null);
    assert.strictEqual(result.table.rows[4].value, null);
  });

  it("should handle nulls first when configured", () => {
    const table: ParseResult = {
      rows: [{ value: 20 }, { value: null }, { value: 10 }, { value: 30 }],
      columns: [{ name: "value", type: "number", nonNullCount: 3, nullCount: 1, sampleValues: [] }],
      rowCount: 4,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
      nullsPosition: "first",
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows[0].value, null);
    assert.strictEqual(result.table.rows[1].value, 10);
    assert.strictEqual(result.table.rows[2].value, 20);
    assert.strictEqual(result.table.rows[3].value, 30);
  });

  it("should sort by multiple columns with priority", () => {
    const table: ParseResult = {
      rows: [
        { dept: "Sales", salary: 60000, name: "Bob" },
        { dept: "IT", salary: 70000, name: "Alice" },
        { dept: "Sales", salary: 55000, name: "Charlie" },
        { dept: "IT", salary: 70000, name: "David" },
        { dept: "Sales", salary: 60000, name: "Eve" },
      ],
      columns: [
        { name: "dept", type: "string", nonNullCount: 5, nullCount: 0, sampleValues: [] },
        { name: "salary", type: "number", nonNullCount: 5, nullCount: 0, sampleValues: [] },
        { name: "name", type: "string", nonNullCount: 5, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 5,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [
        { name: "dept", direction: "asc" },
        { name: "salary", direction: "desc" },
        { name: "name", direction: "asc" },
      ],
    };

    const result = sort(table, config);

    // First by dept (asc): IT, IT, Sales, Sales, Sales
    // Then by salary (desc): 70000, 70000, 60000, 60000, 55000
    // Then by name (asc): Alice, David, Bob, Eve, Charlie
    assert.strictEqual(result.table.rows[0].name, "Alice");
    assert.strictEqual(result.table.rows[1].name, "David");
    assert.strictEqual(result.table.rows[2].name, "Bob");
    assert.strictEqual(result.table.rows[3].name, "Eve");
    assert.strictEqual(result.table.rows[4].name, "Charlie");
  });

  it("should preserve stable sort order", () => {
    const table: ParseResult = {
      rows: [
        { category: "A", index: 1 },
        { category: "A", index: 2 },
        { category: "A", index: 3 },
      ],
      columns: [
        { name: "category", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        { name: "index", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "category", direction: "asc" }],
    };

    const result = sort(table, config);

    // Original order should be preserved for equal values
    assert.strictEqual(result.table.rows[0].index, 1);
    assert.strictEqual(result.table.rows[1].index, 2);
    assert.strictEqual(result.table.rows[2].index, 3);
  });

  it("should handle mixed types by converting to strings", () => {
    const table: ParseResult = {
      rows: [{ value: 100 }, { value: "apple" }, { value: 50 }, { value: "banana" }],
      columns: [{ name: "value", type: "string", nonNullCount: 4, nullCount: 0, sampleValues: [] }],
      rowCount: 4,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
    };

    const result = sort(table, config);

    // Numbers are sorted numerically (50 < 100), then strings lexicographically
    assert.strictEqual(result.table.rows[0].value, 50);
    assert.strictEqual(result.table.rows[1].value, 100);
    assert.strictEqual(String(result.table.rows[2].value), "apple");
    assert.strictEqual(String(result.table.rows[3].value), "banana");
  });

  it("should handle empty table", () => {
    const table: ParseResult = {
      rows: [],
      columns: [{ name: "value", type: "number", nonNullCount: 0, nullCount: 0, sampleValues: [] }],
      rowCount: 0,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows.length, 0);
  });

  it("should handle single row", () => {
    const table: ParseResult = {
      rows: [{ value: 42 }],
      columns: [{ name: "value", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows.length, 1);
    assert.strictEqual(result.table.rows[0].value, 42);
  });

  it("should handle all nulls", () => {
    const table: ParseResult = {
      rows: [{ value: null }, { value: null }, { value: null }],
      columns: [{ name: "value", type: "string", nonNullCount: 0, nullCount: 3, sampleValues: [] }],
      rowCount: 3,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows.length, 3);
    assert.strictEqual(result.table.rows[0].value, null);
    assert.strictEqual(result.table.rows[1].value, null);
    assert.strictEqual(result.table.rows[2].value, null);
  });

  it("should throw error if column not found", () => {
    const table: ParseResult = {
      rows: [{ value: 1 }],
      columns: [{ name: "value", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "nonexistent", direction: "asc" }],
    };

    assert.throws(() => sort(table, config), {
      message: 'Column "nonexistent" not found',
    });
  });

  it("should throw error if no sort columns specified", () => {
    const table: ParseResult = {
      rows: [{ value: 1 }],
      columns: [{ name: "value", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [],
    };

    assert.throws(() => sort(table, config), {
      message: "At least one sort column is required",
    });
  });

  it("should not modify original table", () => {
    const table: ParseResult = {
      rows: [{ value: 3 }, { value: 1 }, { value: 2 }],
      columns: [{ name: "value", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] }],
      rowCount: 3,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
    };

    sort(table, config);

    // Original table should be unchanged
    assert.strictEqual(table.rows[0].value, 3);
    assert.strictEqual(table.rows[1].value, 1);
    assert.strictEqual(table.rows[2].value, 2);
  });

  it("should return unchanged column metadata", () => {
    const table: ParseResult = {
      rows: [{ value: 1 }],
      columns: [{ name: "value", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] }],
      rowCount: 1,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.deepStrictEqual(result.columns, table.columns);
  });

  it("should default direction to asc", () => {
    const table: ParseResult = {
      rows: [{ value: 3 }, { value: 1 }, { value: 2 }],
      columns: [{ name: "value", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] }],
      rowCount: 3,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [{ name: "value", direction: "asc" }],
    };

    const result = sort(table, config);

    assert.strictEqual(result.table.rows[0].value, 1);
    assert.strictEqual(result.table.rows[1].value, 2);
    assert.strictEqual(result.table.rows[2].value, 3);
  });

  it("should handle nulls in multi-column sort", () => {
    const table: ParseResult = {
      rows: [
        { dept: "Sales", salary: 60000 },
        { dept: null, salary: 70000 },
        { dept: "IT", salary: null },
        { dept: "Sales", salary: null },
      ],
      columns: [
        { name: "dept", type: "string", nonNullCount: 2, nullCount: 2, sampleValues: [] },
        { name: "salary", type: "number", nonNullCount: 2, nullCount: 2, sampleValues: [] },
      ],
      rowCount: 4,
      warnings: [],
    };

    const config: SortConfig = {
      type: "sort",
      columns: [
        { name: "dept", direction: "asc" },
        { name: "salary", direction: "desc" },
      ],
      nullsPosition: "last",
    };

    const result = sort(table, config);

    // First non-null dept values sorted, then nulls
    // Within same dept, salary desc (with nulls last)
    assert.strictEqual(result.table.rows[0].dept, "IT");
    assert.strictEqual(result.table.rows[1].dept, "Sales");
    assert.strictEqual(result.table.rows[1].salary, 60000);
    assert.strictEqual(result.table.rows[2].dept, "Sales");
    assert.strictEqual(result.table.rows[2].salary, null);
    assert.strictEqual(result.table.rows[3].dept, null);
  });
});
