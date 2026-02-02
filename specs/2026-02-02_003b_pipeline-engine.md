# Spec: Pipeline Engine and Execution
Date: 2026-02-02
ID: 003b
Status: Done
Completed: 2026-02-03

## Objective
Build the transformation pipeline engine that executes a series of transformation steps on parsed data tables. Establish the database schema for storing pipeline configurations and implement the core execution framework with basic transformation operations.

## Scope
### In scope
- Pipeline data structure and database schema
- Pipeline execution engine (sequential step execution)
- Basic transformation operations: trim, uppercase, lowercase, remove duplicates, filter rows, rename columns, remove columns
- Pipeline state management (create, update, delete, retrieve)
- Convex mutations/queries for pipeline CRUD
- Unit tests for execution engine and operations
- Integration with existing file parsing (spec 003a)

### Out of scope
- UI components for pipeline builder (spec 003c)
- Advanced transformations (complex filtering, joins, aggregations)
- Export functionality (future spec)
- Pipeline versioning and history (future spec)
- Undo/redo (future spec)
- Performance optimization with DuckDB (future spec)

## Requirements
### Functional
- FR1: Store pipeline configuration in Convex database with uploadId reference
- FR2: Execute pipeline steps sequentially on a DataTable
- FR3: Each step transforms the table and passes result to next step
- FR4: Support multiple transformation types: trim, uppercase, lowercase, deduplicate, filter, rename, remove columns
- FR5: Pipeline execution returns final transformed table
- FR6: Preview mode: execute pipeline up to specific step index
- FR7: Mutations: createPipeline, updatePipeline, deletePipeline
- FR8: Queries: getPipeline, getPipelinesByUpload
- FR9: Action: executePipeline (runs transformations and returns result)
- FR10: Handle errors gracefully (invalid configs, missing columns, etc.)

### Non-functional
- NFR1: Pipeline execution completes in <2 seconds for 10MB file
- NFR2: Operations are pure functions (no side effects)
- NFR3: Transformation configs are JSON-serializable
- NFR4: Type-safe operation implementations
- NFR5: Comprehensive error messages for debugging

## Data Model

### TypeScript Types
```typescript
// Transformation operation types
export type TransformationType = 
  | 'trim'           // Trim whitespace from string columns
  | 'uppercase'      // Convert string columns to uppercase
  | 'lowercase'      // Convert string columns to lowercase
  | 'deduplicate'    // Remove duplicate rows
  | 'filter'         // Filter rows by condition
  | 'rename_column'  // Rename a column
  | 'remove_column'; // Remove a column

// Base transformation step
export interface TransformationStep {
  id: string;               // Unique ID (UUID)
  type: TransformationType;
  config: TransformationConfig;
}

// Config types per operation
export type TransformationConfig =
  | TrimConfig
  | UppercaseConfig
  | LowercaseConfig
  | DeduplicateConfig
  | FilterConfig
  | RenameColumnConfig
  | RemoveColumnConfig;

export interface TrimConfig {
  columns: string[]; // Column names to trim
}

export interface UppercaseConfig {
  columns: string[];
}

export interface LowercaseConfig {
  columns: string[];
}

export interface DeduplicateConfig {
  // Remove duplicate rows based on all columns
  columns?: string[]; // Optional: deduplicate based on specific columns
}

export interface FilterConfig {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: string | number | boolean;
}

export interface RenameColumnConfig {
  oldName: string;
  newName: string;
}

export interface RemoveColumnConfig {
  columns: string[]; // Columns to remove
}

// Pipeline configuration
export interface PipelineConfig {
  uploadId: string;      // Reference to uploads table
  sheetName?: string;    // For Excel files (null for CSV)
  steps: TransformationStep[];
}

// Execution result
export interface ExecutionResult {
  table: DataTable;      // From spec 003a
  stepResults: StepResult[];
}

export interface StepResult {
  stepId: string;
  success: boolean;
  rowsAffected?: number;
  error?: string;
}
```

### Convex Schema
```typescript
// pipelines table
pipelines: defineTable({
  uploadId: v.id("uploads"),
  sheetName: v.optional(v.string()),
  steps: v.array(v.object({
    id: v.string(),
    type: v.string(),
    config: v.any(), // JSON-serializable config
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_upload", ["uploadId"]);
```

## Implementation Plan

### 1. Update Convex Schema (convex/schema.ts)
- Add `pipelines` table with fields above
- Index by uploadId for efficient queries

### 2. Transformation Operations (src/lib/pipeline/operations/)
Create one file per operation type:

**src/lib/pipeline/operations/trim.ts**
```typescript
export function trim(table: DataTable, config: TrimConfig): DataTable
```
- Iterate rows, trim specified columns
- Only affect string-type columns
- Return new table

**src/lib/pipeline/operations/uppercase.ts**
```typescript
export function uppercase(table: DataTable, config: UppercaseConfig): DataTable
```

**src/lib/pipeline/operations/lowercase.ts**
```typescript
export function lowercase(table: DataTable, config: LowercaseConfig): DataTable
```

**src/lib/pipeline/operations/deduplicate.ts**
```typescript
export function deduplicate(table: DataTable, config: DeduplicateConfig): DataTable
```
- Remove duplicate rows
- If config.columns specified, deduplicate based on those columns only
- Otherwise, deduplicate based on all columns

**src/lib/pipeline/operations/filter.ts**
```typescript
export function filter(table: DataTable, config: FilterConfig): DataTable
```
- Filter rows based on condition
- Support operators: equals, not_equals, contains, not_contains, greater_than, less_than

**src/lib/pipeline/operations/rename-column.ts**
```typescript
export function renameColumn(table: DataTable, config: RenameColumnConfig): DataTable
```
- Rename column in columns metadata and all rows

