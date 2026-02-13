/**
 * Tests for CSV export functionality
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { closeDatabase, getDatabase } from "../database";
import { createPipelineTables, dropPipelineTables, initializeSchema } from "../schema";
import type { ColumnMetadata, RawDataRow } from "../types";

describe("CSV Export Utilities", () => {
  let testDir: string;

  beforeEach(() => {
    // Create temp directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-export-test-"));
    process.env.SQLITE_DATA_DIR = testDir;
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("CSV Field Escaping", () => {
    test("should escape fields with commas", () => {
      const input = "hello, world";
      const expected = '"hello, world"';
      assert.equal(escapeCSVField(input), expected);
    });

    test("should escape fields with quotes", () => {
      const input = 'hello "world"';
      const expected = '"hello ""world"""';
      assert.equal(escapeCSVField(input), expected);
    });

    test("should escape fields with newlines", () => {
      const input = "hello\nworld";
      const expected = '"hello\nworld"';
      assert.equal(escapeCSVField(input), expected);
    });

    test("should not escape simple fields", () => {
      const input = "hello";
      const expected = "hello";
      assert.equal(escapeCSVField(input), expected);
    });
  });

  describe("CSV Value Formatting", () => {
    test("should format null as empty string", () => {
      assert.equal(formatCSVValue(null), "");
    });

    test("should format undefined as empty string", () => {
      assert.equal(formatCSVValue(undefined), "");
    });

    test("should format boolean as string", () => {
      assert.equal(formatCSVValue(true), "true");
      assert.equal(formatCSVValue(false), "false");
    });

    test("should format number as string", () => {
      assert.equal(formatCSVValue(42), "42");
      assert.equal(formatCSVValue(3.14), "3.14");
    });

    test("should format date as ISO string", () => {
      const date = new Date("2024-02-11T10:00:00.000Z");
      assert.equal(formatCSVValue(date), "2024-02-11T10:00:00.000Z");
    });

    test("should format object as JSON", () => {
      const obj = { foo: "bar" };
      assert.equal(formatCSVValue(obj), '{"foo":"bar"}');
    });

    test("should format array as JSON", () => {
      const arr = [1, 2, 3];
      assert.equal(formatCSVValue(arr), "[1,2,3]");
    });
  });

  describe("Raw Data Export", () => {
    test("should export raw data as CSV", () => {
      const projectId = `test-export-1-${Date.now()}-${Math.random()}`;
      const db = getDatabase(projectId);
      initializeSchema(db);

      // Insert test data
      const rows: RawDataRow[] = [
        { row_id: 1, data: { name: "Alice", age: 30, city: "NYC" } },
        { row_id: 2, data: { name: "Bob", age: 25, city: "LA" } },
        { row_id: 3, data: { name: 'Charlie "The Great"', age: 35, city: "Chicago, IL" } },
      ];

      const insertStmt = db.prepare(`
        INSERT INTO raw_data (row_id, data)
        VALUES (?, ?)
      `);

      for (const row of rows) {
        insertStmt.run(row.row_id, JSON.stringify(row.data));
      }

      // Insert columns
      const columns: Array<Omit<ColumnMetadata, "sampleValues">> = [
        { name: "name", type: "string", nullCount: 0 },
        { name: "age", type: "number", nullCount: 0 },
        { name: "city", type: "string", nullCount: 0 },
      ];

      const colStmt = db.prepare(`
        INSERT INTO columns (name, type, null_count)
        VALUES (?, ?, ?)
      `);

      for (const col of columns) {
        colStmt.run(col.name, col.type, col.nullCount);
      }

      // Generate CSV
      const csv = generateCSV(db, "raw_data", columns);

      // Verify CSV content
      const lines = csv.split("\r\n").filter((line) => line.length > 0);
      assert.equal(lines.length, 4); // Header + 3 data rows

      // Check header
      assert.equal(lines[0], "name,age,city");

      // Check data rows
      assert.equal(lines[1], "Alice,30,NYC");
      assert.equal(lines[2], "Bob,25,LA");
      assert.equal(lines[3], '"Charlie ""The Great""",35,"Chicago, IL"');

      // Clean up
      closeDatabase(projectId);
    });

    test("should handle null values in export", () => {
      const projectId = `test-export-2-${Date.now()}-${Math.random()}`;
      const db = getDatabase(projectId);
      initializeSchema(db);

      // Insert test data with nulls
      const rows: RawDataRow[] = [
        { row_id: 1, data: { name: "Alice", age: null, city: "NYC" } },
        { row_id: 2, data: { name: null, age: 25, city: null } },
      ];

      const insertStmt = db.prepare(`
        INSERT INTO raw_data (row_id, data)
        VALUES (?, ?)
      `);

      for (const row of rows) {
        insertStmt.run(row.row_id, JSON.stringify(row.data));
      }

      // Insert columns
      const columns: Array<Omit<ColumnMetadata, "sampleValues">> = [
        { name: "name", type: "string", nullCount: 1 },
        { name: "age", type: "number", nullCount: 1 },
        { name: "city", type: "string", nullCount: 1 },
      ];

      const colStmt = db.prepare(`
        INSERT INTO columns (name, type, null_count)
        VALUES (?, ?, ?)
      `);

      for (const col of columns) {
        colStmt.run(col.name, col.type, col.nullCount);
      }

      // Generate CSV
      const csv = generateCSV(db, "raw_data", columns);

      // Verify CSV content
      const lines = csv.split("\r\n").filter((line) => line.length > 0);
      assert.equal(lines.length, 3);

      // Check data rows with nulls (empty strings)
      assert.equal(lines[1], "Alice,,NYC");
      assert.equal(lines[2], ",25,");

      // Clean up
      closeDatabase(projectId);
    });
  });

  describe("Pipeline Results Export", () => {
    test("should export pipeline results as CSV", () => {
      const projectId = `test-export-3-${Date.now()}-${Math.random()}`;
      const db = getDatabase(projectId);
      initializeSchema(db);
      const pipelineId = "test-pipeline-123";

      // Create pipeline tables
      createPipelineTables(db, pipelineId);

      // Insert pipeline results
      const sanitized = pipelineId.replace(/-/g, "_");
      const resultTableName = `pipeline_${sanitized}_result`;
      const columnsTableName = `pipeline_${sanitized}_columns`;

      const rows: RawDataRow[] = [
        { row_id: 1, data: { product: "Widget", price: 19.99, inStock: true } },
        { row_id: 2, data: { product: "Gadget", price: 29.99, inStock: false } },
      ];

      const insertStmt = db.prepare(`
        INSERT INTO ${resultTableName} (row_id, data)
        VALUES (?, ?)
      `);

      for (const row of rows) {
        insertStmt.run(row.row_id, JSON.stringify(row.data));
      }

      // Insert column metadata
      const columns: Array<Omit<ColumnMetadata, "sampleValues">> = [
        { name: "product", type: "string", nullCount: 0 },
        { name: "price", type: "number", nullCount: 0 },
        { name: "inStock", type: "boolean", nullCount: 0 },
      ];

      const colStmt = db.prepare(`
        INSERT INTO ${columnsTableName} (name, type, null_count)
        VALUES (?, ?, ?)
      `);

      for (const col of columns) {
        colStmt.run(col.name, col.type, col.nullCount);
      }

      // Generate CSV
      const csv = generateCSV(db, resultTableName, columns);

      // Verify CSV content
      const lines = csv.split("\r\n").filter((line) => line.length > 0);
      assert.equal(lines.length, 3);

      // Check header
      assert.equal(lines[0], "product,price,inStock");

      // Check data rows
      assert.equal(lines[1], "Widget,19.99,true");
      assert.equal(lines[2], "Gadget,29.99,false");

      // Clean up
      dropPipelineTables(db, pipelineId);
      closeDatabase(projectId);
    });
  });

  describe("Large Dataset Export", () => {
    test("should handle large datasets efficiently", () => {
      const projectId = `test-export-4-${Date.now()}-${Math.random()}`;
      const db = getDatabase(projectId);
      initializeSchema(db);

      // Insert 10,000 rows
      const insertStmt = db.prepare(`
        INSERT INTO raw_data (row_id, data)
        VALUES (?, ?)
      `);

      const transaction = db.transaction(() => {
        for (let i = 1; i <= 10000; i++) {
          insertStmt.run(
            i,
            JSON.stringify({
              id: i,
              name: `User ${i}`,
              email: `user${i}@example.com`,
            }),
          );
        }
      });

      transaction();

      // Insert columns
      const columns: Array<Omit<ColumnMetadata, "sampleValues">> = [
        { name: "id", type: "number", nullCount: 0 },
        { name: "name", type: "string", nullCount: 0 },
        { name: "email", type: "string", nullCount: 0 },
      ];

      const colStmt = db.prepare(`
        INSERT INTO columns (name, type, null_count)
        VALUES (?, ?, ?)
      `);

      for (const col of columns) {
        colStmt.run(col.name, col.type, col.nullCount);
      }

      // Generate CSV (should not throw or timeout)
      const startTime = Date.now();
      const csv = generateCSV(db, "raw_data", columns);
      const duration = Date.now() - startTime;

      // Verify it completed reasonably fast (< 1 second for 10k rows)
      assert.ok(duration < 1000, `Export took too long: ${duration}ms`);

      // Verify row count
      const lines = csv.split("\r\n").filter((line) => line.length > 0);
      assert.equal(lines.length, 10001); // Header + 10,000 data rows

      // Clean up
      closeDatabase(projectId);
    });
  });
});

// Helper functions (same as in export route)
function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function escapeCSVField(field: string): string {
  if (field.includes('"') || field.includes(",") || field.includes("\n") || field.includes("\r")) {
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return field;
}

function generateCSV(
  db: import("better-sqlite3").Database,
  tableName: string,
  columns: Array<{ name: string; type: string; nullCount: number }>,
): string {
  const lines: string[] = [];

  // Add header
  const headerRow = columns.map((col) => escapeCSVField(col.name)).join(",");
  lines.push(headerRow);

  // Add data rows
  const stmt = db.prepare(`
    SELECT row_id, data
    FROM ${tableName}
    ORDER BY row_id
  `);

  const rows = stmt.all() as Array<{ row_id: number; data: string }>;

  for (const row of rows) {
    const rowData = JSON.parse(row.data);
    const csvRow = columns
      .map((col) => {
        const value = rowData[col.name];
        return escapeCSVField(formatCSVValue(value));
      })
      .join(",");
    lines.push(csvRow);
  }

  return `${lines.join("\r\n")}\r\n`;
}
