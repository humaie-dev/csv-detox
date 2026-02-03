# Spec: Data Source Selection and Range Extraction
Date: 2026-02-03
ID: 006
Status: Done - All Phases Complete

## Objective
Add ability to configure the data source before parsing. Users should be able to select which Excel sheet to use, and optionally specify row/column ranges to extract from both CSV and Excel files. This addresses scenarios where data doesn't start at cell A1, or when users only want a subset of the file.

## Scope
### In scope
- **Excel sheet selection**: Choose which sheet to parse (currently only parses first sheet)
- **Row range selection**: Specify which rows to include (e.g., "skip first 3 rows", "rows 5-100")
- **Column range selection**: Specify which columns to include (e.g., "columns A-F", "columns 2-8")
- **Header row configuration**: Specify which row contains column headers (default: first row of range)
- UI for configuring these options before/after parsing
- Works for both CSV and Excel files
- Preserves original file upload, stores configuration in database

### Out of scope
- Multiple sheet parsing (combining data from multiple sheets) - future spec
- Advanced range expressions (e.g., "A1:C10, E1:F10") - future spec
- Named range support for Excel - future spec
- Dynamic range detection (auto-detect data boundaries) - future spec

## Requirements

### Functional

**FR1: Excel Sheet Selection**
- After uploading Excel file, show list of available sheets
- Allow user to select which sheet to parse (default: first sheet)
- Display sheet names from Excel file
- Update preview when sheet changes
- Store selected sheet name/index in database

**FR2: Row Range Configuration**
- Allow user to specify:
  - Skip first N rows (common: skip title rows)
  - Start row (1-based, inclusive)
  - End row (1-based, inclusive, optional - defaults to last row)
  - Example: "Start: 5, End: 100" → parses rows 5-100
- Default: Parse all rows (start: 1, end: undefined)
- Validate that start ≤ end
- Show row count preview ("Will parse ~50 rows")

**FR3: Column Range Configuration**
- Allow user to specify:
  - Start column (1-based or letter, inclusive)
  - End column (1-based or letter, inclusive, optional - defaults to last column)
  - Example: "Start: 2, End: 8" → parses columns B-H
  - Example: "Start: B, End: H" → same as above
- Default: Parse all columns (start: 1, end: undefined)
- Validate that start ≤ end
- Show column count preview ("Will parse ~10 columns")

**FR4: Header Row Configuration**
- Allow user to specify if data has headers
- Checkbox: "First row contains headers" (default: checked)
- If unchecked, auto-generate column headers: "Column1", "Column2", etc.
- If checked, use first row of selected range as headers
- Example: "Skip 3 rows, has headers" → row 4 becomes header
- Example: "No headers" → generate "Column1", "Column2", "Column3"

**FR5: Configuration Storage**
- Store configuration in database (new fields in uploads table):
  ```typescript
  {
    sheetName?: string;       // Excel only
    sheetIndex?: number;      // Excel only (fallback if name changes)
    startRow?: number;        // 1-based, default: 1
    endRow?: number;          // 1-based, default: undefined (all)
    startColumn?: number;     // 1-based, default: 1
    endColumn?: number;       // 1-based, default: undefined (all)
    hasHeaders: boolean;      // Default: true
  }
  ```
- Configuration must be set before parsing (required step in upload flow)
- Re-parse file when configuration changes

**FR6: UI Integration**
- Show configuration form immediately after upload (required step before parsing)
- Configuration dialog with sensible defaults:
  - Excel: First sheet selected
  - CSV/Excel: All rows and columns
  - "First row contains headers" checked by default
- "Parse" button triggers parsing with configuration
- Allow editing configuration from preview page ("Reconfigure Data Source")
- Preview updates when configuration changes
- Show warning if selected range is empty or invalid

### Non-functional

**NFR1: Performance**
- Range extraction should not require loading entire file into memory
- For large files, only parse selected range
- Parsing should complete in < 2 seconds for ranges up to 100K rows

**NFR2: Usability**
- Clear labels and examples for each configuration option
- Show preview of what will be parsed (row/column counts)
- Sensible defaults (parse entire file)
- Allow "reset to defaults" button
- Validation errors shown inline

**NFR3: Breaking Changes**
- This feature introduces breaking changes to the upload flow
- Configuration is now required before parsing
- No need for backward compatibility (application not yet deployed)
- Existing development data can be cleared/re-uploaded

**NFR4: Type Safety**
- All configuration options fully typed in TypeScript
- Validation on client and server

## Implementation Plan

### Phase 1: Backend - Parser Updates (Day 1)

