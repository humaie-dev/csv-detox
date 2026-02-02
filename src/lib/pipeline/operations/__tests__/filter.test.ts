/**
 * Tests for filter operation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filter } from "../filter";
import type { ParseResult } from "@/lib/parsers/types";
import type { FilterConfig } from "../../types";

describe("filter operation", () => {
  describe("equals operator", () => {
    it("should filter rows where column equals value", () => {
      const table: ParseResult = {
        rows: [
          { name: "John", age: "30" },
          { name: "Jane", age: "25" },
          { name: "Bob", age: "30" },
        ],
        columns: [
          { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
          { name: "age", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: FilterConfig = {
        type: "filter",
        column: "age",
        operator: "equals",
        value: "30",
      };

      const result = filter(table, config);

      assert.equal(result.rowCount, 2);
      assert.equal(result.rows.length, 2);
      assert.equal(result.rows[0].name, "John");
      assert.equal(result.rows[1].name, "Bob");
    });
  });

  describe("not_equals operator", () => {
    it("should filter rows where column not equals value", () => {
      const table: ParseResult = {
        rows: [
          { name: "John", age: "30" },
          { name: "Jane", age: "25" },
          { name: "Bob", age: "30" },
        ],
        columns: [
          { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
          { name: "age", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: FilterConfig = {
        type: "filter",
        column: "age",
        operator: "not_equals",
        value: "30",
      };

      const result = filter(table, config);

      assert.equal(result.rowCount, 1);
      assert.equal(result.rows[0].name, "Jane");
    });
  });

  describe("contains operator", () => {
    it("should filter rows where column contains value", () => {
      const table: ParseResult = {
        rows: [
          { name: "John Doe" },
          { name: "Jane Smith" },
          { name: "Bob Johnson" },
        ],
        columns: [
          { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: FilterConfig = {
        type: "filter",
        column: "name",
        operator: "contains",
        value: "John",
      };

      const result = filter(table, config);

      assert.equal(result.rowCount, 2);
      assert.equal(result.rows[0].name, "John Doe");
      assert.equal(result.rows[1].name, "Bob Johnson");
    });

    it("should return false for non-string values", () => {
      const table: ParseResult = {
        rows: [
          { name: "John", age: 30 },
        ],
        columns: [
          { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
          { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: FilterConfig = {
        type: "filter",
        column: "age",
        operator: "contains",
        value: "3",
      };

      const result = filter(table, config);

      assert.equal(result.rowCount, 0);
    });
  });

  describe("not_contains operator", () => {
    it("should filter rows where column does not contain value", () => {
      const table: ParseResult = {
        rows: [
          { name: "John Doe" },
          { name: "Jane Smith" },
          { name: "Bob Johnson" },
        ],
        columns: [
          { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: FilterConfig = {
        type: "filter",
        column: "name",
        operator: "not_contains",
        value: "John",
      };

      const result = filter(table, config);

      assert.equal(result.rowCount, 1);
      assert.equal(result.rows[0].name, "Jane Smith");
    });
  });

  describe("greater_than operator", () => {
    it("should filter numeric values greater than threshold", () => {
      const table: ParseResult = {
        rows: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 },
          { name: "Bob", age: 35 },
        ],
        columns: [
          { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
          { name: "age", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: FilterConfig = {
        type: "filter",
        column: "age",
        operator: "greater_than",
        value: 28,
      };

      const result = filter(table, config);

      assert.equal(result.rowCount, 2);
      assert.equal(result.rows[0].name, "John");
      assert.equal(result.rows[1].name, "Bob");
    });

    it("should work with string comparison", () => {
      const table: ParseResult = {
        rows: [
          { name: "Alice" },
          { name: "Bob" },
          { name: "Charlie" },
        ],
        columns: [
          { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: FilterConfig = {
        type: "filter",
        column: "name",
        operator: "greater_than",
        value: "Bob",
      };

      const result = filter(table, config);

      assert.equal(result.rowCount, 1);
      assert.equal(result.rows[0].name, "Charlie");
    });
  });

  describe("less_than operator", () => {
    it("should filter numeric values less than threshold", () => {
      const table: ParseResult = {
        rows: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 },
          { name: "Bob", age: 35 },
        ],
        columns: [
          { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
          { name: "age", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: FilterConfig = {
        type: "filter",
        column: "age",
        operator: "less_than",
        value: 30,
      };

      const result = filter(table, config);

      assert.equal(result.rowCount, 1);
      assert.equal(result.rows[0].name, "Jane");
    });
  });

  it("should throw error for non-existent column", () => {
    const table: ParseResult = {
      rows: [{ name: "John" }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: FilterConfig = {
      type: "filter",
      column: "nonexistent",
      operator: "equals",
      value: "test",
    };

    assert.throws(() => filter(table, config), {
      message: /Column not found/,
    });
  });

  it("should return empty table when no rows match", () => {
    const table: ParseResult = {
      rows: [
        { name: "John" },
        { name: "Jane" },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: FilterConfig = {
      type: "filter",
      column: "name",
      operator: "equals",
      value: "Bob",
    };

    const result = filter(table, config);

    assert.equal(result.rowCount, 0);
    assert.equal(result.rows.length, 0);
  });
});
