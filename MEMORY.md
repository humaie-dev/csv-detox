# Project Memory — CSV Detox

Single source of truth for project state. Update after every meaningful change.

## Current task
## Current task
- Active spec: None
- Status: **Spec 022 complete — assistant uses AI SDK useChat**
- Next action: Manual assistant prompt test
- Note: Assistant now uses AI SDK `useChat` with UI message parts

### 2026-02-12: Spec 022 - AI SDK useChat Integration (COMPLETE ✅)
- ✅ **Replaced manual streaming with `useChat`**
  - Uses AI SDK transport to `/api/assistant/chat`
  - Renders UI message parts for text and tool badges
- ✅ **Added UI message conversion on the server**
  - Converts UI messages to model messages before `streamText`
- ✅ **Switched response to UI message stream**
  - Uses `toUIMessageStreamResponse` for useChat compatibility
- **Files Modified**:
  - `src/components/AssistantChat.tsx` - useChat integration + parts rendering
  - `src/app/api/assistant/chat/route.ts` - UI → model message conversion

### 2026-02-12: Spec 021 - Assistant Streaming Display Fix (COMPLETE ✅)
- ✅ **Expanded client stream parsing**
  - Handles `0:` and `data:` prefixes
  - Falls back to appending raw text lines
- **Files Modified**:
  - `src/components/AssistantChat.tsx` - More robust stream parsing

### 2026-02-12: Spec 020 - Fix Test Runner Entry Point (COMPLETE ✅)
- ✅ **Updated test scripts to use test file globs**
  - `npm test` now targets `src/**/__tests__/**/*.test.ts`
  - `npm test <file>` still works for single-file runs
- ✅ **Confirmed test discovery works**
  - Tests now execute; failure is due to `better-sqlite3` native module mismatch
- **Files Modified**:
  - `package.json` - Updated `test` and `test:watch` scripts

### 2026-02-12: Spec 019 - Persistent Assistant Panel (COMPLETE ✅)
- ✅ **Added shadcn-style Sidebar component** (`src/components/ui/sidebar.tsx`)
  - Supports left/right sidebars, mobile overlay, and SidebarTrigger
  - Handles mobile open state and overlay dismissal
- ✅ **Converted AI Assistant to permanent panel**
  - Removed Sheet drawer usage
  - Embedded assistant in right sidebar with fixed layout
- ✅ **Updated project page layout to use Sidebar**
  - Left pipelines panel now uses Sidebar component
  - Right assistant panel added as persistent sidebar
  - Mobile triggers added for pipelines and assistant
- **Files Created**:
  - `src/components/ui/sidebar.tsx` - Sidebar + trigger components
- **Files Modified**:
  - `src/components/AssistantChat.tsx` - Panel layout (no drawer)
  - `src/app/projects/[projectId]/page.tsx` - New sidebar layout + triggers

### 2026-02-11: AI Assistant Integration (COMPLETE ✅)
- ✅ **Fixed AI SDK v6 API compatibility issues**
  - Changed `parameters:` to `inputSchema:` in tool definitions (AI SDK v6 requirement)
  - Changed `toDataStreamResponse()` to `toTextStreamResponse()` (v6 method)
  - Replaced `maxToolRoundtrips: 5` with `stopWhen: stepCountIs(5)` (v6 stop condition API)
  - Imported `stepCountIs` from `ai` package
- ✅ **Upgraded React for compatibility**
  - Upgraded `react` from 19.0.0 → 19.2.1
  - Upgraded `react-dom` from 19.0.0 → 19.2.1
  - Installed `@ai-sdk/react@3.0.81` (not using `useChat` - using manual fetch instead)
- ✅ **Created AI Assistant Chat Component as Right-Side Drawer**
  - `src/components/AssistantChat.tsx` - Right-side drawer (240 lines)
  - Uses shadcn/ui Sheet component for drawer UI
  - Width: 500px (sm: 540px), slides in from right
  - Manual state management with fetch streaming (not using `useChat` hook due to API incompatibility)
  - Features:
    - Message history with user/assistant bubbles
    - Tool invocation badges (shows when AI calls tools)
    - Loading indicator with spinner
    - Auto-scroll to latest message
    - Empty state with example prompts
    - Sheet header with title and description
- ✅ **Integrated Assistant into Project Page**
  - Added "AI Assistant" button to header (with Sparkles icon)
  - Button visible when project has pipelines
  - Assistant receives context: `projectId` and `selectedPipelineId`
  - Opens right-side drawer on click
- ✅ **Installed shadcn/ui components**
  - `src/components/ui/scroll-area.tsx` - For smooth scrolling chat messages
  - `src/components/ui/sheet.tsx` - For drawer UI
- ✅ **All 493 tests passing**
- ✅ **Build succeeds** with no errors
- **Files Created**:
  - `src/components/AssistantChat.tsx` - Chat drawer component (240 lines)
  - `src/components/ui/scroll-area.tsx` - shadcn/ui component
  - `src/components/ui/sheet.tsx` - shadcn/ui component
- **Files Modified**:
  - `src/app/api/assistant/chat/route.ts` - Fixed for AI SDK v6 compatibility
  - `src/app/projects/[projectId]/page.tsx` - Added assistant button and component
  - `package.json` - Upgraded React, added @ai-sdk/react
- **AI Assistant Capabilities**:
  - **8 tools available**:
    1. `getDataSummary` - Overview of data structure
    2. `sampleData` - Random sample rows
    3. `getColumnInfo` - Column types and stats
    4. `getUniqueValues` - Value distributions (for categorical data)
    5. `searchData` - Find rows matching pattern
    6. `getRowCount` - Count total rows
    7. `listPipelines` - Show all pipelines
    8. `getPipelineDetails` - Inspect specific pipeline steps
  - **Context-aware**: Knows current project and selected pipeline
  - **Streaming responses**: Uses Azure OpenAI with text streaming
  - **Azure OpenAI**: Uses `gpt-4o-global` deployment
- **Status**: AI Assistant feature complete and integrated

### 2026-02-11: Export All Pipelines as ZIP (COMPLETE ✅)
- ✅ **Created server-side CSV export API endpoint**: `/api/projects/[projectId]/pipelines/[pipelineId]/export`
  - **GET** - Stream CSV data directly from SQLite
  - Supports both raw data export (`?raw=true`) and pipeline results export
  - Memory-efficient streaming: Processes data in 1000-row batches
  - Proper CSV formatting: Escapes quotes, commas, newlines per RFC 4180
  - Auto-generates filename from project/pipeline names
  - Returns 404 if pipeline hasn't been executed yet
  - Content-Type: `text/csv; charset=utf-8`
  - Content-Disposition: `attachment; filename="..."`
- ✅ **Simplified ExportButton component** (162 → 98 lines)
  - Removed all DuckDB-WASM logic
  - Simple fetch to export API endpoint
  - Direct download via Blob URL
  - No progress modal needed (server handles all processing)
  - Props changed: Now requires `projectId` and `pipelineId` instead of file details
- ✅ **Removed DuckDB dependencies entirely**
  - Deleted `src/lib/duckdb/` directory (8 files: exporter, loader, previewer, sql-translator, types, init, index)
  - Deleted `src/components/export/ExportProgressModal.tsx`
  - Deleted `public/duckdb/` directory (WASM bundles: ~74MB of files)
  - Removed `@duckdb/duckdb-wasm` from package.json
  - Removed postinstall script that copied WASM files
  - **26 packages removed** from node_modules
- ✅ **Created comprehensive export tests** (15 tests, all passing)
  - `src/lib/sqlite/__tests__/export.test.ts` - CSV export utilities tests:
    - CSV field escaping (commas, quotes, newlines)
    - CSV value formatting (null, boolean, number, date, object, array)
    - Raw data export with special characters
    - Null value handling
    - Pipeline results export
    - Large dataset export (10,000 rows, < 1 second)
- ✅ **Build succeeds** with no errors
- ✅ **All 493 tests passing** (15 new export tests added)
- **Files Created**:
  - `src/app/api/projects/[projectId]/pipelines/[pipelineId]/export/route.ts` - CSV export endpoint (289 lines)
  - `src/lib/sqlite/__tests__/export.test.ts` - Export functionality tests (367 lines)
- ✅ **Integrated ExportButton into project page**
  - Added to header section next to "Delete Project" button
  - Two export modes:
    - **Export Raw Data**: Always visible (when pipelines exist), exports original parsed data
    - **Export Pipeline Results**: Visible when pipeline is selected with steps, exports transformed data
  - Conditional rendering based on parsing state and pipeline selection
- **Files Modified**:
  - `src/components/ExportButton.tsx` - Simplified to use API endpoint (162 → 98 lines, -64 lines)
  - `src/app/projects/[projectId]/page.tsx` - Added ExportButton to header (+14 lines)
  - `package.json` - Removed DuckDB dependency and postinstall script
- **Files Deleted**:
  - `src/lib/duckdb/` directory (8 files, ~35 KB)
  - `src/components/export/ExportProgressModal.tsx` (118 lines)
  - `public/duckdb/` directory (~74 MB WASM files)
- **Key Features**:
  - **Memory-efficient streaming**: Uses ReadableStream to stream CSV in chunks
  - **Proper CSV escaping**: Handles quotes, commas, newlines per RFC 4180
  - **Type-aware formatting**: Formats booleans, numbers, dates, objects, arrays correctly
  - **Flexible export**: Supports raw data or pipeline results
  - **Auto-filename generation**: Uses project/pipeline names with sanitization
  - **Error handling**: Returns 404 if pipeline not executed, 500 for server errors
- **Technical Details**:
  - CSV escaping: Quotes fields containing `"`, `,`, `\n`, or `\r`
  - Quote escaping: Doubles quotes (`"` → `""`)
  - Line endings: Uses CRLF (`\r\n`) per CSV standard
  - Batch size: 1000 rows per batch for memory efficiency
  - Format functions: `formatCSVValue()` and `escapeCSVField()`
- **Bundle Size Impact**:
  - Before: Project page = 48.9 kB, 26 DuckDB packages installed
  - After: Project page = 48.9 kB (unchanged), 26 packages removed
  - WASM files removed: ~74 MB from public directory
- **Status**: Phase 6 complete, DuckDB fully removed, export works server-side

