# Spec: Column Type Casting and Type Tracking
Date: 2026-02-03
ID: 007
Status: Done

## Objective
Add ability to manually cast columns to specific types with validation, and track column type changes throughout the pipeline transformation process. This addresses scenarios where automatic type inference is incorrect or users need explicit control over data types.

## Scope
### In scope
- **Type casting operation**: New transformation step to cast columns to specific types
- **Supported types**: string, number, boolean, date, null
- **Validation**: Validate that values can be cast to target type
- **Error handling**: Options for handling invalid values (fail, skip row, set to null)
- **Type tracking**: Store column types at each pipeline step
- **Type display**: Show column types in UI after each transformation
- **Type evolution**: Track how types change through pipeline
- **Batch casting**: Cast multiple columns at once

### Out of scope
- Custom type definitions (e.g., email, URL) - future spec
- Type constraints (e.g., number range, string length) - future spec
- Automatic type correction suggestions - future spec
- Type inference improvements - separate from this spec

## Requirements

### Functional

**FR1: Type Casting Operation**
- New transformation step type: `cast_column`
- Configuration options:
  ```typescript
  {
    column: string;           // Column to cast
    targetType: ColumnType;   // 'string' | 'number' | 'boolean' | 'date'
    onError: 'fail' | 'null' | 'skip';  // How to handle cast failures
    format?: string;          // Optional format string for dates
  }
  ```
- Cast functions for each type:
  - **To string**: Convert any value to string representation
  - **To number**: Parse numbers, handle thousands separators, reject non-numeric
  - **To boolean**: Accept true/false, yes/no, 1/0, y/n (case-insensitive)
  - **To date**: Parse ISO dates, US dates, custom formats

**FR2: Error Handling Modes**
- **fail**: Stop execution and report error with row number and value
- **null**: Set invalid values to null, continue processing
- **skip**: Remove rows with invalid values from result
- Track number of errors/skipped rows in step result

**FR3: Type Tracking in Pipeline**
- Store column metadata at each step in execution result
- `StepResult` includes:
  ```typescript
  {
    stepIndex: number;
    operation: string;
    status: 'success' | 'error';
    rowsAffected: number;
    columnsAfter: ColumnMetadata[];  // NEW: Column types after this step
    errorMessage?: string;
  }
  ```
- `ExecutionResult` includes complete type evolution:
  ```typescript
  {
    success: boolean;
    result: ParseResult;
    steps: StepResult[];
    typeEvolution: ColumnMetadata[][];  // Types at each step
  }
  ```

**FR4: Batch Type Casting**
- Allow casting multiple columns in single step
- Configuration:
  ```typescript
  {
    casts: Array<{
      column: string;
      targetType: ColumnType;
      onError: 'fail' | 'null' | 'skip';
      format?: string;
    }>;
  }
  ```
- Apply all casts in single pass (more efficient)
- Report which columns had errors

**FR5: Type Display in UI**
- Show column types with badges in DataTable (already exists)
- Show "Type: X → Y" indicator when type changes in a step
- Show error count for cast operations
- Show which columns were affected by type changes

**FR6: Type Validation**
- Before executing cast, validate sample of values
- Show validation preview: "X of Y values can be cast, Z will fail"
- Allow user to review failed values before committing
- Suggest best onError mode based on failure rate

### Non-functional

**NFR1: Performance**
- Type casting should not significantly slow down pipeline execution
- Batch casting should be more efficient than multiple single casts
- Type tracking should use minimal memory (reference column metadata, not duplicate)

**NFR2: Data Integrity**
- Never lose data silently (always report skipped rows or null conversions)
- Type information must be accurate at every step
- Failed casts must include context (row number, value, reason)

**NFR3: Usability**
- Clear error messages for cast failures
- Helpful format examples for date casting
- Type indicators easy to understand
- Validation preview before applying cast

**NFR4: Breaking Changes Acceptable**
- This feature has not been deployed anywhere
- No need for backward compatibility with old StepResult format
- Can make breaking changes to ExecutionResult structure
- Can update all existing operations immediately

## Implementation Plan

### Phase 1: Backend - Type Casting Operation (Day 1)

1. **Update type definitions** (`src/lib/pipeline/types.ts`):
   ```typescript
   export type CastColumnConfig = {
     column: string;
     targetType: ColumnType;
     onError: 'fail' | 'null' | 'skip';
     format?: string;  // For date parsing
   };
   
   export type CastColumnsConfig = {
     casts: Array<{
       column: string;
       targetType: ColumnType;
       onError: 'fail' | 'null' | 'skip';
       format?: string;
     }>;
   };
   
   export type StepResult = {
     stepIndex: number;
     operation: string;
     status: 'success' | 'error';
     rowsAffected: number;
     columnsAfter: ColumnMetadata[];  // NEW
     castErrors?: number;  // NEW: Number of cast failures
     skippedRows?: number;  // NEW: Rows skipped due to cast errors
     errorMessage?: string;
   };
   
   export type ExecutionResult = {
     success: boolean;
     result: ParseResult;
     steps: StepResult[];
     typeEvolution: ColumnMetadata[][];  // NEW: Types at each step
   };
   ```

2. **Implement cast functions** (`src/lib/pipeline/casting/types.ts`):
   ```typescript
   export function castToString(value: unknown): string;
   export function castToNumber(value: unknown): number | null;
   export function castToBoolean(value: unknown): boolean | null;
   export function castToDate(value: unknown, format?: string): Date | null;
   ```

3. **Implement cast operation** (`src/lib/pipeline/operations/cast-column.ts`):
   - Single column casting with error handling
   - Track cast failures and apply onError strategy
   - Update column metadata after cast

