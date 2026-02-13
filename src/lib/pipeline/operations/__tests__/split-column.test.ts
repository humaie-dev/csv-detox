/**
 * Unit tests for split-column operation
 */

import * as assert from "node:assert";
import { describe, it } from "node:test";
import type { ParseResult } from "@/lib/parsers/types";
import type { SplitColumnConfig } from "@/lib/pipeline/types";
import { splitColumn } from "../split-column";

describe("splitColumn", () => {
  // Delimiter method tests
  describe("delimiter method", () => {
    it("should split by space delimiter", () => {
      const table: ParseResult = {
        rows: [{ Name: "John Doe" }, { Name: "Jane Smith" }],
        columns: [
          {
            name: "Name",
            type: "string",
            nonNullCount: 2,
            nullCount: 0,
            sampleValues: ["John Doe", "Jane Smith"],
          },
        ],
        rowCount: 2,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["FirstName", "LastName"],
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rowCount, 2);
      assert.strictEqual(result.rows[0].FirstName, "John");
      assert.strictEqual(result.rows[0].LastName, "Doe");
      assert.strictEqual(result.rows[1].FirstName, "Jane");
      assert.strictEqual(result.rows[1].LastName, "Smith");
      assert.strictEqual(result.rows[0].Name, undefined); // Original removed by default
    });

    it("should split by comma delimiter", () => {
      const table: ParseResult = {
        rows: [{ Address: "123 Main St,Springfield,IL" }],
        columns: [
          {
            name: "Address",
            type: "string",
            nonNullCount: 1,
            nullCount: 0,
            sampleValues: ["123 Main St,Springfield,IL"],
          },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Address",
        method: "delimiter",
        delimiter: ",",
        newColumns: ["Street", "City", "State"],
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].Street, "123 Main St");
      assert.strictEqual(result.rows[0].City, "Springfield");
      assert.strictEqual(result.rows[0].State, "IL");
    });

    it("should handle fewer parts than new columns (fill with null)", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }], // No last name
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["FirstName", "LastName"],
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].FirstName, "John");
      assert.strictEqual(result.rows[0].LastName, null);
    });

    it("should handle more parts than new columns", () => {
      const table: ParseResult = {
        rows: [{ Name: "John Middle Doe" }],
        columns: [
          {
            name: "Name",
            type: "string",
            nonNullCount: 1,
            nullCount: 0,
            sampleValues: ["John Middle Doe"],
          },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["FirstName", "LastName"],
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].FirstName, "John");
      assert.strictEqual(result.rows[0].LastName, "Middle"); // Only takes first two parts
    });

    it("should trim whitespace when trim=true (default)", () => {
      const table: ParseResult = {
        rows: [{ Name: " John , Doe " }],
        columns: [
          {
            name: "Name",
            type: "string",
            nonNullCount: 1,
            nullCount: 0,
            sampleValues: [" John , Doe "],
          },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: ",",
        newColumns: ["FirstName", "LastName"],
        trim: true,
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].FirstName, "John");
      assert.strictEqual(result.rows[0].LastName, "Doe");
    });

    it("should not trim whitespace when trim=false", () => {
      const table: ParseResult = {
        rows: [{ Name: " John , Doe " }],
        columns: [
          {
            name: "Name",
            type: "string",
            nonNullCount: 1,
            nullCount: 0,
            sampleValues: [" John , Doe "],
          },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: ",",
        newColumns: ["FirstName", "LastName"],
        trim: false,
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].FirstName, " John ");
      assert.strictEqual(result.rows[0].LastName, " Doe ");
    });

    it("should keep original column when keepOriginal=true", () => {
      const table: ParseResult = {
        rows: [{ Name: "John Doe" }],
        columns: [
          {
            name: "Name",
            type: "string",
            nonNullCount: 1,
            nullCount: 0,
            sampleValues: ["John Doe"],
          },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["FirstName", "LastName"],
        keepOriginal: true,
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].Name, "John Doe");
      assert.strictEqual(result.rows[0].FirstName, "John");
      assert.strictEqual(result.rows[0].LastName, "Doe");
    });

    it("should respect maxSplits limit", () => {
      const table: ParseResult = {
        rows: [{ Name: "John Middle Jr Doe" }],
        columns: [
          {
            name: "Name",
            type: "string",
            nonNullCount: 1,
            nullCount: 0,
            sampleValues: ["John Middle Jr Doe"],
          },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["FirstName", "LastName"],
        maxSplits: 1, // Only split once
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].FirstName, "John");
      assert.strictEqual(result.rows[0].LastName, "Middle Jr Doe"); // Rest as last part
    });

    it("should handle null values", () => {
      const table: ParseResult = {
        rows: [{ Name: null }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 0, nullCount: 1, sampleValues: [] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["FirstName", "LastName"],
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].FirstName, "");
      assert.strictEqual(result.rows[0].LastName, null);
    });
  });

  // Position method tests
  describe("position method", () => {
    it("should split by fixed positions", () => {
      const table: ParseResult = {
        rows: [{ Code: "ABC123DEF" }],
        columns: [
          {
            name: "Code",
            type: "string",
            nonNullCount: 1,
            nullCount: 0,
            sampleValues: ["ABC123DEF"],
          },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Code",
        method: "position",
        positions: [0, 3, 6], // Split at chars 0-3, 3-6, 6-end
        newColumns: ["Part1", "Part2", "Part3"],
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].Part1, "ABC");
      assert.strictEqual(result.rows[0].Part2, "123");
      assert.strictEqual(result.rows[0].Part3, "DEF");
    });

    it("should handle positions beyond string length", () => {
      const table: ParseResult = {
        rows: [{ Code: "ABC" }],
        columns: [
          { name: "Code", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["ABC"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Code",
        method: "position",
        positions: [0, 3, 10], // Position 10 is beyond string length
        newColumns: ["Part1", "Part2"],
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].Part1, "ABC");
      assert.strictEqual(result.rows[0].Part2, "");
    });
  });

  // Regex method tests
  describe("regex method", () => {
    it("should split by regex pattern", () => {
      const table: ParseResult = {
        rows: [{ Data: "one:two;three" }],
        columns: [
          {
            name: "Data",
            type: "string",
            nonNullCount: 1,
            nullCount: 0,
            sampleValues: ["one:two;three"],
          },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Data",
        method: "regex",
        pattern: "[:;]", // Split on : or ;
        newColumns: ["Part1", "Part2", "Part3"],
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].Part1, "one");
      assert.strictEqual(result.rows[0].Part2, "two");
      assert.strictEqual(result.rows[0].Part3, "three");
    });

    it("should handle maxSplits with regex", () => {
      const table: ParseResult = {
        rows: [{ Data: "one:two:three" }],
        columns: [
          {
            name: "Data",
            type: "string",
            nonNullCount: 1,
            nullCount: 0,
            sampleValues: ["one:two:three"],
          },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Data",
        method: "regex",
        pattern: ":",
        newColumns: ["Part1", "Part2"],
        maxSplits: 1,
      };

      const { table: result } = splitColumn(table, config);

      assert.strictEqual(result.rows[0].Part1, "one");
      assert.strictEqual(result.rows[0].Part2, "two:three");
    });
  });

  // Validation tests
  describe("validation", () => {
    it("should throw error if column does not exist", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "InvalidColumn",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["First", "Last"],
      };

      assert.throws(() => splitColumn(table, config), /Column "InvalidColumn" does not exist/);
    });

    it("should throw error if no new columns specified", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: [],
      };

      assert.throws(() => splitColumn(table, config), /At least one new column must be specified/);
    });

    it("should throw error if new column already exists", () => {
      const table: ParseResult = {
        rows: [{ Name: "John", Age: 30 }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
          { name: "Age", type: "number", nonNullCount: 1, nullCount: 0, sampleValues: [30] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["First", "Age"], // Age already exists
      };

      assert.throws(() => splitColumn(table, config), /New column "Age" already exists/);
    });

    it("should throw error if new column names are empty", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["First", "  "], // Empty name
      };

      assert.throws(() => splitColumn(table, config), /New column names cannot be empty/);
    });

    it("should throw error if new column names are duplicates", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        delimiter: " ",
        newColumns: ["First", "First"], // Duplicate
      };

      assert.throws(() => splitColumn(table, config), /New column names must be unique/);
    });

    it("should throw error if delimiter is undefined for delimiter method", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "delimiter",
        newColumns: ["First", "Last"],
      };

      assert.throws(
        () => splitColumn(table, config),
        /Delimiter must be specified for delimiter method/,
      );
    });

    it("should throw error if positions are undefined for position method", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "position",
        newColumns: ["First", "Last"],
      };

      assert.throws(
        () => splitColumn(table, config),
        /Positions must be specified for position method/,
      );
    });

    it("should throw error if pattern is undefined for regex method", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "regex",
        newColumns: ["First", "Last"],
      };

      assert.throws(() => splitColumn(table, config), /Pattern must be specified for regex method/);
    });

    it("should throw error for invalid regex pattern", () => {
      const table: ParseResult = {
        rows: [{ Name: "John" }],
        columns: [
          { name: "Name", type: "string", nonNullCount: 1, nullCount: 0, sampleValues: ["John"] },
        ],
        rowCount: 1,
        warnings: [],
      };

      const config: SplitColumnConfig = {
        type: "split_column",
        column: "Name",
        method: "regex",
        pattern: "[", // Invalid regex
        newColumns: ["First", "Last"],
      };

      assert.throws(() => splitColumn(table, config), /Invalid regex pattern/);
    });
  });
});
