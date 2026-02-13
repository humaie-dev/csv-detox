# Biome Configuration Notes

⚠️ **DO NOT MODIFY `biome.jsonc` WITHOUT USER APPROVAL**

## Configuration Overview

This file documents the Biome linter and formatter configuration for CSV Detox (`biome.jsonc`).

### Current Exceptions and Overrides

#### 1. CSS Files (`**/*.css`)
- **Rule**: `noUnknownAtRules: off`
- **Reason**: Allows Tailwind CSS directives (`@tailwind`, `@apply`)
- **Parser**: `tailwindDirectives: true` enables Tailwind syntax support

#### 2. React Components (`src/**/*.tsx`, `src/**/*.jsx`)
- **Rules**:
  - `noStaticElementInteractions: off`
  - `useKeyWithClickEvents: off`
  - `noArrayIndexKey: warn` (downgraded from error)
- **Reason**: Common React patterns that don't affect functionality
  - Drag-and-drop interfaces use div onClick handlers
  - Array indices used for stable warning/error lists
  - Accessibility handled at app level, not enforced in linter

#### 3. Test Files (`**/__tests__/**`, `**/*.test.ts`, `**/*.spec.ts`)
- **Rules**:
  - `noConsole: off`
  - `noNonNullAssertion: off`
- **Reason**: 
  - Tests can use console for debugging
  - Non-null assertions acceptable in test setup

#### 4. AddStepDialog Component (`src/components/AddStepDialog.tsx`)
- **Rule**: `noExplicitAny: off`
- **Reason**: Complex dynamic form with type-dependent configs
- **TODO**: Replace `Record<string, any>` with discriminated union based on TransformationType
  - See TODO comment in file at line 54
  - Requires significant refactoring of form state management
  - Low priority - not a runtime safety issue

#### 5. Convex Generated Files (`convex/_generated/**`)
- **All linting and formatting disabled**
- **Reason**: Auto-generated code, should not be modified

### Core Rules (Enforced Globally)

- `noExplicitAny: error` - Explicit types required (except AddStepDialog)
- `noConsole: warn` - Allow `console.error`, `console.warn`, `console.info` only
- `useConst: error` - Prefer const over let/var
- `useImportType: error` - Separate type imports
- `noUnusedVariables: error` - Clean up unused code
- `noUnusedImports: error` - Clean up unused imports
- `noControlCharactersInRegex: off` - Intentional for file name sanitization

### Formatting Rules

- 2-space indentation
- Double quotes for strings/JSX
- Semicolons required
- Trailing commas in multiline
- Line width: 100 characters
- LF line endings
- Arrow parentheses always

### Import Organization

Biome automatically organizes imports:
1. Alphabetically within each group
2. Type imports separated with `import type`
3. No manual sorting needed

### When to Modify This Config

Ask user before:
- Adding new rule exceptions
- Disabling existing rules
- Changing formatter settings
- Adding file-specific overrides

Only modify if:
- New legitimate patterns need exceptions
- False positives affecting development
- User explicitly approves changes

### Version

- Biome: 2.3.15
- Schema: https://biomejs.dev/schemas/2.3.15/schema.json
- Last Updated: 2026-02-13
