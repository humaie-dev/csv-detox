# OpenCode Agent Instructions — CSV Detox

These instructions customize OpenCode's behavior for this repository. OpenCode loads `AGENTS.md` as repo-level rules.

## Build, Test, and Lint Commands

### Development & Build
```bash
npm run dev          # Start Next.js dev server (default: http://localhost:3000)
npm run build        # Build production bundle
npm start            # Start production server
```

### Testing
- **Framework**: Node.js built-in test runner with tsx for TypeScript support
- **Run all tests**: `npm test`
- **Run single test file**: `npm test src/lib/__tests__/validation.test.ts`
- **Watch mode**: `npm run test:watch`
- **Test file naming**: `*.test.ts` in `__tests__` directories

### Linting (to be configured)
- **No linter configured yet** — ESLint should be added via a spec
- When configured: `npm run lint` or `npm run lint:fix`

---

## Spec-Driven Development

### When a Spec is Required
Create a spec in `/specs` for changes that:
- Have **functional impact** (new features, behavior changes, bug fixes affecting logic)
- Require **2-3+ file changes** across the codebase
- Affect **APIs, schemas, or architecture**
- Impact **user-facing behavior**

**Spec format**: `YYYY-MM-DD_NNN_short-title.md` (NNN is zero-padded: 001, 002, etc.)
**Must include**: Objective, Scope (in/out), Functional & Non-functional requirements, Testing plan, Acceptance criteria

### When a Spec is NOT Required (Trivial Changes)
Skip the spec for:
- **One-liner changes** (typo fixes, style tweaks, variable renames)
- **Minor adjustments** (formatting, comments, log messages)
- **Single-file, non-functional changes** (refactoring within one module without behavior change)

### Spec Workflow
- `MEMORY.md` must reference the currently **Active** spec (when applicable)
- If requirements change mid-task: update the spec **first**, then code/tests/docs
- For trivial changes: just update `MEMORY.md` with what changed

---

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled** (`strict: true` in tsconfig.json)
- Target: ES2022
- No JavaScript files allowed (`allowJs: false`)
- Always use explicit types; avoid `any`

### Imports
- Use path alias: `@/*` maps to `src/*`
  ```typescript
  import { foo } from "@/lib/utils";  // ✅ Good
  import { foo } from "../../lib/utils";  // ❌ Avoid
  ```
- Use named imports for React types:
  ```typescript
  import type { ReactNode } from "react";  // ✅ Good
  ```
- Order: external packages → internal modules → types

### Formatting
- **No Prettier configured yet** — assume standard conventions:
  - 2-space indentation
  - Double quotes for strings
  - Semicolons required
  - Trailing commas in multi-line structures
- Consistent with existing code style (see `src/app/layout.tsx` and `src/app/page.tsx`)

### Naming Conventions
- **Files**: kebab-case for utilities, PascalCase for React components
  - `src/lib/csv-parser.ts` ✅
  - `src/app/MyComponent.tsx` ✅
- **Functions/Variables**: camelCase
- **Types/Interfaces**: PascalCase
- **Constants**: UPPER_SNAKE_CASE for true constants
- **React Components**: PascalCase, named exports preferred for pages

### Component Structure
- Next.js App Router conventions:
  - Server Components by default
  - Use `"use client"` directive only when needed
  - Default exports for page/layout files
- Component example:
  ```typescript
  export default function ComponentName() {
    return <div>...</div>;
  }
  ```

### Error Handling
- Never swallow errors silently
- Log errors with context (but never log raw user data)
- Validate inputs at API boundaries
- Use Result types or throw descriptive errors

### Types
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `satisfies` operator for type checking without widening
- Avoid type assertions (`as`) unless absolutely necessary
- Export types used across modules

---

## Architecture & Patterns

### Technical Stack
- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Backend**: Convex (database, storage, serverless functions)
- **UI Components**: shadcn/ui (Tailwind CSS-based component library)
  - Use shadcn/ui components as the foundation for all UI elements
  - Install components via CLI: `npx shadcn@latest add <component>`
  - Customize components in `src/components/ui/` as needed
  - Follow shadcn/ui patterns and conventions
- **Testing**: Node.js test runner with tsx
- **Styling**: Tailwind CSS (via shadcn/ui)

### Folder Conventions
- `src/lib/**` → Pure logic, utilities, core business logic
- `src/app/**` → Next.js App Router (pages, layouts, API routes)
- `src/app/api/**` → Route handlers (thin, delegate to `src/lib/**`)
- `src/components/ui/**` → shadcn/ui components (auto-generated, customizable)
- `src/components/**` → Application-specific React components
- `convex/**` → Convex backend code (schema, mutations, queries)
- Keep route handlers thin; never put business logic in routes

### Ask Before Introducing Change
- **ASK (in chat)** before introducing:
  - Any new libraries/dependencies (runtime or dev)
  - New architectural patterns (state management, folder conventions, etc.)
  - Major refactors or cross-cutting changes
- If approved, record the decision in `docs/internal/PATTERNS.md`

### Pattern Registry (Required)
- Maintain `docs/internal/PATTERNS.md` as the living record of coding/architectural patterns
- Update after any approved architectural change

---

## Quality Gates for Every Change

Before considering a task complete:
1. ✅ Tests pass (when configured)
2. ✅ Lint passes (when configured)
3. ✅ No console warnings/errors introduced
4. ✅ `MEMORY.md` updated (what changed, decisions, next steps)
5. ✅ Spec status updated (Draft → Active → Done) if a spec was created
6. ✅ Documentation updated:
   - Internal docs (`docs/internal/`) when APIs/schemas/architecture change
   - Public docs (`docs/public/`) when user-visible behavior changes

---

## Core Engineering Principles

- Prefer small, incremental changes
- Never leave console warnings/errors introduced by your changes
- Add/adjust unit tests for any logic you add or modify
- Security: Never log raw user data; assume uploaded data is sensitive
- Keep the codebase clean: no stale TODOs in code (track in `MEMORY.md` instead)

---

## Daily Workflow

1. Read `MEMORY.md` (current state + Active spec + TODOs)
2. Determine if a spec is needed (see "When a Spec is Required"); create one if needed
3. Implement the smallest slice that satisfies the requirements
4. Fix any warnings/errors introduced
5. Add/update tests (as defined in spec or appropriate for the change)
6. Update docs (internal/public as needed)
7. Update `MEMORY.md` with changes, decisions, and next TODOs
8. Mark spec `Status: Done` when acceptance criteria are met (if a spec exists)
