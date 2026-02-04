# Spec: GitHub Issue and PR Contribution Automation
Date: 2026-02-05
ID: 011
Status: Draft

## Objective
Extend OpenCode's GitHub Actions workflow to automatically create and implement PRs when mentioned in GitHub issues, and contribute to existing PRs created by other developers.

## Scope
### In scope
- GitHub issue handling: When `@opencode` is mentioned in an issue, OpenCode proposes a plan and creates a PR upon approval
- PR contribution: When `@opencode` is mentioned in any PR (not just OpenCode-created ones), OpenCode helps with implementation
- Smart branch naming based on issue labels (feature/, bugfix/, enhancement/, etc.)
- Spec-driven development for all issue implementations
- Status communication via GitHub reactions (👀 working, ✅ done, ❌ error)
- Proper issue-to-PR linking
- Context-aware prompt generation for different scenarios

### Out of scope
- Automatic issue triage without mention (no AI spam)
- Auto-merging PRs (always requires human review)
- Deployment automation
- Issue creation or management
- GitHub Projects integration

## Requirements
### Functional

**FR1: Issue Comment Handling**
- Detect `@opencode` mentions in issue comments (not just PR comments)
- Respond with 👀 reaction immediately to acknowledge
- Analyze the issue title, description, and labels
- Comment with a proposed implementation plan
- Wait for user approval (any comment with "yes", "approve", "go ahead", "lgtm", etc.)

**FR2: Branch Creation from Issues**
- Determine branch prefix based on issue labels:
  - `bug` label → `bugfix/issue-{number}-{slug}`
  - `enhancement` label → `enhancement/issue-{number}-{slug}`
  - `feature` label → `feature/issue-{number}-{slug}`
  - `documentation` label → `docs/issue-{number}-{slug}`
  - No matching label → `feature/issue-{number}-{slug}` (default)
- Generate slug from issue title (lowercase, hyphenated, max 40 chars)
- Create branch from default branch (main/master)
- Checkout the new branch in the workflow

**FR3: PR Creation from Issues**
- Create PR with descriptive title: `{Issue title} (fixes #{number})`
- PR description should include:
  - Link to issue: `Fixes #{number}`
  - Summary of changes
  - Reference to created spec
  - Checklist for reviewer
- Link PR to issue using GitHub keywords (Fixes, Closes, Resolves)
- Add relevant labels from the original issue

**FR4: Spec-Driven Issue Implementation**
- Always create a spec in `/specs` directory before implementing
- Spec should reference the GitHub issue number
- Follow existing spec-driven development process from AGENTS.md
- Update MEMORY.md after implementation

**FR5: Contributing to Existing PRs**
- Detect `@opencode` mentions in PR comments (existing behavior, but expand to all PRs)
- Work on PR branch regardless of who created it
- Follow PR author's code style and patterns
- Add commits with clear messages indicating OpenCode's contributions
- Don't overwrite existing work, only add/modify as requested

**FR6: Status Communication**
- Add 👀 reaction when starting work
- Add ✅ reaction when successfully completed
- Add ❌ reaction when encountering errors
- Post detailed comment at completion with summary of changes
- Post error comment with logs link if workflow fails

**FR7: GitHub API Integration**
- Use GitHub CLI (`gh`) for API operations (already available in GitHub Actions)
- Fetch issue details (title, body, labels, author)
- Create branches and PRs programmatically
- Add reactions to comments
- Link issues to PRs

### Non-functional

**NFR1: Security**
- Only run on issues/PRs in the same repository (no cross-repo access)
- Respect branch protection rules
- Don't expose secrets in logs or comments
- All changes visible in commits (audit trail)

**NFR2: Performance**
- Acknowledge mention within 30 seconds (👀 reaction)
- Complete simple tasks (bug fixes) within 5 minutes
- Complete complex tasks (features) within 15 minutes
- Fail gracefully with error reactions if timeout

**NFR3: Reliability**
- Handle rate limits gracefully (retry with backoff)
- Detect and prevent infinite loops (max 1 run per comment)
- Handle edge cases (deleted comments, closed issues, etc.)
- Log all GitHub API calls for debugging

**NFR4: Cost**
- Use existing GitHub Copilot subscription (no additional API costs)
- Leverage GitHub Actions free tier (2000 minutes/month for private repos)
- Optimize for fast feedback (reduce CI time where possible)

## Implementation Plan

### Phase 1: GitHub Issue Detection (1-2 hours)
1. Update workflow triggers to include `issue_comment` on regular issues (not just PRs)
2. Add step to differentiate between issue comments and PR comments
3. Extract issue details using `gh issue view $ISSUE_NUMBER --json`
4. Add reaction posting helper functions

### Phase 2: Issue Analysis and Plan Generation (2-3 hours)
1. Create prompt template for issue analysis
2. Run OpenCode with: "Analyze this GitHub issue and create an implementation plan"
3. Post plan as a comment on the issue
4. Add step to detect approval in subsequent comments
5. Store state between workflow runs (approval tracking)

