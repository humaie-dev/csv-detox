# Spec: File Parsing and Type Inference
Date: 2026-02-02
ID: 003a
Status: Done
Completed: 2026-02-02

## Objective
Build the foundation for the transformation pipeline by implementing file parsing (CSV and Excel) with automatic type inference. This creates typed table representations that will feed into the pipeline engine.

## Scope
### In scope
- Parse CSV files into structured table format
- Parse Excel files with multi-sheet support
- Type inference for columns: string, number, boolean, date, null
- In-memory table representation (TypeScript types)
- Convex actions to handle file parsing (server-side)
- Unit tests for parsers and type inference
- Handle files up to 50MB

### Out of scope
- Transformation pipeline execution (spec 003b)
- UI components for preview (spec 003c)
- Database schema for pipelines (spec 003b)
- Large file streaming (future)
- Custom type inference rules (future)
- Data validation (future)

## Requirements
### Functional
- FR1: Parse CSV files with headers into typed DataTable
- FR2: Parse Excel files and extract sheet names
- FR3: Parse each Excel sheet into typed DataTable
- FR4: Infer column types from sample of rows (first 100 rows)
- FR5: Detect: string, number (int/float), boolean (true/false/yes/no/1/0), date (ISO format), null
- FR6: Handle edge cases: empty cells, malformed data, missing headers
- FR7: Convex action `parseFile` accepts uploadId and returns parsed sheets
- FR8: Return metadata: sheet count, row count per sheet, column count

### Non-functional
- NFR1: Parsing completes in <2 seconds for 10MB file
- NFR2: Type inference is deterministic (same input = same output)
- NFR3: Memory efficient (stream parsing where possible)
- NFR4: Graceful error handling with descriptive messages

## Data Model

### TypeScript Types
```typescript
// Column type enum
export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'null';

// Column definition
export interface Column {
  name: string;
  type: ColumnType;
  nullable: boolean; // true if any null values detected
}

// Row data (plain objects)
export type CellValue = string | number | boolean | Date | null;
export type Row = Record<string, CellValue>;

// Table structure
export interface DataTable {
  columns: Column[];
  rows: Row[];
  metadata: {
    totalRows: number; // Total in file (may be more than rows.length)
    totalColumns: number;
    sampleSize: number; // Number of rows actually loaded
  };
}

// Parsed file result
export interface ParsedFile {
  uploadId: string;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  sheets: ParsedSheet[];
}

export interface ParsedSheet {
  name: string; // "Sheet1" or filename for CSV
  table: DataTable;
}
```

## Implementation Plan

### 1. Install Dependencies
```bash
npm install xlsx
npm install --save-dev @types/node
```

### 2. Create Type Definitions (src/lib/parsers/types.ts)
- Export all TypeScript interfaces above
- Utility types for parser functions

### 3. CSV Parser (src/lib/parsers/csv.ts)
```typescript
export function parseCSV(buffer: Buffer): DataTable
```
- Split by newlines, parse rows
- First row = headers
- Parse up to 1000 rows for preview (configurable)
- Infer types from first 100 rows
- Handle quoted strings with embedded commas/newlines
- Handle different line endings (\n, \r\n)

### 4. Excel Parser (src/lib/parsers/excel.ts)
```typescript
export function parseExcel(buffer: Buffer): ParsedSheet[]
```
- Use `xlsx` library to read workbook
- Extract sheet names
- Parse each sheet into DataTable
- First row = headers
- Limit to 1000 rows per sheet for preview
- Infer types per sheet

### 5. Type Inference (src/lib/parsers/type-inference.ts)
```typescript
export function inferColumnTypes(
  headers: string[],
  rows: string[][]
): Column[]
```
- Sample first 100 rows
- For each column, check all sample values:
  - If all null → type: 'null', nullable: true
  - If all parse as numbers → type: 'number'
  - If all parse as booleans → type: 'boolean'
  - If all parse as ISO dates → type: 'date'
  - Otherwise → type: 'string'
