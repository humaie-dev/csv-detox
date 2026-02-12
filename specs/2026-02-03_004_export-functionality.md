# Spec: CSV Export Functionality
Date: 2026-02-03
ID: 004
Status: Superseded
Completion Date: 2026-02-03

## Objective
Enable users to download their transformed data in CSV format. After building and previewing a transformation pipeline, users should be able to export the final result as a downloadable CSV file with proper formatting.

## Scope
### In scope
- Export transformed data to CSV format (UTF-8 with BOM for Excel compatibility)
- Export button in preview UI
- Generate download with sanitized filename based on original file
- Handle null values correctly (empty cells)
- Client-side export generation (no server storage of export files)
- Success/error feedback after export attempt

### Out of scope
- Export to Excel format (CSV only for simplicity)
- Custom delimiter selection for CSV (always use comma)
- Export history/logging
- Scheduled exports
- Email delivery of exports
- Export to other formats (JSON, Parquet, SQL)
- Compression (zip files)
- Export templates with predefined columns/filters
- Progress indicator for large exports (keep it simple)

## Requirements
### Functional
- FR1: Export button visible on preview page (simple button, no dropdown)
- FR2: Generate CSV file with comma delimiter, quoted fields, UTF-8 encoding with BOM
- FR3: Download filename format: `{original-name}_transformed.csv`
- FR4: Sanitize filename to remove invalid characters
- FR5: Export uses the final transformation result (all steps applied)
- FR6: Show success toast notification after download starts
- FR7: Show error toast if export fails
- FR8: Handle empty result tables (0 rows but headers present)

### Non-functional
- NFR1: Export generation completes in <2 seconds for files up to 10,000 rows
- NFR2: CSV files open correctly in Excel, Google Sheets, and other tools
- NFR3: Exported files are valid and parseable by standard tools
- NFR4: No server-side storage required (client-side generation only)
- NFR5: Works in all modern browsers (Chrome, Firefox, Safari, Edge)

## Implementation Plan

### Phase 1: CSV Export Generator ✅ COMPLETE
1. ✅ Create `src/lib/export/csv.ts`
   - `generateCSV(result: ParseResult): string` function
   - Proper CSV escaping (quotes, newlines, commas in values)
   - UTF-8 with BOM for Excel compatibility (`\uFEFF` prefix)
   - Convert null values to empty strings
   - `sanitizeExportFilename()` helper function
2. ✅ Add 26 unit tests for CSV generator
   - Basic export, special characters, Unicode, null handling, edge cases

### Phase 2: Export UI Component
1. Install shadcn/ui Toast component (for success/error notifications)
2. Create `src/components/ExportButton.tsx`
   - Simple button component (no dropdown needed)
   - Props: `data: ParseResult`, `originalFilename: string`
   - Triggers CSV download on click
   - Shows toast notification on success/error
   - Icon: Download icon from lucide-react

### Phase 3: Integration with Preview Page
1. Update `src/app/preview/[uploadId]/page.tsx`
   - Add ExportButton to header section (next to file info)
   - Pass final preview data and original filename
   - Trigger browser download using `URL.createObjectURL()` and `<a>` element
   - Clean up blob URL after download

## Testing Plan

### Unit Tests ✅ COMPLETE
- **CSV Generator** (`src/lib/export/__tests__/csv.test.ts`): 26 tests
  - ✅ Basic CSV generation with headers and rows
  - ✅ Proper quoting of fields containing commas, quotes, newlines
  - ✅ UTF-8 BOM present at start of file
  - ✅ Null values converted to empty strings
  - ✅ Special characters preserved (Unicode, emojis, Chinese)
  - ✅ Empty table produces header-only CSV
  - ✅ Filename sanitization (special chars, spaces, path separators)

### Manual Tests
1. **CSV Export**:
   - Upload sample CSV, add transformations, export as CSV
   - Open in Excel - verify no encoding issues, special characters display correctly
   - Open in Google Sheets - verify correct parsing
   - Open in text editor - verify UTF-8 BOM present, proper escaping

2. **Edge Cases**:
   - Export empty result (all rows filtered out) - verify valid file with headers
   - Export large file (10,000+ rows) - verify performance and success
   - Export after complex pipeline (7+ steps) - verify correct final data

3. **Filename Handling**:
   - Upload "Sales Data 2024.csv" → exports as "Sales_Data_2024_transformed.csv"
   - Upload with special chars "report!@#.xlsx" → sanitizes to "report_transformed.csv"

## Acceptance Criteria

- AC1: Users can click "Export CSV" button on preview page
- AC2: CSV export downloads with `.csv` extension and opens correctly in Excel without encoding issues
- AC3: Exported filename includes "_transformed" suffix and is properly sanitized
- AC4: Null values in data export as empty cells (not "null" text)
- AC5: Special characters (commas, quotes, newlines, Unicode) are preserved in exports
- AC6: Empty result tables (0 rows) export successfully with headers only
- AC7: Export of 10,000 rows completes in under 2 seconds
- AC8: Success toast notification appears after download starts
- AC9: Error toast displays if export fails with helpful message
- AC10: All 26 CSV export tests pass ✅ COMPLETE
