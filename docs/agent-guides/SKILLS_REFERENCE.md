# Skills Reference — CSV Detox

Catalog of available skills and when to use them.

---

## Overview

Skills provide specialized domain knowledge for AI agents. CSV Detox has **6 skills** available, plus 1 global skill (find-skills).

### What are Skills?

Skills are modular instructions that agents can load for specific tasks. They provide:
- Domain-specific best practices
- Detailed reference documentation
- Code examples and patterns
- Links to official documentation

### How to Use Skills

**Agents automatically load appropriate skills** based on their configuration. You can also invoke skills explicitly when needed.

---

## Available Skills

### 1. **ai-sdk** ⭐ 

**Location**: `.agents/skills/ai-sdk/`  
**Used by**: Build Agent, Test Agent

#### Purpose

Answer questions about the AI SDK and help build AI-powered features.

#### When to Use

- Building chatbot features
- Implementing streaming responses
- Adding tool calling to AI assistant
- Using AI SDK hooks (`useChat`, `useCompletion`)
- Integrating AI providers (OpenAI, Anthropic, Azure, etc.)

#### Key Topics

- `generateText` / `streamText`
- Tool calling and function execution
- Streaming responses
- React hooks (`useChat`, `useCompletion`)
- Provider configuration
- Structured output
- Embeddings

#### Example Use Case

```typescript
// When implementing AI assistant features:
// - Creating new tools for assistant
// - Debugging streaming issues
// - Adding structured output
// - Configuring AI models
```

**Trigger words**: "AI SDK", "generateText", "streamText", "tool calling", "useChat"

---

### 2. **avoid-feature-creep** 🎯

**Location**: `.agents/skills/avoid-feature-creep/`  
**Used by**: Build Agent, Plan Agent

#### Purpose

Prevent feature creep when building software. Keep scope focused and ship faster.

#### When to Use

- Planning new features
- Reviewing feature requests
- Managing project scope
- During backlog grooming
- When someone says "just one more feature"

#### Key Principles

- **Start with MVP** — Minimal Viable Product first
- **Question assumptions** — Is this feature needed?
- **User value first** — Does this solve a real problem?
- **Say no often** — Most features can wait
- **Iterate** — Add features based on actual usage

#### Example Use Case

```markdown
User: "Let's add real-time collaboration, user authentication, 
       and advanced analytics to the CSV tool."

Plan Agent (with avoid-feature-creep skill):
"Let's focus on core CSV transformation first. Real-time collab 
 and auth can be added later based on actual user needs. 
 What's the smallest useful version we can ship?"
```

**Trigger words**: "feature planning", "scope", "MVP", "should we add"

---

### 3. **convex-best-practices** 📊

**Location**: `.agents/skills/convex-best-practices/`  
**Used by**: Build Agent, Plan Agent

#### Purpose

Guidelines for building production-ready Convex apps.

#### When to Use

- Creating Convex queries/mutations
- Designing database schema
- Organizing Convex functions
- Optimizing query performance
- Handling errors in Convex
- Following the "Zen of Convex"

#### Key Topics

- Function organization (queries vs mutations vs actions)
- Schema design and validation
- Index configuration
- Error handling patterns
- TypeScript best practices
- Query optimization
- Testing Convex functions

#### Example Use Case

```typescript
// When creating a new Convex mutation:
export const createPipeline = mutation({
  args: {
    name: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    // Validate inputs (best practice)
    if (args.name.trim().length === 0) {
      throw new Error("Name cannot be empty");
    }
    
    // Check existence (best practice)
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    
    // Create with timestamp (best practice)
    const pipelineId = await ctx.db.insert("pipelines", {
      name: args.name,
      projectId: args.projectId,
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return pipelineId;
  },
});
```

**Trigger words**: "Convex", "mutation", "query", "schema", "database"

---

### 4. **convex-http-actions** 🌐

**Location**: `.agents/skills/convex-http-actions/`  
**Used by**: Build Agent

#### Purpose

External API integration and webhook handling in Convex.

#### When to Use

- Creating HTTP endpoints in Convex
- Handling webhooks
- Integrating with external APIs
- Setting up CORS
- Request/response handling
- Authentication for HTTP actions

#### Key Topics

- HTTP endpoint routing
- Request parsing (JSON, form data, etc.)
- Response formats
- CORS configuration
- Webhook signature validation
- Error handling
- Authentication patterns

#### Example Use Case

```typescript
// When creating a webhook handler:
import { httpRouter } from "convex/server";

const http = httpRouter();

http.route({
  path: "/webhook/stripe",
  method: "POST",
  handler: async (request, { runMutation }) => {
    // Verify signature (best practice)
    const signature = request.headers.get("stripe-signature");
    if (!verifySignature(signature, await request.text())) {
      return new Response("Invalid signature", { status: 401 });
    }
    
    // Process webhook
    await runMutation(api.mutations.handleStripeWebhook, { ... });
    
    return new Response("Success", { status: 200 });
  },
});

export default http;
```

