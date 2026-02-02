/**
 * Tests for deduplicate operation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deduplicate } from "../deduplicate";
import type { ParseResult } from "@/lib/parsers/types";
import type { DeduplicateConfig } from "../../types";

describe("deduplicate operation", () => {
  it("should remove duplicate rows based on all columns", () => {
    const table: ParseResult = {
      rows: [
        { name: "John", age: "30" },
        { name: "Jane", age: "25" },
        { name: "John", age: "30" }, // Duplicate
        { name: "Bob", age: "35" },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 4, nullCount: 0, sampleValues: [] },
        { name: "age", type: "string", nonNullCount: 4, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 4,
      warnings: [],
    };

    const config: DeduplicateConfig = {
      type: "deduplicate",
    };

    const result = deduplicate(table, config);

    assert.equal(result.rowCount, 3);
    assert.equal(result.rows.length, 3);
    assert.deepEqual(result.rows[0], { name: "John", age: "30" });
    assert.deepEqual(result.rows[1], { name: "Jane", age: "25" });
    assert.deepEqual(result.rows[2], { name: "Bob", age: "35" });
  });

  it("should remove duplicates based on specific columns", () => {
    const table: ParseResult = {
      rows: [
        { name: "John", age: "30", city: "NYC" },
        { name: "John", age: "25", city: "LA" }, // Same name, different age
        { name: "Jane", age: "30", city: "NYC" },
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        { name: "age", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        { name: "city", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: DeduplicateConfig = {
      type: "deduplicate",
      columns: ["name"], // Only deduplicate by name
    };

    const result = deduplicate(table, config);

    assert.equal(result.rowCount, 2);
    assert.equal(result.rows.length, 2);
    // Should keep first occurrence
    assert.equal(result.rows[0].name, "John");
    assert.equal(result.rows[0].age, "30");
    assert.equal(result.rows[1].name, "Jane");
  });

  it("should preserve order of first occurrences", () => {
    const table: ParseResult = {
      rows: [
        { id: "3" },
        { id: "1" },
        { id: "3" },
        { id: "2" },
        { id: "1" },
      ],
      columns: [
        { name: "id", type: "string", nonNullCount: 5, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 5,
      warnings: [],
    };

    const config: DeduplicateConfig = {
      type: "deduplicate",
    };

    const result = deduplicate(table, config);

    assert.equal(result.rowCount, 3);
    assert.equal(result.rows[0].id, "3");
    assert.equal(result.rows[1].id, "1");
    assert.equal(result.rows[2].id, "2");
  });

  it("should handle null values", () => {
    const table: ParseResult = {
      rows: [
        { name: "John", age: null },
        { name: "Jane", age: "25" },
        { name: "John", age: null }, // Duplicate with null
      ],
      columns: [
        { name: "name", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: [] },
        { name: "age", type: "string", nonNullCount: 2, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 3,
      warnings: [],
    };

    const config: DeduplicateConfig = {
      type: "deduplicate",
    };

    const result = deduplicate(table, config);

    assert.equal(result.rowCount, 2);
    assert.equal(result.rows.length, 2);
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

    const config: DeduplicateConfig = {
      type: "deduplicate",
      columns: ["nonexistent"],
    };

    assert.throws(() => deduplicate(table, config), {
      message: /Columns not found/,
    });
  });

  it("should handle empty table", () => {
    const table: ParseResult = {
      rows: [],
      columns: [
        { name: "name", type: "string", nonNullCount: 0, nullCount: 0, sampleValues: [] },
      ],
      rowCount: 0,
      warnings: [],
    };

    const config: DeduplicateConfig = {
      type: "deduplicate",
    };

    const result = deduplicate(table, config);

    assert.equal(result.rowCount, 0);
    assert.equal(result.rows.length, 0);
  });
});
