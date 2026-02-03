/**
 * Tests for cast-column operation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { castColumn } from "../cast-column";
import type { ParseResult } from "@/lib/parsers/types";
import type { CastColumnConfig } from "../../types";
import { TransformationError } from "../../types";

describe("castColumn operation", () => {
  describe("basic casting to string", () => {
    it("should cast number column to string", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: 100 },
          { id: 2, value: 200 },
          { id: 3, value: 300 },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "value", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [100, 200, 300] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "string",
        onError: "fail",
      };

      const { table: result, columns } = castColumn(table, config);

      assert.equal(result.rowCount, 3);
      assert.equal(result.rows[0].value, "100");
      assert.equal(result.rows[1].value, "200");
      assert.equal(result.rows[2].value, "300");
      
      // Check column metadata updated
      const valueCol = columns.find((col) => col.name === "value");
      assert.equal(valueCol?.type, "string");
      assert.equal(valueCol?.nonNullCount, 3);
      assert.equal(valueCol?.nullCount, 0);
    });

    it("should handle null values when casting to string", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: 100 },
          { id: 2, value: null },
          { id: 3, value: 300 },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "value", type: "number", nonNullCount: 2, nullCount: 1, sampleValues: [100, 300] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "string",
        onError: "fail",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.rowCount, 3);
      assert.equal(result.rows[0].value, "100");
      assert.equal(result.rows[1].value, "");
      assert.equal(result.rows[2].value, "300");
    });
  });

  describe("basic casting to number", () => {
    it("should cast string column to number", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, price: "100" },
          { id: 2, price: "200.50" },
          { id: 3, price: "300" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "price", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: ["100", "200.50", "300"] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "price",
        targetType: "number",
        onError: "fail",
      };

      const { table: result, columns } = castColumn(table, config);

      assert.equal(result.rowCount, 3);
      assert.equal(result.rows[0].price, 100);
      assert.equal(result.rows[1].price, 200.50);
      assert.equal(result.rows[2].price, 300);
      
      // Check column metadata updated
      const priceCol = columns.find((col) => col.name === "price");
      assert.equal(priceCol?.type, "number");
      assert.equal(priceCol?.nonNullCount, 3);
      assert.equal(priceCol?.nullCount, 0);
    });

    it("should handle numbers with commas", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, price: "1,000" },
          { id: 2, price: "2,500.50" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [1, 2] },
          { name: "price", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["1,000", "2,500.50"] },
        ],
        rowCount: 2,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "price",
        targetType: "number",
        onError: "fail",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.rows[0].price, 1000);
      assert.equal(result.rows[1].price, 2500.50);
    });
  });

  describe("basic casting to boolean", () => {
    it("should cast string column to boolean", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, active: "true" },
          { id: 2, active: "false" },
          { id: 3, active: "yes" },
          { id: 4, active: "no" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 4, nullCount: 0, sampleValues: [1, 2, 3, 4] },
          { name: "active", type: "string", nonNullCount: 4, nullCount: 0, sampleValues: ["true", "false", "yes", "no"] },
        ],
        rowCount: 4,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "active",
        targetType: "boolean",
        onError: "fail",
      };

      const { table: result, columns } = castColumn(table, config);

      assert.equal(result.rowCount, 4);
      assert.equal(result.rows[0].active, true);
      assert.equal(result.rows[1].active, false);
      assert.equal(result.rows[2].active, true);
      assert.equal(result.rows[3].active, false);
      
      // Check column metadata updated
      const activeCol = columns.find((col) => col.name === "active");
      assert.equal(activeCol?.type, "boolean");
    });

    it("should handle 1/0 as boolean", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, active: 1 },
          { id: 2, active: 0 },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [1, 2] },
          { name: "active", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [1, 0] },
        ],
        rowCount: 2,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "active",
        targetType: "boolean",
        onError: "fail",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.rows[0].active, true);
      assert.equal(result.rows[1].active, false);
    });
  });

  describe("basic casting to date", () => {
    it("should cast string column to date", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, created: "2023-01-15" },
          { id: 2, created: "2023-06-20" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [1, 2] },
          { name: "created", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["2023-01-15", "2023-06-20"] },
        ],
        rowCount: 2,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "created",
        targetType: "date",
        onError: "fail",
      };

      const { table: result, columns } = castColumn(table, config);

      assert.equal(result.rowCount, 2);
      assert.ok(result.rows[0].created instanceof Date);
      assert.ok(result.rows[1].created instanceof Date);
      
      // Check column metadata updated
      const createdCol = columns.find((col) => col.name === "created");
      assert.equal(createdCol?.type, "date");
    });

    it("should handle multiple date formats", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, date: "2023-01-15" },
          { id: 2, date: "01/15/2023" },
          { id: 3, date: "Jan 15, 2023" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "date", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: ["2023-01-15", "01/15/2023", "Jan 15, 2023"] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "date",
        targetType: "date",
        onError: "fail",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.rowCount, 3);
      assert.ok(result.rows[0].date instanceof Date);
      assert.ok(result.rows[1].date instanceof Date);
      assert.ok(result.rows[2].date instanceof Date);
    });
  });

  describe("error handling - fail mode", () => {
    it("should throw error on invalid cast in fail mode", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "100" },
          { id: 2, value: "invalid" },
          { id: 3, value: "300" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "value", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: ["100", "invalid", "300"] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "fail",
      };

      assert.throws(
        () => castColumn(table, config),
        (error: Error) => {
          assert.ok(error instanceof TransformationError);
          assert.ok(error.message.includes("Failed to cast value in row 2"));
          return true;
        }
      );
    });

    it("should throw error immediately on first failure", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "invalid1" },
          { id: 2, value: "invalid2" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [1, 2] },
          { name: "value", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["invalid1", "invalid2"] },
        ],
        rowCount: 2,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "fail",
      };

      assert.throws(
        () => castColumn(table, config),
        (error: Error) => {
          assert.ok(error instanceof TransformationError);
          assert.ok(error.message.includes("row 1"));
          return true;
        }
      );
    });
  });

  describe("error handling - null mode", () => {
    it("should set invalid values to null in null mode", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "100" },
          { id: 2, value: "invalid" },
          { id: 3, value: "300" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "value", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: ["100", "invalid", "300"] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "null",
      };

      const { table: result, columns } = castColumn(table, config);

      assert.equal(result.rowCount, 3);
      assert.equal(result.rows[0].value, 100);
      assert.equal(result.rows[1].value, null);
      assert.equal(result.rows[2].value, 300);
      
      // Check null counts updated
      const valueCol = columns.find((col) => col.name === "value");
      assert.equal(valueCol?.nullCount, 1);
      assert.equal(valueCol?.nonNullCount, 2);
    });

    it("should add warning about cast errors in null mode", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "100" },
          { id: 2, value: "invalid" },
          { id: 3, value: "also-invalid" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "value", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: ["100", "invalid", "also-invalid"] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "null",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.warnings.length, 1);
      assert.ok(result.warnings[0].includes("2 error(s)"));
      assert.ok(result.warnings[0].includes("Mode: null"));
    });

    it("should continue processing all rows in null mode", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "invalid1" },
          { id: 2, value: "200" },
          { id: 3, value: "invalid2" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "value", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: ["invalid1", "200", "invalid2"] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "null",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.rowCount, 3);
      assert.equal(result.rows[0].value, null);
      assert.equal(result.rows[1].value, 200);
      assert.equal(result.rows[2].value, null);
    });
  });

  describe("error handling - skip mode", () => {
    it("should skip rows with invalid values in skip mode", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "100" },
          { id: 2, value: "invalid" },
          { id: 3, value: "300" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "value", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: ["100", "invalid", "300"] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "skip",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.rowCount, 2);
      assert.equal(result.rows[0].id, 1);
      assert.equal(result.rows[0].value, 100);
      assert.equal(result.rows[1].id, 3);
      assert.equal(result.rows[1].value, 300);
    });

    it("should add warning about skipped rows in skip mode", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "100" },
          { id: 2, value: "invalid" },
          { id: 3, value: "also-invalid" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 3, nullCount: 0, sampleValues: [1, 2, 3] },
          { name: "value", type: "string", nonNullCount: 3, nullCount: 0, sampleValues: ["100", "invalid", "also-invalid"] },
        ],
        rowCount: 3,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "skip",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.rowCount, 1);
      assert.equal(result.warnings.length, 1);
      assert.ok(result.warnings[0].includes("2 error(s)"));
      assert.ok(result.warnings[0].includes("Skipped 2 row(s)"));
    });

    it("should handle all rows being skipped", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "invalid1" },
          { id: 2, value: "invalid2" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [1, 2] },
          { name: "value", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["invalid1", "invalid2"] },
        ],
        rowCount: 2,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "skip",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.rowCount, 0);
      assert.equal(result.rows.length, 0);
    });
  });

  describe("validation", () => {
    it("should throw error if column does not exist", () => {
      const table: ParseResult = {
        rows: [{ id: 1, value: "test" }],
        columns: [
          { name: "id", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [1] },
          { name: "value", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["test"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "nonexistent",
        targetType: "number",
        onError: "fail",
      };

      assert.throws(
        () => castColumn(table, config),
        (error: Error) => {
          assert.ok(error instanceof TransformationError);
          assert.ok(error.message.includes('Column "nonexistent" not found'));
          return true;
        }
      );
    });
  });

  describe("column metadata updates", () => {
    it("should update sample values after casting", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "100" },
          { id: 2, value: "200" },
          { id: 3, value: "300" },
          { id: 4, value: "400" },
          { id: 5, value: "500" },
          { id: 6, value: "600" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 6, nullCount: 0, sampleValues: [1, 2, 3, 4, 5, 6] },
          { name: "value", type: "string", nonNullCount: 6, nullCount: 0, sampleValues: ["100", "200", "300", "400", "500", "600"] },
        ],
        rowCount: 6,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "fail",
      };

      const { columns } = castColumn(table, config);

      const valueCol = columns.find((col) => col.name === "value");
      assert.equal(valueCol?.sampleValues.length, 5); // Max 5 samples
      assert.equal(valueCol?.sampleValues[0], 100);
      assert.equal(valueCol?.sampleValues[1], 200);
    });

    it("should preserve other column metadata", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "100", name: "test" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [1] },
          { name: "value", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["100"] },
          { name: "name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["test"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "fail",
      };

      const { columns } = castColumn(table, config);

      // Check that other columns are unchanged
      const idCol = columns.find((col) => col.name === "id");
      const nameCol = columns.find((col) => col.name === "name");
      
      assert.equal(idCol?.type, "number");
      assert.equal(nameCol?.type, "string");
    });

    it("should exclude null values from sample values", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "100" },
          { id: 2, value: "invalid" },
          { id: 3, value: "300" },
          { id: 4, value: "400" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 4, nullCount: 0, sampleValues: [1, 2, 3, 4] },
          { name: "value", type: "string", nonNullCount: 4, nullCount: 0, sampleValues: ["100", "invalid", "300", "400"] },
        ],
        rowCount: 4,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "null",
      };

      const { columns } = castColumn(table, config);

      const valueCol = columns.find((col) => col.name === "value");
      // Should only have 3 sample values (excluding the null from invalid)
      assert.equal(valueCol?.sampleValues.length, 3);
      assert.equal(valueCol?.sampleValues[0], 100);
      assert.equal(valueCol?.sampleValues[1], 300);
      assert.equal(valueCol?.sampleValues[2], 400);
    });
  });

  describe("edge cases", () => {
    it("should handle empty table", () => {
      const table: ParseResult = {
        rows: [],
        columns: [
          { name: "value", type: "string", nonNullCount: 0, nullCount: 0, sampleValues: [] },
        ],
        rowCount: 0,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "fail",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.rowCount, 0);
      assert.equal(result.rows.length, 0);
    });

    it("should handle all null values", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: null },
          { id: 2, value: null },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [1, 2] },
          { name: "value", type: "string", nonNullCount: 0, nullCount: 2, sampleValues: [] },
        ],
        rowCount: 2,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "fail",
      };

      const { table: result, columns } = castColumn(table, config);

      assert.equal(result.rowCount, 2);
      assert.equal(result.rows[0].value, null);
      assert.equal(result.rows[1].value, null);
      
      const valueCol = columns.find((col) => col.name === "value");
      assert.equal(valueCol?.nullCount, 2);
      assert.equal(valueCol?.nonNullCount, 0);
    });

    it("should preserve existing warnings", () => {
      const table: ParseResult = {
        rows: [{ id: 1, value: "100" }],
        columns: [
          { name: "id", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [1] },
          { name: "value", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["100"] },
        ],
        rowCount: 1,
        warnings: ["Existing warning"],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "fail",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.warnings.length, 1);
      assert.equal(result.warnings[0], "Existing warning");
    });

    it("should handle successful cast with no warnings", () => {
      const table: ParseResult = {
        rows: [
          { id: 1, value: "100" },
          { id: 2, value: "200" },
        ],
        columns: [
          { name: "id", type: "number", nonNullCount: 2, nullCount: 0, sampleValues: [1, 2] },
          { name: "value", type: "string", nonNullCount: 2, nullCount: 0, sampleValues: ["100", "200"] },
        ],
        rowCount: 2,
        warnings: [],
      };

      const config: CastColumnConfig = {
        type: "cast_column",
        column: "value",
        targetType: "number",
        onError: "null",
      };

      const { table: result } = castColumn(table, config);

      assert.equal(result.warnings.length, 0);
    });
  });
});
