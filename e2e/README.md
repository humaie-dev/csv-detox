# E2E Tests

End-to-end tests using Playwright.

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run with UI (interactive mode)
npx playwright test --ui

# Run specific test file
npx playwright test e2e/upload.spec.ts

# Debug mode
npx playwright test --debug

# Run in headed mode (see browser)
npx playwright test --headed
```

## Writing Tests

See `docs/agent-guides/TESTING.md` for E2E test patterns and examples.

## Test Structure

- `e2e/` - Test files (*.spec.ts)
- `playwright.config.ts` - Configuration
- `playwright-report/` - HTML reports (gitignored)
- `test-results/` - Test artifacts (gitignored)
