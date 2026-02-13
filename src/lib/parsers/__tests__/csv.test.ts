/**
 * Tests for CSV parser
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCSV } from "../csv";
import { ParseError } from "../types";

describe("parseCSV", () => {
  describe("basic parsing", () => {
    it("should parse simple CSV with comma delimiter", () => {
      const csv = `name,age,city
John,30,NYC
Jane,25,LA`;

      const result = parseCSV(csv);

      assert.equal(result.rowCount, 2);
      assert.equal(result.columns.length, 3);
      assert.deepEqual(result.rows[0], { name: "John", age: "30", city: "NYC" });
      assert.deepEqual(result.rows[1], { name: "Jane", age: "25", city: "LA" });
    });

    it("should parse CSV with semicolon delimiter", () => {
      const csv = `name;age;city
John;30;NYC`;

      const result = parseCSV(csv, { delimiter: ";" });

      assert.equal(result.rowCount, 1);
      assert.deepEqual(result.rows[0], { name: "John", age: "30", city: "NYC" });
    });

    it("should auto-detect semicolon delimiter", () => {
      const csv = `name;age;city
John;30;NYC
Jane;25;LA`;

      const result = parseCSV(csv);

      assert.equal(result.rowCount, 2);
      assert.deepEqual(result.rows[0], { name: "John", age: "30", city: "NYC" });
    });

    it("should parse CSV with tab delimiter", () => {
      const csv = `name\tage\tcity
John\t30\tNYC`;

      const result = parseCSV(csv, { delimiter: "\t" });

      assert.equal(result.rowCount, 1);
      assert.deepEqual(result.rows[0], { name: "John", age: "30", city: "NYC" });
    });

    it("should handle CRLF line endings", () => {
      const csv = "name,age\r\nJohn,30\r\nJane,25";

      const result = parseCSV(csv);

      assert.equal(result.rowCount, 2);
    });
  });

  describe("quoted fields", () => {
    it("should handle quoted fields with commas", () => {
      const csv = `name,address
"John Doe","123 Main St, NYC"`;

      const result = parseCSV(csv);

      assert.deepEqual(result.rows[0], {
        name: "John Doe",
        address: "123 Main St, NYC",
      });
    });

    it("should handle quoted fields with escaped quotes", () => {
      const csv = `name,quote
"John","He said ""hello"""`;

      const result = parseCSV(csv);

      assert.deepEqual(result.rows[0], {
        name: "John",
        quote: 'He said "hello"',
      });
    });

    it("should handle mixed quoted and unquoted fields", () => {
      const csv = `name,age,city
John,30,"New York"`;

      const result = parseCSV(csv);

      assert.deepEqual(result.rows[0], {
        name: "John",
        age: "30",
        city: "New York",
      });
    });
  });

  describe("empty values", () => {
    it("should convert empty strings to null", () => {
      const csv = `name,age,city
John,,NYC`;

      const result = parseCSV(csv);

      assert.deepEqual(result.rows[0], { name: "John", age: null, city: "NYC" });
    });

    it("should handle rows with all empty values", () => {
      const csv = `name,age,city
,,`;

      const result = parseCSV(csv);

      assert.deepEqual(result.rows[0], { name: null, age: null, city: null });
    });
  });

  describe("type inference", () => {
    it("should infer number type", () => {
      const csv = `name,age
John,30
Jane,25`;

      const result = parseCSV(csv, { inferTypes: true });

      const ageColumn = result.columns.find((c) => c.name === "age");
      assert.equal(ageColumn?.type, "number");
    });

    it("should infer boolean type", () => {
      const csv = `name,active
John,true
Jane,false`;

      const result = parseCSV(csv, { inferTypes: true });

      const activeColumn = result.columns.find((c) => c.name === "active");
      assert.equal(activeColumn?.type, "boolean");
    });

    it("should infer date type", () => {
      const csv = `name,birthdate
John,2000-01-15
Jane,1995-06-20`;

      const result = parseCSV(csv, { inferTypes: true });

      const birthdateColumn = result.columns.find((c) => c.name === "birthdate");
      assert.equal(birthdateColumn?.type, "date");
    });

    it("should default to string for mixed types", () => {
      const csv = `name,value
John,30
Jane,hello`;

      const result = parseCSV(csv, { inferTypes: true });

      const valueColumn = result.columns.find((c) => c.name === "value");
      assert.equal(valueColumn?.type, "string");
    });

    it("should skip type inference when inferTypes is false", () => {
      const csv = `name,age
John,30`;

      const result = parseCSV(csv, { inferTypes: false });

      const ageColumn = result.columns.find((c) => c.name === "age");
      assert.equal(ageColumn?.type, "string");
    });
  });

  describe("maxRows option", () => {
    it("should limit rows when maxRows is specified", () => {
      const csv = `name,age
John,30
Jane,25
Bob,35`;

      const result = parseCSV(csv, { maxRows: 2 });

      assert.equal(result.rowCount, 2);
      assert.equal(result.rows.length, 2);
    });
  });

  describe("column metadata", () => {
    it("should provide correct null/non-null counts", () => {
      const csv = `name,age
John,30
Jane,
Bob,35`;

      const result = parseCSV(csv, { inferTypes: true });

      const ageColumn = result.columns.find((c) => c.name === "age");
      assert.equal(ageColumn?.nonNullCount, 2);
      assert.equal(ageColumn?.nullCount, 1);
    });

    it("should provide sample values", () => {
      const csv = `name,age
John,30
Jane,25`;

      const result = parseCSV(csv, { inferTypes: true });

      const ageColumn = result.columns.find((c) => c.name === "age");
      assert.ok(ageColumn?.sampleValues.length > 0);
    });
  });

  describe("warnings", () => {
    it("should warn about duplicate column names", () => {
      const csv = `name,age,name
John,30,John2`;

      const result = parseCSV(csv);

      assert.ok(result.warnings.length > 0);
      assert.ok(result.warnings[0].includes("Duplicate"));
    });

    it("should warn about rows with wrong column count", () => {
      const csv = `name,age,city
John,30
Jane,25,LA`;

      const result = parseCSV(csv);

      assert.ok(result.warnings.length > 0);
      assert.ok(result.warnings[0].includes("malformed"));
    });
  });

  describe("error handling", () => {
    it("should throw ParseError for empty file", () => {
      assert.throws(() => {
        parseCSV("");
      }, ParseError);
    });

    it("should throw ParseError for file with only whitespace", () => {
      assert.throws(() => {
        parseCSV("   \n  \n  ");
      }, ParseError);
    });
  });

  describe("edge cases", () => {
    it("should handle single column", () => {
      const csv = `name
John
Jane`;

      const result = parseCSV(csv);

      assert.equal(result.columns.length, 1);
      assert.equal(result.rowCount, 2);
    });

    it("should handle single row", () => {
      const csv = `name,age
John,30`;

      const result = parseCSV(csv);

      assert.equal(result.rowCount, 1);
    });

    it("should handle trailing newlines", () => {
      const csv = `name,age
John,30

`;

      const result = parseCSV(csv);

      assert.equal(result.rowCount, 1);
    });

    it("should handle whitespace in values", () => {
      const csv = `name,age
  John  ,  30  `;

      const result = parseCSV(csv);

      assert.deepEqual(result.rows[0], { name: "John", age: "30" });
    });
  });
});
