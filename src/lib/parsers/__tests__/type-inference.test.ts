/**
 * Tests for type inference
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferColumnTypes } from "../type-inference";

describe("inferColumnTypes", () => {
  describe("number inference", () => {
    it("should infer number type for integer values", () => {
      const rows = [{ age: "30" }, { age: "25" }, { age: "35" }];

      const columns = inferColumnTypes(rows, ["age"]);

      assert.equal(columns[0].type, "number");
    });

    it("should infer number type for decimal values", () => {
      const rows = [{ price: "19.99" }, { price: "25.50" }, { price: "10.00" }];

      const columns = inferColumnTypes(rows, ["price"]);

      assert.equal(columns[0].type, "number");
    });

    it("should infer number type for negative values", () => {
      const rows = [{ temp: "-5" }, { temp: "-10" }, { temp: "0" }];

      const columns = inferColumnTypes(rows, ["temp"]);

      assert.equal(columns[0].type, "number");
    });

    it("should infer number type for scientific notation", () => {
      const rows = [{ value: "1e10" }, { value: "2.5e-4" }];

      const columns = inferColumnTypes(rows, ["value"]);

      assert.equal(columns[0].type, "number");
    });

    it("should infer number type for values with commas", () => {
      const rows = [{ amount: "1,234.56" }, { amount: "9,999.99" }];

      const columns = inferColumnTypes(rows, ["amount"]);

      assert.equal(columns[0].type, "number");
    });
  });

  describe("boolean inference", () => {
    it("should infer boolean for true/false", () => {
      const rows = [{ active: "true" }, { active: "false" }];

      const columns = inferColumnTypes(rows, ["active"]);

      assert.equal(columns[0].type, "boolean");
    });

    it("should infer boolean for yes/no", () => {
      const rows = [{ approved: "yes" }, { approved: "no" }];

      const columns = inferColumnTypes(rows, ["approved"]);

      assert.equal(columns[0].type, "boolean");
    });

    it("should infer boolean for y/n", () => {
      const rows = [{ flag: "y" }, { flag: "n" }];

      const columns = inferColumnTypes(rows, ["flag"]);

      assert.equal(columns[0].type, "boolean");
    });

    it("should infer number for 1/0 (numeric values take priority)", () => {
      const rows = [{ enabled: "1" }, { enabled: "0" }];

      const columns = inferColumnTypes(rows, ["enabled"]);

      // Note: "1" and "0" are treated as numbers, not booleans
      // Use "true"/"false" or "yes"/"no" for boolean inference
      assert.equal(columns[0].type, "number");
    });

    it("should be case insensitive", () => {
      const rows = [{ active: "TRUE" }, { active: "False" }];

      const columns = inferColumnTypes(rows, ["active"]);

      assert.equal(columns[0].type, "boolean");
    });
  });

  describe("date inference", () => {
    it("should infer date for ISO format", () => {
      const rows = [{ date: "2023-01-15" }, { date: "2023-06-20" }];

      const columns = inferColumnTypes(rows, ["date"]);

      assert.equal(columns[0].type, "date");
    });

    it("should infer date for US format", () => {
      const rows = [{ date: "01/15/2023" }, { date: "6/20/2023" }];

      const columns = inferColumnTypes(rows, ["date"]);

      assert.equal(columns[0].type, "date");
    });

    it("should infer date for alternative formats", () => {
      const rows = [{ date: "15 January 2023" }, { date: "20 June 2023" }];

      const columns = inferColumnTypes(rows, ["date"]);

      assert.equal(columns[0].type, "date");
    });

    it("should infer date for text format", () => {
      const rows = [{ date: "Jan 15, 2023" }, { date: "June 20, 2023" }];

      const columns = inferColumnTypes(rows, ["date"]);

      assert.equal(columns[0].type, "date");
    });

    it("should infer date for ISO datetime", () => {
      const rows = [{ timestamp: "2023-01-15T10:30:00Z" }, { timestamp: "2023-06-20T15:45:00Z" }];

      const columns = inferColumnTypes(rows, ["timestamp"]);

      assert.equal(columns[0].type, "date");
    });
  });

  describe("string inference", () => {
    it("should infer string for text values", () => {
      const rows = [{ name: "John" }, { name: "Jane" }];

      const columns = inferColumnTypes(rows, ["name"]);

      assert.equal(columns[0].type, "string");
    });

    it("should infer string for mixed types", () => {
      const rows = [{ value: "30" }, { value: "hello" }];

      const columns = inferColumnTypes(rows, ["value"]);

      assert.equal(columns[0].type, "string");
    });

    it("should default to string for all-null columns", () => {
      const rows = [{ value: null }, { value: null }];

      const columns = inferColumnTypes(rows, ["value"]);

      assert.equal(columns[0].type, "string");
    });
  });

  describe("null handling", () => {
    it("should ignore null values in type inference", () => {
      const rows = [{ age: "30" }, { age: null }, { age: "25" }];

      const columns = inferColumnTypes(rows, ["age"]);

      assert.equal(columns[0].type, "number");
    });

    it("should count null and non-null values correctly", () => {
      const rows = [{ value: "test" }, { value: null }, { value: "" }, { value: "hello" }];

      const columns = inferColumnTypes(rows, ["value"]);

      assert.equal(columns[0].nonNullCount, 2);
      assert.equal(columns[0].nullCount, 2);
    });
  });

  describe("majority type inference", () => {
    it("should infer number when >80% are numbers", () => {
      const rows = [
        { value: "100" },
        { value: "200" },
        { value: "300" },
        { value: "400" },
        { value: "text" }, // Only 20% non-numeric
      ];

      const columns = inferColumnTypes(rows, ["value"]);

      assert.equal(columns[0].type, "number");
    });

    it("should infer string when types are mixed without clear majority", () => {
      const rows = [{ value: "100" }, { value: "200" }, { value: "text" }, { value: "hello" }];

      const columns = inferColumnTypes(rows, ["value"]);

      assert.equal(columns[0].type, "string");
    });
  });

  describe("sample values", () => {
    it("should provide up to 5 sample values", () => {
      const rows = [
        { name: "A" },
        { name: "B" },
        { name: "C" },
        { name: "D" },
        { name: "E" },
        { name: "F" },
      ];

      const columns = inferColumnTypes(rows, ["name"]);

      assert.equal(columns[0].sampleValues.length, 5);
    });

    it("should exclude null values from samples", () => {
      const rows = [{ name: "A" }, { name: null }, { name: "B" }, { name: "" }, { name: "C" }];

      const columns = inferColumnTypes(rows, ["name"]);

      assert.equal(columns[0].sampleValues.length, 3);
      assert.ok(columns[0].sampleValues.every((v) => v !== null && v !== ""));
    });
  });

  describe("multiple columns", () => {
    it("should infer types for all columns correctly", () => {
      const rows = [
        { name: "John", age: "30", active: "true", date: "2023-01-15" },
        { name: "Jane", age: "25", active: "false", date: "2023-06-20" },
      ];

      const columns = inferColumnTypes(rows, ["name", "age", "active", "date"]);

      assert.equal(columns[0].type, "string");
      assert.equal(columns[1].type, "number");
      assert.equal(columns[2].type, "boolean");
      assert.equal(columns[3].type, "date");
    });
  });

  describe("edge cases", () => {
    it("should handle empty rows array", () => {
      const rows: Record<string, unknown>[] = [];

      const columns = inferColumnTypes(rows, ["name"]);

      assert.equal(columns.length, 1);
      assert.equal(columns[0].type, "string");
      assert.equal(columns[0].nonNullCount, 0);
      assert.equal(columns[0].nullCount, 0);
    });

    it("should handle whitespace in values", () => {
      const rows = [{ age: "  30  " }, { age: "  25  " }];

      const columns = inferColumnTypes(rows, ["age"]);

      assert.equal(columns[0].type, "number");
    });
  });
});
