# Spec: Template-Based Custom Transformations (Phase 1)
Date: 2026-02-03
ID: 005
Status: Done

## Objective
Add support for complex data transformations using pre-built, configurable templates. This addresses common spreadsheet normalization needs (unpivot, pivot, merge, split, etc.) that cannot be handled by the existing 7 basic operations.

## Scope
### In scope
- **4 Template Types:**
  1. **Unpivot (Wide → Long)**: Convert column headers to row values
     - Example: `{Name, Jan, Feb, Mar}` → `{Name, Month, Value}`
  2. **Pivot (Long → Wide)**: Convert row values to column headers
     - Example: `{Name, Month, Value}` → `{Name, Jan, Feb, Mar}`
  3. **Split Column**: Split one column into multiple columns
     - Example: `"John Doe"` → `{FirstName: "John", LastName: "Doe"}`
  4. **Merge Columns**: Combine multiple columns into one
     - Example: `{FirstName: "John", LastName: "Doe"}` → `"John Doe"`
- Configuration UI for each template (parameter forms, not code)
- Pure TypeScript implementation (no external transformation libraries)
- Unit tests for each template operation
- Integration with existing pipeline system

### Out of scope
- Custom JavaScript scripting (Phase 2)
- External scripting languages (Python, R, etc.)
- Complex aggregations (group-by, sum, count) - future spec
- DuckDB-based transformations - future spec
- Formula/expression language - future spec

## Requirements

### Functional

**FR1: Unpivot Operation**
- User selects "ID columns" (columns to keep as-is, e.g., Name, ID)
- User selects "Value columns" (columns to unpivot, e.g., Jan, Feb, Mar)
- User provides names for new columns: "Variable" (column name) and "Value" (cell value)
- Output: N rows per input row, where N = number of value columns
- Example:
  ```
  Input:  {Name: "Alice", Jan: 100, Feb: 200, Mar: 150}
  Output: 
    {Name: "Alice", Month: "Jan", Sales: 100}
    {Name: "Alice", Month: "Feb", Sales: 200}
    {Name: "Alice", Month: "Mar", Sales: 150}
  ```

**FR2: Pivot Operation**
- User selects "Index columns" (rows to group by, e.g., Name)
- User selects "Column source" (column containing new column names, e.g., Month)
- User selects "Value source" (column containing values, e.g., Sales)
- Output: One row per unique index combination, with dynamic columns
- Handles missing combinations (fills with null)
- Example:
  ```
  Input: 
    {Name: "Alice", Month: "Jan", Sales: 100}
    {Name: "Alice", Month: "Feb", Sales: 200}
  Output: {Name: "Alice", Jan: 100, Feb: 200}
  ```

**FR3: Split Column Operation**
- User selects column to split
- User chooses split method:
  - **Delimiter**: Split by character (comma, space, tab, custom)
  - **Position**: Split at fixed positions (e.g., chars 0-3, 4-8)
  - **Regex pattern**: Split using regex (advanced option)
- User provides names for new columns (array of names)
- Options:
  - Trim whitespace from parts (default: true)
  - Keep original column (default: false)
  - Max splits (default: unlimited)
- Example (delimiter):
  ```
  Input:  {Name: "John Doe"}
  Config: Split "Name" by " " into ["FirstName", "LastName"]
  Output: {FirstName: "John", LastName: "Doe"}
  ```

**FR4: Merge Columns Operation**
- User selects columns to merge (ordered list)
- User provides separator (default: space)
- User provides new column name
- Options:
  - Skip null values (default: true)
  - Keep original columns (default: false)
- Example:
  ```
  Input:  {FirstName: "John", LastName: "Doe"}
  Config: Merge ["FirstName", "LastName"] with " " into "FullName"
  Output: {FullName: "John Doe"}
  ```

**FR5: Template Operation Integration**
- New operation types: `unpivot`, `pivot`, `split_column`, `merge_columns`
- Each template has typed config interface
- Registered in operations registry
- Works with existing pipeline executor
- Can be combined with other operations in pipeline

### Non-functional

**NFR1: Performance**
- Templates should handle datasets up to 100,000 rows efficiently (< 2 seconds per operation)
- Use streaming/batching if needed for large pivots

**NFR2: Type Safety**
- All template configs fully typed in TypeScript
- Validation errors provide clear, actionable messages

**NFR3: Testability**
- Each template is a pure function
- Comprehensive unit tests (100+ tests total)
- Edge cases covered: empty data, null values, duplicate columns

**NFR4: User Experience**
- Template selection shows descriptions and examples
- Configuration forms show preview of expected output structure
- Clear validation errors for invalid configurations

## Implementation Plan

### Phase 1: Type System and Core Logic (Day 1)

