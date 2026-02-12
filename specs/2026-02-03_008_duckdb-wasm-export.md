# Spec: Client-Side Export with DuckDB-WASM
Date: 2026-02-03
ID: 008
Status: Superseded

## Objective
Enable users to export full CSV/Excel files (1M+ rows) by processing transformations client-side using DuckDB-WASM, eliminating the 5000-row preview limit caused by Convex's 64MB memory constraint.

## Scope
### In scope
- Client-side DuckDB-WASM integration for export only
- Convert all 14 transformation operations to SQL
- Progress UI with download button after completion
- Handle browser memory limits gracefully (OOM errors)
- Support CSV and Excel files up to browser limits (~200MB desktop, ~50MB mobile)
- Export entire file after all transformations applied

### Out of scope
- Server-side DuckDB integration (Convex has 512MB RAM limit, no persistent disk)
- Preview system changes (preview stays at 5000 rows, server-side)
- Manual chunking implementation (DuckDB handles internally)
- Cancellation of in-progress exports (show warning only)
- Web Worker optimization (future enhancement)

## Requirements
### Functional
- FR1: Export button triggers client-side DuckDB-WASM processing for full file
- FR2: Download entire file from Convex Storage to browser
- FR3: Load file into DuckDB in-memory database
- FR4: Translate all 14 pipeline operations to SQL statements
- FR5: Execute SQL transformations in sequence
- FR6: Export final result as CSV with UTF-8 BOM
- FR7: Show "Download" button after export completes (user controls when to save)
- FR8: Prevent concurrent exports (show "Export already in progress" message)
- FR9: Display progress modal with stages: Initialize → Load → Transform → Generate → Ready
- FR10: Handle browser OOM errors with helpful message suggesting smaller file

### Non-functional
- NFR1: Support files up to 200MB on desktop browsers (1M+ rows typical)
- NFR2: Support files up to 50MB on mobile browsers
- NFR3: DuckDB-WASM initialization cached globally (instant subsequent loads)
- NFR4: Progress tracking for file download (MB transferred)
- NFR5: Memory cleanup on errors
- NFR6: All 435 existing tests must continue passing
- NFR7: Preview system unchanged (5000 rows, server-side, fast)

## SQL Translation Mappings

All 14 operations translate to DuckDB SQL:

| Operation | SQL Strategy |
|-----------|-------------|
| **trim** | `UPDATE data SET "col" = TRIM("col")` |
| **uppercase** | `UPDATE data SET "col" = UPPER("col")` |
| **lowercase** | `UPDATE data SET "col" = LOWER("col")` |
| **deduplicate (all)** | `CREATE TABLE deduped AS SELECT DISTINCT * FROM data; DROP TABLE data; ALTER TABLE deduped RENAME TO data` |
| **deduplicate (cols)** | `CREATE TABLE deduped AS SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY "col1", "col2" ORDER BY ROWID) as rn FROM data) WHERE rn = 1; ALTER TABLE deduped DROP COLUMN rn; DROP TABLE data; ALTER TABLE deduped RENAME TO data` |
| **filter (equals)** | `DELETE FROM data WHERE NOT ("col" = 'value')` |
| **filter (contains)** | `DELETE FROM data WHERE NOT ("col" LIKE '%' || 'value' || '%')` |
| **rename_column** | `ALTER TABLE data RENAME COLUMN "old" TO "new"` |
| **remove_column** | `ALTER TABLE data DROP COLUMN "col"` |
| **unpivot** | `CREATE TABLE data_unpivoted AS UNPIVOT data ON ("col1", "col2") INTO NAME "variable" VALUE "value"; DROP TABLE data; ALTER TABLE data_unpivoted RENAME TO data` |
| **pivot** | `CREATE TABLE data_pivoted AS PIVOT data ON "colSource" USING SUM("valSource"); DROP TABLE data; ALTER TABLE data_pivoted RENAME TO data` |
| **cast (fail)** | `UPDATE data SET "col" = CAST("col" AS DOUBLE)` |
| **cast (null)** | `UPDATE data SET "col" = TRY_CAST("col" AS DOUBLE)` |
| **cast (skip)** | `DELETE FROM data WHERE TRY_CAST("col" AS DOUBLE) IS NULL AND "col" IS NOT NULL` |
| **fill_down** | `UPDATE data SET "col" = COALESCE("col", LAST_VALUE("col" IGNORE NULLS) OVER (ORDER BY ROWID))` |
| **fill_across** | `UPDATE data SET "col2" = "col1" WHERE "col2" IS NULL` |
| **split_column** | Multi-step: Add new columns, populate with `STRING_SPLIT()`, optionally drop original |
| **merge_columns** | Multi-step: Add new column, populate with `CONCAT_WS()`, optionally drop originals |

**SQL Escaping Rules:**
- Identifiers (column names): Double quotes `"column_name"`
- String literals: Single quotes `'value'`
- Escape quotes by doubling: `"col""name"` for identifiers, `'val''ue'` for literals

## Implementation Plan

### Phase 1: Dependencies & Setup (1-2 hours) ✅
1. Install `@duckdb/duckdb-wasm@^1.32.0`
2. Create directory: `src/lib/duckdb/`
3. Create test directory: `src/lib/duckdb/__tests__/`
4. Create spec document (this file)
5. Update MEMORY.md with Active spec

### Phase 2: DuckDB Core Integration (6-8 hours)
1. **`src/lib/duckdb/types.ts`** - TypeScript types
   - `DuckDBInstance` interface
   - `ExportProgress` type
   - `ExportOptions` type
   - `SQLTranslationError` class