**Trigger words**: "HTTP", "webhook", "API endpoint", "CORS"

---

### 5. **convex-realtime** ⚡

**Location**: `.agents/skills/convex-realtime/`  
**Used by**: Build Agent

#### Purpose

Patterns for building reactive apps with Convex subscriptions.

#### When to Use

- Implementing real-time updates
- Managing subscriptions
- Optimistic updates
- Paginated queries with cursor-based loading
- Cache behavior
- Reactive UI patterns

#### Key Topics

- Subscription management
- `useQuery` patterns
- Optimistic updates with `useMutation`
- Pagination strategies
- Cache invalidation
- Real-time data flow

#### Example Use Case

```typescript
// Real-time project list:
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

function ProjectList() {
  // Automatically subscribes and updates
  const projects = useQuery(api.queries.getProjects);
  
  if (projects === undefined) {
    return <div>Loading...</div>;
  }
  
  return (
    <ul>
      {projects.map(project => (
        <li key={project._id}>{project.name}</li>
      ))}
    </ul>
  );
}
```

**Trigger words**: "real-time", "subscription", "reactive", "pagination"

---

### 6. **convex-schema-validator** ✅

**Location**: `.agents/skills/convex-schema-validator/`  
**Used by**: Build Agent

#### Purpose

Defining and validating database schemas with proper typing.

#### When to Use

- Creating new Convex tables
- Adding fields to existing tables
- Setting up indexes
- Handling optional fields
- Union types in schema
- Schema migration strategies

#### Key Topics

- Schema definition (`defineSchema`, `defineTable`)
- Validators (`v.string()`, `v.number()`, `v.optional()`, etc.)
- Index configuration
- Union types
- Schema evolution
- Type safety
- Migration patterns

#### Example Use Case

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  pipelines: defineTable({
    name: v.string(),
    projectId: v.id("projects"),
    parseConfig: v.optional(
      v.object({
        sheetName: v.optional(v.string()),
        hasHeaders: v.boolean(),
      })
    ),
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        config: v.any(), // Can be more specific
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_created", ["createdAt"]),
});
```

**Trigger words**: "schema", "validator", "index", "migration"

---

### 7. **find-skills** (Global) 🔍

**Location**: System skill (not in this repo)  
**Used by**: All agents (on-demand)

#### Purpose

Helps discover and install new agent skills.

#### When to Use

- User asks "how do I do X?"
- Looking for functionality that might exist as a skill
- Exploring what skills are available

**Trigger words**: "find skill", "is there a skill for", "install skill"

---

## Skill Selection Guide

### By Agent

| Agent | Skills Available | Why? |
|-------|------------------|------|
| **Build** | All 6 skills | Needs full context for implementation |
| **Plan** | avoid-feature-creep, convex-best-practices | Focus on design and scope |
| **Test** | ai-sdk | For testing AI assistant features |
| **Maintenance** | None | Specialized for housekeeping |

### By Task Type

| Task | Recommended Skill |
|------|-------------------|
| Adding transformation | convex-schema-validator, convex-best-practices |
| AI assistant features | ai-sdk |
| Database queries | convex-best-practices, convex-schema-validator |
| Real-time updates | convex-realtime |
| Webhooks/APIs | convex-http-actions |
| Feature planning | avoid-feature-creep |
| Schema changes | convex-schema-validator |

---

## How Skills Work

### Automatic Loading

Agents automatically load skills based on their configuration:

```yaml
# .opencode/agents/build.yaml
skills:
  - ai-sdk
  - avoid-feature-creep
  - convex-best-practices
  - convex-http-actions
  - convex-realtime
  - convex-schema-validator
```

### Explicit Invocation

You can also load skills explicitly when needed:

```
User: "Load the ai-sdk skill and help me implement streaming chat"
Agent: [Loads ai-sdk skill] "I'll help you implement streaming chat..."
```

### Skill Content

Each skill provides:
- **Instructions** — Best practices and guidelines
- **Examples** — Code snippets and patterns
- **References** — Links to official docs
- **Trigger patterns** — When to use the skill

---

## Adding a New Skill

If you need to add a new skill:

1. **Create skill directory**: `.agents/skills/my-skill/`
2. **Add SKILL.md**: Document the skill
3. **Create symlink**: `.opencode/skills/my-skill -> ../../.agents/skills/my-skill`
4. **Update agent configs**: Add skill to relevant agents
5. **Update this file**: Document the new skill

---

## Quick Reference

### Most Used Skills

1. **convex-best-practices** — Almost every Convex interaction
2. **ai-sdk** — All AI assistant work
3. **convex-schema-validator** — Schema changes

### When in Doubt

- **Building Convex features?** → Use `convex-best-practices`
- **Working with AI?** → Use `ai-sdk`
- **Planning features?** → Use `avoid-feature-creep`
- **Need real-time updates?** → Use `convex-realtime`
- **Creating webhooks?** → Use `convex-http-actions`
- **Changing schema?** → Use `convex-schema-validator`

---

**Need to use a skill?** Just mention it or let your agent load it automatically based on the task!
