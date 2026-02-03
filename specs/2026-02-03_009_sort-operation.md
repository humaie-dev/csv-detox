# Spec: Sort Operation for Pipeline

Date: 2026-02-03
ID: 009
Status: Done

## Objective
Add a `sort` transformation operation that allows users to sort data by one or multiple columns with configurable sort order (ascending/descending).

## Scope

### In scope
- Sort by single column or multiple columns
- Ascending or descending order per column
- Stable sort (preserves order of equal elements)
- Support for all data types (string, number, boolean, date, null)
- Null handling: nulls at start or end
- Multi-column sort with priority order
- UI for adding sort steps to pipeline
- TypeScript implementation for preview (server-side)
- SQL translation for export (DuckDB-WASM)

### Out of scope
- Custom sort functions or comparators
- Locale-aware string sorting (use default lexicographic)
- Case-insensitive sorting option (future enhancement)
- Sort by computed/derived columns (must sort by existing columns)

## Requirements

### Functional
- FR1: Sort by one or more columns
- FR2: Each column can have independent sort direction (asc/desc)
- FR3: Multi-column sort respects priority order (first column is primary sort key)
- FR4: Null values can be placed first or last (configurable)
- FR5: Stable sort preserves original order for equal values
- FR6: Type-aware sorting:
  - Numbers: numerical order (1, 2, 10, 20 not lexicographic)
  - Dates: chronological order
  - Strings: lexicographic order
  - Booleans: false < true
  - Nulls: based on nullsPosition setting
- FR7: UI shows column order with up/down controls
- FR8: Edit mode populates form with existing sort configuration

