# OpenCode PR Agent Workflow

This GitHub Actions workflow automatically triages and implements pull requests using OpenCode AI.

## Features

### 🤖 Automatic PR Triage
When a PR is opened, OpenCode will:
- Review all changes
- Run tests and build
- Identify issues or improvements
- Provide feedback as a PR comment
- Attempt to fix any test failures or build issues

### ⚡ Implement PR on Assignment
When a PR is assigned to someone, OpenCode will:
- Read the PR description
- Follow the spec-driven development process
- Create a spec if needed (in `/specs`)
- Implement the requested feature
- Write comprehensive tests
- Ensure build passes
- Update documentation

### 💬 Interactive Commands
Comment on any PR with `@opencode <instruction>` to:
- `@opencode fix the failing tests` - Fix test failures
- `@opencode add validation for user input` - Add specific functionality
- `@opencode refactor the authentication logic` - Refactor code
- `@opencode write tests for the new feature` - Add test coverage
- `@opencode update the documentation` - Update docs

## Setup

### 1. GitHub Copilot Subscription

This workflow uses **GitHub Copilot** as the AI provider. You need:

- GitHub Copilot subscription (Individual, Business, or Enterprise)
- Copilot enabled for your account or organization

**Check your Copilot status:**
1. Visit https://github.com/settings/copilot
2. Verify Copilot is active
3. If not subscribed: https://github.com/features/copilot

**Pricing:**
- **Individual**: $10/month or $100/year
- **Business**: $19/user/month
- **Enterprise**: Contact sales

**No additional API keys required** - the workflow uses GitHub Copilot through your existing subscription!

### 2. Repository Token

The workflow requires these permissions (already configured in the workflow file):
- `contents: write` - To commit changes
- `pull-requests: write` - To comment on PRs
- `issues: write` - To read PR comments

### 4. Branch Protection (Optional but Recommended)

### Example 1: Create a New Feature PR

```bash
git checkout -b feature/add-user-profiles
git push origin feature/add-user-profiles

# Create PR via GitHub UI with description:
# "Add user profile pages with avatar upload and bio editing"

# Assign the PR to trigger OpenCode implementation
```

OpenCode will:
1. Create spec: `specs/2026-02-05_011_user-profiles.md`
2. Implement the feature following AGENTS.md guidelines
3. Write tests
4. Update MEMORY.md
5. Push commits to the PR branch

### Example 2: Fix Failing Tests

```bash
# PR has failing tests
# Comment on the PR:
@opencode fix the failing tests in the authentication module
```

OpenCode will:
1. Analyze test failures
2. Fix the issues
3. Verify tests pass
4. Push the fix

### Example 3: Request Code Review Improvements

```bash
# After human code review, comment:
@opencode add input validation for email and phone fields, and extract the form logic into a reusable hook
```

OpenCode will:
1. Add the requested validation
2. Create a custom hook
3. Update the component to use the hook
4. Ensure tests cover the new validation

## How It Works

### Trigger Conditions

The workflow runs when:
- **PR opened**: Automatically triages and reviews
- **PR assigned**: Implements the feature described in PR
- **Comment with @opencode**: Executes the instruction in the comment

### Workflow Steps

1. **Checkout**: Fetches the PR branch
2. **Setup**: Installs Node.js and dependencies
3. **Install OpenCode**: Installs the OpenCode CLI globally
4. **Run Agent**: Executes OpenCode with context-aware prompts
5. **Test & Build**: Validates the changes
6. **Commit & Push**: Pushes changes back to the PR branch
7. **Comment**: Provides feedback on the PR

### Agent Behavior

OpenCode follows the repository's development guidelines from `AGENTS.md`:
- ✅ Spec-driven development (creates specs in `/specs`)
- ✅ Updates `MEMORY.md` after changes
- ✅ Writes comprehensive unit tests
- ✅ Follows TypeScript strict mode
- ✅ Uses shadcn/ui for UI components
- ✅ Maintains code style and conventions
- ✅ Updates documentation when needed

## Workflow File

Location: `.github/workflows/opencode-pr-agent.yml`

Key configuration:
```yaml
on:
  pull_request:
    types: [opened, assigned, synchronize]
  issue_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: write
  issues: write
```

