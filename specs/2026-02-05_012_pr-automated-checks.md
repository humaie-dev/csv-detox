# Spec: Automated PR Checks (CI)
Date: 2026-02-05
ID: 012
Status: Done

## Objective
Add a GitHub Actions workflow that runs automated checks on pull requests and protected branches: install deps, run unit tests, and build the app to catch type and compile errors.

## Scope
### In scope
- CI workflow triggered on PR events and pushes to default branch
- Steps: `npm ci`, `npm test`, `npm run build`
- Node.js setup with dependency caching for faster runs
- Fail PR when tests/build fail

### Out of scope
- ESLint or formatting checks (not configured yet)
- End-to-end tests
- Deployment or preview builds

## Functional Requirements
- Trigger on `pull_request` events: opened, synchronize, reopened, ready_for_review
- Trigger on pushes to `main` or `master`
- Use Node.js LTS (v20) on Ubuntu runner
- Use `npm ci` to install dependencies (respecting `package-lock.json`)
- Run `npm test` (Node test runner with tsx)
- Run `npm run build` (Next.js production build)
- Mark the check status appropriately (success/failure)
- Cancel in-progress runs when new commits push to the same ref

## Non-functional Requirements
- Use actions/setup-node cache for npm to improve performance
- Complete within a few minutes on typical runner
- Minimal permissions (read-only contents)

## Testing Plan
- Open a test PR to trigger the workflow; verify all steps run and report
- Push a failing test locally and open PR; verify CI fails on `npm test`
- Introduce a type error and open PR; verify `npm run build` fails

## Acceptance Criteria
- CI workflow file exists at `.github/workflows/ci.yml`
- On any PR update, the workflow runs `npm ci`, `npm test`, then `npm run build`
- On pushes to the default branch, the workflow runs the same checks
- Workflow uses Node 20 and caches npm dependencies
- Workflow cancels previous in-progress runs for the same ref
- PRs show a required check named "ci / build-and-test" that passes when tests/build succeed
