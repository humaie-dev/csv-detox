/**
 * Tests for CSV Export Generator
 */

import { describe, test } from "node:test";
import assert from "node:assert";
import { generateCSV, sanitizeExportFilename } from "../csv";
import type { ParseResult } from "@/lib/parsers/types";

describe("generateCSV", () => {
  describe("basic CSV generation", () => {
    test("should generate CSV with headers and simple string data", () => {
      const input: ParseResult = {
        rows: [
          { name: "Alice", city: "NYC" },
          { name: "Bob", city: "LA" },
        ],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["Alice", "Bob"] },
          { name: "city", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["NYC", "LA"] },
        ],
        rowCount: 2,
        columnCount: 2,
        warnings: [],
      };

      const csv = generateCSV(input);

      // Should have UTF-8 BOM
      assert.strictEqual(csv.charCodeAt(0), 0xfeff, "Should start with UTF-8 BOM");

      // Remove BOM for easier testing
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name,city\r\nAlice,NYC\r\nBob,LA");
    });

    test("should handle empty table with headers only", () => {
      const input: ParseResult = {
        rows: [],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 0, sampleValues: [] },
          { name: "city", type: "string", nullCount: 0, nonNullCount: 0, sampleValues: [] },
        ],
        rowCount: 0,
        columnCount: 2,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name,city");
    });

    test("should handle single row", () => {
      const input: ParseResult = {
        rows: [{ name: "Alice" }],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 1, sampleValues: ["Alice"] },
        ],
        rowCount: 1,
        columnCount: 1,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name\r\nAlice");
    });

    test("should handle single column", () => {
      const input: ParseResult = {
        rows: [{ name: "Alice" }, { name: "Bob" }],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["Alice", "Bob"] },
        ],
        rowCount: 2,
        columnCount: 1,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name\r\nAlice\r\nBob");
    });
  });

  describe("data type handling", () => {
    test("should convert numbers to strings", () => {
      const input: ParseResult = {
        rows: [
          { name: "Alice", age: 30, score: 95.5 },
          { name: "Bob", age: 25, score: 87.2 },
        ],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["Alice", "Bob"] },
          { name: "age", type: "number", nullCount: 0, nonNullCount: 2, sampleValues: [30, 25] },
          { name: "score", type: "number", nullCount: 0, nonNullCount: 2, sampleValues: [95.5, 87.2] },
        ],
        rowCount: 2,
        columnCount: 3,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name,age,score\r\nAlice,30,95.5\r\nBob,25,87.2");
    });

    test("should convert booleans to strings", () => {
      const input: ParseResult = {
        rows: [
          { name: "Alice", active: true },
          { name: "Bob", active: false },
        ],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["Alice", "Bob"] },
          { name: "active", type: "boolean", nullCount: 0, nonNullCount: 2, sampleValues: [true, false] },
        ],
        rowCount: 2,
        columnCount: 2,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name,active\r\nAlice,true\r\nBob,false");
    });

    test("should handle null values as empty strings", () => {
      const input: ParseResult = {
        rows: [
          { name: "Alice", city: "NYC" },
          { name: "Bob", city: null },
          { name: null, city: "LA" },
        ],
        columns: [
          { name: "name", type: "string", nullCount: 1, nonNullCount: 2, sampleValues: ["Alice", "Bob"] },
          { name: "city", type: "string", nullCount: 1, nonNullCount: 2, sampleValues: ["NYC", "LA"] },
        ],
        rowCount: 3,
        columnCount: 2,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name,city\r\nAlice,NYC\r\nBob,\r\n,LA");
    });
  });

  describe("CSV escaping", () => {
    test("should quote fields containing commas", () => {
      const input: ParseResult = {
        rows: [
          { name: "Smith, John", city: "New York, NY" },
        ],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 1, sampleValues: ["Smith, John"] },
          { name: "city", type: "string", nullCount: 0, nonNullCount: 1, sampleValues: ["New York, NY"] },
        ],
        rowCount: 1,
        columnCount: 2,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, 'name,city\r\n"Smith, John","New York, NY"');
    });

    test("should escape quotes by doubling them", () => {
      const input: ParseResult = {
        rows: [
          { text: 'She said "Hello"' },
          { text: '"Quoted"' },
        ],
        columns: [
          { name: "text", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ['She said "Hello"', '"Quoted"'] },
        ],
        rowCount: 2,
        columnCount: 1,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, 'text\r\n"She said ""Hello"""\r\n"""Quoted"""');
    });

    test("should quote fields containing newlines", () => {
      const input: ParseResult = {
        rows: [
          { text: "Line 1\nLine 2" },
          { text: "Line 1\r\nLine 2" },
        ],
        columns: [
          { name: "text", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["Line 1\nLine 2"] },
        ],
        rowCount: 2,
        columnCount: 1,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, 'text\r\n"Line 1\nLine 2"\r\n"Line 1\r\nLine 2"');
    });

    test("should handle mixed special characters", () => {
      const input: ParseResult = {
        rows: [
          { text: 'She said, "Hello,\nWorld"' },
        ],
        columns: [
          { name: "text", type: "string", nullCount: 0, nonNullCount: 1, sampleValues: ['She said, "Hello,\nWorld"'] },
        ],
        rowCount: 1,
        columnCount: 1,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, 'text\r\n"She said, ""Hello,\nWorld"""');
    });
  });

  describe("Unicode and special characters", () => {
    test("should preserve Unicode characters", () => {
      const input: ParseResult = {
        rows: [
          { name: "Müller", city: "München" },
          { name: "José", city: "São Paulo" },
        ],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["Müller", "José"] },
          { name: "city", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["München", "São Paulo"] },
        ],
        rowCount: 2,
        columnCount: 2,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name,city\r\nMüller,München\r\nJosé,São Paulo");
    });

    test("should preserve emojis", () => {
      const input: ParseResult = {
        rows: [
          { name: "Alice", emoji: "🎉" },
          { name: "Bob", emoji: "👍" },
        ],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["Alice", "Bob"] },
          { name: "emoji", type: "string", nullCount: 0, nonNullCount: 2, sampleValues: ["🎉", "👍"] },
        ],
        rowCount: 2,
        columnCount: 2,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name,emoji\r\nAlice,🎉\r\nBob,👍");
    });

    test("should handle Chinese characters", () => {
      const input: ParseResult = {
        rows: [
          { name: "张三", city: "北京" },
        ],
        columns: [
          { name: "name", type: "string", nullCount: 0, nonNullCount: 1, sampleValues: ["张三"] },
          { name: "city", type: "string", nullCount: 0, nonNullCount: 1, sampleValues: ["北京"] },
        ],
        rowCount: 1,
        columnCount: 2,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, "name,city\r\n张三,北京");
    });
  });

  describe("column header escaping", () => {
    test("should escape column names with commas", () => {
      const input: ParseResult = {
        rows: [
          { "Name, First": "Alice", "City, State": "NYC, NY" },
        ],
        columns: [
          { name: "Name, First", type: "string", nullCount: 0, nonNullCount: 1, sampleValues: ["Alice"] },
          { name: "City, State", type: "string", nullCount: 0, nonNullCount: 1, sampleValues: ["NYC, NY"] },
        ],
        rowCount: 1,
        columnCount: 2,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, '"Name, First","City, State"\r\nAlice,"NYC, NY"');
    });

    test("should escape column names with quotes", () => {
      const input: ParseResult = {
        rows: [
          { 'Name "Nick"': "Alice" },
        ],
        columns: [
          { name: 'Name "Nick"', type: "string", nullCount: 0, nonNullCount: 1, sampleValues: ["Alice"] },
        ],
        rowCount: 1,
        columnCount: 1,
        warnings: [],
      };

      const csv = generateCSV(input);
      const withoutBOM = csv.substring(1);

      assert.strictEqual(withoutBOM, '"Name ""Nick"""\r\nAlice');
    });
  });
});

