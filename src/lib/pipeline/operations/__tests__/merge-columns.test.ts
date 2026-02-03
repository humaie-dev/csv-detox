/**
 * Unit tests for merge-columns operation
 */

import { describe, it } from "node:test";
import * as assert from "node:assert";
import { mergeColumns } from "../merge-columns";
import type { ParseResult } from "@/lib/parsers/types";
import type { MergeColumnsConfig } from "@/lib/pipeline/types";

describe("mergeColumns", () => {
  it("should merge two columns with space separator", () => {
    const table: ParseResult = {
      rows: [
        { FirstName: "John", LastName: "Doe" },
        { FirstName: "Jane", LastName: "Smith" },
      ],
      columns: [
        { name: "FirstName", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["John", "Jane"] },
        { name: "LastName", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["Doe", "Smith"] },
      ],
      rowCount: 2,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["FirstName", "LastName"],
      separator: " ",
      newColumn: "FullName",
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rowCount, 2);
    assert.strictEqual(result.rows[0].FullName, "John Doe");
    assert.strictEqual(result.rows[1].FullName, "Jane Smith");
    assert.strictEqual(result.rows[0].FirstName, undefined); // Original removed by default
    assert.strictEqual(result.rows[0].LastName, undefined);
  });

  it("should merge three columns", () => {
    const table: ParseResult = {
      rows: [{ Street: "123 Main", City: "Springfield", State: "IL" }],
      columns: [
        { name: "Street", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["123 Main"] },
        { name: "City", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Springfield"] },
        { name: "State", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["IL"] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["Street", "City", "State"],
      separator: ", ",
      newColumn: "FullAddress",
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rows[0].FullAddress, "123 Main, Springfield, IL");
  });

  it("should handle single column merge", () => {
    const table: ParseResult = {
      rows: [{ Name: "John" }],
      columns: [
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["Name"],
      separator: " ",
      newColumn: "FullName",
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rows[0].FullName, "John");
  });

  it("should skip null values by default (skipNull=true)", () => {
    const table: ParseResult = {
      rows: [{ FirstName: "John", MiddleName: null, LastName: "Doe" }],
      columns: [
        { name: "FirstName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        { name: "MiddleName", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "LastName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Doe"] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["FirstName", "MiddleName", "LastName"],
      separator: " ",
      newColumn: "FullName",
      skipNull: true,
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rows[0].FullName, "John Doe"); // MiddleName skipped
  });

  it("should include null values as empty strings when skipNull=false", () => {
    const table: ParseResult = {
      rows: [{ FirstName: "John", MiddleName: null, LastName: "Doe" }],
      columns: [
        { name: "FirstName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        { name: "MiddleName", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "LastName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Doe"] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["FirstName", "MiddleName", "LastName"],
      separator: " ",
      newColumn: "FullName",
      skipNull: false,
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rows[0].FullName, "John  Doe"); // Extra space where MiddleName is null
  });

  it("should keep original columns when keepOriginal=true", () => {
    const table: ParseResult = {
      rows: [{ FirstName: "John", LastName: "Doe" }],
      columns: [
        { name: "FirstName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        { name: "LastName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Doe"] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["FirstName", "LastName"],
      separator: " ",
      newColumn: "FullName",
      keepOriginal: true,
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rows[0].FullName, "John Doe");
    assert.strictEqual(result.rows[0].FirstName, "John");
    assert.strictEqual(result.rows[0].LastName, "Doe");
  });

  it("should handle empty string values", () => {
    const table: ParseResult = {
      rows: [{ FirstName: "", LastName: "Doe" }],
      columns: [
        { name: "FirstName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: [""] },
        { name: "LastName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Doe"] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["FirstName", "LastName"],
      separator: " ",
      newColumn: "FullName",
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rows[0].FullName, " Doe");
  });

  it("should handle all null values", () => {
    const table: ParseResult = {
      rows: [{ FirstName: null, LastName: null }],
      columns: [
        { name: "FirstName", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        { name: "LastName", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["FirstName", "LastName"],
      separator: " ",
      newColumn: "FullName",
      skipNull: true,
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rows[0].FullName, ""); // Empty string when all values are null
  });

  it("should convert non-string values to strings", () => {
    const table: ParseResult = {
      rows: [{ ID: 123, Name: "John", Active: true }],
      columns: [
        { name: "ID", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [123] },
        { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        { name: "Active", type: "boolean", nonNullCount: 1, nullCount: 0, sampleValues: [true] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["ID", "Name", "Active"],
      separator: "-",
      newColumn: "Combined",
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rows[0].Combined, "123-John-true");
  });

  it("should use custom separator", () => {
    const table: ParseResult = {
      rows: [{ FirstName: "John", LastName: "Doe" }],
      columns: [
        { name: "FirstName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        { name: "LastName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Doe"] },
      ],
      rowCount: 1,
      warnings: [],
    };

    const config: MergeColumnsConfig = {
      type: "merge_columns",
      columns: ["FirstName", "LastName"],
      separator: " | ",
      newColumn: "FullName",
    };

    const { table: result } = mergeColumns(table, config);

    assert.strictEqual(result.rows[0].FullName, "John | Doe");
  });

  // Validation tests
  describe("validation", () => {
    it("should throw error if no columns specified", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: MergeColumnsConfig = {
        type: "merge_columns",
        columns: [],
        separator: " ",
        newColumn: "FullName",
      };

      assert.throws(
        () => mergeColumns(table, config),
        /At least one column must be specified for merging/
      );
    });

    it("should throw error if column does not exist", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: MergeColumnsConfig = {
        type: "merge_columns",
        columns: ["Name", "InvalidColumn"],
        separator: " ",
        newColumn: "FullName",
      };

      assert.throws(
        () => mergeColumns(table, config),
        /Column "InvalidColumn" does not exist/
      );
    });

    it("should throw error if new column name is empty", () => {
      const table: ParseResult = {
        rows: [{ FirstName: "John", LastName: "Doe" }],
        columns: [
          { name: "FirstName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
          { name: "LastName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Doe"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: MergeColumnsConfig = {
        type: "merge_columns",
        columns: ["FirstName", "LastName"],
        separator: " ",
        newColumn: "  ", // Empty
      };

      assert.throws(
        () => mergeColumns(table, config),
        /New column name cannot be empty/
      );
    });

    it("should throw error if new column already exists (and not in merge list)", () => {
      const table: ParseResult = {
        rows: [{ FirstName: "John", LastName: "Doe", Age: 30 }],
        columns: [
          { name: "FirstName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
          { name: "LastName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Doe"] },
          { name: "Age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [30] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: MergeColumnsConfig = {
        type: "merge_columns",
        columns: ["FirstName", "LastName"],
        separator: " ",
        newColumn: "Age", // Already exists
      };

      assert.throws(
        () => mergeColumns(table, config),
        /New column "Age" already exists/
      );
    });

    it("should allow new column name to be one of the merged columns (will be replaced)", () => {
      const table: ParseResult = {
        rows: [{ FirstName: "John", LastName: "Doe" }],
        columns: [
          { name: "FirstName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
          { name: "LastName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Doe"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: MergeColumnsConfig = {
        type: "merge_columns",
        columns: ["FirstName", "LastName"],
        separator: " ",
        newColumn: "FirstName", // Same as one of the columns
      };

      const { table: result } = mergeColumns(table, config);
      assert.strictEqual(result.rows[0].FirstName, "John Doe");
    });

    it("should throw error if duplicate columns in merge list", () => {
      const table: ParseResult = {
        rows: [{ FirstName: "John", LastName: "Doe" }],
        columns: [
          { name: "FirstName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
          { name: "LastName", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["Doe"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: MergeColumnsConfig = {
        type: "merge_columns",
        columns: ["FirstName", "FirstName"], // Duplicate
        separator: " ",
        newColumn: "FullName",
      };

      assert.throws(
        () => mergeColumns(table, config),
        /Columns to merge must be unique/
      );
    });
  });
});
