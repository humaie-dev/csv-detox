# Spec: Fix Test Runner Entry Point
Date: 2026-02-12
ID: 020
Status: Done

## Objective
Fix `npm test` so it discovers and runs test files without trying to import the `src` directory as a module.

## Scope
### In scope
- Update the test scripts to target test file globs in `__tests__` directories.
- Keep compatibility with running a single test file via `npm test <path>`.

### Out of scope
- Adding new dependencies.
- Changing test frameworks or adding new test utilities.

## Requirements
### Functional
- FR1: `npm test` runs all `*.test.ts` files under `src/**/__tests__/`.
- FR2: `npm test src/lib/__tests__/validation.test.ts` runs a single file.

### Non-functional
- NFR1: No new dependencies introduced.
- NFR2: Existing test discovery conventions remain intact.

## Implementation Plan
1. Update `package.json` test scripts to use a test file glob instead of `src`.
2. Verify scripts still accept a file path argument.

## Testing Plan
- Unit: Run `npm test`.
- Manual: Run `npm test src/lib/__tests__/validation.test.ts`.

## Acceptance Criteria
- AC1: `npm test` no longer fails with `index.json` resolution errors.
- AC2: All tests run via glob and single-file mode.
