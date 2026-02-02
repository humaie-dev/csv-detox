# Project Memory — CSV Detox

Single source of truth for project state. Update after every meaningful change.

## Current task
- Active spec: None (Spec 004 complete)
- Status: **Ready for manual testing or next spec**
- Next action: Manual test CSV export or create new spec

## Recent changes

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
