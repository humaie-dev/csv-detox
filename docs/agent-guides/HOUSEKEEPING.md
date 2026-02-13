# Housekeeping Guide — CSV Detox

Repository maintenance checklist and automated housekeeping workflow.

---

## Overview

The Maintenance Agent performs regular repository health checks to catch issues early and keep documentation current.

**Automated schedule**: Daily at 9:00 AM UTC via GitHub Actions

---

## Table of Contents

- [Daily Maintenance Tasks](#daily-maintenance-tasks)
- [Weekly/Monthly Tasks](#weeklymonthly-tasks)
- [Automated Workflow](#automated-workflow)
- [Manual Maintenance](#manual-maintenance)
- [When to Create a PR](#when-to-create-a-pr)

---

## Daily Maintenance Tasks

### 1. Quality Gates Check

**Run all quality gates to ensure repository health:**

```bash
# Lint check (must pass)
npm run check

# Tests (must pass)
npm test

# Build (must pass)
npm run build
```

**Check:**
- [ ] Lint passes with no errors (warnings acceptable)
- [ ] All tests pass (493 tests)
- [ ] Build completes successfully
- [ ] No new TypeScript errors introduced

**Action:**
- Fix any lint errors found
- Fix any failing tests
- Fix any TypeScript build errors
- Document any intentional warnings

**Note:** Do NOT redefine code style rules here. All code style rules are defined in [CODE_STYLE.md](./CODE_STYLE.md). This check verifies the repository meets those existing rules.

---

### 2. Code Quality Scan

#### TODO/FIXME Comments

```bash
# Find TODO comments outside of tests
rg "TODO|FIXME" --glob "!**/__tests__/**" --glob "!**.test.ts" src/
```

**Check:**
- [ ] TODOs should be tracked as GitHub issues, not in code
- [ ] FIXMEs indicate technical debt - create issue if important

**Action:**
- Remove stale TODOs
- Convert important TODOs to GitHub issues

#### Console Statements

```bash
# Find console.log in production code
rg "console\.(log|debug|info)" --glob "!**/__tests__/**" --glob "!**.test.ts" src/
```

**Check:**
- [ ] No `console.log` statements in production code
- [ ] Test files can have console statements

**Action:**
- Remove or replace with proper logging
- Use error reporting service for production errors

#### Large Files

```bash
# Find files over 500 lines
find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 500 {print}'
```

**Check:**
- [ ] Files >500 lines might benefit from splitting
- [ ] Large files should have clear sections

**Action:**
- Flag for human review (might be intentional)
- Suggest refactoring opportunities

#### Unused Imports

**Check:**
- [ ] Run TypeScript compiler - it flags unused imports
- [ ] Remove imports not actually used

```bash
npm run build 2>&1 | grep "is declared but never used"
```

**Action:**
- Remove unused imports (safe cleanup)

---

### 2. Documentation Health

#### Internal Links

```bash
# Check all markdown links
find docs/ -name "*.md" -exec grep -H "\[.*\](.*)" {} \;
```

**Check:**
- [ ] All internal links work (files exist)
- [ ] Relative paths are correct
- [ ] No broken links to moved/renamed files

**Action:**
- Fix broken links automatically
- Update paths to renamed files

#### PATTERNS.md Current?

**Check:**
- [ ] PATTERNS.md reflects current codebase
- [ ] New patterns from recent work are documented
- [ ] Examples are up-to-date

**Action:**
- Add missing patterns
- Update outdated examples
- Remove obsolete patterns

#### Code Examples in Docs

**Check:**
- [ ] Code examples in documentation still work
- [ ] Imports are correct
- [ ] APIs haven't changed

**Action:**
- Update outdated examples
- Test examples if possible

---

### 3. Dependencies

#### Unused Dependencies

```bash
# Check for unused packages
npx depcheck
```

**Check:**
- [ ] Dependencies in package.json are actually used
- [ ] No leftover deps from removed features

**Action:**
- Flag unused dependencies
- Remove if confirmed unused (ask first)

#### Security Issues

```bash
# Check for known vulnerabilities
npm audit
```

**Check:**
- [ ] No high/critical security issues
- [ ] Audit report is clean or explained

**Action:**
- Run `npm audit fix` if safe
- Flag critical issues for immediate attention

#### Outdated Dependencies

```bash
# Check for outdated packages
npm outdated
```

**Check:**
- [ ] Note dependencies >6 months behind latest
- [ ] Flag major version updates

**Action:**
- Minor updates: Can auto-apply if tests pass
- Major updates: Flag for human review

---

### 4. Test Health

#### Test Descriptions

```bash
# Find tests without descriptions
rg "it\(\"\"|it\(\'\'\)" src/ e2e/
```

**Check:**
- [ ] All tests have meaningful descriptions
- [ ] No empty or generic test names ("test 1", "works", etc.)

**Action:**
- Flag tests with poor descriptions

#### Skipped Tests

```bash
# Find skipped tests
rg "it\.skip|test\.skip" src/ e2e/
```

**Check:**
- [ ] Skipped tests have a reason (comment)
- [ ] Skipped tests aren't stale (>30 days)

**Action:**
- Flag for review - should be fixed or removed

#### Test File Naming

```bash
# Find test files not following convention
find src/ -name "*test*" | grep -v "\.test\.ts$" | grep -v "__tests__"
```

**Check:**
- [ ] Test files follow naming convention (`*.test.ts`)
- [ ] Tests in `__tests__/` directories

**Action:**
- Rename if needed (safe refactor)

---

### 5. Type Safety

#### Any Types

```bash
# Find 'any' type usage
rg ": any[\s,\)\[]" --glob "!**/__tests__/**" src/
```

**Check:**
- [ ] Minimize `any` types
- [ ] `any` should have a comment explaining why

**Action:**
- Flag for improvement (don't auto-fix)
- Suggest proper types if obvious

#### @ts-ignore Comments

```bash
# Find TypeScript ignore comments
rg "@ts-ignore|@ts-expect-error" src/
```

**Check:**
- [ ] Each `@ts-ignore` has a comment explaining why
- [ ] Try to remove if possible

**Action:**
- Flag for review - these are code smells

---

## Weekly/Monthly Tasks

### Weekly

- [ ] Review ARCHITECTURE.md for accuracy
- [ ] Check that agent guides reflect current practices
- [ ] Review open issues/PRs for staleness
- [ ] Verify CI/CD pipelines still work

### Monthly

- [ ] Review and update PATTERNS.md comprehensively
- [ ] Check for duplicate code that could be refactored
- [ ] Review test coverage (if metrics available)
- [ ] Update dependency major versions (with testing)

---

## Automated Workflow

### GitHub Action Trigger

The housekeeping workflow runs daily via `.github/workflows/housekeeping.yml`:

```yaml
name: Daily Housekeeping
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9:00 AM UTC
  workflow_dispatch:  # Manual trigger
```

### What the Automation Does

1. **Checkout repo** — Get latest code
2. **Run maintenance checks** — Execute checklist above
3. **Generate report** — Create markdown report
4. **Auto-fix simple issues** — Broken links, formatting
5. **Create PR if needed** — If issues found or fixes made
6. **Comment on workflow run** — If everything is clean

### Report Format

```markdown
# Housekeeping Report - 2026-02-13

## ✅ Passing Checks
- All markdown links valid
- No console.log in production code
- Dependencies up to date
- All tests have descriptions

## ⚠️ Issues Found

### Code Quality (3 issues)
1. `src/lib/parser.ts:42` - TODO comment, created GitHub issue #123
   ```typescript
   // TODO: Add support for more encodings
   ```

2. `src/app/page.tsx:1-523` - File is 523 lines, consider splitting
   - Suggested split: Extract upload form to separate component

3. `src/lib/utils.ts:15` - Using `any` type without explanation
   ```typescript
   function process(data: any) { ... }
   ```

### Documentation (1 issue)
1. `docs/internal/PATTERNS.md` - Outdated pattern example
   - Pattern example needs updating

## 🔧 Auto-Fixed (2 items)
- Fixed broken link in README.md: `docs/agent-guides/INDEX.md`
- Removed trailing whitespace in 3 files

## 📊 Summary
- Total issues: 4
- Auto-fixed: 2
- Need human review: 2
- Files scanned: 187
- Tests: 493 passing

## 🎯 Recommendations
1. Create issue for encoding support (parser.ts TODO)
2. Consider refactoring page.tsx (>500 lines)
3. Add proper types to utils.ts:15
```

---

## Manual Maintenance

### When to Run Manually

- Before major releases
- After large refactors
- When docs feel stale
- On demand via GitHub Actions UI

### How to Run Manually

```bash
# Via GitHub Actions
# 1. Go to Actions tab
# 2. Select "Daily Housekeeping" workflow
# 3. Click "Run workflow"

# Or locally (as Maintenance Agent):
# Just follow the checklist above
```

---

## When to Create a PR

### Create PR if:

- ✅ Auto-fixed any issues (broken links, formatting, etc.)
- ✅ Found issues requiring human review
- ✅ Made documentation updates
- ✅ Updated patterns or examples

### PR Format

**Title**: `chore: Daily housekeeping [Date]`

**Labels**: `housekeeping`, `automated`

**Description**: Include full report (see format above)

**Reviewers**: Assign to repo maintainer

### Skip PR if:

- ❌ No issues found
- ❌ No changes made
- ❌ Everything is clean

In this case, just comment on the workflow run.

---

## Auto-Fix Guidelines

### Safe to Auto-Fix ✅

- Broken internal links (update to correct path)
- Trailing whitespace
- Missing newlines at end of file
- Outdated version numbers in docs
- Simple typos in docs (be conservative)

### Flag for Human Review ⚠️

- TODO comments (need context on priority)
- Large files (need architectural decision)
- Missing documentation (need domain knowledge)
- Security issues (need careful review)
- `any` types (need proper types)
- Skipped tests (need understanding of why)
- Major dependency updates (need testing)

### Never Auto-Fix ❌

- Business logic
- Type signatures
- Function implementations
- Breaking changes
- Database schemas
- Anything that could affect behavior

---

## Maintenance Agent Instructions

If you are the Maintenance Agent running housekeeping:

### Process

1. **Run all checks** from the checklist
2. **Document findings** in structured report
3. **Auto-fix safe issues** (see guidelines)
4. **Create PR** if changes or issues found
5. **Be thorough** but respect context

### Reporting

- **Be specific** — Link to files and line numbers
- **Explain impact** — Why does this matter?
- **Suggest fixes** — What should be done?
- **Prioritize** — High/Medium/Low severity

### Decision Making

- **When uncertain** — Flag for human review, don't guess
- **Patterns** — Look for systemic issues, not one-offs
- **Context matters** — Some "issues" are intentional
- **Ask why** — Before flagging, consider if there's a reason

---

## Quick Checklist

### Daily Run (Automated)

- [ ] Code quality scan (TODOs, console.log, large files)
- [ ] Documentation health (links, PATTERNS.md)
- [ ] Dependency check (unused, security, outdated)
- [ ] Test health (descriptions, skipped, naming)
- [ ] Type safety (any types, @ts-ignore)

### Weekly Run (Manual)

- [ ] Review ARCHITECTURE.md
- [ ] Update agent guides if needed
- [ ] Check open issues/PRs
- [ ] Verify CI/CD

### Monthly Run (Manual)

- [ ] Comprehensive PATTERNS.md review
- [ ] Duplicate code check
- [ ] Test coverage review
- [ ] Major dependency updates

---

## Success Criteria

Good housekeeping keeps the repository:

- ✅ **Clean** — No stale TODOs or console.logs
- ✅ **Current** — Docs reflect reality
- ✅ **Secure** — No known vulnerabilities
- ✅ **Maintainable** — Clear patterns, good tests
- ✅ **Healthy** — Regular checks, early issue detection

---

**Running housekeeping?** Follow the checklist, be thorough, and create a clear report!