### Non-functional
- NFR1: Sort must handle 5000 rows in preview (<500ms)
- NFR2: SQL translation must use DuckDB's ORDER BY with NULLS FIRST/LAST
- NFR3: All existing 441 tests must continue passing
- NFR4: Add comprehensive tests for sort operation
- NFR5: Sort is non-destructive (doesn't modify values, only reorders)

## Type Definitions

```typescript
export interface SortConfig {
  type: "sort";
  columns: SortColumn[];
  nullsPosition?: "first" | "last"; // Default: "last"
}

export interface SortColumn {
  name: string;
  direction: "asc" | "desc"; // Default: "asc"
}
```

## Implementation Phases

### Phase 1: Type System (15 min)
- [ ] Add `"sort"` to `TransformationType` union
- [ ] Add `SortConfig` interface to `src/lib/pipeline/types.ts`
- [ ] Export new types

### Phase 2: TypeScript Operation (30 min)
- [ ] Create `src/lib/pipeline/operations/sort.ts`
- [ ] Implement type-aware comparison function
- [ ] Handle null positioning
- [ ] Handle multi-column sorting with priority
- [ ] Register in `operations/index.ts`

### Phase 3: Unit Tests (30 min)
- [ ] Create `src/lib/pipeline/operations/__tests__/sort.test.ts`
- [ ] Test single column sort (asc/desc)
- [ ] Test multi-column sort with priority
- [ ] Test type-aware sorting (numbers, strings, dates, booleans)
- [ ] Test null handling (first/last)
- [ ] Test stable sort behavior
- [ ] Test validation (column not found)
- [ ] Test edge cases (empty table, all nulls, single row)
- Target: ~20 tests

### Phase 4: SQL Translation (30 min)
- [ ] Add `translateSort()` to `src/lib/duckdb/sql-translator.ts`
- [ ] Generate `CREATE TABLE AS SELECT * FROM data ORDER BY ...`
- [ ] Handle NULLS FIRST/NULLS LAST
- [ ] Handle multiple columns with ASC/DESC
- [ ] Add tests to `sql-translator.test.ts` (~6 tests)

### Phase 5: UI Integration (45 min)
- [ ] Add "Sort" to `AddStepDialog.tsx` operations dropdown
- [ ] Create form with:
  - Column selector (multi-select with order badges)
  - Direction toggles (asc/desc) per column
  - Up/down buttons to reorder columns
  - Nulls position radio (first/last)
- [ ] Add example showing use case
- [ ] Add edit mode population
- [ ] Update `PipelineSteps.tsx` display format

### Phase 6: Testing & Documentation (15 min)
- [ ] Run all tests (expect ~467 tests)
- [ ] Verify build succeeds
- [ ] Update `MEMORY.md`
- [ ] Mark spec as Done

## Examples

### Single Column Sort
```typescript
{
  id: "step-1",
  type: "sort",
  config: {
    type: "sort",
    columns: [
      { name: "age", direction: "desc" }
    ],
    nullsPosition: "last"
  }
}
// Result: Sorted by age descending, nulls at end
```

### Multi-Column Sort
```typescript
{
  id: "step-2",
  type: "sort",
  config: {
    type: "sort",
    columns: [
      { name: "department", direction: "asc" },
      { name: "salary", direction: "desc" },
      { name: "name", direction: "asc" }
    ],
    nullsPosition: "last"
  }
}
// Result: Sort by department (asc), then salary (desc), then name (asc)
```

## SQL Translation

### Single Column
```sql
CREATE TABLE sorted AS 
SELECT * FROM data 
ORDER BY "age" DESC NULLS LAST;

DROP TABLE data;
ALTER TABLE sorted RENAME TO data;
```

### Multi-Column
```sql
CREATE TABLE sorted AS 
SELECT * FROM data 
ORDER BY "department" ASC NULLS LAST, 
         "salary" DESC NULLS LAST, 
         "name" ASC NULLS LAST;

DROP TABLE data;
ALTER TABLE sorted RENAME TO data;
```

## UI Mockup

```
┌─ Add Transformation Step ─────────────────────┐
│                                                │
│ Operation Type:  [Sort ▼]                     │
│                                                │
│ Sort By:                                       │
│  ┌─────────────────────────────────────────┐  │
│  │ [1] department  [Ascending ▼]  [↑] [↓] │  │
│  │ [2] salary      [Descending ▼] [↑] [↓] │  │
│  │ [3] name        [Ascending ▼]  [↑] [↓] │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  [+ Add Column]                                │
│                                                │
│ Null Values:                                   │
│  ○ Place nulls first                           │
│  ● Place nulls last                            │
│                                                │
│ ╭─ Example ─────────────────────────────────╮ │
│ │ Sort by department (A→Z), then by salary  │ │
│ │ (high to low), then by name (A→Z)         │ │
│ ╰───────────────────────────────────────────╯ │
│                                                │
│               [Cancel]  [Add Step]             │
└────────────────────────────────────────────────┘
```

## Acceptance Criteria

1. ✅ Sort operation added to type system
2. ✅ TypeScript operation handles single and multi-column sorting
3. ✅ Type-aware sorting (numbers, dates, strings, booleans)
4. ✅ Null positioning configurable (first/last)
5. ✅ Stable sort preserves order
6. ✅ SQL translation generates correct ORDER BY clause
7. ✅ UI allows adding/reordering sort columns
8. ✅ UI shows asc/desc toggles per column
9. ✅ All ~467 tests passing
10. ✅ Build succeeds with no errors

## Testing Plan

### Unit Tests (TypeScript Operation)
- Single column ascending/descending
- Multi-column with priority order
- Number sorting (1, 2, 10 not "1", "10", "2")
- Date sorting (chronological)
- String sorting (lexicographic)
- Boolean sorting (false < true)
- Null handling (first vs last)
- Stable sort verification
- Mixed types in same column
- Validation errors
- Edge cases (empty, single row, all nulls)

### Unit Tests (SQL Translation)
- Single column ORDER BY
- Multi-column ORDER BY
- ASC/DESC per column
- NULLS FIRST/NULLS LAST
- Column name escaping
- Multi-step pipeline with sort

### Manual Testing
- Add sort step via UI
- Reorder columns via up/down
- Toggle asc/desc
- Preview shows sorted data
- Export includes sort operation
- Edit existing sort step

## Technical Notes

### TypeScript Sort Implementation
```typescript
function compareValues(a: any, b: any, direction: "asc" | "desc"): number {
  // Handle nulls
  if (a === null && b === null) return 0;
  if (a === null) return nullsFirst ? -1 : 1;
  if (b === null) return nullsFirst ? 1 : -1;
  
  // Type-aware comparison
  if (typeof a === "number" && typeof b === "number") {
    return direction === "asc" ? a - b : b - a;
  }
  
  if (a instanceof Date && b instanceof Date) {
    return direction === "asc" 
      ? a.getTime() - b.getTime() 
      : b.getTime() - a.getTime();
  }
  
  // String comparison (works for booleans too)
  const comparison = String(a).localeCompare(String(b));
  return direction === "asc" ? comparison : -comparison;
}
```

### Stable Sort
JavaScript's `Array.sort()` is stable as of ES2019, so we can rely on it for stable sorting.

### Performance
- TypeScript: O(n log n) comparison sorts, acceptable for 5000 rows
- SQL: DuckDB's optimized sorting, handles millions of rows

## Dependencies
- None (uses existing pipeline infrastructure)

## Risks
- **Risk**: Multi-column sort UI complexity
  - **Mitigation**: Use simple list with up/down buttons (proven pattern)
  
- **Risk**: Mixed type sorting behavior unclear
  - **Mitigation**: Document behavior, convert to strings for mixed types

## Future Enhancements (Out of Scope)
- Case-insensitive string sorting
- Custom collation/locale support
- Sort by expression (computed columns)
- Reverse sort (toggle between asc/desc quickly)
