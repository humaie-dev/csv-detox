/**
 * SQLite schema creation and migration functions
 */

import type { Database } from "better-sqlite3";
import type { ParseConfig } from "./types";

/**
 * Initialize database schema for a new project
 */
export function initializeSchema(db: Database): void {
  // Enable WAL mode for better concurrency
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = 10000"); // ~40MB cache
  db.pragma("temp_store = MEMORY");

  // Create raw_data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS raw_data (
      row_id INTEGER PRIMARY KEY,
      data JSON NOT NULL
    );
  `);

  // Create columns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS columns (
      name TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      null_count INTEGER DEFAULT 0,
      sample_values TEXT,
      min_value TEXT,
      max_value TEXT
    );
  `);

  // Create parse_config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS parse_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config JSON NOT NULL
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_raw_data_row_id ON raw_data(row_id);
  `);
}

/**
 * Sanitize pipeline ID for use in table names
 * SQLite table names can't contain hyphens
 */
function sanitizePipelineId(pipelineId: string): string {
  return pipelineId.replace(/-/g, "_");
}

/**
 * Create pipeline result tables
 */
export function createPipelineTables(db: Database, pipelineId: string): void {
  const sanitized = sanitizePipelineId(pipelineId);
  const resultTableName = `pipeline_${sanitized}_result`;
  const columnsTableName = `pipeline_${sanitized}_columns`;

  db.exec(`
    CREATE TABLE IF NOT EXISTS ${resultTableName} (
      row_id INTEGER PRIMARY KEY,
      data JSON NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ${columnsTableName} (
      name TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      null_count INTEGER DEFAULT 0,
      sample_values TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_${resultTableName}_row_id ON ${resultTableName}(row_id);
  `);
}

/**
 * Drop pipeline result tables
 */
export function dropPipelineTables(db: Database, pipelineId: string): void {
  const sanitized = sanitizePipelineId(pipelineId);
  const resultTableName = `pipeline_${sanitized}_result`;
  const columnsTableName = `pipeline_${sanitized}_columns`;

  db.exec(`DROP TABLE IF EXISTS ${resultTableName};`);
  db.exec(`DROP TABLE IF EXISTS ${columnsTableName};`);
}

/**
 * Store parse configuration
 */
export function storeParseConfig(db: Database, config: ParseConfig): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO parse_config (id, config)
    VALUES (1, ?)
  `);
  stmt.run(JSON.stringify(config));
}

/**
 * Get parse configuration
 */
export function getParseConfig(db: Database): ParseConfig | null {
  const stmt = db.prepare(`SELECT config FROM parse_config WHERE id = 1`);
  const row = stmt.get() as { config: string } | undefined;
  return row ? JSON.parse(row.config) : null;
}

/**
 * Check if database has been initialized with data
 */
export function isInitialized(db: Database): boolean {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM raw_data`);
  const result = stmt.get() as { count: number };
  return result.count > 0;
}

/**
 * Get row count from raw_data
 */
export function getRawDataRowCount(db: Database): number {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM raw_data`);
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Get row count from pipeline result
 */
export function getPipelineResultRowCount(db: Database, pipelineId: string): number {
  const sanitized = sanitizePipelineId(pipelineId);
  const tableName = `pipeline_${sanitized}_result`;
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
  const result = stmt.get() as { count: number };
  return result.count;
}