### Phase 3: Branch Creation and PR Setup (1-2 hours)
1. Implement label-based branch naming logic
2. Create branch from default branch using `gh`
3. Generate PR title and description from issue
4. Create PR using `gh pr create` with proper linking keywords
5. Copy labels from issue to PR

### Phase 4: Spec-Driven Implementation (2-3 hours)
1. Update OpenCode prompts to always create specs for issue work
2. Ensure spec references GitHub issue number
3. Follow existing spec-driven workflow from AGENTS.md
4. Run tests and build
5. Commit changes and push to branch

### Phase 5: PR Contribution Enhancement (1-2 hours)
1. Update existing PR detection to work with any PR (not just OpenCode-created)
2. Add safety checks to avoid conflicts (detect uncommitted changes)
3. Enhance commit messages to indicate collaborative work
4. Update PR comments to show OpenCode's contributions

### Phase 6: Status Communication (1 hour)
1. Add reaction posting at key workflow stages
2. Replace text-based status comments with reactions
3. Add final summary comment with ✅ or ❌
4. Include logs link in error comments

### Phase 7: Testing and Documentation (2 hours)
1. Test issue mention flow end-to-end
2. Test PR contribution flow on external PRs
3. Test error handling and edge cases
4. Update .github/workflows/README.md with new features
5. Add examples to documentation

## Testing Plan

### Manual Testing (Primary)
1. **Test Issue Mention**:
   - Create test issue: "Add JSON export feature"
   - Add `enhancement` label
   - Comment: `@opencode can you implement this?`
   - Verify: 👀 reaction, plan comment, approval detection
   - Reply: "looks good, go ahead"
   - Verify: Branch created, spec created, PR created, implementation complete, ✅ reaction

2. **Test Issue with Bug Label**:
   - Create test issue: "Fix CSV export error with special characters"
   - Add `bug` label
   - Mention @opencode
   - Verify: Branch name starts with `bugfix/`

3. **Test PR Contribution**:
   - Create PR manually with some implementation
   - Comment: `@opencode add unit tests for this feature`
   - Verify: Tests added, committed, pushed, ✅ reaction

4. **Test Error Handling**:
   - Create issue with ambiguous description
   - Mention @opencode
   - Verify: ❌ reaction, error comment with details

5. **Test Approval Flow**:
   - Mention @opencode in issue
   - Reply "no, not yet"
   - Verify: No PR created
   - Reply "actually, go ahead"
   - Verify: PR created

### Integration Testing
- Test with branch protection enabled
- Test with required reviews
- Test with status checks required
- Test with fork PRs (should skip due to security)

### Edge Cases
- Issue already has linked PR
- Issue is closed
- Issue has no labels
- Comment is edited/deleted
- Multiple @opencode mentions in one comment
- Concurrent mentions in different issues

## Acceptance Criteria

**AC1: Issue Mention Detection**
- ✅ Workflow triggers on `@opencode` mention in issue comment
- ✅ 👀 reaction added within 30 seconds
- ✅ Ignores mentions in regular text (e.g., "I asked @opencode yesterday")

**AC2: Plan Generation**
- ✅ OpenCode analyzes issue and posts implementation plan
- ✅ Plan includes: spec to create, files to modify, tests to write
- ✅ Plan awaits user approval before proceeding

**AC3: Approval Detection**
- ✅ Detects approval keywords: "yes", "approve", "go ahead", "lgtm", "approved", "sounds good", "👍"
- ✅ Case-insensitive detection
- ✅ Ignores non-approval comments ("no", "wait", "not yet")

**AC4: Branch Naming**
- ✅ Branch name includes issue number and slug
- ✅ Prefix based on labels: bug→bugfix/, enhancement→enhancement/, feature→feature/, docs→docs/
- ✅ Slug is URL-safe (lowercase, hyphens, max 40 chars)

**AC5: PR Creation**
- ✅ PR title includes issue title and number
- ✅ PR description links to issue with `Fixes #N`
- ✅ PR has same labels as issue
- ✅ PR appears in issue's "Development" section (automatic GitHub linking)

**AC6: Spec Creation**
- ✅ Spec created in `/specs` directory with correct naming
- ✅ Spec references GitHub issue number
- ✅ Spec follows template from TEMPLATE.md
- ✅ MEMORY.md updated to reference active spec

**AC7: Implementation**
- ✅ Implementation follows spec-driven development process
- ✅ Tests written and passing
- ✅ Build succeeds
- ✅ MEMORY.md updated with changes

**AC8: PR Contribution**
- ✅ Can contribute to any PR (not just OpenCode-created)
- ✅ Respects existing code and patterns
- ✅ Commits indicate OpenCode's work
- ✅ Works with `@opencode <instruction>` format

**AC9: Status Communication**
- ✅ 👀 reaction when starting work
- ✅ ✅ reaction when successfully completed
- ✅ ❌ reaction on errors
- ✅ Final comment with summary or error details

**AC10: Error Handling**
- ✅ Graceful failure with ❌ reaction and error comment
- ✅ Error comment includes link to workflow logs
- ✅ No partial PRs created on failure
- ✅ User can retry with another mention