### 2026-02-11: Spec 018 Phase 5 - Frontend Cleanup (COMPLETE ✅)
- ✅ **Discovery: Project detail page already uses SQLite APIs**
  - The main working interface (`/projects/[projectId]/page.tsx`, 870 lines) already uses SQLite API routes
  - No DuckDB usage in project detail page - it was implemented correctly from the start
  - Uses `/api/projects/[projectId]/data` for raw data preview
  - Uses `/api/projects/[projectId]/pipelines/[pipelineId]/preview` for pipeline preview
  - Uses `/api/projects/[projectId]/sheets` for Excel sheet selection
  - Fully functional: create pipelines, add/edit/remove steps, view previews, sheet selection
- ✅ **Deleted unused pipeline editor page**
  - Removed `/src/app/projects/[projectId]/pipelines/[pipelineId]/` directory entirely
  - This was a redundant page that was never linked to from anywhere
  - All functionality exists in the project detail page
  - Bundle size reduced: 48.9 kB (project page) vs 124 kB (old pipeline editor)
- ✅ **Created React hooks for API access** (for future use)
  - `src/hooks/api/useProjectData.ts` - Three reusable hooks:
    - `useProjectData(projectId, options)` - Fetch raw data with pagination
    - `useColumns(projectId)` - Fetch column metadata
    - `usePipelinePreview({ projectId, pipelineId, upToStep })` - Execute pipeline preview
  - These hooks are available for future pages/components that need API access
- ✅ **Verified DuckDB usage scope**
  - Only 2 files still use DuckDB: `ExportButton.tsx` and `ExportProgressModal.tsx`
  - These will be replaced in Phase 6 with server-side export API
  - No DuckDB warnings in build output after removing pipeline editor page
- ✅ **Build succeeds** with no errors
- ✅ **All 516 tests passing** (no regressions)
- **Files Deleted**:
  - `src/app/projects/[projectId]/pipelines/[pipelineId]/page.tsx` - Unused pipeline editor (325 lines)
- **Files Created**:
  - `src/hooks/api/useProjectData.ts` - React hooks for API access (203 lines)
- **Key Insights**:
  - **Phase 5 was mostly already done**: The project detail page was already using SQLite APIs
  - **Architectural win**: Single-page approach (project detail) is simpler than separate pipeline editor
  - **Ready for Phase 6**: Only ExportButton remains to be converted to server-side
- **Status**: Phase 5 complete, frontend uses SQLite APIs, ready to replace export functionality


- ✅ **Created pipeline execution API endpoint**: `/api/projects/[projectId]/pipelines/[pipelineId]/execute`
  - **POST** - Execute full pipeline and store results in SQLite
  - Loads raw data from SQLite (or re-parses if pipeline has custom parseConfig)
  - Executes all transformation steps using existing pipeline executor
  - Creates/replaces pipeline result tables (`pipeline_{id}_result`, `pipeline_{id}_columns`)
  - Stores results in batches using transactions for performance
  - Returns execution metadata: success, rowCount, columnCount, duration, stepResults
  - Error handling: Reports failed steps with error details
  - Full support for pipeline-specific parse configs (different Excel sheets)
- ✅ **Created pipeline results API endpoint**: `/api/projects/[projectId]/pipelines/[pipelineId]/results`
  - **GET** - Fetch stored pipeline execution results with pagination
  - Query params: `limit` (1-1000, default 100), `offset` (default 0)
  - Returns data, columns, pagination metadata
  - Checks if pipeline results exist (returns 404 with `executed: false` if not)
  - Helper functions: `getPipelineResults()`, `getPipelineColumns()`, `getPipelineResultRowCount()`
- ✅ **Build succeeds** with no errors
- ✅ **All 516 tests passing** (no regressions)
- **Files Created**:
  - `src/app/api/projects/[projectId]/pipelines/[pipelineId]/execute/route.ts` - Pipeline execution endpoint (286 lines)
  - `src/app/api/projects/[projectId]/pipelines/[pipelineId]/results/route.ts` - Results retrieval endpoint (188 lines)
- **Key Features**:
  - **Server-side execution**: Pipelines execute on server, not client
  - **Persistent results**: Execution results stored in SQLite per pipeline
  - **Full data processing**: Handles entire datasets (not limited to preview rows)
  - **Pipeline-specific parsing**: Re-parses file if pipeline has custom parseConfig (e.g., different Excel sheet)
  - **Batch operations**: Stores results in batches using SQLite transactions
  - **Execution metadata**: Tracks success/failure, duration, rows affected per step
  - **Error reporting**: Detailed error messages for failed transformations
- **Technical Details**:
  - Uses existing `executePipeline()` from `src/lib/pipeline/executor.ts`
  - Drops and recreates pipeline tables on each execution (clean slate)
  - Sanitizes pipeline IDs for SQLite table names (hyphens → underscores)
  - Stores rows as JSON in SQLite for schema flexibility
  - Column metadata includes type, null count, sample values
- **Status**: Phase 4 complete, pipeline execution API ready for use


- ✅ **Created Convex client wrapper** for server-side API routes:
  - `src/lib/convex/client.ts` - ConvexHttpClient singleton for API routes
  - `downloadFileFromConvex()` - Downloads files from Convex Storage
  - `getUpload()` and `getProject()` - Fetch metadata from Convex
- ✅ **Created server-side parser module**:
  - `src/lib/sqlite/parser.ts` - Parses files and stores in SQLite
  - `parseAndStoreFile()` - Main function: download → parse → store
  - `isProjectDataInitialized()` - Check if project has data
  - Supports CSV and Excel files
  - Batch processing (1000 rows per batch) for memory efficiency
  - Type conversion: Parser ColumnMetadata → SQLite ColumnMetadata
  - Auto-clears old data on re-parse
- ✅ **Created Next.js API route**: `/api/projects/[projectId]/parse`
  - **POST** - Parse file and store in SQLite
    - Validates request body with Zod
    - Checks if already initialized (skip unless force=true)
    - Downloads file from Convex Storage
    - Merges parseOptions (request overrides upload config)
    - Returns rowCount, columnCount, columns, parseTimeMs
    - Full error handling with descriptive messages
  - **GET** - Check parse status (returns `initialized: boolean`)
  - Next.js 15 compatibility (async params)
- ✅ **Comprehensive integration tests** (8 tests, all passing):
  - `src/lib/sqlite/__tests__/parser.test.ts`
  - CSV parsing and storage
  - Data retrieval verification
  - Column metadata storage
  - Parse options (row/column ranges)
  - Batch processing (2500 rows)
  - Re-parsing (clears old data)
- ✅ **Build succeeds** with no errors
- ✅ **All 516 tests passing** (508 previous + 8 new parser tests)
- **Files Created**:
  - `src/lib/convex/client.ts` - Server-side Convex client
  - `src/lib/sqlite/parser.ts` - File parsing and storage
  - `src/app/api/projects/[projectId]/parse/route.ts` - Parse API endpoint
  - `src/lib/sqlite/__tests__/parser.test.ts` - Integration tests
- **Key Features**:
  - **No Convex memory limits**: Parsing happens in Next.js server (not Convex actions)
  - **Batch processing**: Handles large files without OOM
  - **Parse config support**: Respects row/column ranges, sheet selection, headers
  - **Idempotent**: Skip re-parsing unless forced
  - **Error recovery**: Cleans up database on parse failure
- **Technical Details**:
  - Uses existing CSV/Excel parsers from `src/lib/parsers/`
  - Stores rows as JSON in SQLite for schema flexibility
  - Column type inference: number, string, boolean, date (excludes "null" type)
  - Sample values converted to strings for storage
- **Status**: Phase 2 complete, server-side file parsing ready for use

### 2026-02-11: Spec 018 Phase 1 - SQLite Infrastructure (COMPLETE ✅)
- ✅ **Installed dependencies**: better-sqlite3@11.10.0, @types/better-sqlite3, lru-cache@11.0.2
- ✅ **Created SQLite infrastructure** in `src/lib/sqlite/`:
  - `types.ts` - TypeScript interfaces for all DB operations (ColumnMetadata, DataPreviewResult, etc.)
  - `schema.ts` - Schema initialization, pipeline tables, parse config storage
  - `database.ts` - Main wrapper with lazy hydration, caching, CRUD operations
  - `queries.ts` - Common query patterns (random sample, stats, distribution, search)
  - `cache.ts` - LRU cache for database instances (max 10 open DBs)
  - `index.ts` - Barrel export for clean imports
- ✅ **Key Features Implemented**:
  - **Lazy hydration**: Databases opened on first access, cached for reuse
  - **LRU cache**: Max 10 databases open, automatically closes least-recently-used
  - **Schema initialization**: Creates tables on first DB creation (raw_data, columns, parse_config)
  - **Pipeline tables**: Dynamic table creation per pipeline (pipeline_{id}_result, pipeline_{id}_columns)
  - **Sanitization**: Pipeline IDs sanitized (hyphens → underscores) for valid table names
  - **PRAGMA optimizations**: WAL mode, NORMAL sync, 40MB cache, temp tables in RAM
  - **JSON storage**: Rows stored as JSON for schema flexibility
  - **Batch operations**: Transactional inserts for performance
  - **Query utilities**: Random sampling, column stats, value distribution, pattern search
- ✅ **Database per project**: Each project gets its own SQLite file: `{projectId}.db`
- ✅ **Comprehensive testing** (42 tests, all passing):
  - `database.test.ts` - 13 tests (creation, caching, CRUD, pagination, edge cases)
  - `schema.test.ts` - 11 tests (schema init, pipeline tables, parse config, row counts)
  - `queries.test.ts` - 18 tests (sampling, stats, distribution, search, distinct values)
- ✅ **Build succeeds** with no errors
- ✅ **All 508 tests passing** (466 existing + 42 new SQLite tests)
- **Files Created**:
  - `src/lib/sqlite/types.ts`
  - `src/lib/sqlite/schema.ts`
  - `src/lib/sqlite/database.ts`
  - `src/lib/sqlite/queries.ts`
  - `src/lib/sqlite/cache.ts`
  - `src/lib/sqlite/index.ts`
  - `src/lib/sqlite/__tests__/database.test.ts`
  - `src/lib/sqlite/__tests__/schema.test.ts`
  - `src/lib/sqlite/__tests__/queries.test.ts`
- **Technical Details**:
  - Database files stored in `data/sqlite/` directory (created automatically)
  - Configurable via `SQLITE_DB_DIR` environment variable
  - Database wrapper handles cleanup (deletes DB file + WAL + SHM files)
  - Cache automatically closes databases on eviction
  - All queries use parameterized statements (no SQL injection)