1. **Update type definitions** (`src/lib/pipeline/types.ts`):
   ```typescript
   export type TransformationType = 
     | ... existing ...
     | "unpivot"
     | "pivot"
     | "split_column"
     | "merge_columns";

   export interface UnpivotConfig {
     type: "unpivot";
     idColumns: string[];        // Columns to keep as-is
     valueColumns: string[];     // Columns to unpivot
     variableColumnName: string; // New column for column names
     valueColumnName: string;    // New column for values
   }

   export interface PivotConfig {
     type: "pivot";
     indexColumns: string[];     // Group by these
     columnSource: string;       // Column containing new column names
     valueSource: string;        // Column containing values
     aggregation?: "first" | "last" | "sum" | "mean" | "count"; // Future: handle duplicates
   }

   export interface SplitColumnConfig {
     type: "split_column";
     column: string;
     method: "delimiter" | "position" | "regex";
     delimiter?: string;         // For delimiter method
     positions?: number[];       // For position method (split points)
     pattern?: string;           // For regex method
     newColumns: string[];       // Names for new columns
     trim?: boolean;             // Trim whitespace (default: true)
     keepOriginal?: boolean;     // Keep original column (default: false)
     maxSplits?: number;         // Max number of splits (default: unlimited)
   }

   export interface MergeColumnsConfig {
     type: "merge_columns";
     columns: string[];          // Columns to merge (in order)
     separator: string;          // Separator between values
     newColumn: string;          // Name for merged column
     skipNull?: boolean;         // Skip null values (default: true)
     keepOriginal?: boolean;     // Keep original columns (default: false)
   }
   ```

2. **Implement unpivot** (`src/lib/pipeline/operations/unpivot.ts`):
   - Validate id columns and value columns exist
   - For each input row, create N output rows (N = value columns)
   - Copy id columns to each output row
   - Set variable column to value column name
   - Set value column to cell value from value column

3. **Implement pivot** (`src/lib/pipeline/operations/pivot.ts`):
   - Validate index, column source, and value source exist
   - Group rows by index columns
   - Collect unique values from column source (these become new columns)
   - Create output rows with index columns + dynamic columns
   - Fill in values from value source
   - Handle missing combinations (null values)
   - Note: For Phase 1, if duplicate combinations exist, use "last" value (later: add aggregation option)

4. **Implement split column** (`src/lib/pipeline/operations/split-column.ts`):
   - Validate column exists
   - Based on method:
     - **Delimiter**: Split string by delimiter
     - **Position**: Extract substrings at positions
     - **Regex**: Split using regex pattern
   - Handle cases where split produces fewer parts than new columns (fill with null)
   - Handle cases where split produces more parts (truncate or add to last column based on maxSplits)
   - Optionally trim whitespace
   - Optionally remove original column

5. **Implement merge columns** (`src/lib/pipeline/operations/merge-columns.ts`):
   - Validate all columns exist
   - For each row, collect values from columns (in order)
   - Skip null values if configured
   - Join with separator
   - Optionally remove original columns

6. **Register operations** (`src/lib/pipeline/operations/index.ts`):
   - Add all 4 new operations to registry
   - Export config types

### Phase 2: Unit Tests (Day 1-2)

Write comprehensive tests for each operation:

**Unpivot tests** (`src/lib/pipeline/operations/__tests__/unpivot.test.ts`):
- Basic unpivot (2-3 value columns)
- Single value column
- Multiple id columns
- Null values in value columns
- Preserves column types
- Empty data
- Missing columns (validation errors)
- Duplicate column names in output (validation errors)

**Pivot tests** (`src/lib/pipeline/operations/__tests__/pivot.test.ts`):
- Basic pivot (2-3 unique column values)
- Single index column
- Multiple index columns
- Missing combinations (fills with null)
- Duplicate combinations (uses last value for Phase 1)
- Null values in column source (creates column named "null")
- Empty data
- Missing columns (validation errors)

**Split column tests** (`src/lib/pipeline/operations/__tests__/split-column.test.ts`):
- Delimiter split (space, comma, tab, custom)
- Position split (fixed positions)
- Regex split (e.g., split on multiple delimiters)
- Fewer parts than new columns (fills with null)
- More parts than new columns (truncate or extend)
- Trim whitespace option
- Keep original option
- Max splits option
- Null values (produce null parts)
- Empty string (produce empty parts)
- Missing column (validation error)

**Merge columns tests** (`src/lib/pipeline/operations/__tests__/merge-columns.test.ts`):
- Basic merge (2-3 columns)
- Single column (edge case)
- Skip null values option
- Keep null values option
- Keep original columns option
- Empty string values
- All null values (produces empty string or null)
- Missing columns (validation error)

### Phase 3: UI Components (Day 2-3)

**Update AddStepDialog** (`src/components/AddStepDialog.tsx`):
- Add 4 new operation types to dropdown
- Create configuration forms for each template:

