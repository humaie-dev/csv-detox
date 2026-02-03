/**
 * Tests for trim operation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { trim } from "../trim";
import type { ParseResult } from "@/lib/parsers/types";
import type { TrimConfig } from "../../types";

describe("trim operation", () => {
  it("should trim whitespace from string columns", () => {
    const table: ParseResult = {
      rows: [
        { name: "  John  ", age: "30" },
        { name: " Jane ", age: "25" },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
        { name: "age", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: TrimConfig = {
      type: "trim",
      columns: ["name", "age"],
    };

    const { table: result } = trim(table, config);

    assert.equal(result.rows[0].name, "John");
    assert.equal(result.rows[1].name, "Jane");
    assert.equal(result.rows[0].age, "30");
    assert.equal(result.rows[1].age, "25");
  });

  it("should only trim string-type columns", () => {
    const table: ParseResult = {
      rows: [
        { name: "  John  ", age: 30, active: true },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "active", type: "boolean", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: TrimConfig = {
      type: "trim",
      columns: ["name", "age", "active"],
    };

    const { table: result } = trim(table, config);

    assert.equal(result.rows[0].name, "John");
    assert.equal(result.rows[0].age, 30); // Not trimmed (number)
    assert.equal(result.rows[0].active, true); // Not trimmed (boolean)
  });

  it("should handle empty strings", () => {
    const table: ParseResult = {
      rows: [
        { name: "   ", value: "" },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "value", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: TrimConfig = {
      type: "trim",
      columns: ["name", "value"],
    };

    const { table: result } = trim(table, config);

    assert.equal(result.rows[0].name, "");
    assert.equal(result.rows[0].value, "");
  });

  it("should throw error for non-existent columns", () => {
    const table: ParseResult = {
      rows: [{ name: "John" }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: TrimConfig = {
      type: "trim",
      columns: ["name", "nonexistent"],
    };

    assert.throws(() => trim(table, config), {
      message: /Columns not found/,
    });
  });

  it("should handle null values", () => {
    const table: ParseResult = {
      rows: [
        { name: "  John  " },
        { name: null },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: TrimConfig = {
      type: "trim",
      columns: ["name"],
    };

    const { table: result } = trim(table, config);

    assert.equal(result.rows[0].name, "John");
    assert.equal(result.rows[1].name, null);
  });
});
