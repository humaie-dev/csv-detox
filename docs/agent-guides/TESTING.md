# Testing Guide — CSV Detox

Comprehensive testing guide for unit tests and E2E tests.

---

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Unit Testing](#unit-testing)
- [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [Test Organization](#test-organization)
- [Common Patterns](#common-patterns)
- [Coverage Goals](#coverage-goals)
- [Running Tests](#running-tests)
- [Debugging Tests](#debugging-tests)

---

## Overview

CSV Detox uses two testing approaches:

1. **Unit/Integration Tests** — Fast, isolated, for business logic
2. **E2E Tests** — Browser-based, for user flows

### Testing Philosophy

- **Test behavior, not implementation**
- **Focus on business logic** (high value, high risk)
- **Keep tests fast** — Unit tests <100ms each
- **Make tests readable** — Future developers should understand intent
- **No flaky tests** — Tests must be deterministic

---

## Testing Stack

| Type | Framework | Purpose |
|------|-----------|---------|
| **Unit** | Node.js test runner | Business logic, utilities |
| **Integration** | Node.js test runner | Multi-module interactions |
| **E2E** | Playwright | User flows, browser testing |

### Why These Tools?

- **Node.js test runner** — Built-in, fast, no extra dependencies
- **tsx** — TypeScript execution without compilation step
- **Playwright** — Cross-browser, reliable, great dev experience

---

## Unit Testing

### Setup

Tests use Node.js built-in test runner with tsx for TypeScript support.

```bash
npm test                                # Run all tests
npm test src/lib/__tests__/parser.test.ts  # Run specific file
npm run test:watch                      # Watch mode
```

### Test File Structure

```typescript
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { functionToTest } from "../module";

describe("Module Name", () => {
  // Setup (if needed)
  before(() => {
    // Runs once before all tests in this describe block
  });

  after(() => {
    // Runs once after all tests in this describe block
  });

  describe("functionToTest", () => {
    it("should handle valid input correctly", () => {
      const result = functionToTest("valid input");
      assert.strictEqual(result, "expected output");
    });

    it("should throw on invalid input", () => {
      assert.throws(
        () => functionToTest("invalid"),
        /Expected error message pattern/
      );
    });

    it("should handle edge case: empty input", () => {
      const result = functionToTest("");
      assert.deepStrictEqual(result, { error: "Empty input" });
    });
  });
});
```

### Assertions

Use Node.js `assert` module:

```typescript
import assert from "node:assert";

// Strict equality
assert.strictEqual(actual, expected);
assert.strictEqual(result.success, true);

// Deep equality (objects/arrays)
assert.deepStrictEqual(actual, expected);
assert.deepStrictEqual(result, { success: true, data: [] });

// Truthiness
assert.ok(value); // value is truthy
assert.ok(!value); // value is falsy

// Type checks
assert.strictEqual(typeof result, "string");

// Exceptions
assert.throws(() => fn(), /error message pattern/);
assert.throws(() => fn(), Error);

// No exception
assert.doesNotThrow(() => fn());

// Async assertions
await assert.rejects(async () => await asyncFn(), /error/);
await assert.doesNotReject(async () => await asyncFn());
```

### Testing Pure Functions

Pure functions are the easiest to test:

```typescript
// src/lib/utils.ts
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/__+/g, "_");
}

// src/lib/__tests__/utils.test.ts
import { describe, it } from "node:test";
import assert from "node:assert";
import { sanitizeFileName } from "../utils";

describe("utils", () => {
  describe("sanitizeFileName", () => {
    it("should remove special characters", () => {
      assert.strictEqual(
        sanitizeFileName("file@#$.csv"),
        "file___.csv"
      );
    });

    it("should collapse multiple underscores", () => {
      assert.strictEqual(
        sanitizeFileName("file___name.csv"),
        "file_name.csv"
      );
    });

    it("should preserve alphanumeric and dots/dashes", () => {
      assert.strictEqual(
        sanitizeFileName("file-name.v2.csv"),
        "file-name.v2.csv"
      );
    });
  });
});
```

### Testing with Edge Cases

Always test boundary conditions:

```typescript
describe("parseCSV", () => {
  it("should handle empty string", () => {
    const result = parseCSV("");
    assert.deepStrictEqual(result, { headers: [], rows: [] });
  });

  it("should handle single column", () => {
    const result = parseCSV("name\nAlice\nBob");
    assert.deepStrictEqual(result, {
      headers: ["name"],
      rows: [["Alice"], ["Bob"]],
    });
  });

  it("should handle quotes with commas", () => {
    const result = parseCSV('name,address\n"Alice","123 Main St, Apt 4"');
    assert.deepStrictEqual(result.rows[0], ["Alice", "123 Main St, Apt 4"]);
  });

  it("should handle very large file", () => {
    const largeCSV = generateLargeCSV(100000); // 100k rows
    assert.doesNotThrow(() => parseCSV(largeCSV));
  });
});
```

### Testing Error Handling

```typescript
describe("parseCSV error handling", () => {
  it("should throw on malformed CSV", () => {
    const malformed = 'name,age\n"Alice,25\n'; // Unclosed quote
    assert.throws(
      () => parseCSV(malformed),
      /Malformed CSV: unclosed quote/
    );
  });

  it("should throw on inconsistent column count", () => {
    const inconsistent = "name,age\nAlice,25\nBob"; // Missing column
    assert.throws(
      () => parseCSV(inconsistent, { strict: true }),
      /Inconsistent column count/
    );
  });
});
```

### Testing Async Functions

```typescript
describe("async functions", () => {
  it("should fetch data successfully", async () => {
    const data = await fetchData("valid-id");
    assert.strictEqual(data.success, true);
  });

  it("should reject on invalid ID", async () => {
    await assert.rejects(
      async () => await fetchData("invalid"),
      /Not found/
    );
  });
});
```

### Mocking (When Needed)

Node.js test runner has built-in mocking:

```typescript
import { describe, it, mock } from "node:test";
import assert from "node:assert";

describe("with mocks", () => {
  it("should call callback with result", () => {
    const callback = mock.fn();
    
    processData("input", callback);
    
    assert.strictEqual(callback.mock.calls.length, 1);
    assert.deepStrictEqual(callback.mock.calls[0].arguments, [
      { success: true }
    ]);
  });
});
```

For more complex mocking, consider using dependency injection:

```typescript
// src/lib/processor.ts
export function createProcessor(fetcher: Fetcher) {
  return {
    process: async (id: string) => {
      const data = await fetcher.fetch(id);
      return transform(data);
    }
  };
}

// src/lib/__tests__/processor.test.ts
const mockFetcher = {
  fetch: async (id: string) => ({ id, data: "mock" })
};

const processor = createProcessor(mockFetcher);
const result = await processor.process("123");
assert.deepStrictEqual(result, { transformed: true });
```

---

## E2E Testing with Playwright

### Setup

```bash
npx playwright test                 # Run all E2E tests
npx playwright test --ui            # Interactive UI mode
npx playwright test --headed        # See browser
npx playwright test --debug         # Debug mode
npx playwright test e2e/upload.spec.ts  # Single file
```

### Test File Structure

```typescript
// e2e/upload.spec.ts
import { test, expect } from "@playwright/test";

test.describe("File Upload", () => {
  test("should upload CSV file successfully", async ({ page }) => {
    // Navigate to page
    await page.goto("/");
    
    // Interact with UI
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("test-fixtures/sample.csv");
    
    // Assert expected outcome
    await expect(page.locator('text="sample.csv"')).toBeVisible();
    await expect(page.locator('text="Upload successful"')).toBeVisible();
  });

  test("should reject files over 50MB", async ({ page }) => {
    await page.goto("/");
    
    // Simulate large file (mock)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("test-fixtures/large-file.csv");
    
    // Expect error message
    await expect(page.locator('text="File too large"')).toBeVisible();
  });
});
```

### Common Playwright Patterns

#### Navigation

```typescript
await page.goto("/");
await page.goto("/projects/123");
await page.goBack();
await page.reload();
```

#### Locators

```typescript
// By text
page.locator('text="Upload File"');
page.locator('text=/upload/i'); // Case-insensitive regex

// By role
page.getByRole("button", { name: "Upload" });
page.getByRole("heading", { name: "Projects" });

// By test ID
page.locator('[data-testid="upload-button"]');

// By CSS selector
page.locator(".upload-form");
page.locator("#project-123");

// Chaining
page.locator(".project-list").locator("button").first();
```

#### Interactions

```typescript
// Click
await page.locator('button:text("Upload")').click();

// Type
await page.locator('input[name="name"]').fill("Project Name");
await page.locator('input[name="name"]').type("Typed slowly");

// Select
await page.locator('select[name="format"]').selectOption("csv");

// File upload
await page.locator('input[type="file"]').setInputFiles("path/to/file.csv");

// Checkbox/Radio
await page.locator('input[type="checkbox"]').check();
await page.locator('input[type="radio"]').check();
```

#### Assertions

```typescript
// Visibility
await expect(page.locator('text="Success"')).toBeVisible();
await expect(page.locator('text="Loading"')).toBeHidden();

// Text content
await expect(page.locator("h1")).toHaveText("CSV Detox");
await expect(page.locator(".error")).toContainText("Error");

// Count
await expect(page.locator(".project-item")).toHaveCount(5);

// URL
await expect(page).toHaveURL("/projects/123");

// Value
await expect(page.locator('input[name="name"]')).toHaveValue("Project");

// Attribute
await expect(page.locator("button")).toHaveAttribute("disabled", "");
```

#### Waiting

```typescript
// Wait for element
await page.waitForSelector('text="Loaded"');

// Wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.click('a[href="/projects"]')
]);

// Wait for network request
await page.waitForResponse(resp => 
  resp.url().includes("/api/upload") && resp.status() === 200
);

// Wait for timeout (use sparingly!)
await page.waitForTimeout(1000);
```

### E2E Test Examples

#### Upload Flow

```typescript
test("complete upload flow", async ({ page }) => {
  await page.goto("/");
  
  // Upload file
  await page.locator('input[type="file"]').setInputFiles("test-fixtures/data.csv");
  
  // Wait for success
  await expect(page.locator('text="Upload successful"')).toBeVisible();
  
  // Verify file appears in list
  await expect(page.locator('text="data.csv"')).toBeVisible();
  
  // Click to view
  await page.locator('text="data.csv"').click();
  
  // Verify preview loads
  await expect(page.locator(".data-preview")).toBeVisible();
  await expect(page.locator(".data-preview table")).toBeVisible();
});
```

#### Transformation Pipeline

```typescript
test("should create transformation pipeline", async ({ page }) => {
  await page.goto("/projects/test-project-id");
  
  // Click "New Pipeline"
  await page.getByRole("button", { name: "New Pipeline" }).click();
  
  // Name the pipeline
  await page.locator('input[name="pipelineName"]').fill("Clean Data");
  
  // Add trim operation
  await page.getByRole("button", { name: "Add Step" }).click();
  await page.locator('select[name="operationType"]').selectOption("trim");
  
  // Select columns
  await page.locator('input[name="column-name"]').check();
  await page.locator('input[name="column-address"]').check();
  
  // Save
  await page.getByRole("button", { name: "Save" }).click();
  
  // Verify pipeline appears
  await expect(page.locator('text="Clean Data"')).toBeVisible();
});
```

#### AI Assistant

```typescript
test("should interact with AI assistant", async ({ page }) => {
  await page.goto("/projects/test-project-id");
  
  // Open assistant
  await page.getByRole("button", { name: "AI Assistant" }).click();
  
  // Verify drawer opens
  await expect(page.locator(".assistant-drawer")).toBeVisible();
  
  // Type message
  await page.locator('input[name="message"]').fill("Show me a summary of the data");
  await page.keyboard.press("Enter");
  
  // Wait for response
  await expect(page.locator('.message-assistant:last-child')).toBeVisible({ timeout: 10000 });
  
  // Verify response contains expected content
  await expect(page.locator('.message-assistant:last-child'))
    .toContainText("rows");
});
```

### E2E Test Best Practices

#### Use Page Objects (for complex tests)

```typescript
// e2e/pages/upload-page.ts
export class UploadPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  async uploadFile(fileName: string) {
    await this.page.locator('input[type="file"]').setInputFiles(fileName);
  }

  async expectSuccess() {
    await expect(this.page.locator('text="Upload successful"')).toBeVisible();
  }
}

// e2e/upload.spec.ts
import { UploadPage } from "./pages/upload-page";

test("upload with page object", async ({ page }) => {
  const uploadPage = new UploadPage(page);
  await uploadPage.goto();
  await uploadPage.uploadFile("test-fixtures/data.csv");
  await uploadPage.expectSuccess();
});
```

#### Setup Fixtures

```typescript
// e2e/fixtures/test-data.ts
export const fixtures = {
  smallCSV: "test-fixtures/small.csv",
  largeCSV: "test-fixtures/large.csv",
  validXLSX: "test-fixtures/valid.xlsx",
};

// e2e/upload.spec.ts
import { fixtures } from "./fixtures/test-data";

test("upload small CSV", async ({ page }) => {
  // ... use fixtures.smallCSV
});
```

---

## Test Organization

### File Structure

```
src/lib/
├── csv-parser.ts
├── __tests__/
│   └── csv-parser.test.ts       # Unit tests
├── transformations/
│   ├── trim.ts
│   ├── filter.ts
│   └── __tests__/
│       ├── trim.test.ts
│       └── filter.test.ts

e2e/
├── upload.spec.ts                # E2E tests
├── transformation.spec.ts
├── export.spec.ts
└── fixtures/
    ├── small.csv
    └── large.csv
```

### Naming Conventions

- **Unit tests**: `*.test.ts` in `__tests__/` directories
- **E2E tests**: `*.spec.ts` in `e2e/` directory
- **Test names**: Describe behavior, not implementation

```typescript
// ✅ Good test names
it("should remove leading/trailing whitespace");
it("should handle empty input gracefully");
it("should throw on invalid CSV format");

// ❌ Bad test names
it("test 1");
it("works");
it("calls trim() function");
```

---

## Common Patterns

### Testing Transformations

```typescript
describe("trim transformation", () => {
  it("should trim specified columns", () => {
    const input = {
      headers: ["name", "age"],
      rows: [["  Alice  ", "25"], ["Bob  ", "30"]],
    };
    
    const result = applyTrim(input, { columns: ["name"] });
    
    assert.deepStrictEqual(result.rows, [
      ["Alice", "25"],
      ["Bob", "30"],
    ]);
  });
});
```

### Testing SQL Translation

```typescript
describe("SQL translator", () => {
  it("should generate UPDATE for trim operation", () => {
    const steps: TransformationStep[] = [
      { id: "1", type: "trim", config: { columns: ["name"] } }
    ];
    
    const sql = translatePipeline(steps);
    
    assert.strictEqual(sql[0], 'UPDATE data SET "name" = TRIM("name")');
  });
  
  it("should escape column names with special characters", () => {
    const steps: TransformationStep[] = [
      { id: "1", type: "trim", config: { columns: ["user name"] } }
    ];
    
    const sql = translatePipeline(steps);
    
    assert.strictEqual(sql[0], 'UPDATE data SET "user name" = TRIM("user name")');
  });
});
```

---

## Coverage Goals

### Target Coverage

| Code Type | Coverage Goal | Rationale |
|-----------|---------------|-----------|
| **Business logic** | >90% | High value, high risk |
| **Utilities** | >95% | Reused everywhere |
| **API routes** | >80% | Integration tests |
| **UI components** | Smoke tests | Focus on logic, not rendering |

### What to Test

#### High Priority ✅
- Data transformation logic
- CSV/XLSX parsing
- Validation functions
- SQL translation
- Error handling

#### Medium Priority
- API route handlers
- React component behavior
- Form submissions
- Edge cases

#### Lower Priority
- Type definitions (TypeScript handles this)
- Simple getters/setters
- Third-party library wrappers

---

## Running Tests

### Local Development

```bash
# Unit tests
npm test                          # All unit tests
npm test src/lib/__tests__/parser.test.ts  # Single file
npm run test:watch                # Watch mode

# E2E tests
npx playwright test               # All E2E tests
npx playwright test --ui          # Interactive mode
npx playwright test --headed      # See browser
npx playwright test --debug       # Debug mode
npx playwright test upload        # Tests matching "upload"
```

### CI/CD

Tests run automatically on every PR:

```yaml
# .github/workflows/test.yml
- name: Run unit tests
  run: npm test

- name: Run E2E tests
  run: npx playwright test
```

---

## Debugging Tests

### Unit Test Debugging

```typescript
// Add console.log for debugging
it("should do something", () => {
  const result = functionToTest("input");
  console.log("Result:", JSON.stringify(result, null, 2));
  assert.strictEqual(result.success, true);
});
```

Run single test:
```bash
npm test src/lib/__tests__/specific.test.ts
```

### E2E Test Debugging

```bash
# Debug mode (opens inspector)
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Slow down execution
npx playwright test --slow-mo=1000
```

Add screenshots on failure:

```typescript
test("should work", async ({ page }) => {
  await page.goto("/");
  // ... test steps
  
  // Take screenshot on failure
  await page.screenshot({ path: "failure.png" });
});
```

Use `page.pause()` for interactive debugging:

```typescript
test("debug interactively", async ({ page }) => {
  await page.goto("/");
  await page.pause(); // Opens Playwright Inspector
  // ... continue test
});
```

---

## Test Maintenance

### Keeping Tests Fast

- ✅ Mock external dependencies
- ✅ Use in-memory databases
- ✅ Avoid `waitForTimeout` in E2E tests
- ✅ Run tests in parallel (Playwright default)

### Handling Flaky Tests

```typescript
// ❌ Flaky: relies on timing
await page.waitForTimeout(1000);
await expect(page.locator(".result")).toBeVisible();

// ✅ Stable: explicit wait
await expect(page.locator(".result")).toBeVisible({ timeout: 5000 });
```

### Test Data Management

Keep test fixtures small and focused:

```
e2e/fixtures/
├── small.csv      # 10 rows, fast
├── medium.csv     # 100 rows, typical
└── edge-cases/
    ├── empty.csv
    ├── single-column.csv
    └── special-chars.csv
```

---

## Quick Reference

### Unit Test Template

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";
import { functionToTest } from "../module";

describe("Module", () => {
  describe("functionToTest", () => {
    it("should handle normal case", () => {
      const result = functionToTest("input");
      assert.strictEqual(result, "expected");
    });
    
    it("should handle edge case", () => {
      // ...
    });
    
    it("should throw on invalid input", () => {
      assert.throws(() => functionToTest("invalid"), /error/);
    });
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/");
    await page.locator("selector").click();
    await expect(page.locator("result")).toBeVisible();
  });
});
```

---

**Need more examples?** Check existing tests in the codebase or [COMMON_TASKS.md](./COMMON_TASKS.md).