**Unpivot Form:**
```
┌─────────────────────────────────────┐
│ ID Columns (keep as-is):            │
│ [Badge: Name] [Badge: ID] [+ Add]   │
│                                      │
│ Value Columns (unpivot):             │
│ [Badge: Jan] [Badge: Feb] [+ Add]   │
│                                      │
│ New Column Names:                    │
│ Variable name: [Month___________]   │
│ Value name:    [Sales___________]   │
│                                      │
│ Preview: 1 row → 2 rows              │
└─────────────────────────────────────┘
```

**Pivot Form:**
```
┌─────────────────────────────────────┐
│ Index Columns (group by):            │
│ [Badge: Name] [Badge: Region] [+ Add]│
│                                      │
│ Column Source (becomes columns):     │
│ [Dropdown: Month_______________]    │
│                                      │
│ Value Source (fills cells):          │
│ [Dropdown: Sales_______________]    │
│                                      │
│ Preview: Creates columns from unique │
│ values in "Month" column             │
└─────────────────────────────────────┘
```

**Split Column Form:**
```
┌─────────────────────────────────────┐
│ Column to split:                     │
│ [Dropdown: Name_______________]     │
│                                      │
│ Split method:                        │
│ ( ) Delimiter  (•) Position  ( ) Regex│
│                                      │
│ Delimiter: [____]  (e.g., space, comma)│
│                                      │
│ New column names:                    │
│ [FirstName__] [LastName___] [+ Add] │
│                                      │
│ Options:                             │
│ [✓] Trim whitespace                  │
│ [ ] Keep original column             │
└─────────────────────────────────────┘
```

**Merge Columns Form:**
```
┌─────────────────────────────────────┐
│ Columns to merge (in order):         │
│ [Badge: FirstName]                   │
│ [Badge: LastName]                    │
│ [+ Add Column]                       │
│                                      │
│ Separator: [_] (space, comma, etc.)  │
│                                      │
│ New column name: [FullName________] │
│                                      │
│ Options:                             │
│ [✓] Skip null values                 │
│ [ ] Keep original columns            │
└─────────────────────────────────────┘
```

- Add validation for each form
- Show helpful examples/tooltips
- Update PipelineSteps to display template configs

### Phase 4: Integration and Testing (Day 3)

1. **Update Convex schema** (if needed - likely no changes)
2. **Test full pipeline**:
   - Upload CSV with wide-format data
   - Add unpivot step
   - Add filter step
   - Add pivot step
   - Verify preview updates correctly
   - Export result
3. **Manual testing scenarios**:
   - Unpivot: Monthly sales data (Name + Jan/Feb/Mar → Name/Month/Sales)
   - Pivot: Transaction log (Date/Product/Amount → Date + Product columns)
   - Split: Full names (Name → FirstName/LastName)
   - Merge: Address parts (Street + City + State → FullAddress)
   - Combined: Split → Filter → Merge
4. **Performance testing**:
   - Test with 10K, 50K, 100K rows
   - Verify operations complete in < 2 seconds

## Testing Plan

### Unit Tests (120+ tests)
- `unpivot.test.ts` - 20 tests
- `pivot.test.ts` - 25 tests
- `split-column.test.ts` - 30 tests
- `merge-columns.test.ts` - 20 tests
- Integration tests for combined operations - 25 tests

### Manual Testing
1. **Unpivot scenario**: Wide-format sales data
2. **Pivot scenario**: Long-format transaction log
3. **Split scenario**: Parse full names, addresses, dates
4. **Merge scenario**: Combine name parts, address parts
5. **Combined pipeline**: Split → Filter → Unpivot → Export
6. **Error cases**: Invalid configurations, missing columns
7. **Edge cases**: Empty data, single row, single column, all nulls

### Performance Testing
- 10K rows: < 200ms per operation
- 50K rows: < 1s per operation
- 100K rows: < 2s per operation

## Acceptance Criteria

- **AC1**: All 4 template types implemented as pure functions
- **AC2**: All unit tests passing (120+ tests, 100% pass rate)
- **AC3**: Templates integrated into operation registry and executor
- **AC4**: UI forms for all 4 templates in AddStepDialog
- **AC5**: PipelineSteps displays template configs in human-readable format
- **AC6**: Manual testing scenarios completed successfully
- **AC7**: Performance targets met (< 2s for 100K rows per operation)
- **AC8**: Build succeeds with no errors
- **AC9**: MEMORY.md updated with changes
- **AC10**: Patterns documented in `docs/internal/PATTERNS.md`

## Future Work (Phase 2: Custom Scripting)
- JavaScript function editor (CodeMirror or Monaco)
- Sandboxed execution environment (Web Workers or isolated-vm)
- Helper library with common functions (groupBy, aggregate, etc.)
- Example script templates
- Debug/error output for user scripts
- Type definitions for script context (intellisense support)

## Notes
- Unpivot is also called "melt" (pandas), "gather" (tidyr), or "normalizing columns"
- Pivot is also called "cast" (pandas), "spread" (tidyr), or "crosstab"
- These templates cover ~80% of complex transformation needs based on user research
- Phase 2 (custom scripts) will cover the remaining 20% of edge cases
