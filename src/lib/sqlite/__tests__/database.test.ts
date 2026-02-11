/**
 * Tests for SQLite database operations
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs";
import * as path from "path";
import {
  getDatabase,
  closeDatabase,
  deleteDatabase,
  databaseExists,
  getDatabasePath,
  insertRawData,
  insertColumns,
  getColumns,
  getRawData,
  getRowCount,
  clearAllData,
} from "../database";
import { resetDatabaseCache } from "../cache";
import type { ColumnMetadata } from "../types";

const TEST_PROJECT_ID = "test-project-123";
const TEST_DATA_DIR = path.join(process.cwd(), "data", "sqlite", "test");

// Override DB directory for testing
process.env.SQLITE_DB_DIR = TEST_DATA_DIR;

describe("SQLite Database Operations", () => {
  before(() => {
    // Ensure test directory exists
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  after(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    resetDatabaseCache();
  });

  describe("Database Creation and Management", () => {
    it("should create a new database", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      assert.ok(db, "Database should be created");
      assert.ok(databaseExists(TEST_PROJECT_ID), "Database file should exist");
      closeDatabase(TEST_PROJECT_ID);
    });

    it("should return cached database on second access", () => {
      const db1 = getDatabase(TEST_PROJECT_ID);
      const db2 = getDatabase(TEST_PROJECT_ID);
      assert.strictEqual(db1, db2, "Should return same database instance");
      closeDatabase(TEST_PROJECT_ID);
    });

    it("should get correct database path", () => {
      const dbPath = getDatabasePath(TEST_PROJECT_ID);
      assert.ok(dbPath.includes(TEST_PROJECT_ID), "Path should include project ID");
      assert.ok(dbPath.endsWith(".db"), "Path should end with .db");
    });

    it("should delete database file", () => {
      getDatabase(TEST_PROJECT_ID); // Create it first
      deleteDatabase(TEST_PROJECT_ID);
      assert.ok(!databaseExists(TEST_PROJECT_ID), "Database should be deleted");
    });
  });

  describe("Data Insertion and Retrieval", () => {
    before(() => {
      // Create fresh database for these tests
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should insert raw data rows", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const rows = [
        { name: "Alice", age: 30, city: "NYC" },
        { name: "Bob", age: 25, city: "LA" },
        { name: "Charlie", age: 35, city: "Chicago" },
      ];

      insertRawData(db, rows);

      const count = getRowCount(db);
      assert.strictEqual(count, 3, "Should have 3 rows");
    });

    it("should retrieve raw data with pagination", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      
      // Get first 2 rows
      const rows = getRawData(db, 0, 2);
      assert.strictEqual(rows.length, 2, "Should return 2 rows");
      assert.ok(rows[0].data.name, "Should have name field");
      assert.ok(rows[0].data.age, "Should have age field");
    });

    it("should insert and retrieve column metadata", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const columns: ColumnMetadata[] = [
        {
          name: "name",
          type: "string",
          nullCount: 0,
          sampleValues: ["Alice", "Bob", "Charlie"],
        },
        {
          name: "age",
          type: "number",
          nullCount: 0,
          minValue: "25",
          maxValue: "35",
        },
      ];

      insertColumns(db, columns);

      const retrieved = getColumns(db);
      assert.strictEqual(retrieved.length, 2, "Should have 2 columns");
      assert.strictEqual(retrieved[0].name, "name", "First column should be name");
      assert.strictEqual(retrieved[1].name, "age", "Second column should be age");
      assert.deepStrictEqual(
        retrieved[0].sampleValues,
        ["Alice", "Bob", "Charlie"],
        "Sample values should match"
      );
    });

    it("should clear all data", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      clearAllData(db);
      
      const count = getRowCount(db);
      assert.strictEqual(count, 0, "Should have 0 rows after clearing");
      
      const columns = getColumns(db);
      assert.strictEqual(columns.length, 0, "Should have 0 columns after clearing");
    });
  });

  describe("Batch Operations", () => {
    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should handle large batch inserts", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      
      // Generate 1000 rows
      const rows = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        value: Math.random() * 100,
      }));

      insertRawData(db, rows);

      const count = getRowCount(db);
      assert.strictEqual(count, 1000, "Should have 1000 rows");
    });

    it("should retrieve data with different pagination parameters", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      
      const page1 = getRawData(db, 0, 10);
      assert.strictEqual(page1.length, 10, "First page should have 10 rows");
      
      const page2 = getRawData(db, 10, 10);
      assert.strictEqual(page2.length, 10, "Second page should have 10 rows");
      
      // Verify no overlap
      assert.notStrictEqual(
        page1[0].row_id,
        page2[0].row_id,
        "Pages should not overlap"
      );
    });
  });

  describe("Edge Cases", () => {
    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should handle empty data insertion", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      insertRawData(db, []);
      
      const count = getRowCount(db);
      assert.strictEqual(count, 0, "Should have 0 rows");
    });

    it("should handle null values in data", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const rows = [
        { name: "Alice", age: null, city: "NYC" },
        { name: null, age: 30, city: null },
      ];

      insertRawData(db, rows);

      const retrieved = getRawData(db, 0, 10);
      assert.strictEqual(retrieved.length, 2, "Should have 2 rows");
      assert.strictEqual(retrieved[0].data.age, null, "Null age should be preserved");
    });

    it("should handle special characters in data", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      clearAllData(db);
      
      const rows = [
        { name: "O'Brien", message: 'He said "hello"', symbol: "€£¥" },
      ];

      insertRawData(db, rows);

      const retrieved = getRawData(db, 0, 10);
      assert.strictEqual(retrieved[0].data.name, "O'Brien", "Should handle quotes");
      assert.strictEqual(
        retrieved[0].data.message,
        'He said "hello"',
        "Should handle nested quotes"
      );
    });
  });
});
