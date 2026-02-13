# Common Tasks Guide — CSV Detox

Step-by-step guides for frequent development tasks.

---

## Table of Contents

- [Adding a Transformation Operation](#adding-a-transformation-operation)
- [Adding a shadcn/ui Component](#adding-a-shadcnui-component)
- [Creating a Convex Mutation or Query](#creating-a-convex-mutation-or-query)
- [Adding a New Assistant Tool](#adding-a-new-assistant-tool)
- [Fixing TypeScript Errors](#fixing-typescript-errors)
- [Updating Documentation](#updating-documentation)

---

## Adding a Transformation Operation

### Overview

Transformation operations process data (trim, filter, sort, cast, etc.). They translate to SQL for both preview and export.

### Steps

#### 1. Define the Operation Type

Add to shared types:

```typescript
// src/lib/types.ts
export type TransformationStep =
  | { id: string; type: "trim"; config: TrimConfig }
  | { id: string; type: "newOperation"; config: NewOperationConfig }; // ✅ Add here

export interface NewOperationConfig {
  type: "newOperation";
  // Define config fields
  targetColumn: string;
  parameter: string;
}
```

#### 2. Implement SQL Translation

```typescript
// src/lib/sql-translator.ts (or sqlite equivalent)
function translateStep(step: TransformationStep): string {
  switch (step.type) {
    case "newOperation": {
      const { targetColumn, parameter } = step.config;
      // Escape column name and parameter
      const col = escapeIdentifier(targetColumn);
      const param = escapeLiteral(parameter);
      return `UPDATE data SET ${col} = SOME_SQL_FUNCTION(${col}, ${param})`;
    }
    // ... other cases
  }
}
```

#### 3. Add Unit Tests

```typescript
// src/lib/__tests__/sql-translator.test.ts
describe("SQL translator", () => {
  describe("newOperation", () => {
    it("should generate correct SQL", () => {
      const steps: TransformationStep[] = [
        {
          id: "1",
          type: "newOperation",
          config: {
            type: "newOperation",
            targetColumn: "name",
            parameter: "value",
          },
        },
      ];

      const sql = translatePipeline(steps);

      assert.strictEqual(
        sql[0],
        'UPDATE data SET "name" = SOME_SQL_FUNCTION("name", \'value\')'
      );
    });

    it("should handle special characters in column name", () => {
      const steps: TransformationStep[] = [
        {
          id: "1",
          type: "newOperation",
          config: {
            type: "newOperation",
            targetColumn: 'user"name',
            parameter: "test",
          },
        },
      ];

      const sql = translatePipeline(steps);

      assert.strictEqual(
        sql[0],
        'UPDATE data SET "user""name" = SOME_SQL_FUNCTION("user""name", \'test\')'
      );
    });
  });
});
```

#### 4. Update Convex Schema (if needed)

```typescript
// convex/schema.ts
steps: v.array(
  v.union(
    v.object({ id: v.string(), type: v.literal("trim"), config: v.any() }),
    v.object({ id: v.string(), type: v.literal("newOperation"), config: v.any() }), // ✅ Add here
    // ... other operations
  )
),
```

#### 5. Add UI Component (if needed)

```typescript
// src/components/NewOperationConfig.tsx
export function NewOperationConfig({ onChange }: Props) {
  return (
    <div>
      <Label>Target Column</Label>
      <Select onValueChange={(value) => onChange({ targetColumn: value })}>
        {/* ... options */}
      </Select>
      
      <Label>Parameter</Label>
      <Input onChange={(e) => onChange({ parameter: e.target.value })} />
    </div>
  );
}
```

#### 6. Test End-to-End

- Create a test pipeline with new operation
- Verify preview works (SQLite)
- Verify export works (client-side export)
- Check edge cases (empty columns, special chars, etc.)

---

## Adding a shadcn/ui Component

### Overview

shadcn/ui components are copy-pasted into your project, not installed via npm. This allows full customization.

### Steps

#### 1. Install the Component

```bash
npx shadcn@latest add <component-name>
```

Example:
```bash
npx shadcn@latest add dropdown-menu
```

This creates `src/components/ui/dropdown-menu.tsx`.

#### 2. Import and Use

```typescript
// src/components/MyComponent.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MyComponent() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 3. Customize (if needed)

Edit `src/components/ui/dropdown-menu.tsx` directly:

```typescript
// Add custom variant
const dropdownMenuItemVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "...",
        destructive: "text-red-600", // ✅ Add custom variant
      },
    },
  }
);
```

#### 4. Update Documentation

If adding a new pattern, document in `docs/internal/PATTERNS.md`.

### Common Components

| Component | Use Case |
|-----------|----------|
| `button` | Buttons with variants |
| `card` | Content containers |
| `dialog` | Modal dialogs |
| `dropdown-menu` | Context menus |
| `input` | Form inputs |
| `select` | Dropdowns |
| `toast` | Notifications |
| `table` | Data tables |
| `sheet` | Side drawers |

---

## Creating a Convex Mutation or Query

### Overview

Convex mutations write data, queries read data. Both are strongly typed and reactive.

### Creating a Query

```typescript
// convex/queries.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getProjectById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    return project;
  },
});
```

**Using in React:**

```typescript
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

