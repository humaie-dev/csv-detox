/**
 * LRU cache for SQLite database instances
 * Keeps max 10 databases open to prevent excessive file handles
 */

import { LRUCache } from "lru-cache";
import type { Database } from "better-sqlite3";

export interface CachedDatabase {
  db: Database;
  projectId: string;
  lastAccessed: number;
}

class DatabaseCache {
  private cache: LRUCache<string, CachedDatabase>;

  constructor(maxSize: number = 10) {
    this.cache = new LRUCache<string, CachedDatabase>({
      max: maxSize,
      dispose: (value: CachedDatabase) => {
        // Close database when evicted from cache
        try {
          value.db.close();
          console.log(`[DatabaseCache] Closed database for project: ${value.projectId}`);
        } catch (error) {
          console.error(`[DatabaseCache] Error closing database for project ${value.projectId}:`, error);
        }
      },
    });
  }

  /**
   * Get database from cache
   */
  get(projectId: string): Database | null {
    const cached = this.cache.get(projectId);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.db;
    }
    return null;
  }

  /**
   * Set database in cache
   */
  set(projectId: string, db: Database): void {
    this.cache.set(projectId, {
      db,
      projectId,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Remove database from cache and close it
   */
  remove(projectId: string): void {
    const cached = this.cache.get(projectId);
    if (cached) {
      this.cache.delete(projectId);
      // Dispose handler will close the database
    }
  }

  /**
   * Clear all databases from cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if project is cached
   */
  has(projectId: string): boolean {
    return this.cache.has(projectId);
  }
}

// Global singleton instance
let cacheInstance: DatabaseCache | null = null;

/**
 * Get or create database cache singleton
 */
export function getDatabaseCache(): DatabaseCache {
  if (!cacheInstance) {
    cacheInstance = new DatabaseCache(10);
  }
  return cacheInstance;
}

/**
 * Reset cache (for testing)
 */
export function resetDatabaseCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
    cacheInstance = null;
  }
}