- If any nulls mixed with other types → nullable: true
- Utility functions:
  - `isNumber(value: string): boolean`
  - `isBoolean(value: string): boolean`
  - `isDate(value: string): boolean`

### 6. Convex Action (convex/parsers.ts)
```typescript
export const parseFile = action({
  args: { uploadId: v.id("uploads") },
  handler: async (ctx, args) => {
    // 1. Get upload record from database
    // 2. Download file from Convex storage
    // 3. Detect file type from mimeType
    // 4. Call parseCSV or parseExcel
    // 5. Return ParsedFile
  }
});
```

### 7. Unit Tests
- `src/lib/parsers/__tests__/csv.test.ts`:
  - Parse simple CSV
  - Parse CSV with quoted fields
  - Parse CSV with empty cells
  - Handle malformed CSV gracefully
- `src/lib/parsers/__tests__/excel.test.ts`:
  - Parse single-sheet Excel
  - Parse multi-sheet Excel
  - Extract sheet names correctly
- `src/lib/parsers/__tests__/type-inference.test.ts`:
  - Infer string type
  - Infer number type (integers and floats)
  - Infer boolean type (various formats)
  - Infer date type (ISO format)
  - Handle nullable columns
  - Handle mixed type columns (default to string)

## Testing Plan

### Unit Tests (26+ tests)

**CSV Parser**:
- ✅ Parse simple CSV with 3 columns, 5 rows
- ✅ Parse CSV with quoted strings containing commas
- ✅ Parse CSV with empty cells (null values)
- ✅ Handle CSV with \r\n line endings
- ✅ Handle CSV with \n line endings
- ✅ Handle malformed CSV (inconsistent column count) → error or best effort

**Excel Parser**:
- ✅ Parse single-sheet Excel file
- ✅ Parse multi-sheet Excel file (3 sheets)
- ✅ Extract correct sheet names
- ✅ Parse each sheet independently
- ✅ Handle empty sheets gracefully

**Type Inference**:
- ✅ Infer 'string' for text values
- ✅ Infer 'number' for integers (1, 2, 3)
- ✅ Infer 'number' for floats (1.5, 2.7)
- ✅ Infer 'boolean' for true/false
- ✅ Infer 'boolean' for yes/no
- ✅ Infer 'boolean' for 1/0
- ✅ Infer 'date' for ISO dates (2024-01-15)
- ✅ Infer 'null' for all-null column
- ✅ Set nullable: true when nulls present
- ✅ Default to 'string' for mixed types

### Integration Tests
- Upload CSV → parseFile → verify table structure
- Upload Excel → parseFile → verify multiple sheets
- Verify row counts are correct
- Verify column types match expectations

### Manual Testing
- Upload test-data.csv (various column types)
- Upload test-workbook.xlsx (3 sheets)
- Verify parsing completes quickly
- Check console for error messages

## Test Data Files
Create in `test-data/` directory:
- `simple.csv` - 3 columns (name, age, active), 10 rows
- `mixed-types.csv` - columns with numbers, booleans, dates, nulls
- `large.csv` - 5000 rows to test performance
- `workbook.xlsx` - 3 sheets with different data

## Acceptance Criteria
- AC1: CSV files parse into DataTable with correct structure
- AC2: Excel files parse with sheet detection (multi-sheet support)
- AC3: Type inference correctly detects: string, number, boolean, date, null
- AC4: Nullable flag set correctly when nulls present
- AC5: Convex action `parseFile` works end-to-end
- AC6: All 26+ unit tests pass
- AC7: Parsing 10MB file completes in <2 seconds
- AC8: Malformed files handled gracefully (errors don't crash)
- AC9: Empty cells treated as null
- AC10: Quoted CSV fields handled correctly

## Dependencies
```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

## Notes
- For preview/sampling, we load up to 1000 rows
- Full file processing (for export) will come in future spec
- Type inference uses first 100 rows as sample
- If column has mixed types, default to 'string' for safety
