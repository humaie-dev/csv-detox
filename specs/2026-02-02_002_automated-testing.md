# Spec: Automated Testing Setup
Date: 2026-02-02
ID: 002
Status: Done

## Objective
Set up automated testing infrastructure to prevent regression bugs and enable confident refactoring. Focus on unit tests for business logic and integration tests for Convex mutations.

## Scope
### In scope
- Choose and configure test framework (Node.js built-in test runner recommended)
- Set up test file structure and conventions
- Write unit tests for validation functions (file type, size, filename sanitization)
- Write integration tests for Convex mutations (using Convex test helpers)
- Add test npm scripts
- Configure CI-ready test execution
- Document testing patterns in PATTERNS.md

### Out of scope
- E2E tests (Playwright/Cypress) - future spec
- Visual regression testing
- Load/performance testing
- Code coverage enforcement (can be added later)
- Test database seeding utilities (future enhancement)

## Requirements
### Functional
- FR1: Run all tests with `npm test`
- FR2: Run single test file with `npm test -- path/to/test.ts`
- FR3: Tests exit with code 0 on success, non-zero on failure
- FR4: Test output is clear and actionable
- FR5: Tests can run in CI environment without interaction
- FR6: Convex mutations can be tested in isolation using Convex test helpers
- FR7: Tests cover all validation logic (sanitizeFilename, validateFileType, validateFileSize)

### Non-functional
- NFR1: Tests run in under 10 seconds (fast feedback loop)
- NFR2: Tests are deterministic (no flaky tests)
- NFR3: Tests don't require external services (use Convex test backend)
- NFR4: Test code follows same style guidelines as production code
- NFR5: Tests are easy to write and maintain

## Implementation Plan
1. **Choose test framework**:
   - Option A: Node.js built-in test runner (recommended - no dependencies)
   - Option B: Vitest (NO - violates no-Vite rule)
   - Option C: Jest (heavier, requires more config)
   - **Decision**: Use Node.js built-in test runner (`node:test`)

2. **Install dependencies** (if needed):
   - `@types/node` (already installed)
   - Convex provides `convex-test` for testing mutations/queries

3. **Create test structure**:
   ```
   src/lib/__tests__/
   convex/__tests__/
   ```

4. **Add test scripts to package.json**:
   ```json
   {
     "test": "node --test",
     "test:watch": "node --test --watch"
   }
   ```

5. **Write tests**:
   - Unit tests for validation functions in Convex mutations
   - Integration tests for Convex mutations using test helpers
   - Test file naming: `*.test.ts`

6. **Document patterns**:
   - Update AGENTS.md with test commands
   - Update PATTERNS.md with testing conventions
   - Create test examples

## Testing Plan
### Unit Tests to Write
- `sanitizeFilename()`:
  - Test with normal filename → returns same
  - Test with path traversal (`../../etc/passwd`) → sanitized
  - Test with null bytes → removed
  - Test with special chars → replaced with underscore
  - Test with empty string → generates default name
  - Test with dot-file (`.hidden`) → generates default name

- `validateFileType()`:
  - Test CSV with correct MIME → true
  - Test XLSX with correct MIME → true
  - Test .txt file → false
  - Test CSV with wrong MIME → false
  - Test no extension → false

- `validateFileSize()`:
  - Test 0 bytes → false
  - Test 1 byte → true
  - Test 50MB exactly → true
  - Test 50MB + 1 byte → false

### Integration Tests to Write
- `uploadFile` mutation:
  - Test successful upload with valid CSV
  - Test successful upload with valid XLSX
  - Test rejection of oversized file
  - Test rejection of invalid file type
  - Test database record created with correct fields
  - Test file ID is generated

- `generateUploadUrl` mutation:
  - Test returns valid URL string

### Manual Testing (after automated tests pass)
- Upload actual file through UI
- Verify Convex dashboard shows correct data

## Acceptance Criteria
- AC1: `npm test` runs all tests successfully
- AC2: Can run single test file with `npm test -- path/to/test.ts`
- AC3: All validation functions have unit tests with >90% coverage
- AC4: All Convex mutations have integration tests
- AC5: Tests run in under 10 seconds
- AC6: Tests pass in CI environment (no interactive prompts)
- AC7: Test patterns documented in PATTERNS.md
- AC8: AGENTS.md updated with test commands
- AC9: All current functionality tested (no breaking changes)