describe("sanitizeExportFilename", () => {
  test("should add _transformed suffix by default", () => {
    const result = sanitizeExportFilename("data.csv");
    assert.strictEqual(result, "data_transformed");
  });

  test("should remove extension", () => {
    const result = sanitizeExportFilename("sales_report.xlsx");
    assert.strictEqual(result, "sales_report_transformed");
  });

  test("should replace spaces with underscores", () => {
    const result = sanitizeExportFilename("Sales Data 2024.csv");
    assert.strictEqual(result, "Sales_Data_2024_transformed");
  });

  test("should remove special characters", () => {
    const result = sanitizeExportFilename("report!@#$%^&*.csv");
    assert.strictEqual(result, "report_transformed");
  });

  test("should handle path separators", () => {
    const result1 = sanitizeExportFilename("/path/to/file.csv");
    assert.strictEqual(result1, "file_transformed");

    const result2 = sanitizeExportFilename("C:\\Users\\data.csv");
    assert.strictEqual(result2, "data_transformed");
  });

  test("should collapse multiple underscores", () => {
    const result = sanitizeExportFilename("my___file___.csv");
    assert.strictEqual(result, "my_file_transformed");
  });

  test("should trim underscores from edges", () => {
    const result = sanitizeExportFilename("_file_.csv");
    assert.strictEqual(result, "file_transformed");
  });

  test("should use 'export' for empty/invalid filenames", () => {
    const result1 = sanitizeExportFilename("!@#$.csv");
    assert.strictEqual(result1, "export_transformed");

    const result2 = sanitizeExportFilename(".csv");
    assert.strictEqual(result2, "export_transformed");
  });

  test("should support custom suffix", () => {
    const result = sanitizeExportFilename("data.csv", "_final");
    assert.strictEqual(result, "data_final");
  });

  test("should handle filenames without extension", () => {
    const result = sanitizeExportFilename("datafile");
    assert.strictEqual(result, "datafile_transformed");
  });
});