1. **Update type definitions** (`src/lib/parsers/types.ts`):
   ```typescript
   export interface ParseOptions {
     inferTypes?: boolean;
     maxRows?: number;
     sheetName?: string;        // NEW: Excel sheet to parse
     sheetIndex?: number;       // NEW: Excel sheet index (0-based)
     startRow?: number;         // NEW: First row to parse (1-based)
     endRow?: number;           // NEW: Last row to parse (1-based)
     startColumn?: number;      // NEW: First column to parse (1-based)
     endColumn?: number;        // NEW: Last column to parse (1-based)
     hasHeaders?: boolean;      // NEW: Does first row contain headers (default: true)
   }
   ```

2. **Update CSV parser** (`src/lib/parsers/csv.ts`):
   - Add support for `startRow`, `endRow`, `startColumn`, `endColumn`
   - Skip rows before `startRow`
   - Stop parsing after `endRow`
   - Extract only columns in range
   - Use `hasHeaders` to determine if first row is header or data
   - If `hasHeaders=false`, generate column names: "Column1", "Column2", etc.

3. **Update Excel parser** (`src/lib/parsers/excel.ts`):
   - Add `listSheets()` function to get all sheet names
   - Update `parseExcel()` to accept `sheetName` or `sheetIndex`
   - Add support for row/column range extraction
   - Use `hasHeaders` to determine if first row is header or data
   - If `hasHeaders=false`, generate column names: "Column1", "Column2", etc.

4. **Write unit tests**:
   - CSV: row range extraction (20 tests)
   - CSV: column range extraction (15 tests)
   - CSV: no headers mode (10 tests)
   - Excel: sheet selection (10 tests)
   - Excel: row/column range extraction (20 tests)
   - Excel: no headers mode (10 tests)
   - Edge cases: empty ranges, invalid ranges (15 tests)

### Phase 2: Database Schema Updates (Day 1)

1. **Update Convex schema** (`convex/schema.ts`):
   ```typescript
   uploads: defineTable({
     // ... existing fields ...
     parseConfig: v.object({
       sheetName: v.optional(v.string()),
       sheetIndex: v.optional(v.number()),
       startRow: v.optional(v.number()),
       endRow: v.optional(v.number()),
       startColumn: v.optional(v.number()),
       endColumn: v.optional(v.number()),
       hasHeaders: v.boolean(),  // Required field, default: true
     }),
   }),
   ```

2. **Update mutations** (`convex/uploads.ts`):
   - Add `updateParseConfig` mutation
   - Update existing queries to include `parseConfig`

3. **Update parser action** (`convex/parsers.ts`):
   - Pass `parseConfig` to parser functions
   - Return sheet list for Excel files

### Phase 3: UI Components (Day 2)

1. **Create `DataSourceConfig` component** (`src/components/DataSourceConfig.tsx`):
   - Shows current configuration
   - "Configure Data Source" button opens dialog
   - Displays row/column ranges, sheet name (if Excel)

2. **Create `DataSourceConfigDialog` component**:
   - Form with all configuration options:
     - Sheet selector (Excel only, dropdown with sheet names)
     - Row range inputs (start, end, skip first N shortcut)
     - Column range inputs (start, end, accepts numbers or letters)
     - "First row contains headers" checkbox (default: checked)
   - "Preview" shows estimated row/column counts
   - "Reset to Defaults" button
   - Validation for all fields
   - "Parse" button triggers initial parse (or "Apply" for reconfiguration)

3. **Integration**:
   - Update upload page (`src/app/page.tsx`):
     - After upload, show DataSourceConfigDialog immediately
     - For Excel: auto-fetch sheet list and show in dialog
     - For CSV: show dialog with row/column/header options
     - Don't proceed to preview until configuration is set
   - Add to preview page (`src/app/preview/[uploadId]/page.tsx`):
     - Show "Reconfigure Data Source" button near file name
     - Re-fetch preview when config changes

### Phase 4: Excel Sheet List Feature (Day 2)

1. **Create `listSheets` action** (`convex/parsers.ts`):
   ```typescript
   export const listSheets = action({
     args: { storageId: v.id("_storage") },
     handler: async (ctx, { storageId }) => {
       // Get file blob
       // Use xlsx to read workbook
       // Return array of sheet names
     },
   });
   ```

2. **Update upload flow**:
   - After Excel upload, call `listSheets`
   - Store sheet names in state
   - Show sheet selector in config dialog

### Phase 5: Testing and Polish (Day 3)