- **Status**: Phase 1 complete, SQLite infrastructure ready for Phase 2

### 2026-02-11: Created Spec 018 - Server-Side SQLite Storage (Draft)
- ✅ **Comprehensive spec for moving data operations to server-side SQLite**
- **Objective**: Remove all file parsing and data access from Convex actions and client-side DuckDB; move to server-side SQLite
- **Key Changes**:
  - Server-side file parsing (Next.js API routes, not Convex actions)
  - One SQLite database per project (stores raw data, pipeline results)
  - All data access via API routes (no client-side file processing)
  - Pipeline execution on server (not client DuckDB-WASM)
  - LLM-accessible sampling API for data exploration
  - Lazy hydration: SQLite databases loaded on-demand
  - Database caching (LRU, max 10 open DBs)
- **Benefits**:
  - Remove ~72MB DuckDB-WASM from client bundle
  - No client-side file downloads (better privacy)
  - No Convex 64MB memory limits
  - Better performance on mobile
  - LLM can sample/explore data
- **8 Implementation Phases**:
  1. SQLite Infrastructure (wrapper, schema, caching) - 3-4 hours
  2. Server-Side File Parsing (Next.js API routes) - 3-4 hours
  3. Data Access API Routes (preview, columns, sampling) - 2-3 hours
  4. Pipeline Execution API (server-side transformations) - 4-5 hours
  5. Update Frontend (remove DuckDB-WASM) - 3-4 hours
  6. Export Functionality (streaming CSV from SQLite) - 2 hours
  7. LLM Sampling API (random, stats, search) - 2-3 hours
  8. Testing & Migration - 3-4 hours
- **Total estimate**: 22-29 hours
- **Design Decisions**:
  - SQLite per project (isolation, parallel access)
  - JSON column storage (flexible schema)
  - Keep Convex for metadata (projects, pipelines, uploads)
  - Streaming export (no memory issues)
  - WAL mode for better concurrency
- **Status**: Draft spec created, ready for review and implementation

## Recent changes
- ✅ **Removed obsolete routes and components**
- **Deleted Routes**:
  - `src/app/create-pipeline/` - Replaced by `/projects/new`
  - `src/app/pipeline/[pipelineId]/` - Replaced by `/projects/[projectId]/pipelines/[pipelineId]`
  - `src/app/preview/[uploadId]/` - Superseded by new pipeline editor
- **Deleted Components**:
  - `src/components/PipelineSidebar.tsx` - No longer used (replaced by project detail page)
- ✅ **Build succeeds** with no errors (only expected DuckDB and @next/swc warnings)
- **Current Route Structure**:
  - `/` - Redirects to `/projects`
  - `/projects` - List all projects
  - `/projects/new` - Create new project (file upload)
  - `/projects/[projectId]` - Project detail (file info + pipelines list)
  - `/projects/[projectId]/pipelines/[pipelineId]` - Pipeline editor

### 2026-02-11: Spec 017 - Project-Based Architecture (Complete)
- ✅ **Major architectural refactor to introduce Project concept**
- **Objective**: Reorganize app around Projects (one file, many pipelines) to enable multi-table extraction from single files
- ✅ **Phase 1: Database Schema & Backend**:
  - Updated `convex/schema.ts`: Added `projects` table, updated `pipelines` to use `projectId` instead of `uploadId`
  - Added `parseConfig` to pipelines table (optional, overrides project/upload defaults)
  - Created `convex/projects.ts` with full CRUD: `list()`, `get()`, `create()`, `update()`, `remove()`
  - Updated `convex/pipelines.ts`: Changed `list(projectId)`, added parseConfig support
  - Proper indexes: `by_project`, `by_created`, `by_upload`
- ✅ **Phase 3: UI Pages**:
  - Created `/projects` page: Lists all projects in card grid with file info and pipeline counts
  - Created `/projects/[projectId]` page: Project detail with file info, pipeline list, create/delete actions
  - Created `/projects/new` page: File upload and project creation flow
- ✅ **Phase 4: Pipeline Editor**:
  - Created `/projects/[projectId]/pipelines/[pipelineId]` route: Full pipeline editor with project context
  - Pipeline fetches upload through project (nested queries)
  - Breadcrumb navigation: Projects → [Project Name] → [Pipeline Name]
  - parseConfig can be set per-pipeline or inherit from project/upload
- ✅ **Phase 5: Navigation**:
  - Updated home page (`/`) to redirect to `/projects`
  - New flow: Home → Projects → Project Detail → Pipeline Editor
- **Key Design Decisions**:
  - No data migration (fresh start approach - user confirmed)
  - ParseConfig hierarchy: Upload default → Pipeline override
  - Cascading deletes: Delete project → delete all pipelines
  - One file per project (can extend to multi-file later)
- **Files Created**:
  - `convex/projects.ts` - Project CRUD operations
  - `src/app/projects/page.tsx` - Projects list
  - `src/app/projects/[projectId]/page.tsx` - Project detail
  - `src/app/projects/new/page.tsx` - Create project (file upload)
  - `src/app/projects/[projectId]/pipelines/[pipelineId]/page.tsx` - Pipeline editor
  - `specs/2026-02-11_017_project-architecture.md` - Comprehensive spec
- **Files Modified**:
  - `convex/schema.ts` - Added projects table, updated pipelines
  - `convex/pipelines.ts` - Changed to use projectId
  - `src/app/page.tsx` - Simple redirect to /projects
- **Old Routes (No Longer Used)**:
  - `/create-pipeline` - Replaced by `/projects/new`
  - `/pipeline/[pipelineId]` - Replaced by `/projects/[projectId]/pipelines/[pipelineId]`
  - `/preview/[uploadId]` - Superseded by new pipeline editor
- **Status**: Core functionality complete, ready for manual testing

### 2026-02-05: Loader Idempotency Fix
- ✅ Prevent "Table with name 'data' already exists" in repeated previews
- **Change**: `src/lib/duckdb/loader.ts` now drops `data`/`data_filtered` if present and uses `CREATE OR REPLACE TABLE`
- **Why**: Preview reuses a cached DuckDB instance across navigations; ensuring a clean slate avoids catalog errors

## Recent changes

### 2026-02-05: Created Spec 011 - GitHub Issue and PR Automation (Draft)
- ✅ Created comprehensive spec for extending OpenCode workflow
- **Objective**: Enable OpenCode to create PRs from GitHub issues and contribute to existing PRs
- **Key Features**:
  - Issue handling: @opencode mention → plan → approval → PR creation
  - PR contribution: Work on any PR (not just OpenCode-created)
  - Smart branch naming based on issue labels (feature/, bugfix/, enhancement/, docs/)
  - Spec-driven development for all issue implementations
  - Status communication via GitHub reactions (👀, ✅, ❌)
  - Proper issue-to-PR linking
- **7 Implementation Phases**:
  1. GitHub Issue Detection (1-2 hours)
  2. Issue Analysis and Plan Generation (2-3 hours)
  3. Branch Creation and PR Setup (1-2 hours)
  4. Spec-Driven Implementation (2-3 hours)
  5. PR Contribution Enhancement (1-2 hours)
  6. Status Communication (1 hour)
  7. Testing and Documentation (2 hours)
- **Design Decisions**:
  - Two-step approval for issues (plan first, implement after confirmation)
  - Reactions instead of verbose comments (reduces noise)
  - Always create specs (maintains consistency with spec-driven development)
  - Label-based branch naming (matches Git conventions)
  - Use GitHub CLI (`gh`) for API operations (simpler than actions/github-script)
- **10 Acceptance Criteria** defined
- **Status**: Draft spec created, ready to begin implementation

### 2026-02-05: Spec 012 - Automated PR Checks (Complete)
- ✅ Added CI workflow at `.github/workflows/ci.yml`
- ✅ Triggers on PR updates and pushes to `main`/`master`
- ✅ Uses Node 20 with npm cache
- ✅ Steps: install (`npm ci`), test (`npm test`), build (`npm run build`)
- ✅ Concurrency enabled to cancel in-progress runs per ref
- **Status**: Complete; monitor run times and adjust caching if needed

### 2026-02-05: Spec 013 - Fix TSX Test Discovery (Complete)
- ✅ Updated `package.json`:
  - `test`: `tsx --test src`
  - `test:watch`: `tsx --test --watch src`
- ✅ Added spec `specs/2026-02-05_013_fix-tsx-test-discovery.md`
- ✅ Reason: Shell did not expand `src/**/*.test.ts` in GitHub Actions, causing CI failure
- **Status**: Complete; CI should now discover tests reliably

## Recent changes

### 2026-02-04: Removed Convex Authentication (Complete)
- ✅ **Removed all Convex authentication**:
  - User requested removal of Convex auth to use Vercel authentication instead
  - Uninstalled `@convex-dev/auth` package
  - Removed auth tables from Convex schema
  - Deleted auth configuration files and middleware
  - Removed all authentication guards from pages
  - Deleted SignInForm and UserMenu components
- ✅ **Backend Changes**:
  - Removed `...authTables` from `convex/schema.ts`
  - Deleted `convex/auth.ts` and `convex/auth.config.ts`
  - Deleted `convex/http.ts` (no longer needed without auth routes)
  - Deleted `src/middleware.ts` (Convex auth middleware)
- ✅ **Frontend Changes**:
  - Updated `src/app/layout.tsx` - removed `ConvexAuthNextjsServerProvider`
  - Updated `src/app/providers.tsx` - changed from `ConvexAuthNextjsProvider` to `ConvexProvider`
  - Updated `src/app/page.tsx` - removed `Authenticated/Unauthenticated` guards
  - Updated `src/app/create-pipeline/page.tsx` - removed auth guards and UserMenu
  - Updated `src/app/pipeline/[pipelineId]/page.tsx` - removed auth guards and UserMenu
  - Deleted `src/components/SignInForm.tsx`
  - Deleted `src/components/UserMenu.tsx`
- ✅ **All 466 tests passing** (no regressions)
- ✅ **Build succeeds** with no errors (only known DuckDB and @next/swc warnings)
- **Status**: Authentication fully removed, app is open without auth, ready for Vercel auth integration

### 2026-02-03: Authentication Implementation (Previously Removed)
- ✅ **Implemented Authentication using Convex Auth**:
  - Added anonymous authentication (no username/password required)
  - All authenticated users can view and create all pipelines (shared workspace model)
  - Session persists across page refreshes
  - Simple "Sign In" button creates anonymous session
