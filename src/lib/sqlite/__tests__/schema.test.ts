/**
 * Tests for SQLite schema operations
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { resetDatabaseCache } from "../cache";
import { deleteDatabase, getDatabase, insertRawData } from "../database";
import {
  createPipelineTables,
  dropPipelineTables,
  getParseConfig,
  getPipelineResultRowCount,
  getRawDataRowCount,
  isInitialized,
  storeParseConfig,
} from "../schema";
import type { ParseConfig } from "../types";

const TEST_PROJECT_ID = "test-schema-project";
const TEST_DATA_DIR = path.join(process.cwd(), "data", "sqlite", "test");

process.env.SQLITE_DB_DIR = TEST_DATA_DIR;

describe("SQLite Schema Operations", () => {
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

  describe("Schema Initialization", () => {
    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should initialize schema on new database", () => {
      const db = getDatabase(TEST_PROJECT_ID);

      // Check that tables exist
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;

      const tableNames = tables.map((t) => t.name);
      assert.ok(tableNames.includes("raw_data"), "Should have raw_data table");
      assert.ok(tableNames.includes("columns"), "Should have columns table");
      assert.ok(tableNames.includes("parse_config"), "Should have parse_config table");
    });

    it("should have correct pragmas set", () => {
      const db = getDatabase(TEST_PROJECT_ID);

      const journalMode = db.pragma("journal_mode", { simple: true });
      assert.strictEqual(journalMode, "wal", "Should use WAL mode");

      const synchronous = db.pragma("synchronous", { simple: true });
      assert.strictEqual(synchronous, 1, "Should use NORMAL synchronous mode");
    });

    it("should check if database is initialized", () => {
      const db = getDatabase(TEST_PROJECT_ID);

      assert.strictEqual(isInitialized(db), false, "Should not be initialized");

      // Add some data
      insertRawData(db, [{ test: "data" }]);

      assert.strictEqual(isInitialized(db), true, "Should be initialized");
    });
  });

  describe("Pipeline Tables", () => {
    const pipelineId = "test-pipeline-123";
    const sanitizedId = "test_pipeline_123"; // Hyphens replaced with underscores

    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should create pipeline result tables", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      createPipelineTables(db, pipelineId);

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;

      const tableNames = tables.map((t) => t.name);
      assert.ok(
        tableNames.includes(`pipeline_${sanitizedId}_result`),
        "Should have pipeline result table",
      );
      assert.ok(
        tableNames.includes(`pipeline_${sanitizedId}_columns`),
        "Should have pipeline columns table",
      );
    });

    it("should insert data into pipeline result table", () => {
      const db = getDatabase(TEST_PROJECT_ID);

      const stmt = db.prepare(`
        INSERT INTO pipeline_${sanitizedId}_result (data)
        VALUES (?)
      `);

      stmt.run(JSON.stringify({ result: "test" }));

      const count = getPipelineResultRowCount(db, pipelineId);
      assert.strictEqual(count, 1, "Should have 1 row in pipeline result");
    });

    it("should drop pipeline tables", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      dropPipelineTables(db, pipelineId);

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;

      const tableNames = tables.map((t) => t.name);
      assert.ok(
        !tableNames.includes(`pipeline_${sanitizedId}_result`),
        "Should not have pipeline result table",
      );
      assert.ok(
        !tableNames.includes(`pipeline_${sanitizedId}_columns`),
        "Should not have pipeline columns table",
      );
    });
  });

  describe("Parse Config Storage", () => {
    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should store and retrieve parse config", () => {
      const db = getDatabase(TEST_PROJECT_ID);

      const config: ParseConfig = {
        delimiter: ",",
        hasHeaders: true,
        encoding: "utf-8",
      };

      storeParseConfig(db, config);

      const retrieved = getParseConfig(db);
      assert.deepStrictEqual(retrieved, config, "Parse config should match");
    });

    it("should return null when no parse config exists", () => {
      const db = getDatabase(TEST_PROJECT_ID);

      // Clear the parse_config table
      db.exec("DELETE FROM parse_config");

      const retrieved = getParseConfig(db);
      assert.strictEqual(retrieved, null, "Should return null");
    });

    it("should update parse config on duplicate insert", () => {
      const db = getDatabase(TEST_PROJECT_ID);

      const config1: ParseConfig = {
        delimiter: ",",
        hasHeaders: true,
      };

      storeParseConfig(db, config1);

      const config2: ParseConfig = {
        delimiter: ";",
        hasHeaders: false,
      };

      storeParseConfig(db, config2);

      const retrieved = getParseConfig(db);
      assert.deepStrictEqual(retrieved, config2, "Should have updated config");
    });
  });

  describe("Row Counts", () => {
    before(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    after(() => {
      deleteDatabase(TEST_PROJECT_ID);
    });

    it("should get raw data row count", () => {
      const db = getDatabase(TEST_PROJECT_ID);

      assert.strictEqual(getRawDataRowCount(db), 0, "Should have 0 rows initially");

      insertRawData(db, [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ]);

      assert.strictEqual(getRawDataRowCount(db), 3, "Should have 3 rows");
    });

    it("should get pipeline result row count", () => {
      const db = getDatabase(TEST_PROJECT_ID);
      const pipelineId = "count-test-pipeline";
      const sanitized = "count_test_pipeline";

      createPipelineTables(db, pipelineId);

      assert.strictEqual(
        getPipelineResultRowCount(db, pipelineId),
        0,
        "Should have 0 rows initially",
      );

      const stmt = db.prepare(`
        INSERT INTO pipeline_${sanitized}_result (data)
        VALUES (?)
      `);

      stmt.run(JSON.stringify({ test: 1 }));
      stmt.run(JSON.stringify({ test: 2 }));

      assert.strictEqual(getPipelineResultRowCount(db, pipelineId), 2, "Should have 2 rows");
    });
  });
});