**src/lib/pipeline/operations/remove-column.ts**
```typescript
export function removeColumn(table: DataTable, config: RemoveColumnConfig): DataTable
```
- Remove columns from metadata and all rows

**src/lib/pipeline/operations/index.ts**
- Export all operations
- Export operation registry:
```typescript
export const operations: Record<TransformationType, OperationFn> = {
  trim,
  uppercase,
  lowercase,
  deduplicate,
  filter,
  rename_column: renameColumn,
  remove_column: removeColumn,
};
```

### 3. Pipeline Executor (src/lib/pipeline/executor.ts)
```typescript
export function executePipeline(
  table: DataTable,
  steps: TransformationStep[]
): ExecutionResult
```
- Iterate through steps sequentially
- Look up operation function from registry
- Execute operation with current table and config
- Catch errors per step and record in stepResults
- Return final table and step results

```typescript
export function executeUntilStep(
  table: DataTable,
  steps: TransformationStep[],
  stopAtIndex: number
): ExecutionResult
```
- Execute only up to step N (for preview)

### 4. Convex Mutations (convex/pipelines.ts)
```typescript
export const createPipeline = mutation({
  args: {
    uploadId: v.id("uploads"),
    sheetName: v.optional(v.string()),
    steps: v.array(v.object({
      id: v.string(),
      type: v.string(),
      config: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    // Insert pipeline into database
    // Return pipeline ID
  }
});

export const updatePipeline = mutation({
  args: {
    pipelineId: v.id("pipelines"),
    steps: v.array(...),
  },
  handler: async (ctx, args) => {
    // Update pipeline steps
  }
});

export const deletePipeline = mutation({
  args: { pipelineId: v.id("pipelines") },
  handler: async (ctx, args) => {
    // Delete pipeline
  }
});
```

### 5. Convex Queries (convex/pipelines.ts)
```typescript
export const getPipeline = query({
  args: { pipelineId: v.id("pipelines") },
  handler: async (ctx, args) => {
    // Return pipeline config
  }
});

export const getPipelinesByUpload = query({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    // Return all pipelines for upload
  }
});
```

### 6. Convex Action (convex/pipelines.ts)
```typescript
export const executePipeline = action({
  args: {
    pipelineId: v.id("pipelines"),
    stopAtStep: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Get pipeline config
    // 2. Get upload record
    // 3. Parse file using parseFile action
    // 4. Execute pipeline steps
    // 5. Return result
  }
});
```

### 7. Unit Tests

**src/lib/pipeline/operations/__tests__/trim.test.ts**
- Trim whitespace from string columns
- Leave non-string columns unchanged
- Handle empty tables
- Handle columns that don't exist

**src/lib/pipeline/operations/__tests__/uppercase.test.ts**
- Convert strings to uppercase
- Leave other types unchanged

**src/lib/pipeline/operations/__tests__/lowercase.test.ts**
- Convert strings to lowercase

**src/lib/pipeline/operations/__tests__/deduplicate.test.ts**
- Remove duplicate rows (all columns)
- Remove duplicates based on specific columns
- Preserve order

**src/lib/pipeline/operations/__tests__/filter.test.ts**
- Filter with equals operator
- Filter with not_equals
- Filter with contains
- Filter with not_contains
- Filter with greater_than
- Filter with less_than
- Handle no matches (empty result)

**src/lib/pipeline/operations/__tests__/rename-column.test.ts**
- Rename column successfully
- Handle column not found error

**src/lib/pipeline/operations/__tests__/remove-column.test.ts**
- Remove single column
- Remove multiple columns
- Handle column not found

**src/lib/pipeline/__tests__/executor.test.ts**
- Execute empty pipeline (no-op)
- Execute single step
- Execute multiple steps in sequence
- Execute until specific step (preview)
- Handle errors in steps gracefully
- Preserve table structure

## Testing Plan

### Unit Tests (40+ tests)

**Operation Tests**:
- ✅ Trim: 5 tests
- ✅ Uppercase: 3 tests
- ✅ Lowercase: 3 tests
- ✅ Deduplicate: 5 tests
- ✅ Filter: 8 tests (one per operator + edge cases)
- ✅ Rename Column: 3 tests
- ✅ Remove Column: 4 tests

**Executor Tests**:
- ✅ Empty pipeline: 1 test
- ✅ Single step: 2 tests
- ✅ Multiple steps: 3 tests
- ✅ Execute until step: 2 tests
- ✅ Error handling: 3 tests

### Integration Tests
- Create pipeline in database
- Execute pipeline end-to-end with real file
- Update pipeline and re-execute
- Delete pipeline
- Query pipelines by upload

### Manual Testing
- Upload CSV, create pipeline with 3 transformations
- Execute pipeline and verify result
- Test each operation type individually
- Verify error handling with invalid configs

## Acceptance Criteria
- AC1: Pipelines can be created, updated, and deleted in database
- AC2: Pipeline executor runs steps sequentially
- AC3: All 7 basic operations work correctly (trim, uppercase, lowercase, deduplicate, filter, rename, remove)
- AC4: Errors in steps are caught and reported
- AC5: Preview mode (executeUntilStep) works
- AC6: All 40+ unit tests pass
- AC7: Integration tests pass
- AC8: Pipeline execution completes in <2 seconds for 10MB file
- AC9: Operations produce expected transformations
- AC10: Type safety maintained throughout

## Dependencies
No new dependencies required (uses existing xlsx from spec 003a)

## Notes
- Operations are pure functions - no mutations of input table
- Each operation returns a new DataTable
- Step IDs are UUIDs for unique identification
- Pipeline configs are fully JSON-serializable for database storage
- Error handling: operations throw descriptive errors, executor catches and records
