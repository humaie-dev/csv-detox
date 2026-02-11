# Spec: Server-Side SQLite Storage for File Data and Pipeline Operations
Date: 2026-02-11
ID: 018
Status: Draft

## Objective
Move all file parsing and data access operations from Convex and client-side DuckDB to a server-side SQLite database. This includes file parsing, pipeline execution, previews, and data sampling. The SQLite database will be the single source of truth for file contents and transformation results.

## Scope
### In scope
- Server-side file parsing (CSV, Excel) with results stored in SQLite
- SQLite schema for storing raw file data and pipeline execution results
- Next.js API routes for all data access operations (replacing Convex actions)
- Lazy hydration: SQLite database created/loaded on-demand when accessed
- LLM-accessible sampling API for data exploration
- Pipeline execution on server (not client or Convex)
- Preview data fetched from SQLite via server actions/API routes
- Caching layer for SQLite database instances
- Export functionality using SQLite data (not client-side DuckDB)

### Out of scope
- Convex file storage (keep using Convex Storage for file upload/download URLs)
- Convex metadata tables (keep projects, pipelines, uploads metadata in Convex)
- Real-time collaboration features
- Distributed SQLite (single-server deployment for now)

## Current Architecture (Problems)

### Issues with Current Approach:
1. **Convex Actions**: File parsing happens in Convex actions (64MB memory limit, timeouts)
2. **Client-Side DuckDB**: 
   - Large WASM bundle (~72MB) downloaded to browser
   - Files downloaded to client for processing
   - Privacy concern: sensitive data processed client-side
   - Performance: slow on mobile devices
3. **Scattered Logic**: Parsing in Convex, transformations in client, export in DuckDB-WASM
4. **No LLM Access**: No way for LLM to sample/explore file data for assistance

## New Architecture (Solution)

### Data Flow:
```
User uploads file
  ↓
Convex Storage (stores file)
  ↓
Server-side parser (Next.js API route)
  ↓
SQLite database (stores parsed data)
  ↓
Client requests preview → Next.js API route → SQLite query → JSON response
Client executes pipeline → Next.js API route → SQLite transformations → Results stored
Client exports data → Next.js API route → SQLite query → CSV download
LLM needs sample → Server action → SQLite query → Sample data
```

### SQLite Schema Design:

#### Database per Project
Each project gets its own SQLite database file: `{projectId}.db`

```sql
-- Raw file data (parsed from CSV/Excel)
CREATE TABLE raw_data (
  row_id INTEGER PRIMARY KEY,
  data JSON NOT NULL  -- Store row as JSON object {"col1": "val1", ...}
);

-- Column metadata (types, stats)
CREATE TABLE columns (
  name TEXT PRIMARY KEY,
  type TEXT NOT NULL,  -- 'string', 'number', 'boolean', 'date'
  null_count INTEGER DEFAULT 0,
  sample_values TEXT,  -- JSON array of sample values
  min_value TEXT,
  max_value TEXT
);

-- Pipeline execution results (one table per pipeline)
CREATE TABLE pipeline_{pipelineId}_result (
  row_id INTEGER PRIMARY KEY,
  data JSON NOT NULL
);

CREATE TABLE pipeline_{pipelineId}_columns (
  name TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  null_count INTEGER DEFAULT 0,
  sample_values TEXT
);

-- Parse config applied
CREATE TABLE parse_config (
  config JSON NOT NULL
);
```

#### Indexing Strategy
```sql
CREATE INDEX idx_raw_data_row_id ON raw_data(row_id);
-- JSON indexes for common queries (SQLite 3.38+)
CREATE INDEX idx_raw_data_json ON raw_data(json_extract(data, '$'));
```

## Implementation Plan

### Phase 1: SQLite Infrastructure (3-4 hours)
1. Install dependencies:
   - `better-sqlite3` - Fast SQLite bindings for Node.js
   - `@types/better-sqlite3` - TypeScript types
2. Create `src/lib/sqlite/`:
   - `types.ts` - TypeScript interfaces for DB operations
   - `database.ts` - SQLite wrapper with lazy hydration
   - `schema.ts` - Schema creation and migration functions
   - `queries.ts` - Common query patterns
3. Implement lazy hydration:
   ```typescript
   class ProjectDatabase {
     private db: Database | null = null;
     
     async hydrate(projectId: string) {
       if (this.db) return this.db;
       const dbPath = path.join(DATA_DIR, `${projectId}.db`);
       this.db = new Database(dbPath);
       await this.initSchema();
       return this.db;
     }
   }
   ```
4. Create database cache (LRU cache, max 10 open databases)
5. Write comprehensive unit tests

### Phase 2: Server-Side File Parsing (3-4 hours)
1. Create `src/app/api/projects/[projectId]/parse/route.ts`:
   - Download file from Convex Storage
   - Parse CSV/Excel using existing parsers
   - Store parsed data in SQLite
   - Return column metadata
2. Move parsing logic from `convex/parsers.ts` to server:
   - Keep CSV/Excel parser libraries in `src/lib/parsers/`
   - Remove Convex action wrappers
