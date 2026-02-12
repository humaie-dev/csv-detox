# Spec: Transformation Pipeline and Preview
Date: 2026-02-02
ID: 003
Status: Superseded

**Note**: This spec has been broken into smaller, more manageable specs:
- Spec 003a: File Parsing and Type Inference (Done)
- Spec 003b: Pipeline Engine and Execution (Done)
- Spec 003c: Preview UI Components (Done)

---

## Objective
Establish the core transformation pipeline infrastructure that processes CSV/Excel files through a series of transformation steps, with the ability to preview the output at each step. Support multiple transformation configurations for Excel files with multiple sheets.

## Scope
### In scope
- Pipeline data structure to hold transformation configs
- File parsing (CSV and Excel) into in-memory table format
- Typed table representation (columns with inferred types)
- Multi-step transformation execution framework
- Preview mode: show table state after each transformation step
- Support for multiple sheets in Excel files
- UI to display table previews with pagination
- Convex mutations/queries for pipeline management
- Database schema for storing pipeline configs

### Out of scope
- Actual transformation operations (trim, uppercase, filter, etc.) - future spec
- Export functionality - future spec
- Large file streaming (>50MB) - future spec
- Type inference configuration/overrides - future spec
- Data validation rules - future spec
- Undo/redo functionality - future spec
- Real-time collaboration - future spec
- Performance optimization (DuckDB integration) - future spec

## Requirements
### Functional
- FR1: Parse CSV files into typed table format
- FR2: Parse Excel files into typed tables (one per sheet)
- FR3: Infer column types: string, number, boolean, date, null
- FR4: Store transformation pipeline config in database
- FR5: Execute pipeline steps sequentially (even with no-op transformations)
- FR6: Generate preview of table at each step (up to 100 rows for preview)
- FR7: Display table in UI with column headers and data
- FR8: Support pagination for large previews (50 rows per page)
- FR9: Show current step indicator in UI
- FR10: User can navigate between transformation steps
- FR11: For Excel: user can configure separate pipelines per sheet
- FR12: Display sheet selector for Excel files

