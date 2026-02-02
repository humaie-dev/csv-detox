/**
 * Tests for uppercase and lowercase operations
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { uppercase } from "../uppercase";
import { lowercase } from "../lowercase";
import type { ParseResult } from "@/lib/parsers/types";
import type { UppercaseConfig, LowercaseConfig } from "../../types";

describe("uppercase operation", () => {
  it("should convert strings to uppercase", () => {
    const table: ParseResult = {
      rows: [
        { name: "john", city: "new york" },
        { name: "jane", city: "los angeles" },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
        { name: "city", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: UppercaseConfig = {
      type: "uppercase",
      columns: ["name", "city"],
    };

    const result = uppercase(table, config);

    assert.equal(result.rows[0].name, "JOHN");
    assert.equal(result.rows[0].city, "NEW YORK");
    assert.equal(result.rows[1].name, "JANE");
    assert.equal(result.rows[1].city, "LOS ANGELES");
  });

  it("should only affect string-type columns", () => {
    const table: ParseResult = {
      rows: [
        { name: "john", age: 30 },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UppercaseConfig = {
      type: "uppercase",
      columns: ["name", "age"],
    };

    const result = uppercase(table, config);

    assert.equal(result.rows[0].name, "JOHN");
    assert.equal(result.rows[0].age, 30);
  });

  it("should throw error for non-existent columns", () => {
    const table: ParseResult = {
      rows: [{ name: "john" }],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: UppercaseConfig = {
      type: "uppercase",
      columns: ["nonexistent"],
    };

    assert.throws(() => uppercase(table, config), {
      message: /Columns not found/,
    });
  });
});

describe("lowercase operation", () => {
  it("should convert strings to lowercase", () => {
    const table: ParseResult = {
      rows: [
        { name: "JOHN", city: "NEW YORK" },
        { name: "JANE", city: "LOS ANGELES" },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
        { name: "city", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: LowercaseConfig = {
      type: "lowercase",
      columns: ["name", "city"],
    };

    const result = lowercase(table, config);

    assert.equal(result.rows[0].name, "john");
    assert.equal(result.rows[0].city, "new york");
    assert.equal(result.rows[1].name, "jane");
    assert.equal(result.rows[1].city, "los angeles");
  });

  it("should only affect string-type columns", () => {
    const table: ParseResult = {
      rows: [
        { name: "JOHN", age: 30 },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
        { name: "age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: LowercaseConfig = {
      type: "lowercase",
      columns: ["name", "age"],
    };

    const result = lowercase(table, config);

    assert.equal(result.rows[0].name, "john");
    assert.equal(result.rows[0].age, 30);
  });

  it("should handle mixed case", () => {
    const table: ParseResult = {
      rows: [
        { name: "JoHn DoE" },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: LowercaseConfig = {
      type: "lowercase",
      columns: ["name"],
    };

    const result = lowercase(table, config);

    assert.equal(result.rows[0].name, "john doe");
  });
});