- ✅ **Backend Implementation**:
  - Installed `@convex-dev/auth@latest` package
  - Created `convex/auth.ts` with Anonymous provider configuration
  - Updated `convex/schema.ts` to include auth tables
  - Created `convex/http.ts` for HTTP routes needed by auth
  - Added `auth.addHttpRoutes(http)` for authentication endpoints
- ✅ **Frontend Implementation**:
  - Updated `src/app/layout.tsx` to use `ConvexAuthProvider` instead of `ConvexProvider`
  - Created `src/components/SignInForm.tsx` - Simple card with "Sign In" button and loading state
  - Created `src/components/UserMenu.tsx` - Dropdown menu with user status and "Sign Out" button
  - Installed shadcn/ui dropdown-menu component
- ✅ **Protected All Routes**:
  - Updated `src/app/page.tsx` - Wrapped with Authenticated/Unauthenticated components, added UserMenu to header
  - Updated `src/app/create-pipeline/page.tsx` - Wrapped with auth components, added UserMenu to header
  - Updated `src/app/pipeline/[pipelineId]/page.tsx` - Wrapped with auth components, added UserMenu to header
  - Unauthenticated users see sign-in form on all pages
  - Authenticated users see full app functionality
- ✅ **Build succeeds** with no errors (only known warnings)
- ✅ **All 466 tests passing**
- **Key Features**:
  - Anonymous authentication - no registration required
  - Shared workspace - all users see all pipelines
  - Persistent sessions - stays logged in across page refreshes
  - UserMenu in top-right of all pages for sign out
- **Technical Details**:
  - Uses Convex Auth's Anonymous provider
  - Authentication state managed by Convex client
  - HTTP routes configured for auth callbacks
  - Auth tables automatically created in Convex schema
- **Status**: Complete and ready for production use

### 2026-02-03: Spec 010 - Pipeline Management Sidebar (Complete)
- ✅ **Implemented Pipeline Sidebar for Saving and Managing Pipelines**:
  - Users can now save transformation pipelines with custom names
  - View all saved pipelines for the current file in collapsible sidebar
  - Load any saved pipeline with one click
  - Delete pipelines with confirmation
  - Active pipeline is visually highlighted
- ✅ **Backend Implementation**:
  - Updated Convex schema with `name` field in `pipelines` table
  - Added `by_upload_and_name` index for efficient lookups
  - Created `convex/pipelines.ts` with CRUD functions:
    - `list(uploadId)` - Query all pipelines for an upload
    - `create(uploadId, name, steps)` - Save new pipeline
    - `remove(id)` - Delete pipeline
    - `update(id, steps)` - Update pipeline steps
- ✅ **UI Components**:
  - Created `src/components/SavePipelineDialog.tsx`:
    - Input for pipeline name (max 50 chars)
    - Validation: required, no duplicates per upload
    - Character counter
    - Error handling
  - Created `src/components/PipelineSidebar.tsx`:
    - Collapsible sidebar (280px wide when open, 48px collapsed)
    - Lists all saved pipelines for current file
    - Shows pipeline name and step count
    - Active pipeline indicator (highlighted border)
    - Delete button per pipeline (trash icon)
    - Empty state when no pipelines saved
    - Click pipeline to load its steps
- ✅ **Preview Page Integration** (`src/app/preview/[uploadId]/page.tsx`):
  - Removed old pipeline auto-save logic
  - Added PipelineSidebar component to left of page
  - Replaced server-side pipeline execution with client-side `executeUntilStep()`
  - Simplified handler functions (no more Convex mutations on every step change)
  - New layout: Sidebar | Config/Steps | Data Preview
  - Full-height flexbox layout with proper overflow handling
- ✅ **Build succeeds** with no errors (only known warnings)
- ✅ **All 466 tests passing**
- **Key Features**:
  - Pipelines are isolated per upload (each file has its own pipelines)
  - Pipeline names must be unique within each file
  - Sidebar persists collapse state during session
  - Toast notifications for save/load/delete actions
- **UX Improvements**:
  - Users can save multiple variations of transformations
  - Easy switching between different pipeline approaches
  - No auto-save clutter - users explicitly save when ready
- **Status**: Complete and ready for manual testing

### 2026-02-03: SQL Table Name Conflict Fix (Complete)
- ✅ **Fixed DuckDB Table Name Conflicts in Multi-Step Pipelines**:
  - Resolved error: "Table with name 'data' already exists!"
  - Multiple operations of the same type now use unique temporary table names
  - Export now works correctly with complex multi-step pipelines
- ✅ **Implementation**:
  - Modified `translatePipeline()` to pass step index to each translator function
  - Updated 5 functions to use unique temp tables: `translateDeduplicate()`, `translateUnpivot()`, `translatePivot()`, `translateFillDown()`, `translateSort()`
  - Temp table names now include step index: `data_filled_0`, `data_filled_1`, `data_sorted_0`, etc.
  - Updated all tests to expect new table naming pattern
- ✅ **All 466 tests passing**
- ✅ **Build succeeds** with no errors
- **Root Cause**: Operations creating temporary tables used hard-coded names (e.g., "data_filled")
- **Solution**: Append step index to temp table names to ensure uniqueness
- **Impact**: Users can now use multiple Fill Down, Sort, Pivot, etc. steps in same pipeline
- **Status**: Complete and ready for production use

### 2026-02-03: Fill Down SQL Translation Fix (Complete)
- ✅ **Fixed DuckDB SQL Translation for Fill Down Operation**:
  - Resolved error: "window functions are not allowed in UPDATE"
  - Changed from UPDATE statement with window function to CREATE TABLE AS SELECT
  - Export with Fill Down now works correctly
- ✅ **Implementation**:
  - Rewrote `translateFillDown()` in `src/lib/duckdb/sql-translator.ts`
  - Uses `CREATE TABLE data_filled AS SELECT ... EXCLUDE (...), [filled columns]`
  - Then `DROP TABLE data` and `ALTER TABLE data_filled RENAME TO data`
  - Updated test to expect 3 statements instead of 2
- ✅ **All 466 tests passing**
- ✅ **Build succeeds** with no errors
- **Root Cause**: DuckDB doesn't allow window functions (LAST_VALUE) in UPDATE statements
- **Solution**: Use CREATE TABLE AS SELECT which allows window functions in SELECT clause
- **Status**: Complete and ready for production use

### 2026-02-03: DuckDB-WASM CORS Fix (Complete)
- ✅ **Fixed CORS Error with Worker Files**:
  - DuckDB-WASM worker files now served from local `/public/duckdb/` directory
  - Eliminated CORS issues from CDN-served files (jsDelivr)
  - Export functionality now works correctly
- ✅ **Implementation**:
  - Copied 4 files to `public/duckdb/`: `duckdb-mvp.wasm`, `duckdb-browser-mvp.worker.js`, `duckdb-eh.wasm`, `duckdb-browser-eh.worker.js`
  - Updated `src/lib/duckdb/init.ts` to use local bundles instead of `getJsDelivrBundles()`
  - Added `postinstall` script to automatically copy files from `node_modules` after `npm install`
  - Added `public/duckdb/` to `.gitignore` (files copied automatically, not committed)
- ✅ **Build succeeds** with no errors
- **Technical Details**:
  - Worker files must be served from same origin as app (no CDN)
  - Files are ~72MB total but only downloaded once by browser
  - `postinstall` script ensures files are always present after dependency installation
- **Known Webpack Warning** (harmless, can be ignored):
  - `Critical dependency: the request of a dependency is an expression` from `duckdb-node.cjs`
  - This is DuckDB's Node.js compatibility code, not used in browser
  - Does not affect functionality or bundle size
- **Status**: Complete and ready for production use

### 2026-02-03: Sort Operation (Complete)
- ✅ **Added Sort Transformation Operation**:
  - Sort by one or multiple columns
  - Configurable direction per column (ascending/descending)
  - Multi-column sort with priority order (first column = primary sort key)
  - Null positioning (first or last)
  - Type-aware sorting (numbers, dates, strings, booleans)
- ✅ **Backend Implementation**:
  - Created `sort.ts` operation with stable sort
  - Type-aware comparison function (numbers < strings < dates)
  - Handles nulls, mixed types, edge cases
  - 19 comprehensive unit tests (all passing)
  - Added to `src/lib/pipeline/types.ts`: `SortConfig`, `SortColumn` interfaces
  - Registered in `src/lib/pipeline/operations/index.ts`
- ✅ **SQL Translation**:
  - DuckDB ORDER BY with NULLS FIRST/LAST
  - Multi-column support in single CREATE TABLE AS statement
  - 6 SQL translator tests (all passing)
- ✅ **UI Components**:
  - Multi-column sort interface with add/remove/reorder
  - Up/down arrows to change column priority
  - Direction dropdown per column (Ascending A→Z, Descending Z→A)
  - Nulls position radio buttons
  - Edit mode support (populate form when editing)
  - Display format in PipelineSteps: "Sort by: col1 (↑), col2 (↓) (nulls last)"
- ✅ **All 466 tests passing** (441 existing + 19 sort operation + 6 SQL translator)
- ✅ **Build succeeds** with no errors
- **Use Cases**: Sort by department then salary, chronological sorting, numerical ordering
- **Status**: Complete and ready for production use

### 2026-02-03: DuckDB-WASM Export Implementation (Complete)
- ✅ **Implemented Client-Side Full File Export**:
  - Installed DuckDB-WASM v1.32.0 for browser-based SQL processing
  - Export now processes entire files (1M+ rows) instead of 5000-row preview limit
  - Preview unchanged (stays server-side, 5000 rows, fast and responsive)
- ✅ **Core DuckDB Integration**:
  - Created SQL translator for all 14 transformation operations
  - In-place UPDATE strategy for memory efficiency
  - Proper SQL escaping for identifiers (double quotes) and literals (single quotes)
  - Global DuckDB instance caching (instant subsequent exports)
- ✅ **UI Components**:
  - Export progress modal with 6 stages (initializing, downloading, loading, transforming, generating, ready)
  - Progress tracking for file download (MB transferred)
  - Progress tracking for transformations (step N of M)
  - Download button shown when ready (user controls timing)
  - OOM error detection with helpful message
- ✅ **File Processing**:
  - Downloads file from Convex Storage with progress
  - Loads CSV directly into DuckDB
  - Converts Excel to CSV first (DuckDB-WASM has no native Excel support)
  - Applies parseConfig (row/column ranges, sheet selection)
