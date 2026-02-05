# Spec 015 — Excel Memory Guard for Preview

Status: Active

Objective
- Prevent OOM/ArrayBuffer allocation failures when previewing large Excel files in Convex by bounding in-memory rows and using memory-efficient parsing.

Scope
- In: Excel parsing for preview and validation; `listSheets()` behavior; server-side Convex actions that call the Excel parser.
- Out: Client-side full export (DuckDB-WASM already handles full data), CSV parsing (already efficient), UI changes.

Functional Requirements
- Parsing large Excel files for preview must not exceed Convex memory limits (~64MB).
- Respect user-provided `startRow`, `endRow`, `startColumn`, `endColumn`, `sheetName`/`sheetIndex`, and `hasHeaders`.
- When preview row cap (`maxRows`) is set (e.g., 5000), only materialize enough rows to satisfy `startRow..startRow+maxRows-1`.
- `listSheets(buffer)` must read only workbook metadata and avoid loading sheet data.
 - Add conservative server-side guards to avoid loading very large files into memory for preview/validation (return a clear error instead of crashing).

Non-Functional Requirements
- Memory-efficient: minimize allocations during `XLSX.read` and `sheet_to_json`.
- Backwards-compatible API for `parseExcel()` and `listSheets()`.
- No console warnings/errors introduced.

Design
- Use `XLSX.read(buffer, { type: "array", dense: true })` to reduce cell structure size.
- Compute `sheetRows = endRow ?? ((startRow-1) + maxRows)` when `maxRows` is finite.
- Pass `sheetRows` into `XLSX.utils.sheet_to_json()` to limit materialized rows.
- For `listSheets()`, call `XLSX.read(buffer, { type: "array", bookSheets: true })` to avoid loading sheet contents.
 - Add size caps in Convex actions: refuse to preview or validate files larger than ~25MB server-side; direct users to client-side Export or to narrow ranges.

Testing Plan
- Unit test to verify `dense: true` and `sheetRows` are passed appropriately by monkey-patching `xlsx` exports.
- Smoke test by parsing with `maxRows` and `startRow` to ensure result row count <= `maxRows`.

Acceptance Criteria
- Preview parsing of large Excel files no longer throws `Array buffer allocation failed`.
- `listSheets()` returns correct sheet names without loading cell data.
- Tests compile and pass locally/CI.
 - Opening Pipeline/Preview routes with oversized files shows a friendly error instead of crashing the action.
