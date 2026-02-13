# Automated PR Review System

This repository includes an automated PR review system powered by OpenCode agents.

## Overview

When a pull request is opened, synchronized, or marked ready for review, the **Review Agent** automatically:

1. ✅ Runs all quality gates (tests, linting, build)
2. 🔍 Analyzes changed files for potential issues
3. 💬 Posts a detailed review comment on the PR
4. 📊 Provides actionable feedback

## Components

### 1. Review Agent (`.opencode/agents/review.yaml`)

The Review Agent is configured to:
- Check code quality and best practices
- Verify adherence to project patterns
- Identify potential bugs or security issues
- Ensure proper TypeScript usage
- Validate test coverage
- Review Convex-specific patterns

### 2. GitHub Action (`.github/workflows/pr-review.yml`)

The workflow is triggered on:
- `pull_request` events: `opened`, `synchronize`, `reopened`, `ready_for_review`

It automatically:
- Skips draft PRs
- Runs quality checks
- Generates a review report
- Posts the review as a comment

### 3. Review Script (`scripts/review-pr.js`)

A Node.js script that:
- Analyzes changed files
- Runs tests, linting, and build
- Detects common issues (e.g., `any` types, console.log)
- Generates a structured review report

## Review Report Format

The automated review includes:

```
## 🤖 Automated Code Review

### Summary
[Number of changed files and diff stats]

### Quality Gates
✅/❌ Tests
✅/❌ Linting
✅/❌ Build

### Critical Issues 🔴
[Must be fixed before merging]

### Suggestions 🟡
[Nice-to-have improvements]

### Positive Notes 🟢
[Good practices identified]

### Recommendation
✅ Approve / 🔄 Request Changes / 💬 Comment
```

## What the Review Checks

### Quality Gates
- **Tests**: All unit tests must pass
- **Linting**: No linting errors (Biome)
- **Build**: Next.js build must succeed
- **TypeScript**: No type errors

### Code Analysis
- Excessive use of `any` types
- Console.log statements in production code
- Missing test files for new features
- TODO comments
- Common anti-patterns

### Best Practices (Manual Review)
The Review Agent configuration also includes guidelines for human reviewers:
- Code style consistency
- Security considerations
- Performance implications
- Convex-specific patterns
- React/Next.js best practices

## Using the Review Agent

### Automatic Reviews

The review runs automatically on every PR. No action needed!

### Manual Review with OpenCode

You can also invoke the Review Agent manually:

```bash
# Using OpenCode CLI (if available)
opencode run --agent review --input "Please review PR #123"
```

### Customizing the Review

To modify what the review checks:

1. **Update the agent**: Edit `.opencode/agents/review.yaml`
2. **Update the script**: Edit `scripts/review-pr.js`
3. **Update the workflow**: Edit `.github/workflows/pr-review.yml`

## Limitations

This is an **automated assistant**, not a replacement for human code review:

- ✅ Catches common issues and style problems
- ✅ Enforces quality gates
- ✅ Saves reviewer time on mechanical checks
- ❌ Cannot evaluate business logic
- ❌ Cannot assess architecture decisions
- ❌ Cannot catch all bugs

**Always have a human reviewer approve PRs before merging.**

## Troubleshooting

### Review not posting

Check that:
1. The PR is not in draft mode
2. GitHub Actions has necessary permissions
3. The workflow file is on the base branch

### False positives

If the review flags something incorrectly:
1. Add comments in the code explaining why it's okay
2. Update `scripts/review-pr.js` to skip that check
3. Document the exception in this file

### Skipping automated review

Add `[skip review]` to your PR title to skip the automated review (not recommended).

## Examples

### Successful Review

```
✅ Approve - All quality gates passed. Ready to merge after human review.
```

### Review with Issues

```
🔄 Request Changes - Critical issues must be addressed before merging.

Critical Issues:
- Tests are failing - must be fixed before merging
- src/lib/foo.ts: Uses `any` type - consider using more specific types
```

## Contributing

To improve the review system:

1. Update the Review Agent instructions in `.opencode/agents/review.yaml`
2. Add new checks to `scripts/review-pr.js`
3. Test on a PR
4. Document changes in this file
