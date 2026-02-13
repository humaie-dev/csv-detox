# Code Style Guide — CSV Detox

Coding conventions and style guidelines for CSV Detox.

**Note**: Formatting and many linting rules are automatically enforced by Biome. Run `npm run check` before committing to auto-fix issues.

**⚠️ CRITICAL**: Never modify `biome.jsonc` without explicit user approval. The configuration contains carefully tuned rules and exceptions.

---

## Table of Contents

- [Automated Enforcement](#automated-enforcement)
- [TypeScript Configuration](#typescript-configuration)
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [Imports](#imports)
- [Types and Interfaces](#types-and-interfaces)
- [React Components](#react-components)
- [Error Handling](#error-handling)
- [Comments and Documentation](#comments-and-documentation)
- [What to Avoid](#what-to-avoid)

---

## Automated Enforcement

### Biome Configuration

CSV Detox uses [Biome](https://biomejs.dev/) for linting and formatting. Configuration is in `biome.jsonc`.

**⚠️ IMPORTANT**: Do NOT modify `biome.jsonc` without user approval. It contains:
- Carefully tuned lint rules
- Specific exceptions for complex components
- Tailwind CSS and accessibility overrides
- Test file special handling

**Commands**:
```bash
npm run lint        # Check for lint errors
npm run lint:fix    # Auto-fix lint errors
npm run format      # Format code
npm run check       # Format + lint + organize imports (use this!)
```

**Automatically enforced**:
- ✅ 2-space indentation
- ✅ Double quotes for strings
- ✅ Semicolons required
- ✅ Trailing commas in multi-line structures
- ✅ Line width: 100 characters
- ✅ No `any` types (error, with justified exceptions)
- ✅ No `var` usage (use `const`/`let`)
- ✅ No unused imports or variables
- ✅ Import type separation (`import type { ... }`)
- ✅ Organize imports alphabetically
- ✅ No `console.log` in production code (warning)

Run `npm run check` before committing to ensure compliance.

---

## TypeScript Configuration

### Strict Mode

CSV Detox uses **TypeScript strict mode**:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "allowJs": false
  }
}
```

### Key Rules

- ✅ **No `any` types** — Always use explicit types
- ✅ **No JavaScript files** — TypeScript only
- ✅ **Strict null checks** — Handle `null`/`undefined` explicitly
- ✅ **No implicit `any`** — All parameters must be typed

---

## File Organization

### Folder Structure

```
src/
├── lib/              # Pure logic, utilities, business logic
│   ├── csv-parser.ts
│   ├── transformations/
│   └── __tests__/
├── app/              # Next.js App Router
│   ├── api/          # API routes (thin handlers)
│   ├── projects/     # Pages
│   └── layout.tsx
├── components/       # Application components
│   └── ui/           # shadcn/ui components
convex/               # Convex backend
├── schema.ts
├── mutations.ts
└── queries.ts
```

### Where Code Goes

| Code Type | Location | Example |
|-----------|----------|---------|
| Business logic | `src/lib/**` | CSV parsing, transformations |
| API routes | `src/app/api/**` | File upload endpoints |
| React components (app) | `src/components/**` | AssistantChat, FileUploader |
| UI primitives | `src/components/ui/**` | Button, Card (shadcn/ui) |
| Backend logic | `convex/**` | Database queries, mutations |
| Tests | `__tests__/` next to code | Same directory as tested file |
| E2E tests | `e2e/` | Playwright specs |

---

## Naming Conventions

### Files

```typescript
// Utilities, libraries: kebab-case
src/lib/csv-parser.ts ✅
src/lib/CSVParser.ts ❌

// React components: PascalCase
src/components/AssistantChat.tsx ✅
src/components/assistant-chat.tsx ❌

// Tests: Same as file + .test.ts
src/lib/__tests__/csv-parser.test.ts ✅
```

### Variables and Functions

```typescript
// camelCase for variables and functions
const fileName = "data.csv"; ✅
const FileName = "data.csv"; ❌

function parseCSV(input: string) { } ✅
function ParseCSV(input: string) { } ❌
```

### Types and Interfaces

```typescript
// PascalCase for types and interfaces
interface ParseOptions { } ✅
interface parseOptions { } ❌

type TransformStep = { }; ✅
type transformStep = { }; ❌
```

### Constants

```typescript
// UPPER_SNAKE_CASE for true constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; ✅
const maxFileSize = 50 * 1024 * 1024; ❌

// But not for computed values
const apiUrl = process.env.API_URL; ✅ (not constant at compile time)
```

### React Components

```typescript
// PascalCase, descriptive names
export default function AssistantChat() { } ✅
export default function chat() { } ❌

// Prefer named exports for non-page components
export function FileUploader() { } ✅

// Default exports for pages/layouts (Next.js convention)
export default function ProjectPage() { } ✅
```

---

## Imports

### Path Aliases

Always use `@/*` for internal imports:

```typescript
// ✅ Good
import { parseCSV } from "@/lib/csv-parser";
import { Button } from "@/components/ui/button";

// ❌ Bad
import { parseCSV } from "../../lib/csv-parser";
import { Button } from "../ui/button";
```

### Import Order

Biome automatically organizes imports alphabetically and groups them:

1. External packages (`react`, `convex/react`, etc.)
2. Internal modules (`@/lib/*`, `@/components/*`)
3. Type imports are separated using `import type { ... }`

**No manual sorting needed** — `npm run check` handles this automatically.

### Type-Only Imports

Use `import type` for type-only imports (enforced by Biome):

```typescript
// ✅ Good — explicit type import
import type { ReactNode } from "react";
import type { ParseOptions } from "@/lib/types";

// ❌ Bad — mixed types and values (Biome will flag this)
import { useState, ReactNode } from "react";
```

---

## Types and Interfaces

### When to Use Each

```typescript
// Use `interface` for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Use `type` for unions, intersections, primitives
type Status = "pending" | "active" | "archived";
type ID = string | number;
type UserWithMetadata = User & { createdAt: Date };
```

### Type Annotations

```typescript
// ✅ Always annotate function parameters
function processFile(file: File, options: ParseOptions): Result {
  // ...
}

// ✅ Annotate return types for exported functions
export function parseCSV(input: string): ParseResult {
  // ...
}

// ✅ Let TypeScript infer simple variables
const count = 5; // inferred as number ✅
const count: number = 5; // redundant ❌
```

### Avoid `any`

```typescript
// ❌ Never use `any`
function process(data: any) { }

// ✅ Use `unknown` if truly unknown
function process(data: unknown) {
  if (typeof data === "string") {
    // TypeScript knows data is string here
  }
}

// ✅ Or use generics
function process<T>(data: T): T {
  return data;
}
```

### Use `satisfies` Operator

```typescript
// ✅ Type-check without widening type
const config = {
  maxSize: 50,
  allowedTypes: ["csv", "xlsx"]
} satisfies Config;

// Now config.maxSize is `number`, not `Config["maxSize"]`
```

### Avoid Type Assertions

```typescript
// ❌ Avoid `as` unless absolutely necessary
const value = unknownValue as string;

// ✅ Use type guards instead
if (typeof unknownValue === "string") {
  const value = unknownValue; // TypeScript knows it's string
}
```

---

## React Components

### Server Components by Default

```typescript
// ✅ Server Component (default in Next.js App Router)
export default function ProjectPage() {
  return <div>Content</div>;
}

// ✅ Client Component (only when needed)
"use client";

import { useState } from "react";

export default function InteractiveWidget() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### When to Use "use client"

Use `"use client"` directive when you need:

- React hooks (`useState`, `useEffect`, etc.)
- Browser APIs (`window`, `localStorage`, etc.)
- Event handlers (`onClick`, `onSubmit`, etc.)
- Third-party libraries that require client-side

### Component Structure

```typescript
// ✅ Clear component structure
interface MyComponentProps {
  title: string;
  items: string[];
  onSelect?: (item: string) => void;
}

export function MyComponent({ title, items, onSelect }: MyComponentProps) {
  // 1. Hooks at top
  const [selected, setSelected] = useState<string | null>(null);
  
  // 2. Derived state
  const hasItems = items.length > 0;
  
  // 3. Event handlers
  const handleSelect = (item: string) => {
    setSelected(item);
    onSelect?.(item);
  };
  
  // 4. Early returns
  if (!hasItems) {
    return <div>No items</div>;
  }
  
  // 5. Main render
  return (
    <div>
      <h2>{title}</h2>
      {items.map(item => (
        <button key={item} onClick={() => handleSelect(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}
```

### Props Destructuring

```typescript
// ✅ Destructure props in function signature
export function MyComponent({ title, items }: Props) {
  return <div>{title}</div>;
}

// ❌ Don't use props object
export function MyComponent(props: Props) {
  return <div>{props.title}</div>;
}
```

---

## Error Handling

### Never Swallow Errors

```typescript
// ❌ Don't swallow errors
try {
  parseCSV(input);
} catch {
  // Silent failure
}

// ✅ At minimum, log with context
try {
  parseCSV(input);
} catch (error) {
  console.error("Failed to parse CSV:", error);
  throw error;
}
```

### Use Result Types or Throw

```typescript
// ✅ Option 1: Result type
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

function parseCSV(input: string): Result<Data> {
  try {
    const data = parse(input);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ✅ Option 2: Throw descriptive errors
function parseCSV(input: string): Data {
  if (!input) {
    throw new Error("CSV input is empty");
  }
  // ...
}
```

### Validate at Boundaries

```typescript
// ✅ Validate inputs at API boundaries
export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate before processing
  if (!body.file || typeof body.file !== "string") {
    return Response.json(
      { error: "Invalid file parameter" },
      { status: 400 }
    );
  }
  
  // Now safe to use
  const result = processFile(body.file);
  return Response.json(result);
}
```

### Never Log Raw User Data

```typescript
// ❌ NEVER log sensitive user data
console.log("Processing file:", fileContents);

// ✅ Log metadata only
console.log("Processing file:", {
  size: file.size,
  type: file.type,
  name: file.name,
});
```

---

## Comments and Documentation

### When to Comment

```typescript
// ✅ Explain WHY, not WHAT
// Using UPDATE instead of SELECT for better memory efficiency with large files
await db.execute(`UPDATE data SET ...`);

// ❌ Don't state the obvious
// Increment count by 1
count++;
```

### JSDoc for Public APIs

```typescript
/**
 * Parses a CSV string into structured data
 * 
 * @param input - Raw CSV string
 * @param options - Parsing configuration
 * @returns Parsed data with headers and rows
 * @throws {Error} If CSV format is invalid
 */
export function parseCSV(
  input: string,
  options: ParseOptions
): ParseResult {
  // ...
}
```

### TODOs

```typescript
// ❌ Don't leave TODOs in code
// TODO: Add error handling

// ✅ Create a GitHub issue instead
```

---

## What to Avoid

### Don't

- ❌ Use `any` type without justification (enforced by Biome with specific exceptions)
- ❌ Use `var` (use `const`/`let`, enforced by Biome)
- ❌ Ignore TypeScript errors
- ❌ Leave `console.log` in production code (use `console.info`, `console.warn`, or `console.error`)
- ❌ Swallow errors silently
- ❌ Use `@ts-ignore` (fix the type issue or add proper type assertion)
- ❌ Put business logic in API routes
- ❌ Create god files (>500 lines without justification)
- ❌ Use relative imports (`../../`) — use path aliases (`@/*`)
- ❌ Leave TODOs in code (create GitHub issues instead)
- ❌ Modify `biome.jsonc` without user approval

### Do

- ✅ Run `npm run check` before committing (enforces all style rules)
- ✅ Use `const` by default (enforced by Biome)
- ✅ Use strict TypeScript
- ✅ Use path aliases (`@/*`)
- ✅ Handle errors with context
- ✅ Validate at boundaries
- ✅ Keep functions small and focused
- ✅ Write tests for business logic
- ✅ Update docs when APIs change
- ✅ Ask before modifying linter configuration

---

## Quick Checklist

Before submitting code, verify:

- [ ] Ran `npm run check` (auto-fixes formatting + lint)
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Error handling present
- [ ] Functions are focused and small
- [ ] Types are explicit where needed
- [ ] Naming follows conventions

---

**Need examples?** Check [COMMON_TASKS.md](./COMMON_TASKS.md) for real-world code examples.
