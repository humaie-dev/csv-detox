/**
 * Integration tests for server-side file parsing and SQLite storage
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as fs from "fs";
import * as path from "path";
import { parseAndStoreFile, isProjectDataInitialized } from "../parser";
import {
  getDatabase,
  getRawData,
  getColumns,
  getRowCount,
  deleteDatabase,
} from "../database";
import { resetDatabaseCache } from "../cache";

const TEST_PROJECT_ID = "test-parser-project-001" as any;
const TEST_DATA_DIR = path.join(process.cwd(), "data", "sqlite", "test");

process.env.SQLITE_DB_DIR = TEST_DATA_DIR;

describe("SQLite Parser Integration", () => {
  before(() => {
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  after(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    resetDatabaseCache();
  });

  describe("CSV Parsing", () => {
    const csvContent = `name,age,city
Alice,30,NYC
Bob,25,LA
Charlie,35,Chicago`;

    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should parse CSV and store in SQLite", async () => {
      const buffer = new TextEncoder().encode(csvContent).buffer;

      const result = await parseAndStoreFile(
        TEST_PROJECT_ID,
        buffer,
        "test.csv",
        "text/csv"
      );

      assert.strictEqual(result.rowCount, 3, "Should parse 3 rows");
      assert.strictEqual(result.columns.length, 3, "Should have 3 columns");
    });

    it("should store data accessible via database queries", async () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const data = getRawData(db, 0, 10);

      assert.strictEqual(data.length, 3, "Should retrieve 3 rows");
      assert.strictEqual(data[0].data.name, "Alice", "First row should be Alice");
      assert.strictEqual(data[1].data.name, "Bob", "Second row should be Bob");
    });

    it("should store column metadata", async () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const columns = getColumns(db);

      assert.strictEqual(columns.length, 3, "Should have 3 columns");
      assert.ok(
        columns.find((c) => c.name === "name"),
        "Should have name column"
      );
      assert.ok(
        columns.find((c) => c.name === "age"),
        "Should have age column"
      );
      assert.ok(
        columns.find((c) => c.name === "city"),
        "Should have city column"
      );
    });

    it("should detect project as initialized", async () => {
      const initialized = isProjectDataInitialized(TEST_PROJECT_ID);
      assert.strictEqual(initialized, true, "Project should be initialized");
    });
  });

  describe("Parse Options", () => {
    const csvWithRange = `A,B,C,D
1,2,3,4
5,6,7,8
9,10,11,12
13,14,15,16`;

    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should respect row range options", async () => {
      const buffer = new TextEncoder().encode(csvWithRange).buffer;

      const result = await parseAndStoreFile(
        TEST_PROJECT_ID,
        buffer,
        "test.csv",
        "text/csv",
        {
          startRow: 1,
          endRow: 2,
          hasHeaders: true,
        }
      );

      // startRow=1 means "row 1 becomes headers", so we get row 2 as data
      assert.strictEqual(result.rowCount, 1, "Should parse 1 row (row 2 becomes data)");
    });

    it("should respect column range options", async () => {
      deleteDatabase(TEST_PROJECT_ID);
      const buffer = new TextEncoder().encode(csvWithRange).buffer;

      const result = await parseAndStoreFile(
        TEST_PROJECT_ID,
        buffer,
        "test.csv",
        "text/csv",
        {
          startColumn: 2,
          endColumn: 3,
          hasHeaders: true,
        }
      );

      assert.strictEqual(result.columns.length, 2, "Should have 2 columns (B, C)");
      const columnNames = result.columns.map((c) => c.name);
      assert.ok(columnNames.includes("B"), "Should include column B");
      assert.ok(columnNames.includes("C"), "Should include column C");
    });
  });

  describe("Batch Processing", () => {
    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should handle large CSV files with batching", async () => {
      // Generate 2500 rows (triggers 3 batches with BATCH_SIZE=1000)
      const rows = ["id,value"];
      for (let i = 1; i <= 2500; i++) {
        rows.push(`${i},value${i}`);
      }
      const csvContent = rows.join("\n");
      const buffer = new TextEncoder().encode(csvContent).buffer;

      const result = await parseAndStoreFile(
        TEST_PROJECT_ID,
        buffer,
        "large.csv",
        "text/csv"
      );

      assert.strictEqual(result.rowCount, 2500, "Should parse all 2500 rows");

      const db = getDatabase(TEST_PROJECT_ID);
      const count = getRowCount(db);
      assert.strictEqual(count, 2500, "Should store all 2500 rows");
    });
  });

  describe("Re-parsing", () => {
    const csvV1 = `name,age\nAlice,30\nBob,25`;
    const csvV2 = `name,age,city\nAlice,30,NYC\nBob,25,LA\nCharlie,35,Chicago`;

    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should clear old data when re-parsing", async () => {
      // Parse first version
      let buffer = new TextEncoder().encode(csvV1).buffer;
      await parseAndStoreFile(TEST_PROJECT_ID, buffer, "test.csv", "text/csv");

      let db = getDatabase(TEST_PROJECT_ID);
      let count1 = getRowCount(db);
      assert.strictEqual(count1, 2, "Should have 2 rows from v1");

      // Parse second version (more data)
      buffer = new TextEncoder().encode(csvV2).buffer;
      await parseAndStoreFile(TEST_PROJECT_ID, buffer, "test.csv", "text/csv");

      db = getDatabase(TEST_PROJECT_ID);
      const count2 = getRowCount(db);
      assert.strictEqual(count2, 3, "Should have 3 rows from v2 (old data cleared)");

      const columns = getColumns(db);
      assert.strictEqual(columns.length, 3, "Should have 3 columns from v2");
    });
  });
});