const project = useQuery(api.queries.getProjectById, { projectId: "..." });
```

### Creating a Mutation

```typescript
// convex/mutations.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateProjectName = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate
    if (args.name.trim().length === 0) {
      throw new Error("Name cannot be empty");
    }

    // Update
    await ctx.db.patch(args.projectId, {
      name: args.name,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
```

**Using in React:**

```typescript
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";

const updateProjectName = useMutation(api.mutations.updateProjectName);

// Later
await updateProjectName({ projectId: "...", name: "New Name" });
```

### Best Practices

- ✅ **Validate inputs** — Check all args at the start
- ✅ **Return useful data** — Return IDs, updated objects, etc.
- ✅ **Throw descriptive errors** — Help debug issues
- ✅ **Use transactions** — Mutations are atomic by default
- ✅ **Index wisely** — Add indexes for common queries

---

## Adding a New Assistant Tool

### Overview

The AI assistant uses tools to interact with data. Tools are functions the AI can call.

### Steps

#### 1. Define the Tool

```typescript
// src/app/api/assistant/chat/route.ts
const tools = {
  // ... existing tools
  
  newTool: {
    description: "Brief description of what this tool does",
    inputSchema: z.object({
      param1: z.string().describe("Description of param1"),
      param2: z.number().describe("Description of param2"),
    }),
    execute: async ({ param1, param2 }) => {
      // Implement tool logic
      // Can query Convex, run SQL, etc.
      
      const result = await doSomething(param1, param2);
      
      return JSON.stringify({
        success: true,
        result,
      });
    },
  },
};
```

#### 2. Test the Tool

```typescript
// Manual test in assistant
// User: "Use newTool with param1='test' and param2=42"
// AI should call the tool and return results
```

#### 3. Update Tool List in Component

If you want to show tool invocations in the UI:

```typescript
// src/components/AssistantChat.tsx
const toolNames: Record<string, string> = {
  // ... existing tools
  newTool: "New Tool", // ✅ Add here for nice display
};
```

#### 4. Document the Tool

Add to ARCHITECTURE.md or PATTERNS.md if it's a significant capability.

---

## Fixing TypeScript Errors

### Common Errors and Solutions

#### Error: `Type 'X' is not assignable to type 'Y'`

```typescript
// ❌ Problem
const value: string = 42;

// ✅ Solution: Fix the type
const value: number = 42;

// OR: Cast if you're sure
const value = 42 as unknown as string; // Use sparingly!
```

#### Error: `Object is possibly 'null' or 'undefined'`

```typescript
// ❌ Problem
const project = await ctx.db.get(projectId);
return project.name; // Error: project might be null

// ✅ Solution 1: Throw if null
const project = await ctx.db.get(projectId);
if (!project) {
  throw new Error("Project not found");
}
return project.name; // TypeScript knows project is not null here

// ✅ Solution 2: Optional chaining
return project?.name;

// ✅ Solution 3: Nullish coalescing
return project?.name ?? "Unnamed";
```

#### Error: `Parameter 'x' implicitly has an 'any' type`

```typescript
// ❌ Problem
function process(data) {
  return data.value;
}

// ✅ Solution: Add type annotation
function process(data: { value: string }) {
  return data.value;
}
```

#### Error: `Cannot find module '@/lib/module'`

```typescript
// ❌ Problem
import { fn } from "@/lib/module";

// ✅ Solution: Check the path
// Verify file exists at src/lib/module.ts or src/lib/module/index.ts

// ✅ Or check tsconfig.json paths are correct
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Debugging Strategy

1. **Read the error carefully** — TypeScript errors are usually specific
2. **Check the types** — Hover over variables in VS Code to see inferred types
3. **Fix from the source** — Don't just cast, fix the root cause
4. **Use type guards** — `if (typeof x === "string")` narrows types
5. **Explicit return types** — Help catch errors early

---

## Updating Documentation

### When to Update Docs

- ✅ **API changes** — Update relevant guide
- ✅ **Schema changes** — Update ARCHITECTURE.md
- ✅ **New patterns** — Update PATTERNS.md
- ✅ **User-facing changes** — Update docs/public/
- ✅ **Common tasks** — Add to COMMON_TASKS.md

### Which Docs to Update

| Change Type | Documentation to Update |
|-------------|-------------------------|
| New transformation | COMMON_TASKS.md (this file), ARCHITECTURE.md |
| New Convex mutation | ARCHITECTURE.md (Database Schema section) |
| New UI pattern | CODE_STYLE.md, PATTERNS.md |
| New test pattern | TESTING.md |
| New workflow | WORKFLOW.md |
| New skill | SKILLS_REFERENCE.md |
| Architecture change | ARCHITECTURE.md, PATTERNS.md |
| User-facing feature | docs/public/USAGE.md |

### Documentation Checklist

Before marking work complete:

- [ ] Updated relevant agent guides
- [ ] Updated PATTERNS.md if new pattern introduced
- [ ] Updated ARCHITECTURE.md if system design changed
- [ ] Updated public docs if user-visible change
- [ ] Verified all internal links still work
- [ ] Added examples where helpful

---

## Quick Tips

### General Development

- Always run `npm test` before committing
- Document significant changes in PR description
- Check PATTERNS.md before introducing new patterns
- Small PRs are better than big ones

### Performance

- Preview uses SQLite (fast, 5K rows)
- Export uses client-side processing (slower, unlimited)
- Cache database instances globally
- Use in-place UPDATEs, not new tables

### Debugging

- Check browser console for client errors
- Check terminal for server errors
- Use `console.log` during development (remove before commit)
- Playwright `--debug` mode is your friend

---

**Need more help?** Check other guides:
- [CODE_STYLE.md](./CODE_STYLE.md) — Coding conventions
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design
- [TESTING.md](./TESTING.md) — Testing patterns
- [WORKFLOW.md](./WORKFLOW.md) — Development workflow
