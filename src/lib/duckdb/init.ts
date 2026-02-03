/**
 * DuckDB-WASM initialization and caching
 */

import * as duckdb from "@duckdb/duckdb-wasm";
import type { DuckDBInstance } from "./types";

// Global cache for DuckDB instance
let cachedInstance: DuckDBInstance | null = null;
let initializationPromise: Promise<DuckDBInstance> | null = null;

/**
 * Initialize DuckDB-WASM with worker support
 * 
 * First initialization takes 5-10 seconds to download WASM bundle.
 * Subsequent calls return cached instance immediately.
 */
export async function initDuckDB(): Promise<DuckDBInstance> {
  // Return cached instance if available
  if (cachedInstance) {
    return cachedInstance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Use local DuckDB bundles from public directory
      // This avoids CORS issues with CDN-served worker files
      const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
        mvp: {
          mainModule: "/duckdb/duckdb-mvp.wasm",
          mainWorker: "/duckdb/duckdb-browser-mvp.worker.js",
        },
        eh: {
          mainModule: "/duckdb/duckdb-eh.wasm",
          mainWorker: "/duckdb/duckdb-browser-eh.worker.js",
        },
      };

      // Select best bundle for the browser
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

      // Instantiate DuckDB with worker
      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      // Get version info
      const conn = await db.connect();
      const versionResult = await conn.query("SELECT version() as version");
      const version = versionResult.toArray()[0]?.version?.toString() || "unknown";
      await conn.close();

      const instance: DuckDBInstance = { db, version };
      cachedInstance = instance;
      initializationPromise = null;

      return instance;
    } catch (error) {
      initializationPromise = null;
      throw new Error(
        `Failed to initialize DuckDB-WASM: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  })();

  return initializationPromise;
}

/**
 * Clear the cached DuckDB instance (for testing or cleanup)
 */
export function clearDuckDBCache(): void {
  cachedInstance = null;
  initializationPromise = null;
}
