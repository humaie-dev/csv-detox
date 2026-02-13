/**
 * SQLite database wrapper with lazy hydration
 */

import * as fs from "node:fs";
import * as path from "node:path";
import Database from "better-sqlite3";
import { getDatabaseCache } from "./cache";
import { initializeSchema } from "./schema";
import type { ColumnMetadata, RawDataRow } from "./types";

// Database directory (configurable via env)
const DB_DIR = process.env.SQLITE_DB_DIR || path.join(process.cwd(), "data", "sqlite");

/**
 * Ensure database directory exists
 */
function ensureDbDirectory(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

/**
 * Get database file path for a project
 */
export function getDatabasePath(projectId: string): string {
  ensureDbDirectory();
  return path.join(DB_DIR, `${projectId}.db`);
}

/**
 * Open or retrieve cached database for a project
 * Uses lazy hydration - database is only opened when accessed
 */
export function getDatabase(projectId: string): Database.Database {
  const cache = getDatabaseCache();

  // Check cache first
  const cached = cache.get(projectId);
  if (cached) {
    return cached;
  }

  // Open database
  const dbPath = getDatabasePath(projectId);
  const isNewDb = !fs.existsSync(dbPath);

  const db = new Database(dbPath, {
    readonly: false,
    fileMustExist: false,
    timeout: 5000,
    verbose: process.env.NODE_ENV === "development" ? console.info : undefined,
  });

  // Initialize schema if new database
  if (isNewDb) {
    initializeSchema(db);
  }

  // Cache the database
  cache.set(projectId, db);

  return db;
}

/**
 * Close database and remove from cache
 */
export function closeDatabase(projectId: string): void {
  const cache = getDatabaseCache();
  cache.remove(projectId);
}

/**
 * Delete database file for a project
 */
export function deleteDatabase(projectId: string): void {
  // Close and remove from cache first
  closeDatabase(projectId);

  // Delete file
  const dbPath = getDatabasePath(projectId);
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);

    // Also delete WAL and SHM files if they exist
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  }
}

/**
 * Check if database exists for a project
 */
export function databaseExists(projectId: string): boolean {
  const dbPath = getDatabasePath(projectId);
  return fs.existsSync(dbPath);
}

/**
 * Insert raw data rows in batch
 */
export function insertRawData(db: Database.Database, rows: Array<Record<string, unknown>>): void {
  const insert = db.prepare(`
    INSERT INTO raw_data (data)
    VALUES (?)
  `);

  const insertMany = db.transaction((rows: Array<Record<string, unknown>>) => {
    for (const row of rows) {
      insert.run(JSON.stringify(row));
    }
  });

  insertMany(rows);
}

/**
 * Insert column metadata
 */
export function insertColumns(db: Database.Database, columns: ColumnMetadata[]): void {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO columns (name, type, null_count, sample_values, min_value, max_value)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((cols: ColumnMetadata[]) => {
    for (const col of cols) {
      insert.run(
        col.name,
        col.type,
        col.nullCount,
        col.sampleValues ? JSON.stringify(col.sampleValues) : null,
        col.minValue || null,
        col.maxValue || null,
      );
    }
  });

  insertMany(columns);
}

/**
 * Get all columns metadata
 */
export function getColumns(db: Database.Database): ColumnMetadata[] {
  const stmt = db.prepare(`
    SELECT name, type, null_count, sample_values, min_value, max_value
    FROM columns
  `);

  const rows = stmt.all() as Array<{
    name: string;
    type: string;
    null_count: number;
    sample_values: string | null;
    min_value: string | null;
    max_value: string | null;
  }>;

  return rows.map((row) => ({
    name: row.name,
    type: row.type as "string" | "number" | "boolean" | "date",
    nullCount: row.null_count,
    sampleValues: row.sample_values ? JSON.parse(row.sample_values) : undefined,
    minValue: row.min_value || undefined,
    maxValue: row.max_value || undefined,
  }));
}

/**
 * Get raw data with pagination
 */
export function getRawData(
  db: Database.Database,
  offset: number = 0,
  limit: number = 100,
): RawDataRow[] {
  const stmt = db.prepare(`
    SELECT row_id, data
    FROM raw_data
    ORDER BY row_id
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset) as Array<{
    row_id: number;
    data: string;
  }>;

  return rows.map((row) => ({
    row_id: row.row_id,
    data: JSON.parse(row.data),
  }));
}

/**
 * Get total row count
 */
export function getRowCount(db: Database.Database): number {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM raw_data`);
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Clear all data from database (for testing)
 */
export function clearAllData(db: Database.Database): void {
  db.exec(`DELETE FROM raw_data`);
  db.exec(`DELETE FROM columns`);
  db.exec(`DELETE FROM parse_config`);
}