1. **Unit tests** (100+ new tests):
   - CSV range extraction
   - CSV no-headers mode
   - Excel sheet selection
   - Excel range extraction
   - Excel no-headers mode
   - Validation edge cases

2. **Manual testing scenarios**:
   - CSV with 5 rows of title/metadata → skip first 5 rows
   - Excel with multiple sheets → select "Data" sheet
   - Excel with data starting at B5 → configure range
   - CSV with no headers → uncheck "has headers", verify Column1, Column2 generated
   - Large file (100K rows) → extract rows 1000-2000

3. **Error handling**:
   - Invalid range (start > end)
   - Range exceeds file bounds
   - Sheet name doesn't exist
   - Empty range (no data)

4. **Upload flow changes**:
   - Ensure configuration dialog appears after upload
   - Ensure user can't skip configuration
   - Ensure "Parse" button works correctly

## Testing Plan

### Unit Tests (100+ new tests)

**CSV parser with ranges** (`csv.test.ts`):
- Parse rows 5-10 from 20-row CSV
- Parse columns 2-5 from 10-column CSV
- Skip first N rows
- Parse with hasHeaders=true (use first row as headers)
- Parse with hasHeaders=false (generate Column1, Column2, etc.)
- Invalid ranges (start > end, negative numbers)
- Range exceeds file size
- Empty range

**Excel parser with sheets and ranges** (`excel.test.ts`):
- List all sheets in workbook
- Parse specific sheet by name
- Parse specific sheet by index
- Parse row/column range from Excel
- Parse with hasHeaders=true
- Parse with hasHeaders=false
- Sheet name doesn't exist (error)
- Invalid sheet index (error)

**Range validation** (`range-validation.test.ts`):
- Valid ranges pass
- Invalid ranges fail with clear errors
- Column letter conversion (A → 1, Z → 26, AA → 27)
- Edge cases (1-based indexing)

### Manual Testing

1. **CSV scenarios**:
   - Upload CSV with title rows → configure to skip them
   - Upload CSV with 100 columns → extract columns 1-20
   - Upload large CSV → extract specific row range
   - Upload CSV without headers → uncheck "has headers", verify auto-generated names

2. **Excel scenarios**:
   - Upload multi-sheet Excel → select different sheets
   - Upload Excel with data at B5 → configure start row/column
   - Upload Excel with merged cells → verify parsing works
   - Upload Excel without headers → uncheck "has headers", verify auto-generated names

3. **UI flows**:
   - Upload file → configuration dialog appears automatically
   - Configure options → click "Parse" → see preview
   - From preview page → "Reconfigure Data Source" → change settings → preview updates
   - Reset to defaults → verify default values restored
   - Validation errors display correctly

4. **Edge cases**:
   - Configuration with no data (empty range)
   - Very large range (10K+ rows)
   - Invalid sheet name
   - Row/column out of bounds

## Acceptance Criteria

- **AC1**: Users can select Excel sheet to parse (dropdown with sheet names)
- **AC2**: Users can specify row range (start, end) for both CSV and Excel
- **AC3**: Users can specify column range (start, end) for both CSV and Excel
- **AC4**: Users can configure whether data has headers (checkbox)
- **AC5**: When headers disabled, column names auto-generated as "Column1", "Column2", etc.
- **AC6**: Configuration dialog appears immediately after upload (required step)
- **AC7**: Configuration is stored in database and persists across sessions
- **AC8**: Preview updates when configuration changes (from "Reconfigure" button)
- **AC9**: Validation prevents invalid ranges (start > end, negative values)
- **AC10**: All unit tests passing (100+ new tests)
- **AC11**: Build succeeds with no errors
- **AC12**: Manual testing scenarios completed successfully
- **AC13**: MEMORY.md updated with changes
- **AC14**: Column letter notation (A, B, AA) supported and converts to 1-based numbers
- **AC15**: Upload flow enforces configuration before allowing preview/transformation

## Future Work (Post-Spec 006)

- Multiple sheet parsing (combine data from multiple sheets)
- Advanced range expressions (e.g., "A1:C10, E1:F10")
- Named range support for Excel
- Dynamic range detection (auto-detect where data starts/ends)
- Visual range selector (spreadsheet-like grid UI)
- Cell-level configuration (skip specific cells, handle merged cells)
- Formula evaluation for Excel files

## Notes

- This is a common need for real-world data files that don't start at A1
- Many business reports have title rows, metadata, or data in specific regions
- Excel files often have multiple sheets (summary, raw data, notes)
- Users should be able to extract clean tabular data from messy files
- Configuration is optional - default behavior should "just work" for clean files