- ✅ **Comprehensive Testing**:
  - Created 44 unit tests for SQL translator
  - Tests all 14 operations, SQL escaping, multi-step pipelines
  - All 441 tests passing (397 existing + 44 new DuckDB tests)
- ✅ **Build succeeds** with no errors
- **Technical Details**:
  - DuckDB-WASM first load: 5-10 seconds (WASM bundle download)
  - WASM memory limit: 4GB (vs Convex's 64MB)
  - Practical limit: ~1M rows for typical datasets (2MB per 10K rows × 10 columns)
  - Mobile devices: ~50MB files max
- **Key Files Created**:
  - `src/lib/duckdb/types.ts` - TypeScript types
  - `src/lib/duckdb/init.ts` - DuckDB-WASM initialization with caching
  - `src/lib/duckdb/loader.ts` - File downloading and loading
  - `src/lib/duckdb/sql-translator.ts` - Core SQL translation logic (14 operations)
  - `src/lib/duckdb/exporter.ts` - Main orchestration function
  - `src/lib/duckdb/__tests__/sql-translator.test.ts` - 44 comprehensive tests
  - `src/components/export/ExportProgressModal.tsx` - Progress UI
  - `specs/2026-02-03_008_duckdb-wasm-export.md` - Spec document
- **Files Modified**:
  - `src/components/ExportButton.tsx` - Complete rewrite to use DuckDB-WASM
  - `src/app/preview/[uploadId]/page.tsx` - Updated ExportButton props
  - `convex/uploads.ts` - Added `getFileUrl` query
  - `package.json` - Added `@duckdb/duckdb-wasm@^1.32.0`
- **Cleanup**:
  - ✅ Removed old server-side CSV generator (`src/lib/export/csv.ts`) - no longer used
  - ✅ Removed 26 tests for dead code (`src/lib/export/__tests__/csv.test.ts`)
  - ✅ Removed empty `src/lib/export/` directory
  - DuckDB-WASM now handles all CSV generation client-side
- **Status**: Complete and ready for production use

### 2026-02-03: UX Enhancement - Collapsible Data Source Configuration
- ✅ **Made Parse Config Panel Collapsible**:
  - Installed shadcn/ui Collapsible component
  - Added collapse/expand button to Data Source Configuration header
  - Chevron icon changes (ChevronUp when open, ChevronDown when collapsed)
  - Panel starts open by default
  - Smooth animation when expanding/collapsing
  - Title and description always visible (only content collapses)
- ✅ **Updated ParseConfigPanel.tsx**:
  - Wrapped CardContent in CollapsibleContent component
  - Added isOpen state (default: true)
  - Added CollapsibleTrigger button with icon in header
  - Uses flex layout to position toggle button
- ✅ **All 435 tests passing** (no regressions)
- ✅ **Build succeeds** with no errors
- **UX Benefit**: Users can collapse the config panel to focus on pipeline steps and data preview
- **Status**: Complete and ready to use

### 2026-02-03: Fill Down & Fill Across Operations (Complete)
- ✅ **Implemented Two New Transformation Operations**:
  - **Fill Down** - Fill empty cells with the last non-empty value from above (vertical fill)
  - **Fill Across** - Fill empty cells with the last non-empty value from left (horizontal fill)
- ✅ **Backend Implementation**:
  - Created `fill-down.ts` operation with `fillDown()` function
  - Created `fill-across.ts` operation with `fillAcross()` function
  - Both operations support:
    - Multi-column processing
    - `treatWhitespaceAsEmpty` option (default: false)
    - Preserve data types (numbers, booleans, dates stay their type)
    - Validation (columns exist, at least one column specified)
  - Updated `src/lib/pipeline/types.ts`:
    - Added `fill_down` and `fill_across` to `TransformationType` union
    - Created `FillDownConfig` and `FillAcrossConfig` interfaces
  - Registered both operations in `src/lib/pipeline/operations/index.ts`
- ✅ **Comprehensive Unit Tests** (38 tests total):
  - Created `fill-down.test.ts` with 19 tests:
    - Single/multiple column filling
    - Data type preservation (numbers, booleans)
    - First row empty handling
    - All rows empty handling
    - Stop at next non-empty value
    - Multiple fill sequences
    - Whitespace handling (default off, optional on)
    - Real-world hierarchical product data use case
    - Validation errors (column doesn't exist, empty columns array)
    - Edge cases (single row, empty table, mixed types)
  - Created `fill-across.test.ts` with 19 tests:
    - Single row left-to-right filling
    - Each row processed independently
    - Data type preservation
    - First column empty handling
    - All columns empty handling
    - Column order respecting
    - Stop at next non-empty value
    - Multiple fill sequences
    - Whitespace handling
    - Real-world quarterly data pattern
    - Validation errors and edge cases
- ✅ **UI Integration**:
  - Updated `AddStepDialog.tsx`:
    - Added "Fill Down" and "Fill Across" to operations dropdown
    - Created form for Fill Down:
      - Column badges (multi-select)
      - Example showing hierarchical data normalization
      - Checkbox for "Treat whitespace-only cells as empty"
    - Created form for Fill Across:
      - Column badges (multi-select with order numbers shown)
      - Example showing quarterly data filling
      - Warning: "⚠️ Order Matters - Columns filled left to right"
      - Checkbox for whitespace handling
    - Added edit mode population for both operations
    - Added config building in handleSubmit
  - Updated `PipelineSteps.tsx`:
    - Added "Fill Down" and "Fill Across" to operation name mapping
    - Format display for Fill Down: `Columns: A, B, C (incl. whitespace)`
    - Format display for Fill Across: `Columns: Q1 → Q2 → Q3 (incl. whitespace)`
- ✅ **All 435 tests passing** (397 existing + 38 new fill operation tests)
- ✅ **Build succeeds** with no errors
- **Use Case**: Normalize hierarchical data where parent values span multiple child rows (e.g., Product spans multiple Measure rows)
- **Key Design Decisions**:
  - Empty cell definition: `null` and `""` are empty by default
  - Whitespace-only `"   "` is optional (user chooses via checkbox)
  - Fill Down: Processes columns independently, fills top-to-bottom
  - Fill Across: Processes each row independently, fills left-to-right
  - Column order matters for Fill Across (user selects order)
  - First row/column empty: Left as `null` (no fill source available)
  - Data type preservation: Numbers stay numbers, dates stay dates
- **Status**: Complete and ready for production use

### 2026-02-03: UI Enhancement - Replaced Loading Text with Spinners
- ✅ **Installed shadcn/ui Spinner component**:
  - Added `src/components/ui/spinner.tsx` (Loader2Icon with animation)
- ✅ **Updated Preview Page** (`src/app/preview/[uploadId]/page.tsx`):
  - Replaced "Loading upload..." text with Spinner + text
  - Replaced "Loading..." text in data preview with Spinner + text
  - Used `flex items-center gap-2` for horizontal layout
- ✅ **Updated ParseConfigPanel** (`src/components/ParseConfigPanel.tsx`):
  - Replaced "Saving configuration..." text with Spinner + text
  - Smaller spinner (size-3) for inline indicator
- ✅ **Updated AddStepDialog** (`src/components/AddStepDialog.tsx`):
  - Added Spinner to "Validating..." button state
  - Button now shows spinner icon + "Validating..." text
- ✅ **All 397 tests passing**
- ✅ **Build succeeds**
- **Status**: All loading states now use animated spinners for better UX

### 2026-02-03: Spec 006 Phase 3 - Parse Configuration UI Redesign (Complete)
- ✅ **Converted to Inline Panel Design** (per user request):
  - Replaced dialog-based `ParseConfigDialog` with inline `ParseConfigPanel` component
  - Config panel now displays directly on Transform Data page (left sidebar, above Pipeline Steps)
  - Removed "Configure Data Source" button - config is always visible
  - Removed "Apply Configuration" submit button
- ✅ **Implemented Auto-Save on Blur**:
  - All input fields (startRow, endRow, startColumn, endColumn) auto-save on blur
  - Excel sheet selector auto-saves on change
  - "Has Headers" checkbox auto-saves on change
  - Preview automatically reloads after each config change
  - Shows "Saving configuration..." indicator during save
- ✅ **Created ParseConfigPanel Component** (`src/components/ParseConfigPanel.tsx`):
  - Wrapped in Card component for clean inline display
  - All fields have onBlur handlers that trigger saveConfig()
  - Select and Checkbox components call handlers directly (no blur needed)
  - "Reset to Defaults" button auto-saves after reset
  - Same validation as before: start ≤ end, all numbers ≥ 1
  - Error display for validation failures or save errors
  - Shows helpful descriptions and examples for each field
- ✅ **Updated Preview Page Layout** (`src/app/preview/[uploadId]/page.tsx`):
  - Removed `parseConfigDialogOpen` state (no longer needed)
  - Removed "Configure Data Source" button from header
  - Added ParseConfigPanel to left sidebar above PipelineSteps
  - Changed callback from `onConfigSaved` to `onConfigChanged` (clearer naming)
  - Left sidebar now shows: Data Source Config → Pipeline Steps
- ✅ **All 397 tests passing** (no regressions)
- ✅ **Build succeeds** with no errors
- **UX Improvements**:
  - Config always visible - no need to open dialog
  - Instant feedback - changes apply immediately on blur
  - Cleaner workflow - no submit button to click
  - Better for iterative exploration of data ranges
- **Status**: Inline parse configuration with auto-save complete and ready for use

### 2026-02-03: Spec 006 Phase 3 - Parse Configuration UI (Complete)
- ✅ **Created listSheets Convex Action** (`convex/parsers.ts`):
  - `listSheets` action - Fetches Excel file and returns sheet names
  - Only works for Excel files (.xlsx, .xls)
  - Uses `listSheets()` utility from Excel parser
  - Returns array of sheet names
- ✅ **Created ParseConfigDialog Component** (`src/components/ParseConfigDialog.tsx`):
  - Full dialog with all parse configuration options
  - **Excel sheet selector**: Dropdown with sheet names (only shown for Excel files)
  - **Row range inputs**: startRow, endRow (number inputs, 1-based)
  - **Column range inputs**: startColumn, endColumn (number inputs, 1-based)
  - **Has Headers checkbox**: Default checked, shows description
  - "Reset to Defaults" button - clears all config
  - "Apply Configuration" button - saves to database via `updateParseConfig` mutation
  - **Validation**: startRow ≤ endRow, startColumn ≤ endColumn, all numbers ≥ 1
  - Error display for validation failures or save errors
  - Shows examples and helpful descriptions for each field
- ✅ **Updated Preview Page** (`src/app/preview/[uploadId]/page.tsx`):
  - Added "Configure Data Source" button in header (next to Export button)
  - Added `availableSheets` state for Excel sheet names
  - Added `loadSheetNames()` function - fetches sheets for Excel files on mount
  - Added `handleConfigSaved()` handler - reloads data after config changes
  - Added `ParseConfigDialog` component at bottom with all props wired up
  - Fetches sheet list automatically for Excel files
  - Dialog opens when "Configure Data Source" button clicked
- ✅ **All 397 tests passing** (no regressions)
- ✅ **Build succeeds** with no errors
- **Status**: Spec 006 Phase 3 complete, parse configuration UI ready for use

### 2026-02-03: Fixed OOM Error in Preview Page (Critical Fix)
- ✅ **Root Cause**: parseFile action was parsing entire files (maxRows: Infinity)
  - Convex has 64MB memory limit per action
  - Large CSV/Excel files (>10K rows) were causing OOM
  - This broke the entire preview page, not just validation
- ✅ **Solution**: Added 5000-row limit for preview parsing
  - `parseFile` action now limits to 5000 rows by default
  - Caps user-configured endRow ranges to 5000 rows max
  - Adds warning when preview is capped: "Preview limited to 5000 rows..."
  - Full data still available via pipeline execution and export
- ✅ **Trade-offs**:
  - Preview shows first 5000 rows only (sufficient for most use cases)
  - Pipeline execution still processes full files (uses streaming)
  - Export functionality gets full data (not limited)
- ✅ **All 397 tests passing**
- ✅ **Build succeeds**
- **Status**: Preview page now works with large files

### 2026-02-03: Spec 007 Phase 3 - Memory Optimization for Validation (Complete)
- ✅ **Fixed OOM Error**: Reduced validation sample from 1000 to 500 rows
  - Convex has 64MB memory limit per action
  - Large CSV files were causing OOM when parsing full file
  - Solution: Parse only first 500 rows for validation (sufficient sample size)
  - Disabled type inference during validation parse (saves memory)
  - Added clear UI indicator: "Validates first 500 rows"
- ✅ **All 397 tests passing**
- ✅ **Build succeeds**
- **Status**: Validation now works with large files

### 2026-02-03: Spec 007 Phase 3 - Validation Preview (Complete)
- ✅ **Created Validation Backend** (`src/lib/pipeline/casting/validate.ts`):
  - `validateCast()` - Validates column values can be cast to target type
  - Returns statistics: total, valid, invalid counts, failure rate
  - Collects sample invalid values (up to 5) with error messages
  - Recommends error handling mode based on failure rate:
    - 0% failures → recommend `fail` (safest)
    - ≤5% failures → recommend `skip` (data quality issues)
    - ≤20% failures → recommend `null` (intentional nulls/missing data)
    - >20% failures → recommend `fail` (likely wrong type choice)
  - Samples first 500 rows for performance (optimized for Convex memory limits)
- ✅ **Created Convex Action** (`convex/parsers.ts`):
  - `validateCast` action - Fetches file data and validates cast
  - Accepts uploadId, column, targetType, format
  - Returns ValidationResult with statistics and recommendations
  - Memory-optimized: Limits to 500 rows, skips type inference
- ✅ **Updated AddStepDialog UI** (`src/components/AddStepDialog.tsx`):
  - Added "Preview Cast Validation" button to cast_column form
  - Shows validation results in card:
    - Valid/Invalid counts with color coding (green/red)
    - Failure rate percentage
    - Recommended error handling mode (highlighted)
    - Sample invalid values with error messages
    - Success message when all values valid
  - Auto-enables when uploadId, column, and targetType are set
  - Loading state during validation
  - Shows "Validates first 500 rows" label
- ✅ **Updated Preview Page** (`src/app/preview/[uploadId]/page.tsx`):
  - Pass uploadId prop to AddStepDialog for validation
- ✅ **Comprehensive Testing**:
  - Created 19 tests for validateCast function (`casting/__tests__/validate.test.ts`)
  - Tests all validation scenarios: all-valid, mixed, all-invalid
  - Tests recommendation logic for all failure rate thresholds
  - Tests maxSamples collection and maxRows performance
  - Tests type-specific validation (number, boolean, date, string)
  - Tests edge cases (empty array, nulls, mixed types)
- ✅ **All 397 tests passing** (378 previous + 19 new validation tests)
- ✅ **Build succeeds** with no errors
- **Status**: Phase 3 complete, validation preview ready for use

### 2026-02-03: Spec 007 Phase 2 - UI Type Casting Dialog (Complete)
- ✅ **Added cast_column to AddStepDialog** (`src/components/AddStepDialog.tsx`):
  - Added to operations selector with description
  - Column dropdown selector
  - Target type selector (string, number, boolean, date)
  - Error handling mode selector with descriptions:
    - `fail` - Stop immediately on first error
    - `null` - Replace invalid values with null
    - `skip` - Remove rows with invalid values
  - Optional date format input (shown only when targetType is "date")
  - Example box showing common use cases
  - Form validation for all required fields
  - Edit mode support (populate form when editing existing step)
- ✅ **Updated PipelineSteps display** (`src/components/PipelineSteps.tsx`):
  - Added "Cast Column Type" to operation name mapping
  - Format display: `column → targetType (on error: mode)`
  - Example: `age → number (on error: null)`
- ✅ **All 378 tests passing** (no regressions)
- ✅ **Build succeeds** with no errors
- **Ready for manual testing**: Start dev server and test cast column operation in browser
- **Status**: Phase 2 complete, core functionality ready for use

### 2026-02-03: Spec 007 Phase 1 - Backend Type Casting (Complete)
- ✅ **Created Type Casting Functions** (`src/lib/pipeline/casting/types.ts`):
  - `castToString()` - Converts any value to string (never fails)
  - `castToNumber()` - Converts to number with comma removal, returns null on failure
  - `castToBoolean()` - Accepts true/false, yes/no, y/n, 1/0 (case-insensitive)
  - `castToDate()` - Parses ISO, US, European, and text date formats
  - `tryCast()` - Wrapper that returns `{ success, value, error }`
  - Special handling: null/undefined inputs treated as successful casts (return null or empty string)
- ✅ **Created Cast Column Operation** (`src/lib/pipeline/operations/cast-column.ts`):
  - Validates column exists before casting
  - Processes each row with `tryCast()`
  - Three error handling modes:
    - `fail` - Throw TransformationError immediately on first failure
    - `null` - Set failed casts to null, continue processing
    - `skip` - Remove entire row on cast failure
  - Updates column metadata (type, nullCount, sampleValues)
  - Generates warnings for cast errors and skipped rows
- ✅ **Updated Pipeline Type System** (`src/lib/pipeline/types.ts`):
  - Added `"cast_column"` to `TransformationType` union
  - Added `CastColumnConfig` interface
  - **BREAKING CHANGE**: Updated `OperationFn` signature to return `{ table, columns }`
  - **BREAKING CHANGE**: Added `columnsAfter` to `StepResult`
  - **BREAKING CHANGE**: Added `typeEvolution` to `ExecutionResult`
- ✅ **Updated ALL 11 Existing Operations**:
  - Changed return type from `ParseResult` to `{ table: ParseResult; columns: ColumnMetadata[] }`
  - Simple operations (trim, uppercase, lowercase, deduplicate, filter): Return unchanged columns
  - rename-column: Updates column name in metadata
  - remove-column: Filters out removed columns
  - split-column: Adds new columns as string type
  - merge-columns: Adds merged column as string type
  - unpivot/pivot: Create new column structures with type inference
- ✅ **Updated Pipeline Executor** (`src/lib/pipeline/executor.ts`):
  - Tracks `columnsAfter` for each step in `StepResult`
  - Builds `typeEvolution` array showing column metadata at each step
  - Both `executePipeline()` and `executeUntilStep()` return type evolution
- ✅ **Comprehensive Testing**:
  - Created 40 tests for casting functions (`casting/__tests__/types.test.ts`)
  - Created 24 tests for cast-column operation (`operations/__tests__/cast-column.test.ts`)
  - Updated all 304 existing tests to use new operation signature
  - Fixed edge case: `castToNumber` now rejects Infinity
  - Fixed edge case: `tryCast` now treats null/undefined input as successful cast
- ✅ **All 378 tests passing** (304 existing + 40 casting + 24 cast-column + 10 new executor)
- ✅ **Build succeeds** with no errors
- **Key Design Decisions**:
  - Breaking changes are acceptable (app not deployed yet)
  - All operations must now return `{ table, columns }` for type tracking
  - Type evolution is mandatory at each pipeline step
  - Null inputs are treated as successful casts (not errors)
- **Status**: Phase 1 complete, backend ready for UI implementation

### 2026-02-03: Created Spec 007 - Column Type Casting and Type Tracking
- ✅ Comprehensive spec created for type casting and type tracking
- **Objective**: Manual column type casting with validation and pipeline-wide type tracking
- **Key Features**:
  - New `cast_column` transformation operation
  - Cast to: string, number, boolean, date
  - Error handling modes: fail, set to null, skip row
  - Batch casting for multiple columns
  - Track column types at each pipeline step
  - Type evolution display in UI
  - Validation preview before applying cast
- **5 Implementation Phases**:
  1. ✅ Backend type casting operation (COMPLETE)
  2. UI type casting dialog (add to AddStepDialog)
  3. Validation preview (validate before applying)
  4. Batch casting UI (cast multiple columns)
  5. Testing and documentation
- **64 new unit tests completed** (40 casting + 24 cast-column)
- **Use cases**: Fix incorrect type inference, ensure consistent types, validate data quality
- **Type tracking enhancement**: ExecutionResult includes type evolution at each step

## Recent changes

### 2026-02-03: Spec 006 Phase 2 - Database Schema Updates (Complete)
- ✅ **Updated Convex schema** (`convex/schema.ts`):
  - Added `parseConfig` field to uploads table
  - Optional object with all parse options: `sheetName`, `sheetIndex`, `startRow`, `endRow`, `startColumn`, `endColumn`, `hasHeaders`
  - Fully typed with Convex validators
- ✅ **Created updateParseConfig mutation** (`convex/uploads.ts`):
  - Allows updating parse configuration for an upload
  - Full validation of all range values
  - Validates upload exists before updating
  - Returns success indicator
- ✅ **Updated parseFile action** (`convex/parsers.ts`):
  - Changed signature to accept `uploadId` instead of `storageId` + `fileType`
  - Fetches upload record from database
  - Extracts parseConfig from upload and applies to parse options
  - Defaults to `hasHeaders: true` when no parseConfig exists
  - Backward compatible parseFileInternal kept for pipeline execution
- ✅ **Updated executePipelineAction** (`convex/pipelines.ts`):
  - Now reads parseConfig from upload record
  - Applies all parse options when executing pipelines
  - Consistent behavior with parseFile action
- ✅ **Updated preview page** (`src/app/preview/[uploadId]/page.tsx`):
  - Changed parseFile call to use new `uploadId` parameter
  - Simplified - no longer needs to pass storageId and fileType
- ✅ **All 304 tests passing** (no regressions)
- ✅ **Build succeeds** with no errors
- **Status**: Phase 2 complete, database integration working

## Recent changes

### 2026-02-03: Spec 006 Phase 1 - Backend Parser Updates (Complete)
- ✅ **Updated type definitions** (`src/lib/parsers/types.ts`):
  - Added new `ParseOptions` fields: `sheetName`, `sheetIndex`, `startRow`, `endRow`, `startColumn`, `endColumn`, `hasHeaders`
  - All options fully typed with detailed JSDoc comments
  - 1-based indexing for user-facing row/column numbers
- ✅ **Updated CSV parser** (`src/lib/parsers/csv.ts`):
  - Added row range extraction (`startRow`, `endRow`)
  - Added column range extraction (`startColumn`, `endColumn`)
  - Added `hasHeaders` option (default: true)
    - When `false`: generates "Column1", "Column2", etc.
    - When `true`: uses first row of selected range as headers
  - Proper validation for invalid ranges
  - Semantics: `startRow=N` means "start from line N of file"
- ✅ **Updated Excel parser** (`src/lib/parsers/excel.ts`):
  - Added `listSheets()` function to get all sheet names from workbook
  - Added sheet selection by name (`sheetName`) or index (`sheetIndex`)
  - Added row range extraction (same as CSV)
  - Added column range extraction (same as CSV)
  - Added `hasHeaders` option (same as CSV)
  - Uses xlsx library's range parameter for efficient extraction
  - Changed `raw: true` to preserve number types
- ✅ **Fixed build issue** (`convex/pipelines.ts`):
  - Updated `sheet` option to `sheetName` to match new ParseOptions
- ✅ **Wrote comprehensive unit tests**:
  - **CSV range tests** (`csv-ranges.test.ts`): 60 tests
    - Row range extraction (10 tests)
    - Column range extraction (8 tests)
    - Combined row+column ranges (2 tests)
    - hasHeaders option (7 tests)
    - Edge cases with ranges (6 tests)
  - **Excel range tests** (`excel-ranges.test.ts`): 47 tests
    - listSheets function (4 tests)
    - Sheet selection (7 tests)
    - Row range extraction (10 tests)
    - Column range extraction (8 tests)
    - Combined row+column ranges (2 tests)
    - hasHeaders option (7 tests)
    - Edge cases with ranges (6 tests)
    - Sheet selection with ranges (3 tests)
- ✅ **All 304 tests passing** (257 previous + 47 new Excel tests)
- ✅ **Build succeeds** with no errors
- **Design decisions**:
  - Breaking changes OK (app not deployed yet)
  - 1-based indexing for row/column numbers (converted to 0-based internally)
  - `startRow=N, hasHeaders=true` means "line N becomes headers"
  - Simple checkbox for headers instead of complex "header row number"
- **Status**: Phase 1 complete, ready for Phase 2 (database schema)

### 2026-02-03: Bug Fix - Split Column Comma Input Issue
- ✅ Fixed issue where users couldn't type commas in "New Column Names" field
- ✅ Fixed same issue in "Positions" field for position-based splitting
- **Root cause**: Input was parsing and filtering values on every keystroke
- **Solution**: Store raw string value during input, parse only on submit
- Changed fields to accept string input and parse to arrays at validation time
- Both fields now allow natural comma entry: "FirstName,LastName" works as expected
- Edit mode still works correctly (arrays converted to strings for display)
- ✅ Build succeeds with no errors
- **Status**: Split column form now fully functional

### 2026-02-03: UI Enhancement - Added Examples to Step Dialogs
- ✅ Added example boxes to all 11 transformation operations in `AddStepDialog.tsx`
- **Examples added**:
  - **Trim**: Shows whitespace removal example
  - **Uppercase/Lowercase**: Shows case transformation examples
  - **Deduplicate**: Shows description of duplicate removal
  - **Filter**: Shows conditional filtering examples
  - **Rename Column**: Shows column renaming example
  - **Remove Column**: Shows description
  - **Unpivot**: Shows wide → long transformation example
  - **Pivot**: Shows long → wide transformation example
  - **Split Column**: Shows delimiter-based splitting example
  - **Merge Columns**: Shows column merging example
- Examples use monospace font on muted background for clear visibility
- Helps users understand transformations before applying them
- ✅ Build succeeds with no errors
- **Status**: UI improved with inline documentation

### 2026-02-03: Spec 005 - Template-Based Transformations (Complete)
- ✅ **Phase 1: Backend Implementation**
  - Updated type system (`src/lib/pipeline/types.ts`):
    - Added 4 new operation types: `unpivot`, `pivot`, `split_column`, `merge_columns`
    - Created config interfaces: `UnpivotConfig`, `PivotConfig`, `SplitColumnConfig`, `MergeColumnsConfig`
  - Implemented 4 template operations:
    - `unpivot.ts` - Convert wide format to long format (columns → rows)
    - `pivot.ts` - Convert long format to wide format (rows → columns) with 5 aggregation options
    - `split-column.ts` - Split one column into multiple (delimiter, position, regex methods)
    - `merge-columns.ts` - Combine multiple columns into one
  - Registered operations in `operations/index.ts`
  - Comprehensive unit tests (101 new tests):
    - `unpivot.test.ts` - 15 tests (basic, multi-id, null handling, validation)
    - `pivot.test.ts` - 24 tests (basic, multi-index, null handling, 5 aggregations, validation)
    - `split-column.test.ts` - 32 tests (3 methods, options, edge cases, validation)
    - `merge-columns.test.ts` - 20 tests (merge, skip nulls, keep originals, validation)
- ✅ **Phase 2: UI Implementation** (forms were already implemented)
  - Verified `AddStepDialog.tsx` contains all 4 template operation forms:
    - **Unpivot form** (lines 538-612): ID columns badges, value columns badges, variable/value names
    - **Pivot form** (lines 614-703): Index columns badges, column source dropdown, value source dropdown, aggregation selector
    - **Split Column form** (lines 705-821): Column dropdown, method radio (delimiter/position/regex), dynamic inputs, options checkboxes
    - **Merge Columns form** (lines 823-886): Columns badges, separator input, new column name, options checkboxes
  - Verified `PipelineSteps.tsx` displays all 4 template operations with human-readable formatting
  - All forms include proper validation, error handling, and helper text
- ✅ All 224 tests passing (100% pass rate)
- ✅ Build succeeds with no errors
- **Status**: Fully complete and ready for manual testing

### 2026-02-03: Spec 004 - CSV Export Functionality (Complete)
- ✅ **Phase 1: CSV Export Generator**
  - Created `src/lib/export/csv.ts` with `generateCSV()` function
  - Proper CSV escaping (quotes, commas, newlines)
  - UTF-8 with BOM for Excel compatibility
  - Created `sanitizeExportFilename()` helper
  - Wrote 26 comprehensive unit tests (all passing)
- ✅ **Phase 2: Export UI Component**
  - Installed shadcn/ui Toast component
  - Added `<Toaster />` to root layout
  - Created `ExportButton` component with Download icon
  - Triggers browser download using blob URLs
  - Shows success/error toast notifications
- ✅ **Phase 3: Integration**
  - Added ExportButton to preview page header
  - Passes final preview data and original filename
  - Disabled when loading or error state
- ✅ Build succeeds with no errors
- ✅ All 153 tests passing (127 previous + 26 new CSV tests)
- **Status**: Ready for manual testing

### 2026-02-03: Spec 003c - Added Edit Step Functionality (Complete)
- ✅ Added edit button to `PipelineSteps.tsx` (pencil icon)
- ✅ Modified `AddStepDialog.tsx` to support edit mode:
  - Added `editingStep` and `onEditStep` props
  - Populates form with existing step configuration using `useEffect`
  - Disables operation type selector when editing (can't change operation type)
  - Shows "Edit Transformation Step" title and "Save Changes" button
- ✅ Wired up edit handlers in `src/app/preview/[uploadId]/page.tsx`:
  - Added `handleEdit()` - Opens dialog with step data
  - Added `handleEditStep()` - Updates step and syncs to Convex
  - Clears editing state when dialog closes
- ✅ Build succeeds with no errors
- ✅ All 127 tests passing
- **Status**: Spec 003c fully complete, ready for manual testing

### 2026-02-03: Spec 003c Phase 4 - Pipeline Preview Page (Complete)
- ✅ Created `/preview/[uploadId]/page.tsx` dynamic route
- ✅ **Integrated all components:**
  - DataTable for displaying data
  - PipelineSteps for step management
  - AddStepDialog for adding transformations
- ✅ **Convex integration:**
  - `useQuery` for fetching upload and pipeline data
  - `useMutation` for creating/updating pipelines
  - `useAction` for parsing files and executing pipelines
  - Auto-loads existing pipeline if present
  - Auto-creates pipeline on first step addition
- ✅ **State management:**
  - Local state for steps and preview
  - Selected step index for step-by-step preview
  - Original data cached after parse
  - Preview data updates on step changes
- ✅ **Features implemented:**
  - Load and parse uploaded file
  - Add/remove/reorder pipeline steps
  - Click step to preview up to that step
  - Auto-save pipeline to Convex on changes
  - Loading states for async operations
  - Error display for failures
- ✅ **Layout:**
  - Two-column layout (steps sidebar + data preview)
  - Responsive grid (stacks on mobile)
  - Header with file info
  - Error card when needed
- ✅ Updated upload page with "Transform Data →" link
- ✅ Build succeeds with no errors (only known @next/swc warning)
- **Status**: All 4 phases complete, ready for manual testing

### 2026-02-03: Spec 003c Phase 3 - Add Step Dialog (Complete)
- ✅ Installed shadcn/ui components: dialog, select, input, label
- ✅ Created `src/components/AddStepDialog.tsx`
  - Dialog with operation type selector dropdown
  - 7 operation types with descriptions
  - **Dynamic forms for each operation:**
    - Trim/Uppercase/Lowercase: Column badges (multi-select with click)
    - Deduplicate: Optional column badges (all or specific)
    - Filter: Column dropdown, operator dropdown (6 operators), value input
    - Rename Column: Current name dropdown, new name input
    - Remove Column: Column badges (multi-select)
  - **Validation:**
    - Required fields checked before submission
    - Clear error messages displayed in red box
    - Form state resets on close
  - **UX Features:**
    - Badge-based multi-select for columns (click to toggle)
    - Two-column descriptions in operation selector
    - Cancel/Add Step buttons in footer
    - Form resets when switching operations
- ✅ Build succeeds with no errors
- **Next**: Phase 4 - Create preview page with Convex integration

### 2026-02-03: Spec 003c Phase 2 - Pipeline Step List (Complete)
- ✅ Installed shadcn/ui button component with lucide-react icons
- ✅ Created `src/components/PipelineSteps.tsx`
  - Displays list of transformation steps with step numbers
  - Shows operation type badges and human-readable names
  - Formats configuration details for each step type
  - Highlights selected step with border and background
  - Up/down buttons for reordering (disabled for first/last)
  - Remove button for each step (red trash icon)
  - Add Step button in header
  - Empty state when no steps
  - Click to select step for preview
  - Fully typed with TypeScript
- ✅ Build succeeds with no errors
- **Next**: Phase 3 - Create Add Step Dialog for configuring transformations

### 2026-02-03: Spec 003c Phase 1 - Data Table Component (Complete)
- ✅ Initialized shadcn/ui with Tailwind CSS v3
  - Installed Tailwind CSS v3.x (v4 had Next.js compatibility issues)
  - Created `tailwind.config.ts` with shadcn theme configuration
  - Created `postcss.config.js` for PostCSS integration
  - Updated `src/app/globals.css` with Tailwind directives and CSS variables
  - Configured dark mode support
- ✅ Installed shadcn/ui components:
  - `table` - Data table component
  - `card` - Card with header/content/footer
  - `badge` - Badge for displaying column types
- ✅ Created `src/components/DataTable.tsx`
  - Displays ParseResult data in shadcn/ui Table
  - Shows column headers with type badges (number, string, boolean, date)
  - Displays first 100 rows by default (configurable via maxRows prop)
  - Shows row count and column count in card header
  - Renders null values with italic styling
  - Displays warnings below table if present
- ✅ Build succeeds with no errors (only known @next/swc warning)
- **Next**: Phase 2 - Create Pipeline Step List component

### 2026-02-03: Created Spec 003c - Preview UI and Pipeline Builder (Active)
- ✅ Created comprehensive spec for UI implementation
- **Objective**: Build React UI for data display and pipeline building
- **Key Features**:
  - DataTable component for displaying parsed data
  - PipelineSteps list with add/remove/reorder controls
  - AddStepDialog for configuring transformations
  - Step-by-step preview execution
  - Integration with Convex backend from spec 003b
- **Tech Stack**: shadcn/ui components (Table, Card, Button, Dialog, Select, Input)
- **5 Implementation Phases**:
  1. Data Table Component
  2. Pipeline Step List
  3. Add Step Dialog
  4. Pipeline Preview Page
  5. Integration and State Management
- **Manual testing approach** (no unit tests for UI components yet)
- **10 Acceptance Criteria** defined

### 2026-02-03: Added shadcn/ui as UI component standard
- ✅ Updated AGENTS.md with shadcn/ui technical stack
- ✅ Updated PATTERNS.md with shadcn/ui usage patterns
- **Decision**: All UI components should use shadcn/ui as the foundation
  - Tailwind CSS-based, copy-paste components
  - Install via: `npx shadcn@latest add <component>`
  - Components placed in `src/components/ui/` and can be customized
  - Application-specific components in `src/components/` compose shadcn/ui primitives

### 2026-02-03: Spec 003b Pipeline Engine (Done)
- ✅ Updated Convex schema with `pipelines` table (uploadId, sheetName, steps[], timestamps)
- ✅ Created comprehensive type system in `src/lib/pipeline/types.ts`
  - TransformationStep, PipelineConfig, ExecutionResult, StepResult
  - Config types for all 7 operations
- ✅ Implemented 7 transformation operations (all pure functions):
  - `trim.ts` - Trim whitespace from string columns
  - `uppercase.ts` / `lowercase.ts` - Case transformations
  - `deduplicate.ts` - Remove duplicate rows (all columns or specific columns)
  - `filter.ts` - Filter rows with 6 operators (equals, not_equals, contains, not_contains, greater_than, less_than)
  - `rename-column.ts` - Rename columns with validation
  - `remove-column.ts` - Remove columns with validation
- ✅ Created operations registry in `src/lib/pipeline/operations/index.ts`
- ✅ Implemented pipeline executor in `src/lib/pipeline/executor.ts`
  - `executePipeline()` - Sequential execution with error handling
  - `executeUntilStep()` - Preview mode (execute up to specific step)
  - Tracks rowsAffected for each step
  - Stops execution on first error
- ✅ Created Convex integration in `convex/pipelines.ts`
  - CRUD mutations: createPipeline, updatePipeline, deletePipeline
  - Queries: getPipeline, listPipelines
  - Action: executePipelineAction (fetches data, executes pipeline, returns result)
- ✅ Updated `convex/uploads.ts` with getUpload query
- ✅ Updated `convex/parsers.ts` with parseFileInternal action
- ✅ Wrote 48 comprehensive unit tests:
  - `trim.test.ts` - 5 tests
  - `case.test.ts` - 6 tests (uppercase/lowercase)
  - `deduplicate.test.ts` - 6 tests
  - `filter.test.ts` - 10 tests (all operators + edge cases)
  - `rename-column.test.ts` - 4 tests
  - `remove-column.test.ts` - 5 tests
  - `executor.test.ts` - 12 tests (executePipeline + executeUntilStep)
- ✅ All 127 tests passing (79 from spec 003a + 48 new pipeline tests)
- ✅ Build succeeds with no errors (only known @next/swc warning)

### 2026-02-02: Spec 003a File Parsing (Done)

### Spec 003a: File Parsing and Type Inference (Done)
- ✅ Installed xlsx package for Excel parsing
- ✅ Created comprehensive type definitions in `src/lib/parsers/types.ts`
- ✅ Implemented CSV parser with delimiter auto-detection in `src/lib/parsers/csv.ts`
  - Handles quoted fields, escaped quotes, multiple delimiters (comma, semicolon, tab, pipe)
  - Auto-detects delimiters
  - Converts empty values to null
  - Warns about duplicate columns and malformed rows
- ✅ Implemented Excel parser in `src/lib/parsers/excel.ts`
  - Multi-sheet support
  - Sheet selection by index or name
  - Warns when multiple sheets available
- ✅ Implemented type inference in `src/lib/parsers/type-inference.ts`
  - Infers: string, number, boolean, date, null
  - Number formats: integers, decimals, negative numbers, scientific notation, comma-separated
  - Boolean formats: true/false, yes/no, y/n (case-insensitive)
  - Date formats: ISO (2023-01-15), US (01/15/2023), text (Jan 15, 2023)
  - Numbers prioritized over booleans (0 and 1 treated as numbers)
  - Majority type detection (>80% threshold)
- ✅ Created Convex action in `convex/parsers.ts`
  - `parseFile` action accepts storageId and fileType
  - Returns ParseResult with rows, columns, metadata, warnings
- ✅ Wrote 79 unit tests across validation and parser modules
  - CSV parser: 26 tests (basic parsing, quoted fields, empty values, type inference, warnings, errors, edge cases)
  - Type inference: 27 tests (number, boolean, date, string inference, null handling, mixed types)
  - Validation: 26 tests (from spec 002)
  - All tests passing (100% pass rate)
- ✅ Manual testing verified correct type detection
- ✅ Build succeeds with no errors (only known @next/swc warning)

### Spec 001: File Upload (Done)
- ✅ Created Convex + Postgres file upload system
- ✅ File IDs generated by database
- ✅ Files stored in Convex storage
- ✅ Updated Next.js to 15.5.11 (security fix)
- ✅ Removed Vite/Vitest references from docs

### Spec 002: Automated Testing (Done)
- ✅ Set up Node.js test runner with tsx
- ✅ Added test scripts: `npm test` and `npm run test:watch`
- ✅ Extracted validation functions to `src/lib/validation.ts`
- ✅ Wrote 26 unit tests for all validation functions
- ✅ All tests passing (100% pass rate)
- ✅ Fixed bug in `sanitizeFilename` discovered by tests
- ✅ Updated AGENTS.md with test commands
- ✅ Updated PATTERNS.md with testing conventions
- ✅ Build verified after refactoring (no regressions)

## Setup required (first-time)
To run the application:
1. `npx convex dev` - Login/create Convex account, initializes project
2. `npm run dev` - Start Next.js (in separate terminal)
3. Visit http://localhost:3000 to test file uploads

See `docs/internal/CONVEX_SETUP.md` for detailed setup instructions.

## Known Issues
- **@next/swc version warning**: Harmless warning about version mismatch (see `docs/internal/KNOWN_ISSUES.md`)
  - Does not affect functionality
  - Build and app work correctly
  - Keeping Next.js 15.5.11 for security patches

## Agent rules (OpenCode)
- Repo rules: AGENTS.md

## Key decisions
- Next.js + Node
- Convex for backend + database + file storage
- Postgres available via Convex integration for future features
- DuckDB planned as data engine for preview/export
- Ask before introducing new libraries or patterns; record in docs/internal/PATTERNS.md
### 2026-02-05: Spec 014 - CI Dummy Convex URL (Complete)
- ✅ Injected `NEXT_PUBLIC_CONVEX_URL` in `.github/workflows/ci.yml` build step only
- ✅ Placeholder value `https://dummy.convex.cloud` used (non-secret)
- ✅ Avoids build-time env error from `src/app/providers.tsx`
- **Status**: Complete; builds in CI should now succeed