3. Update project creation flow:
   - Upload file to Convex Storage (keep this)
   - Create project in Convex (keep this)
   - Trigger server-side parse → create SQLite DB
4. Handle parse errors and retries

### Phase 3: Data Access API Routes (2-3 hours)
1. Create `src/app/api/projects/[projectId]/data/route.ts`:
   - GET `/api/projects/{projectId}/data?limit=100&offset=0`
   - Returns paginated raw data from SQLite
   - Used for preview in pipeline editor
2. Create `src/app/api/projects/[projectId]/columns/route.ts`:
   - GET `/api/projects/{projectId}/columns`
   - Returns column metadata (names, types, stats)
3. Create `src/app/api/projects/[projectId]/sample/route.ts`:
   - POST `/api/projects/{projectId}/sample` with query params
   - Flexible sampling for LLM exploration
   - Examples: random sample, value distribution, null analysis
4. Add authentication/authorization (project ownership check)

### Phase 4: Pipeline Execution API (4-5 hours)
1. Create `src/app/api/projects/[projectId]/pipelines/[pipelineId]/execute/route.ts`:
   - POST with steps array
   - Executes transformation pipeline on SQLite data
   - Stores results in `pipeline_{pipelineId}_result` table
   - Returns execution metadata (row count, warnings, etc.)
2. Implement server-side pipeline executor:
   - Reuse existing operation logic from `src/lib/pipeline/operations/`
   - Execute transformations in-memory on batches
   - Write results to SQLite incrementally (streaming)