## Design Decisions

### Decision 1: Use GitHub CLI (gh) instead of actions/github-script
**Rationale**: GitHub CLI is more ergonomic for complex operations (creating PRs, branches, adding labels) and provides better error messages. It's also pre-installed in GitHub Actions runners.

### Decision 2: Reactions instead of verbose comments
**Rationale**: Reduces noise in issues/PRs. Users can see status at a glance. Final comment provides details only when needed.

### Decision 3: Two-step approval for issues
**Rationale**: Prevents accidental implementations. Gives users control over when OpenCode acts. Builds trust by showing plan first.

### Decision 4: Always create specs, even for simple bugs
**Rationale**: Maintains consistency with spec-driven development philosophy. Provides documentation for why changes were made. Easier to track decisions.

### Decision 5: Label-based branch naming
**Rationale**: Matches common Git conventions. Makes it clear what type of change it is. Works well with branch protection rules.

### Decision 6: No automatic issue triage
**Rationale**: Avoids spam. Respects issue authors' autonomy. OpenCode only acts when explicitly asked.

## Technical Notes

### GitHub Actions Context Available
```javascript
github.event.issue.number          // Issue number
github.event.issue.title           // Issue title
github.event.issue.body            // Issue description
github.event.issue.labels          // Array of label objects
github.event.comment.body          // Comment text
github.event.comment.user.login    // Comment author
```

### GitHub CLI Commands Needed
```bash
gh issue view $NUMBER --json title,body,labels,author
gh issue comment $NUMBER --body "Plan: ..."
gh pr create --title "..." --body "..." --label "..." --base main --head branch-name
gh api repos/:owner/:repo/issues/comments/:comment_id/reactions -f content='+1'
```

### State Management Between Runs
**Challenge**: GitHub Actions are stateless. Approval detection needs to remember plan was posted.

**Solution**: Use issue comment history to detect state:
1. Check if OpenCode has already commented with a plan
2. If yes, look for approval in subsequent comments
3. If no, post plan and exit

### Preventing Duplicate Work
**Challenge**: Multiple mentions could trigger multiple workflow runs.

**Solution**: 
1. Check if OpenCode plan comment already exists (via `gh api`)
2. Check if PR already linked to issue
3. Add "in-progress" label while working
4. Remove label when done

## Dependencies

### Existing Tools (Already Available)
- ✅ GitHub CLI (`gh`) - Pre-installed in Actions runners
- ✅ GitHub Copilot - Already configured as AI provider
- ✅ OpenCode CLI - Already installed in workflow
- ✅ Node.js & npm - Already configured

### New Requirements
- None (all tools already available)

## Risks and Mitigations

**Risk 1: API Rate Limits**
- GitHub API: 5000 requests/hour for authenticated requests
- Mitigation: Current usage is low (~10 API calls per workflow run). Monitor usage.

**Risk 2: Infinite Loops**
- OpenCode mentions itself, triggers another run
- Mitigation: Ignore comments from "OpenCode Bot" user. Add max-runs-per-minute check.

**Risk 3: Approval Ambiguity**
- User says "yes" in unrelated context
- Mitigation: Require approval in reply to plan comment. Use threading if available.

**Risk 4: Concurrent Modifications**
- User pushes to branch while OpenCode is working
- Mitigation: Pull latest changes before pushing. Handle merge conflicts gracefully.

**Risk 5: Security - Fork PRs**
- Forks could abuse workflow to run arbitrary code
- Mitigation: Current workflow already has `if: github.event.pull_request.head.repo.full_name == github.repository`. Keep this check.

## Future Enhancements (Out of Scope for v1)

- **Smart Issue Assignment**: Automatically assign issues to OpenCode when mentioned
- **Progress Updates**: Post intermediate progress comments for long-running tasks
- **Multi-Issue Coordination**: Handle issues that depend on other issues
- **Draft PR Mode**: Create draft PRs for review before full implementation
- **Custom Workflows**: Allow `.github/opencode.yml` config for custom behavior
- **Learning from Feedback**: Track approval/rejection patterns to improve plan quality

## Success Metrics

- Time from mention to plan comment: < 2 minutes
- Time from approval to PR creation: < 10 minutes
- PR acceptance rate: > 70% (PRs merged without major revisions)
- Error rate: < 10% (workflows that fail)
- User satisfaction: Gather feedback after 2 weeks of usage

## Rollout Plan

1. **Week 1**: Implement Phase 1-3 (issue detection, plan, branch/PR creation)
2. **Week 2**: Implement Phase 4-6 (spec-driven implementation, PR contribution, status)
3. **Week 3**: Testing and documentation (Phase 7)
4. **Week 4**: Monitor usage, gather feedback, iterate

## Related Documentation

- Current workflow: `.github/workflows/opencode-pr-agent.yml`
- Workflow README: `.github/workflows/README.md`
- AGENTS.md: Repository coding guidelines
- MEMORY.md: Project state tracking
