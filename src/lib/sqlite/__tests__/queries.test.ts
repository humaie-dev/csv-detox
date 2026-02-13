/**
 * Tests for SQLite query operations
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { resetDatabaseCache } from "../cache";
import { deleteDatabase, getDatabase, insertRawData } from "../database";
import {
  countRowsWhere,
  getColumnDistribution,
  getColumnStats,
  getDistinctValues,
  getRandomSample,
  getRowRange,
  searchColumnValues,
} from "../queries";

const TEST_PROJECT_ID = "test-query-project";
const TEST_DATA_DIR = path.join(process.cwd(), "data", "sqlite", "test");

process.env.SQLITE_DB_DIR = TEST_DATA_DIR;

describe("SQLite Query Operations", () => {
  before(() => {
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }

    // Create test database with sample data
    deleteDatabase(TEST_PROJECT_ID);
    const db = getDatabase(TEST_PROJECT_ID);

    const rows = [
      { id: 1, name: "Alice", age: 30, city: "NYC", score: 85.5 },
      { id: 2, name: "Bob", age: 25, city: "LA", score: 92.0 },
      { id: 3, name: "Charlie", age: 35, city: "Chicago", score: 78.3 },
      { id: 4, name: "Diana", age: 28, city: "NYC", score: 88.7 },
      { id: 5, name: "Eve", age: 32, city: "LA", score: 95.2 },
      { id: 6, name: "Frank", age: 29, city: "Chicago", score: 82.1 },
      { id: 7, name: "Grace", age: 31, city: "NYC", score: 90.0 },
      { id: 8, name: "Henry", age: 27, city: "LA", score: 87.5 },
      { id: 9, name: "Iris", age: 33, city: "Chicago", score: 91.8 },
      { id: 10, name: "Jack", age: 26, city: "NYC", score: 84.2 },
    ];

    insertRawData(db, rows);
  });

  after(() => {
    deleteDatabase(TEST_PROJECT_ID);
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    resetDatabaseCache();
  });

  describe("Random Sampling", () => {
    it("should get random sample of rows", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const sample = getRandomSample(db, "raw_data", 5);

      assert.strictEqual(sample.length, 5, "Should return 5 rows");
      assert.ok(sample[0].name, "Should have name field");
      assert.ok(sample[0].age, "Should have age field");
    });

    it("should not exceed available rows", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const sample = getRandomSample(db, "raw_data", 100);

      assert.ok(sample.length <= 10, "Should not exceed 10 rows");
    });
  });

  describe("Row Range Queries", () => {
    it("should get rows by ID range", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const rows = getRowRange(db, 3, 6);

      assert.strictEqual(rows.length, 4, "Should return 4 rows (3-6 inclusive)");
      assert.strictEqual(rows[0].id, 3, "First row should have id 3");
      assert.strictEqual(rows[3].id, 6, "Last row should have id 6");
    });

    it("should handle single row range", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const rows = getRowRange(db, 5, 5);

      assert.strictEqual(rows.length, 1, "Should return 1 row");
      assert.strictEqual(rows[0].id, 5, "Should be row with id 5");
    });
  });

  describe("Column Statistics", () => {
    it("should calculate stats for numeric column", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const stats = getColumnStats(db, "age", "raw_data", 100);

      assert.strictEqual(stats.name, "age", "Should be age column");
      assert.strictEqual(stats.type, "number", "Should be number type");
      assert.strictEqual(stats.count, 10, "Should have 10 samples");
      assert.strictEqual(stats.nullCount, 0, "Should have 0 nulls");
      assert.strictEqual(stats.minValue, 25, "Min age should be 25");
      assert.strictEqual(stats.maxValue, 35, "Max age should be 35");
      assert.ok(stats.avgValue, "Should have average value");
      assert.ok(stats.avgValue! > 25 && stats.avgValue! < 35, "Avg should be in range");
    });

    it("should calculate stats for string column", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const stats = getColumnStats(db, "city", "raw_data", 100);

      assert.strictEqual(stats.name, "city", "Should be city column");
      assert.strictEqual(stats.type, "string", "Should be string type");
      assert.strictEqual(stats.uniqueCount, 3, "Should have 3 unique cities");
    });
  });

  describe("Column Distribution", () => {
    it("should get value distribution for column", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const dist = getColumnDistribution(db, "city", "raw_data", 10, 100);

      assert.strictEqual(dist.column, "city", "Should be city column");
      assert.ok(dist.values.length > 0, "Should have values");
      assert.ok(dist.values.length <= 3, "Should have at most 3 unique cities");

      // Check that percentages sum to ~100
      const totalPct = dist.values.reduce((sum, v) => sum + v.percentage, 0);
      assert.ok(totalPct > 99 && totalPct <= 100, "Percentages should sum to ~100");
    });

    it("should limit results to top N values", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const dist = getColumnDistribution(db, "city", "raw_data", 2, 100);

      assert.strictEqual(dist.values.length, 2, "Should limit to 2 values");
    });

    it("should sort by frequency descending", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const dist = getColumnDistribution(db, "city", "raw_data", 10, 100);

      // Check that counts are in descending order
      for (let i = 1; i < dist.values.length; i++) {
        assert.ok(
          dist.values[i - 1].count >= dist.values[i].count,
          "Values should be sorted by count descending",
        );
      }
    });
  });

  describe("Search Operations", () => {
    it("should search for matching values", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const results = searchColumnValues(db, "name", "a", "raw_data", 100);

      assert.ok(results.length > 0, "Should find matches");

      // All results should contain 'a' (case-insensitive)
      for (const row of results) {
        const name = (row.name as string).toLowerCase();
        assert.ok(name.includes("a"), `Name ${row.name} should contain 'a'`);
      }
    });

    it("should limit search results", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const results = searchColumnValues(db, "name", "a", "raw_data", 3);

      assert.ok(results.length <= 3, "Should limit to 3 results");
    });

    it("should return empty array when no matches", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const results = searchColumnValues(db, "name", "xyz123", "raw_data", 100);

      assert.strictEqual(results.length, 0, "Should return empty array");
    });
  });

  describe("Count Operations", () => {
    it("should count rows matching condition", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const count = countRowsWhere(db, "city", "NYC", "raw_data");

      assert.strictEqual(count, 4, "Should have 4 rows with NYC");
    });

    it("should return 0 for non-existent values", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const count = countRowsWhere(db, "city", "Paris", "raw_data");

      assert.strictEqual(count, 0, "Should have 0 rows");
    });
  });

  describe("Distinct Values", () => {
    it("should get distinct values", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const values = getDistinctValues(db, "city", "raw_data", 100);

      assert.strictEqual(values.length, 3, "Should have 3 distinct cities");
      assert.ok(values.includes("NYC"), "Should include NYC");
      assert.ok(values.includes("LA"), "Should include LA");
      assert.ok(values.includes("Chicago"), "Should include Chicago");
    });

    it("should limit distinct values", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const values = getDistinctValues(db, "city", "raw_data", 2);

      assert.strictEqual(values.length, 2, "Should limit to 2 values");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty table", () => {
      const emptyProjectId = "empty-test-project";
      deleteDatabase(emptyProjectId);
      const db = getDatabase(emptyProjectId);

      const sample = getRandomSample(db, "raw_data", 10);
      assert.strictEqual(sample.length, 0, "Should return empty array");

      deleteDatabase(emptyProjectId);
    });

    it("should handle null values in column stats", () => {
      const nullProjectId = "null-test-project";
      deleteDatabase(nullProjectId);
      const db = getDatabase(nullProjectId);

      insertRawData(db, [
        { id: 1, value: 10 },
        { id: 2, value: null },
        { id: 3, value: 20 },
      ]);

      const stats = getColumnStats(db, "value", "raw_data", 100);
      assert.strictEqual(stats.nullCount, 1, "Should count null values");

      deleteDatabase(nullProjectId);
    });
  });
});