4. **Implement batch cast operation** (`src/lib/pipeline/operations/cast-columns.ts`):
   - Multiple columns in single pass
   - Efficient row-by-row processing
   - Aggregate error reporting

5. **Update pipeline executor** (`src/lib/pipeline/executor.ts`):
   - **BREAKING**: Update StepResult to always include columnsAfter
   - **BREAKING**: Update ExecutionResult to always include typeEvolution
   - Track column types after each step
   - No backward compatibility needed

6. **Update ALL existing operations** to return column metadata:
   - All operations must return updated column metadata
   - `rename-column.ts` - Update column name in metadata
   - `remove-column.ts` - Remove from metadata array
   - `split-column.ts` - Add new columns as string type
   - `merge-columns.ts` - Add merged column as string type
   - `pivot.ts` / `unpivot.ts` - Already compute types
   - `filter.ts` / `deduplicate.ts` / `trim.ts` / `uppercase.ts` / `lowercase.ts` - Pass through unchanged metadata
   - **Breaking change**: All operations must now return metadata

7. **Write unit tests** (60+ tests):
   - Cast to string (5 tests)
   - Cast to number (10 tests - integers, decimals, thousands, errors)
   - Cast to boolean (8 tests - various formats, errors)
   - Cast to date (10 tests - ISO, US, custom formats, errors)
   - Error handling modes (12 tests - fail, null, skip)
   - Batch casting (8 tests)
   - Type tracking in executor (7 tests)

### Phase 2: UI - Type Casting Dialog (Day 1)

1. **Update AddStepDialog** (`src/components/AddStepDialog.tsx`):
   - Add "Cast Column Type" operation option
   - Form fields:
     - Column selector (dropdown)
     - Target type selector (radio buttons: String, Number, Boolean, Date)
     - Error handling mode (radio buttons: Fail, Set to Null, Skip Row)
     - Date format input (shown only when casting to date)
     - Validation preview area
   - "Validate" button to preview cast results
   - Show error count and sample failures

2. **Update PipelineSteps** (`src/components/PipelineSteps.tsx`):
   - Display cast operations: "Cast {column} to {type}"
   - Show error handling mode
   - Show cast statistics (if available)

3. **Update DataTable** (`src/components/DataTable.tsx`):
   - Already shows type badges - enhance to show type changes
   - Add tooltip: "Type changed: string → number"
   - Highlight columns that changed type in last step

### Phase 3: Validation Preview (Day 2)

1. **Create validation action** (`convex/parsers.ts`):
   ```typescript
   export const validateCast = action({
     args: {
       uploadId: v.id("uploads"),
       column: v.string(),
       targetType: v.string(),
     },
     handler: async (ctx, args) => {
       // Parse first 1000 rows
       // Attempt cast on all values
       // Return: { total, valid, invalid, samples }
     }
   });
   ```

2. **Add validation UI** to cast dialog:
   - "Preview" button
   - Results: "X of Y values can be cast"
   - Sample invalid values (first 5)
   - Recommend onError mode

### Phase 4: Batch Casting UI (Day 2)

1. **Add "Cast Multiple Columns" operation**:
   - Table-based UI:
     - Row per column
     - Column name | Target type | Error mode | Format
   - Add/remove rows
   - Apply all at once

### Phase 5: Testing and Documentation (Day 2)

1. Manual testing with various data types
2. Test error handling modes
3. Update PATTERNS.md with type tracking guidance
4. Update MEMORY.md

## Testing Plan

### Unit Tests (60+ tests)
- `casting/types.test.ts` - Cast functions (30 tests)
- `operations/cast-column.test.ts` - Single column casting (15 tests)
- `operations/cast-columns.test.ts` - Batch casting (8 tests)
- `executor.test.ts` - Type tracking (7 tests)

### Integration Tests
- Full pipeline with type casts
- Type evolution tracking
- Error handling in pipeline context

### Manual Testing
- Upload CSV with mixed types
- Cast columns to different types
- Test all error handling modes
- Verify type badges update correctly
- Test batch casting

## Acceptance Criteria

1. ✅ Users can cast individual columns to string/number/boolean/date
2. ✅ Cast validation detects incompatible values
3. ✅ Error handling modes (fail/null/skip) work correctly
4. ✅ Batch casting allows multiple columns at once
5. ✅ Column types tracked throughout pipeline execution
6. ✅ Type changes visible in UI (badges, indicators)
7. ✅ All unit tests pass (60+ new tests)
8. ✅ Build succeeds with no errors
9. ✅ No regression in existing operations
10. ✅ Performance acceptable (< 10% overhead for type tracking)

## Open Questions

1. **Date format strings**: Use standard format codes or custom syntax?
   - Proposal: Use standard JavaScript date format strings (ISO 8601, etc.)
   
2. **Type inference after operations**: Should we re-infer types after each step?
   - Proposal: No - track explicit changes only, preserve inferred types

3. **Type constraints**: Should we add min/max for numbers, regex for strings?
   - Decision: Out of scope for this spec, add in future enhancement

4. **Null handling**: Should cast-to-null count as successful cast?
   - Proposal: Yes, with warning count reported separately

## Dependencies

- Spec 003b (Pipeline Engine) - Required
- Spec 003c (Preview UI) - Required for UI integration
- Spec 006 (Data Source Selection) - Independent

## Related Specs

- Spec 003a: File Parsing and Type Inference (infers initial types)
- Spec 003b: Pipeline Engine (executes cast operations)
- Spec 003c: Preview UI (displays type information)
