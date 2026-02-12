# Spec 016 — Unify Preview And Export With DuckDB-WASM

Status: Superseded

Objective
- Remove server-side preview guards and make Preview and Export use the same client-side flow powered by DuckDB-WASM to handle large files without divergence.

Scope
- In: Preview data loading, step execution for preview, sheet listing, removal of server-side size/row guards.
- Out: Validation UX/logic changes (kept as-is for now), backend schema/routes.

Functional Requirements
- Preview must load files client-side using the same loader as Export and apply the same SQL translation for steps.
- Preview respects `parseConfig` (sheet selection, row/column ranges, headers) exactly as Export.
- Preview result limits rows only at render time (UI), not by server-side caps.
- Sheet names for Excel are listed client-side by downloading the file and reading workbook metadata.
- Remove server-side 25MB and 5000-row guards to avoid drift between flows.

Non-Functional Requirements
- No new dependencies introduced.
- No console warnings/errors.
- Keep existing folder structure and path aliases.

Design
- Add `loadPreviewWithDuckDB(options)` that:
  - Initializes DuckDB, downloads the file, loads it into the DB via existing `loadFileIntoDuckDB()`.
  - Applies transformations using `translatePipeline()` (subset when previewing to a selected step).
  - Returns a `ParseResult` by selecting a limited number of rows for display and inferring column metadata with existing `inferColumnTypes()`.
- Update Preview page to call the new function instead of Convex actions.
- List sheets client-side by fetching the file URL and calling `listSheets()` from the Excel parser.
- Remove server-side guards and preview-specific caps in `convex/parsers.ts`.

Testing Plan
- Manual: Open large CSV/XLSX files in Preview and verify no server OOM; verify steps apply identically to Export.
- Unit: Existing SQL translator tests ensure step parity; no new backend tests required.

Acceptance Criteria
- Preview uses DuckDB-WASM path; Export and Preview share the same translation/execution flow.
- Sheet listing works client-side for Excel files.
- No 25MB or 5000-row server caps remain in `convex/parsers.ts`.
- App builds successfully and preview of large files works without Convex memory errors.