## Limitations

### What OpenCode Can Do
✅ Implement features from specs
✅ Fix bugs and test failures
✅ Refactor code
✅ Add tests and documentation
✅ Follow repository patterns
✅ Make commits and push changes

### What OpenCode Cannot Do
❌ Deploy to production
❌ Approve/merge PRs (requires human review)
❌ Access external services (unless secrets provided)
❌ Make breaking changes without warning
❌ Override branch protection rules

## Cost Considerations

GitHub Copilot provides **unlimited usage** as part of your subscription:

- **Individual**: $10/month or $100/year - unlimited PR automation
- **Business**: $19/user/month - unlimited across your organization  
- **Enterprise**: Custom pricing - unlimited at enterprise scale

**No per-request charges** - once you have Copilot, all PR automation is included!

Compare this to pay-per-use APIs:
- Anthropic Claude: $0.05-$2 per PR
- OpenAI GPT-4: $0.10-$3 per PR

With Copilot, **process unlimited PRs** for one flat monthly rate.

## Troubleshooting

### OpenCode doesn't respond to @opencode comments
- Check that the comment is on a **pull request** (not an issue)
- Ensure you have an active GitHub Copilot subscription
- Verify Copilot is enabled: https://github.com/settings/copilot
- Check workflow run logs for errors

### Changes aren't pushed to the PR
- Verify the workflow has `contents: write` permission
- Check if branch protection rules are blocking pushes
- Review the "Commit and Push Changes" step in workflow logs

### Tests or build fail after OpenCode changes
- OpenCode attempts to fix issues, but may need guidance
- Comment: `@opencode the build is failing because of X, please fix it`
- Provide specific error messages for better results

### Workflow doesn't trigger
- PRs from forks don't have access to secrets (security limitation)
- Check that the workflow file is in the default branch
- Verify GitHub Actions are enabled for the repository
- Ensure Copilot is active for your account/organization

### "Copilot API not available" error
- Verify you have an active Copilot subscription
- Check organization settings if using Business/Enterprise
- Ensure repository has Copilot access enabled

## Security Notes

- OpenCode runs in an isolated GitHub Actions environment
- Has write access only to the PR branch (not main/master)
- Cannot access secrets unless explicitly passed as env vars
- All changes are visible in PR commits (full audit trail)
- Requires human review and approval to merge

## Best Practices

1. **Write Clear PR Descriptions**: OpenCode uses PR descriptions to understand intent
2. **Provide Context in Comments**: Specific instructions get better results
3. **Review AI Changes**: Always review OpenCode's commits before merging
4. **Iterative Refinement**: Comment with feedback to refine the implementation
5. **Use Assignments for Features**: Assign PRs to trigger full implementation mode
6. **Keep Prompts Focused**: One task per comment works better than multiple tasks

## Example Workflow

```bash
# 1. Developer creates a feature PR
git checkout -b feature/export-to-json
git push origin feature/export-to-json

# 2. Create PR on GitHub with description:
"Add JSON export option to the export dropdown. 
Follow the same pattern as CSV export but use JSON format."

# 3. Assign the PR (or mention @opencode in a comment)

# 4. OpenCode implements:
- Creates spec: specs/2026-02-05_011_json-export.md
- Updates ExportButton component
- Adds JSON generation utility
- Writes 15 unit tests
- Updates MEMORY.md
- Commits and pushes changes

# 5. Developer reviews changes, requests refinement:
"@opencode add proper indentation to the JSON output 
and include metadata header with export timestamp"

# 6. OpenCode refines the implementation

# 7. Developer approves and merges PR
```

## Support

For issues with the workflow:
1. Check [workflow run logs](../../actions)
2. Review OpenCode documentation: https://opencode.ai/docs
3. Verify Copilot subscription: https://github.com/settings/copilot
4. Ask in PR comments: `@opencode help with X`

For GitHub Copilot issues:
- Copilot settings: https://github.com/settings/copilot
- Copilot documentation: https://docs.github.com/copilot
- GitHub support: https://support.github.com/

For OpenCode product issues:
- GitHub: https://github.com/anomalyco/opencode
- Documentation: https://opencode.ai/docs
