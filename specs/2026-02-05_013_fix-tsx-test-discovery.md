# Spec 013 — Fix TSX Test Discovery in CI

Status: Superseded

Objective
- Ensure `npm test` reliably discovers and runs all TypeScript tests in CI using TSX + Node test runner.

Scope
- In: Update npm scripts to use directory-based discovery (`tsx --test src`) instead of shell glob patterns.
- Out: Adding/changing tests, CI workflow steps beyond invoking `npm test`.

Functional Requirements
- `npm test` runs all `*.test.ts` files under `src/**` recursively using Node's built-in test runner with TSX.
- `npm run test:watch` supports watch mode with the same discovery logic.

Non-functional Requirements
- The change is shell-agnostic and works locally and in GitHub Actions.
- No impact on build/start scripts.

Testing Plan
- Local: Run `npm test` to verify tests are discovered and executed.
- CI: Workflow step "Run npm test" passes on Ubuntu with Node 20.

Acceptance Criteria
- CI no longer errors with "Could not find 'src/**/*.test.ts'".
- All existing tests are discovered and run when executing `npm test`.

Notes
- TSX treats a directory argument (`src`) as the test root and recursively finds tests; relying on shell glob expansion is brittle across environments.
