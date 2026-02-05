# Spec 014 — CI Dummy NEXT_PUBLIC_CONVEX_URL
Date: 2026-02-05
ID: 014
Status: Done

## Objective
Ensure the app builds in CI by providing a dummy `NEXT_PUBLIC_CONVEX_URL` during the build step.

## Scope
### In scope
- Update GitHub Actions workflow to set a non-secret placeholder for `NEXT_PUBLIC_CONVEX_URL` during the build.

### Out of scope
- Runtime configuration changes
- Changes to application code or environment files

## Requirements
### Functional
- FR1: CI build must have `process.env.NEXT_PUBLIC_CONVEX_URL` defined.
- FR2: The variable should be scoped to the build step only.

### Non-functional
- NFR1: Do not use secrets; value must be a harmless placeholder.
- NFR2: Minimal change footprint; no impact on local dev or tests.

## Implementation Plan
1. Edit `.github/workflows/ci.yml` and inject `NEXT_PUBLIC_CONVEX_URL` on the build step only.
2. Use a benign URL (e.g., `https://dummy.convex.cloud`).

## Testing Plan
- CI: Workflow runs `npm run build` successfully with the injected variable.
- Local: No changes; developers continue to use `.env.local`.

## Acceptance Criteria
- AC1: `ci / build-and-test` succeeds past the build step without missing env errors.
- AC2: No secrets introduced; placeholder clearly non-production.