3. Create `src/app/api/projects/[projectId]/pipelines/[pipelineId]/preview/route.ts`:
   - GET with optional `?upToStep=3` parameter
   - Returns preview of pipeline execution (first 100 rows)
   - Executes pipeline on-the-fly (don't store intermediate results)
4. Handle large datasets:
   - Batch processing for operations like deduplicate, sort
   - Progress reporting via streaming response

### Phase 5: Update Frontend (3-4 hours)
1. Remove DuckDB-WASM dependencies:
   - `@duckdb/duckdb-wasm`
   - All files in `src/lib/duckdb/`
2. Update pipeline editor (`src/app/projects/[projectId]/pipelines/[pipelineId]/page.tsx`):
   - Replace DuckDB preview with API fetch
   - Use Server Actions or API routes for data loading
   - Remove file download logic (no longer needed on client)
3. Update components:
   - `DataTable` - unchanged (receives data from API)
   - `AddStepDialog` - fetch columns from API
   - `ExportButton` - call export API route
4. Create React hooks for API calls:
   - `useProjectData(projectId)` - Fetch raw data
   - `usePipelinePreview(projectId, pipelineId, steps)` - Execute preview
   - `useColumns(projectId)` - Fetch column metadata

### Phase 6: Export Functionality (2 hours)
1. Create `src/app/api/projects/[projectId]/pipelines/[pipelineId]/export/route.ts`:
   - GET route that streams CSV data
   - Executes full pipeline on SQLite data
   - Streams result as CSV (no memory issues)
   - Proper headers for file download
2. Update `ExportButton` component:
   - Remove DuckDB-WASM logic
   - Simple download link to export API route
   - Show progress if available (via fetch streaming)

### Phase 7: LLM Sampling API (2-3 hours)
1. Create `src/lib/sqlite/sampling.ts`:
   - `getRandomSample(db, n)` - Random n rows
   - `getColumnDistribution(db, column)` - Value frequency
   - `getColumnStats(db, column)` - Min, max, avg, null count
   - `searchValues(db, column, pattern)` - Pattern matching
   - `getRowRange(db, startRow, endRow)` - Specific rows
2. Create Server Action for LLM access:
   ```typescript
   // src/app/actions/sample-data.ts
   'use server';
   export async function sampleProjectData(projectId, query) {
     // Parse natural language query
     // Execute appropriate SQLite query
     // Return formatted results
   }
   ```
3. Document sampling API for LLM usage
4. Add rate limiting and access controls

### Phase 8: Testing & Migration (3-4 hours)
1. Unit tests:
   - SQLite wrapper operations (10 tests)
   - Server-side parsing (15 tests)
   - Pipeline execution (20 tests existing + 10 new)
   - Sampling API (8 tests)
2. Integration tests:
   - Full flow: upload → parse → store → preview → execute → export
   - Large file handling (1M+ rows)
   - Error scenarios (corrupt files, OOM, etc.)
3. Performance testing:
   - Compare SQLite vs DuckDB-WASM performance
   - Measure API response times
   - Optimize slow queries
4. Migration plan:
   - No data migration needed (fresh start approach)
   - Remove DuckDB-WASM code after verification
   - Update documentation

## Technical Details

### SQLite Configuration
```typescript
const db = new Database(dbPath, {
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
  verbose: console.log // Only in dev
});

// Performance optimizations
db.pragma('journal_mode = WAL'); // Write-Ahead Logging
db.pragma('synchronous = NORMAL'); // Balance safety/speed
db.pragma('cache_size = 10000'); // ~40MB cache
db.pragma('temp_store = MEMORY'); // Temp tables in RAM
```

### Data Storage Format
Store rows as JSON for flexibility:
```json
{
  "row_id": 1,
  "data": {
    "name": "John Doe",
    "age": 30,
    "email": "john@example.com"
  }
}
```

Benefits:
- Schema-less (handle dynamic columns)
- Easy to serialize/deserialize
- SQLite JSON functions for querying

### Caching Strategy
```typescript
class DatabaseCache {
  private cache = new LRU<string, Database>({ max: 10 });
  
  get(projectId: string): Database | null {
    return this.cache.get(projectId);
  }
  
  set(projectId: string, db: Database) {
    this.cache.set(projectId, db);
  }
}
```

### API Response Format
```typescript
// GET /api/projects/{projectId}/data
{
  "data": [
    {"name": "John", "age": 30},
    {"name": "Jane", "age": 25}
  ],
  "columns": [
    {"name": "name", "type": "string"},
    {"name": "age", "type": "number"}
  ],
  "pagination": {
    "offset": 0,
    "limit": 100,
    "total": 10000
  }
}
```

## Testing Plan

### Unit Tests
- SQLite wrapper: 10 tests (open, close, query, transaction, error handling)
- Server-side parsing: 15 tests (CSV, Excel, ranges, errors)
- Pipeline execution: 30 tests (all 14 operations + edge cases)
- Sampling API: 8 tests (random, distribution, stats, search)

### Integration Tests
- Full data flow: Upload → Parse → Store → Query
- Pipeline execution: Raw data → Transformations → Results
- Export: Pipeline → SQLite → CSV stream
- Large file handling: 1M rows, 100 columns

### Performance Tests
- Parse 100K rows: < 2 seconds
- Query 1M rows with filters: < 500ms
- Pipeline execution (10 steps, 100K rows): < 5 seconds
- Export 1M rows to CSV: < 10 seconds

## Acceptance Criteria
- AC1: File parsing happens server-side via Next.js API routes
- AC2: Parsed data stored in SQLite database (one DB per project)
- AC3: All data access goes through server (no client-side file processing)
- AC4: Pipeline execution happens on server with SQLite
- AC5: Preview data fetched from SQLite via API (max 100 rows)
- AC6: LLM can sample data via server actions (random, stats, search)
- AC7: Export streams CSV from SQLite (no memory issues)
- AC8: DuckDB-WASM completely removed from client bundle
- AC9: SQLite databases lazily hydrated (loaded on first access)
- AC10: Database cache prevents excessive file handles
- AC11: All 466+ existing tests still pass
- AC12: New tests for SQLite operations (60+ new tests)
- AC13: Performance: 1M rows parse + store in < 10 seconds
- AC14: Memory: Server handles 10 concurrent large file operations

## Design Decisions

1. **SQLite per project**: Isolation, easier cleanup, parallel access
2. **JSON column storage**: Flexible schema, handles dynamic columns
3. **Lazy hydration**: Only open DB when needed, close after idle timeout
4. **LRU cache**: Keep hot databases open, close cold ones
5. **Server-side only**: No SQLite on client (security, performance)
6. **Streaming export**: Don't load entire result set in memory
7. **Batch processing**: Process large files in chunks (10K rows per batch)
8. **Keep Convex for metadata**: Projects, pipelines, uploads (perfect fit)
9. **WAL mode**: Better concurrency, faster writes
10. **API routes over Server Actions**: More flexible, better for streaming

## Migration Strategy

### Phase 1: Parallel Implementation (No Breaking Changes)
- Add SQLite infrastructure alongside existing code
- Create new API routes without removing old ones
- Test thoroughly with real data

### Phase 2: Switch Frontend (Feature Flag)
- Add feature flag: `USE_SQLITE_BACKEND`
- Update frontend to use new API routes when flag enabled
- A/B test performance and stability

### Phase 3: Remove DuckDB-WASM (Clean Up)
- Remove DuckDB-WASM dependencies
- Delete `src/lib/duckdb/` directory
- Remove unused Convex actions
- Update documentation

## Security Considerations

1. **Access Control**: Verify user owns project before allowing data access
2. **SQL Injection**: Use parameterized queries (better-sqlite3 handles this)
3. **Rate Limiting**: Limit API calls per user (prevent abuse)
4. **File Size Limits**: Max 500MB files (prevent disk space issues)
5. **Database Encryption**: Optional SQLite encryption for sensitive data
6. **Temporary Files**: Clean up temp files after parsing errors

## Deployment Considerations

1. **Disk Space**: Each project = one SQLite file (plan for growth)
2. **Backups**: Backup SQLite files separately from Convex data
3. **Scaling**: Single server initially, can add read replicas later
4. **Monitoring**: Track DB file sizes, query performance, cache hit rates
5. **Cleanup**: Delete SQLite files when projects deleted

## Future Enhancements (Out of Scope)
- Distributed SQLite with Turso or LiteFS
- SQLite replication for high availability
- Query result caching with Redis
- Real-time updates with SQLite triggers + WebSockets
- Multi-tenant SQLite database (all projects in one DB)