### Non-functional
- NFR1: Preview generation completes in <2 seconds for files up to 10MB
- NFR2: Type inference is consistent and deterministic
- NFR3: UI table rendering is responsive (virtualized if needed)
- NFR4: Pipeline configs are versioned in database
- NFR5: Memory efficient (don't load entire file for preview, sample if needed)

## Data Model

### TypeScript Types
```typescript
// Column type enum
type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'null';

// Table structure
interface DataTable {
  columns: Column[];
  rows: Row[];
  rowCount: number; // Total rows (may be more than rows.length for preview)
}

interface Column {
  name: string;
  type: ColumnType;
  nullable: boolean;
}

interface Row {
  [columnName: string]: string | number | boolean | Date | null;
}

// Transformation configuration
interface TransformationStep {
  id: string;
  type: string; // e.g., 'trim', 'filter', 'map' (not implemented yet)
  config: Record<string, unknown>; // Transformation-specific config
}

interface PipelineConfig {
  id: string;
  uploadId: string; // Reference to uploads table
  sheetName?: string; // For Excel files
  steps: TransformationStep[];
  createdAt: string;
  updatedAt: string;
}

// Preview result
interface PipelinePreview {
  pipelineId: string;
  stepIndex: number; // -1 = source, 0+ = after step N
  table: DataTable;
  metadata: {
    totalRows: number;
    totalColumns: number;
    isPreview: boolean; // true if rows are sampled
  };
}
```

### Convex Schema
```typescript
// pipelines table
{
  uploadId: string; // Link to uploads table
  sheetName: string | null; // null for CSV, sheet name for Excel
  steps: Array<{
    id: string;
    type: string;
    config: object;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

## Implementation Plan

### 1. Database Schema (convex/schema.ts)
- Add `pipelines` table with fields above
- Index by uploadId for quick lookup

### 2. File Parsing Library (src/lib/parsers/)
- `src/lib/parsers/csv.ts`:
  - Parse CSV file into DataTable
  - Infer column types from first 100 rows
  - Handle edge cases (empty cells, malformed data)
- `src/lib/parsers/excel.ts`:
  - Parse Excel file using a library (e.g., xlsx)
  - Extract sheet names
  - Parse each sheet into DataTable
  - Infer column types per sheet
- `src/lib/parsers/types.ts`:
  - Shared type definitions
  - Type inference utilities

### 3. Pipeline Execution Engine (src/lib/pipeline/)
- `src/lib/pipeline/executor.ts`:
  - `executePipeline(table: DataTable, steps: TransformationStep[]): DataTable`
  - Execute steps sequentially
  - For now, steps are no-ops (pass-through)
  - Return final table
- `src/lib/pipeline/preview.ts`:
  - `generatePreview(table: DataTable, maxRows: number): DataTable`
  - Sample rows if needed
  - Limit to maxRows

### 4. Convex Mutations/Queries (convex/pipelines.ts)
- Mutations:
  - `createPipeline`: Create pipeline config for upload
  - `updatePipeline`: Update transformation steps
  - `deletePipeline`: Remove pipeline
- Queries:
  - `getPipeline`: Get pipeline config by ID
  - `getPipelinesByUpload`: Get all pipelines for an upload
  - `getPreview`: Parse file, execute pipeline up to step N, return preview

### 5. UI Components (src/app/)
- `src/app/pipeline/[uploadId]/page.tsx`:
  - Main pipeline page
  - Show file info and sheet selector (for Excel)
  - Display transformation steps sidebar
  - Show current step indicator
- `src/components/TablePreview.tsx`:
  - Display DataTable with headers and rows
  - Pagination controls
  - Column type indicators
- `src/components/StepNavigator.tsx`:
  - List of transformation steps
  - "Source" step (original data)
  - Each transformation step
  - Active step highlighting
  - Click to navigate between steps
- `src/components/SheetSelector.tsx`:
  - Dropdown or tabs for Excel sheets
  - Show row count per sheet

### 6. Dependencies to Add
- `xlsx` - Excel file parsing
- Consider: `papaparse` for CSV (or use built-in parsing)

## Testing Plan

### Unit Tests
- CSV parser:
  - Parse simple CSV with headers
  - Infer string, number, boolean types
  - Handle empty cells (null)
  - Handle quoted strings with commas
  - Handle malformed rows
- Excel parser:
  - Parse single-sheet Excel file
  - Parse multi-sheet Excel file
  - Extract sheet names
  - Infer types per sheet
- Type inference:
  - Detect numbers (integers, floats)
  - Detect booleans (true/false, yes/no, 1/0)
  - Detect dates (ISO format)
  - Default to string
- Pipeline executor:
  - Execute empty pipeline (no-op)
  - Execute with multiple steps (all no-ops for now)
  - Preserve table structure

### Integration Tests
- Create pipeline for CSV upload
- Create pipeline for Excel upload with multiple sheets
- Generate preview at source step
- Generate preview after transformation steps
- Update pipeline steps
- Delete pipeline

### Manual Testing
- Upload CSV file, view parsed table
- Upload Excel file with 3 sheets, view each sheet
- Create pipeline, navigate between steps
- Verify pagination works with large dataset
- Verify column types are displayed
- Verify table updates when navigating steps

## UI Mockup (Text Description)

### Pipeline Page Layout
```
┌─────────────────────────────────────────────────────────┐
│ CSV Detox - Pipeline: sales-data.csv                   │
├─────────────┬───────────────────────────────────────────┤
│ Steps       │ Preview: Step 0 (Source)                  │
│             │                                            │
│ ▶ Source    │ ┌──────────────────────────────────────┐ │
│   (5 cols,  │ │ Name (string) | Amount (number) | ... │ │
│   1000 rows)│ ├──────────────────────────────────────┤ │
│             │ │ John          | 150.50          | ... │ │
│ ○ Step 1    │ │ Jane          | 200.00          | ... │ │
│   [Empty]   │ │ ...                                  │ │
│             │ └──────────────────────────────────────┘ │
│ [+ Add Step]│                                            │
│             │ Showing rows 1-50 of 1000                  │
│             │ [< Prev] [Next >]                          │
└─────────────┴───────────────────────────────────────────┘
```

For Excel files, add sheet tabs:
```
┌─────────────────────────────────────────────────────────┐
│ Pipeline: quarterly-report.xlsx                         │
├─────────────┬───────────────────────────────────────────┤
│ Sheets:     │ [Sales] [Expenses] [Summary]              │
│             │                                            │
│ Steps       │ Preview: Step 0 (Source) - Sales Sheet    │
│ ...         │ ...                                        │
└─────────────┴───────────────────────────────────────────┘
```

## Acceptance Criteria
- AC1: CSV files are parsed into typed tables with correct column types
- AC2: Excel files are parsed with sheet detection
- AC3: Can create pipeline config in database
- AC4: Can retrieve pipeline and generate preview
- AC5: UI displays table with headers, data, and column types
- AC6: Can navigate between "Source" and transformation steps
- AC7: Pagination works for tables >50 rows
- AC8: Excel sheet selector displays all sheets
- AC9: Clicking sheet loads that sheet's pipeline
- AC10: No transformation operations implemented yet (all steps are no-ops)
- AC11: Preview loads in <2 seconds for 10MB file
- AC12: All tests pass