2. **`src/lib/duckdb/init.ts`** - Initialize DuckDB-WASM
   - `initDuckDB()` - Load WASM bundle with worker
   - Cache instance globally (optimization)
   - Handle initialization errors

3. **`src/lib/duckdb/loader.ts`** - Load files into DuckDB
   - `downloadFile(storageUrl, onProgress)` - Download with progress tracking
   - `loadFileIntoDuckDB(db, fileBuffer, fileName, mimeType, parseConfig)` - Register file in virtual filesystem
   - Handle CSV with `read_csv_auto()`
   - Convert Excel to CSV first, then load
   - Apply parseConfig (row/column ranges)

4. **`src/lib/duckdb/sql-translator.ts`** - Convert pipeline → SQL (CORE)
   - `translatePipeline(steps: TransformationStep[]): string[]` - Returns SQL statements
   - `escapeIdentifier(name: string): string` - Quote column names
   - `escapeLiteral(value: string): string` - Quote string values
   - Individual translator functions for each of 14 operations
   - In-place UPDATE strategy for memory efficiency

5. **`src/lib/duckdb/exporter.ts`** - Main orchestration
   - `exportWithDuckDB(options)` - Main export function
   - Stages:
     1. Initialize DuckDB (cached)
     2. Download file from Convex
     3. Load into DuckDB
     4. Translate pipeline to SQL
     5. Execute SQL statements
     6. Export to CSV with UTF-8 BOM
     7. Return blob for download
   - Progress callbacks for each stage
   - OOM error detection
   - Memory cleanup

### Phase 3: UI Components (4-5 hours)
1. Install shadcn/ui progress component: `npx shadcn@latest add progress`

2. **`src/components/export/ExportProgressModal.tsx`** - NEW FILE
   - Modal with progress stages
   - Cancel button (shows warning)
   - Download button when complete
   - Error display with helpful messages
   - Progress bar for file download

3. **`src/components/ExportButton.tsx`** - UPDATE
   - Remove old server-side export logic
   - Call `exportWithDuckDB()` for all exports
   - Show progress modal
   - Handle download button click
   - Add tooltip about browser processing
   - Prevent concurrent exports

4. **`src/app/preview/[uploadId]/page.tsx`** - UPDATE
   - Pass additional props to ExportButton:
     - `fileUrl` (from Convex storage.getUrl())
     - `mimeType`
     - `pipeline` (steps)
     - `parseConfig`
   - Add warning badge when preview limited to 5000 rows

### Phase 4: Testing (4-5 hours)
- **Unit tests** (`sql-translator.test.ts`): 30-40 tests
  - Test each of 14 operations
  - Test empty pipeline
  - Test multi-step pipelines
  - Test SQL escaping (special characters in column names)
  - Test error handling

- **Integration tests (manual)**:
  - Small file (1K rows) - all operations
  - Medium file (50K rows) - dedupe, pivot
  - Large file (250K rows) - all operations
  - Excel file (20K rows) - unpivot
  - Browser testing: Chrome, Firefox, Safari, Edge
  - Mobile testing (limited files)

### Phase 5: Documentation (1-2 hours)
- Update MEMORY.md with completed work
- Update PATTERNS.md with DuckDB patterns
- Document SQL translation decisions
- Document browser memory limits

## Testing Plan
### Unit
- 30-40 tests for SQL translator
- Test each operation type
- Test SQL escaping
- Test error handling
- Test empty/null values

### Integration
- None required (manual testing sufficient)

### Manual
- Upload CSV file with 100K rows
- Apply multiple transformations
- Export full file
- Verify transformations applied correctly
- Test on multiple browsers
- Test with Excel files
- Test OOM handling with very large files

## Acceptance Criteria
- AC1: DuckDB-WASM initializes successfully in Chrome, Firefox, Safari, Edge
- AC2: Can export CSV files up to 200 MB (desktop browsers)
- AC3: Can export Excel files up to 50 MB
- AC4: All 14 operations translate to correct SQL
- AC5: Progress modal shows during export with accurate status
- AC6: Download button appears after export (user controls timing)
- AC7: OOM errors show helpful message
- AC8: Preview system unchanged (5000 rows, server-side)
- AC9: All 435 existing tests still pass
- AC10: 30-40 new unit tests for SQL translator pass
- AC11: Concurrent exports prevented with helpful message
- AC12: Export processes full file (not limited to 5000 rows)

## User Decisions (from planning phase)
- Q1: Download button after export (not auto-download)
- Q2: Reject concurrent exports
- Q3: In-place UPDATE statements (memory efficient)
- Q4: Browser-based storage (not Convex)
- Q5: Always use DuckDB-WASM for export (one code path)
- Q6: Include all optimizations upfront
- Q7: Show helpful OOM error message

## Technical Constraints
- DuckDB-WASM first load: 5-10 seconds (WASM bundle download)
- WASM memory limit: 4GB
- Typical dataset: ~2 MB per 10K rows × 10 columns
- Practical limit: ~1M rows for typical datasets
- Mobile devices: More constrained (~50MB files max)
- Preview system: UNCHANGED (stays at 5000 rows, server-side)

## Key Design Decisions
1. **Client-side only** - No server-side changes required
2. **Preview unchanged** - Fast, responsive 5000-row preview stays server-side
3. **Always use DuckDB** - No fallback to old export, one code path
4. **Download button** - User controls when file saves (not auto-download)
5. **SQL translation** - In-place UPDATEs for memory efficiency
6. **Global cache** - DuckDB instance cached for instant subsequent exports
7. **No cancellation** - Show warning only, don't implement complex cancellation logic
