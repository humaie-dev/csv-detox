# Workflow Guide — CSV Detox

This guide explains the development workflow for CSV Detox, including quality gates and Definition of Done.

---

## Table of Contents

- [Overview](#overview)
- [Development Workflow](#development-workflow)
- [Quality Gates](#quality-gates)
- [Definition of Done](#definition-of-done)
- [Git Conventions](#git-conventions)
- [Selecting an Agent](#selecting-an-agent)
- [When to Ask for Help](#when-to-ask-for-help)

---

## Overview

CSV Detox uses a **spec-free, prompt-driven workflow**:

- ✅ Requirements come from **PR descriptions, issues, or prompts**
- ✅ Agents work autonomously within quality gates
- ✅ No formal specs required
- ✅ Current work state lives in PR descriptions and git history

---

## Development Workflow

### 1. Start New Work

```
1. Read PR description and issue context — Understand requirements
2. Read docs/agent-guides/INDEX.md — Find relevant guides
3. Check docs/agent-guides/COMMON_TASKS.md — Similar examples
4. Review docs/internal/PATTERNS.md — Established patterns
```

### 2. Plan the Work

```
- What files need to change?
- What tests need to be added/updated?
- What documentation needs updating?
- Are there similar examples in the codebase?
- What are the edge cases?
```

For complex features, consider using **Plan Agent** first.

### 3. Implement

```
- Make small, incremental changes
- Follow CODE_STYLE.md guidelines
- Add/update tests as you go
- Document decisions in PR comments or commit messages
```

### 4. Verify Quality Gates

```bash
# Lint code
npm run check

# Run tests
npm test

# Build project
npm run build
```

All gates must pass before proceeding.

### 5. Document Changes

```
- Update PR description with what changed
- Add meaningful commit messages
- Update relevant documentation
- Note any important decisions in PR comments
```

### 6. Complete Work

```
- All quality gates pass
- Documentation updated
- PR description reflects all changes
- Ready for review/merge
```

---

## Quality Gates

**Every change must pass these gates before completion:**

### 1. ✅ Lint Passes

```bash
npm run check
# OR individually:
npm run lint      # Check lint errors
npm run format    # Format code
```

- No lint errors (warnings are acceptable)
- Code properly formatted with Biome
- Imports organized automatically

### 2. ✅ Tests Pass

```bash
npm test
```

- All existing tests pass
- New tests added for new functionality
- Tests are meaningful (not just for coverage)

### 3. ✅ Build Succeeds

```bash
npm run build
```

- No TypeScript errors
- No build warnings
- Production build works

### 4. ✅ No New Warnings/Errors

- Check browser console (no new warnings)
- Check terminal output (no new errors)
- No `console.log` left in production code (use `console.info`, `console.warn`, or `console.error`)

### 5. ✅ Documentation Updated

**When to update docs:**

- **API changes** → Update relevant guide in `docs/agent-guides/`
- **Schema changes** → Update `ARCHITECTURE.md`
- **New patterns** → Update `docs/internal/PATTERNS.md`
- **User-facing changes** → Update `docs/public/`
- **New common tasks** → Add to `COMMON_TASKS.md`

### 6. ✅ Code Style Followed

- Run `npm run check` before committing
- Biome enforces code style automatically (see [CODE_STYLE.md](./CODE_STYLE.md))
- **Never modify `biome.jsonc` without explicit approval** (see CODE_STYLE.md)
- TypeScript strict mode (no `any` without justification)
- Path aliases (`@/*`)
- Consistent naming
- Proper error handling

---

## Definition of Done

A task is "done" when:

1. **Functionality complete** — Requirements met
2. **Lint passes** — `npm run check` succeeds
3. **Tests pass** — `npm test` succeeds
4. **Build succeeds** — `npm run build` works
5. **No regressions** — No new warnings/errors
6. **Docs updated** — Relevant documentation current
7. **PR description current** — Changes documented in PR
8. **Code reviewed** — Follows style guide
9. **Quality gates passed** — All checkboxes ticked

---

## Git Conventions

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — Formatting, no code change
- `refactor` — Code change, no feature/bug
- `test` — Adding/updating tests
- `chore` — Maintenance, deps, config

**Examples:**
```
feat(transform): add column type casting operation

fix(export): handle empty CSV files correctly

docs(guides): add E2E testing section to TESTING.md

chore(deps): upgrade @playwright/test to 1.40.0
```

### Branch Naming

```
<type>/<short-description>

Examples:
feat/column-casting
fix/csv-export-empty-files
docs/testing-guide
chore/upgrade-playwright
```

### Pull Requests

**Title:** Same format as commit messages

**Description template:**
```markdown
## What changed?
[Brief description]

## Why?
[Reason for change]

## How to test?
[Steps to verify]

## Related
- Closes #123
- Related to #456
```

---

## Selecting an Agent

### Default: Build Agent

Most requests automatically go to **Build Agent** (GPT-5.3-Codex).

### Invoke Specific Agent

Use keywords in your prompt:

**Plan Agent** (GPT-5.2):
- "design a solution for..."
- "how should we architect..."
- "plan the approach for..."

**Test Agent** (GPT-5.3-Codex):
- "write tests for..."
- "improve test coverage..."
- "add e2e tests for..."

**Maintenance Agent** (GPT-5.2):
- "cleanup the codebase"
- "update documentation"
- "housekeeping"

**Code Review Agent** (GPT-5.2-Codex):
- "review this PR"
- "run automated code review"
- "check PR for issues"

### Explicit Selection

Or explicitly mention the agent:
```
@plan-agent How should we approach adding real-time updates?
@test-agent Write E2E tests for the upload flow
@maintenance-agent Review and update outdated docs
@code-review-agent Review this PR and flag issues
```

---

## When to Ask for Help

Agents should ask before:

### Always Ask
- ❓ Adding new **dependencies** (npm packages)
- ❓ Making **architectural changes** (new patterns, folder structure)
- ❓ **Major refactors** affecting multiple modules
- ❓ **Breaking changes** to APIs or schemas

### Consider Asking
- ❓ Uncertain about **approach** (Plan Agent can help)
- ❓ Pattern not in **PATTERNS.md** (might exist but not documented)
- ❓ **Complex feature** with multiple approaches
- ❓ **Performance concerns** (needs profiling/testing)

### No Need to Ask
- ✅ Bug fixes (non-breaking)
- ✅ Adding tests
- ✅ Documentation updates
- ✅ Following established patterns
- ✅ Refactoring within same module

---

## Quick Reference

### Starting Work
1. Read PR description and issue context
2. Check INDEX.md for relevant guides
3. Review COMMON_TASKS.md for examples
4. Check PATTERNS.md for established patterns

### During Work
1. Make small changes
2. Test continuously
3. Document decisions in PR comments
4. Follow CODE_STYLE.md

### Before Completion
1. ✅ Tests pass
2. ✅ Build succeeds
3. ✅ No warnings
4. ✅ Docs updated
5. ✅ PR description current
6. ✅ Quality gates met

---

**Need more details?** Check:
- [CODE_STYLE.md](./CODE_STYLE.md) — Coding conventions
- [TESTING.md](./TESTING.md) — Testing guidelines
- [COMMON_TASKS.md](./COMMON_TASKS.md) — Task examples
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design
