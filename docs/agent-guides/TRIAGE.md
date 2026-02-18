# Triage Agent Guide — CSV Detox

Guide for monitoring, reviewing, and triaging production logs and issues.

---

## Overview

The Triage Agent monitors Convex and Vercel logs to identify production issues, determine root causes, and escalate appropriately. This agent is designed for reactive debugging and proactive monitoring.

---

## When to Use the Triage Agent

- Production errors reported by users
- Monitoring daily logs for anomalies
- Debugging authentication failures (401 errors)
- Investigating performance degradation
- Environment configuration mismatches
- Post-deployment verification
- Incident response and root cause analysis

---

## Quick Start

### Invoking the Triage Agent

```bash
# Via OpenCode
@triage review production logs

# Or manually invoke
npx opencode --agent triage "Check for errors in the last hour"
```

### Common Commands

The triage agent will execute these commands for you:

```bash
# Convex logs
npx convex logs --prod --history 50 --success
npx convex logs --prod  # streaming mode

# Environment variables
npx convex env list --prod
npx convex env get OA_INTERNAL_KEY --prod

# Vercel (via dashboard)
# - Web Analytics: Traffic patterns
# - Speed Insights: Core Web Vitals
# - Logs: Runtime errors
# - Alerts: Availability issues
```

---

## Typical Workflows

### Workflow 1: User Reports Error

**User says**: "I'm getting an error when uploading CSV files"

**Triage steps**:

1. **Gather context**:
   - Which environment? (production vs dev)
   - When did it start?
   - Error message shown to user?

2. **Check recent logs**:
   ```bash
   npx convex logs --prod --history 50 --success
   ```

3. **Look for patterns**:
   - 401 errors → authentication issue
   - 500 errors → uncaught exceptions
   - Timeouts → performance issue
   - Validation errors → schema/input issue

4. **Identify root cause**:
   - Check environment variables
   - Review recent deployments
   - Compare dev vs prod config

5. **Escalate with context**:
   - Severity (P0-P3)
   - Evidence from logs
   - Recommended next steps
   - Assign to appropriate agent

### Workflow 2: Daily Log Review

**Goal**: Proactive monitoring to catch issues before users report them

**Steps**:

1. **Review production logs**:
   ```bash
   npx convex logs --prod --history 100 --success
   ```

2. **Check for anomalies**:
   - Increased error rate
   - New error types
   - Performance degradation
   - Unusual traffic patterns

3. **Review Vercel metrics**:
   - Web Analytics: Traffic trends
   - Speed Insights: Core Web Vitals trending
   - Alerts: Any threshold breaches

4. **Document findings**:
   - Create issues for problems found
   - Update docs/internal/KNOWN_ISSUES.md
   - Notify team if critical

### Workflow 3: Authentication Debugging

**Symptom**: 401 unauthorized errors from Convex actions

**Root cause pattern**: Environment variable mismatch

**Steps**:

1. **Check Convex logs** for error message:
   ```bash
   npx convex logs --prod --history 30
   ```
   Look for: `[ERROR] ... 401 'unauthorized'`

2. **Verify Convex environment**:
   ```bash
   npx convex env get OA_INTERNAL_KEY --prod
   npx convex env get PUBLIC_API_URL --prod
   ```

3. **Check API worker secrets** (requires appropriate access):
   ```bash
   npx wrangler secret list
   ```

4. **Compare keys**:
   - Convex `OA_INTERNAL_KEY` should match API worker
   - `PUBLIC_API_URL` should point to correct deployment

5. **Fix if mismatched**:
   ```bash
   npx convex env set OA_INTERNAL_KEY "correct-key" --prod
   ```

6. **Verify fix**:
   ```bash
   npx convex logs --prod
   # Watch for successful API calls
   ```

### Workflow 4: Performance Investigation

**Symptom**: App is slow, users complaining about load times

**Steps**:

1. **Check Vercel Speed Insights**:
   - LCP (Largest Contentful Paint): Should be <2.5s
   - FID (First Input Delay): Should be <100ms
   - CLS (Cumulative Layout Shift): Should be <0.1

2. **Review Convex function durations**:
   ```bash
   npx convex logs --prod --history 50 --success
   ```
   Look for: `Function executed in Xms`

3. **Identify slow functions**:
   - >1000ms: Concerning
   - >5000ms: Critical

4. **Check for patterns**:
   - Specific functions consistently slow?
   - Time of day correlation?
   - Data size correlation?

5. **Escalate to Build Agent**:
   - With specific function names
   - Performance baseline vs current
   - Suggested optimizations

---

## Issue Severity Classification

### P0 (Critical) - Immediate Response

**Criteria**:
- Complete service outage
- Data loss or corruption
- Security vulnerabilities exposed
- Revenue-impacting failures

**Response time**: Immediate (within minutes)

**Escalation**: Alert team, create incident, assign to Build Agent

### P1 (High) - Urgent Response

**Criteria**:
- Core feature broken for all users
- Performance degraded >50%
- Authentication failures
- Critical workflow blocked

**Response time**: Within 1-2 hours

**Escalation**: Create high-priority issue, assign to Build Agent

### P2 (Medium) - Standard Response

**Criteria**:
- Non-critical feature broken
- Intermittent errors affecting <10% users
- Performance degraded 20-50%
- Workaround available

**Response time**: Within 1-2 days

**Escalation**: Create issue, schedule for next sprint

### P3 (Low) - Backlog

**Criteria**:
- Minor bugs with minimal impact
- Cosmetic issues
- Enhancement requests
- Documentation gaps

**Response time**: Next sprint

**Escalation**: Add to backlog, prioritize with other P3 issues

---

## Common Issues and Solutions

### Issue: 401 Unauthorized

**Symptoms**:
- Convex actions failing with 401
- External API calls rejected

**Root cause**:
- `OA_INTERNAL_KEY` mismatch
- `PUBLIC_API_URL` pointing to wrong deployment

**Solution**:
1. Compare environment variables across services
2. Update mismatched keys
3. Redeploy if necessary

### Issue: Timeout Errors

**Symptoms**:
- Functions exceeding time limits
- User requests timing out

**Root cause**:
- Inefficient queries
- Large data processing
- External API latency

**Solution**:
1. Identify slow functions from logs
2. Escalate to Build Agent with:
   - Function name and duration
   - Suggested optimizations (indexing, pagination, etc.)

### Issue: Validation Errors

**Symptoms**:
- Input rejected by Convex
- Schema validation failures

**Root cause**:
- Schema too strict
- Frontend sending incorrect data
- Recent schema change not synced

**Solution**:
1. Review schema definition
2. Check frontend data format
3. Update schema or fix frontend

### Issue: Missing Environment Variables

**Symptoms**:
- Functions failing with undefined errors
- Config values not loading

**Root cause**:
- Environment variables not set in deployment
- Typo in variable name

**Solution**:
1. List all env vars: `npx convex env list --prod`
2. Set missing variables: `npx convex env set KEY value --prod`
3. Verify with `npx convex env get KEY --prod`

---

## Integration with Other Agents

### Escalate to Build Agent

**When**: Code changes needed to fix issues

**Handoff format**:
```markdown
Issue: [Brief description]
Severity: P1
Root Cause: [Analysis from logs]
Evidence: [Log excerpts]
Recommended fix: [Specific code changes needed]
Files affected: [List of files]
```

### Escalate to Test Agent

**When**: Tests needed to prevent regression

**Handoff format**:
```markdown
Issue: [What broke]
Why it wasn't caught: [Gap in test coverage]
Test cases needed:
1. [Specific scenario]
2. [Edge case]
3. [Error condition]
```

### Escalate to Plan Agent

**When**: Architectural changes needed

**Handoff format**:
```markdown
Issue: [Recurring problem]
Current architecture limitation: [Why current design causes this]
Proposed change: [High-level architectural shift]
Trade-offs: [Pros/cons]
```

---

## Skills Used by Triage Agent

### convex-logs

Provides Convex CLI commands for:
- Streaming deployment logs
- Historical log retrieval
- Environment variable inspection
- Deployment targeting (dev vs prod)

**Usage**: Automatically used when checking Convex logs

### vercel-observability

Provides access to:
- Web Analytics (traffic patterns)
- Speed Insights (Core Web Vitals)
- Logs (runtime errors)
- Tracing (request performance)
- Alerts (availability monitoring)

**Usage**: Referenced when checking frontend performance

### convex-best-practices

Helps identify:
- Anti-patterns in function implementations
- Performance optimization opportunities
- Security best practices

**Usage**: Used when analyzing why certain issues occurred

---

## Best Practices

### DO

- ✅ Always specify `--prod` flag when checking production
- ✅ Provide specific log excerpts as evidence
- ✅ Include timestamps in issue reports
- ✅ Compare dev vs prod configurations
- ✅ Document recurring issues in docs/internal/KNOWN_ISSUES.md
- ✅ Verify fixes after escalation

### DON'T

- ❌ Don't assume dev and prod configs match
- ❌ Don't escalate without gathering evidence
- ❌ Don't over-classify severity
- ❌ Don't modify production without approval
- ❌ Don't ignore patterns in logs

---

## Example Triage Reports

### Example 1: Authentication Issue

```markdown
## Issue Report: CSV Upload Failing with 401

**Severity**: P1 (High)
**Environment**: Production
**Started**: 2026-02-13 13:00 UTC
**Impact**: All users unable to upload CSV files

### Symptoms
Users receive "Unauthorized" error when attempting CSV upload.

### Evidence
From `npx convex logs --prod --history 30`:
```
2/13/2026, 1:15:23 PM [CONVEX A(openclawApi:getRuntimeStatus)] [ERROR] 
'[openclawApi getRuntimeStatus] API error response:' 401 'unauthorized'

2/13/2026, 1:15:23 PM [CONVEX A(openclawApi:getRuntimeStatus)] 
Uncaught Error: unauthorized
```

### Root Cause
`OA_INTERNAL_KEY` mismatch between Convex production deployment and API worker.
Recent secret rotation updated API worker but not Convex.

### Next Steps
1. ✅ Verify API worker key: `npx wrangler secret list`
2. ⏳ Update Convex key: `npx convex env set OA_INTERNAL_KEY "xxx" --prod`
3. ⏳ Verify fix: Monitor logs for successful API calls
4. ⏳ Document: Add prevention steps to docs/internal/KNOWN_ISSUES.md

**Assigned to**: Build Agent (for key update)
**Priority**: Immediate (service is down)
```

### Example 2: Performance Degradation

```markdown
## Issue Report: Slow Dashboard Loading

**Severity**: P2 (Medium)
**Environment**: Production
**Started**: ~2 days ago (gradual degradation)
**Impact**: ~30% of users experiencing 5-10s load times

### Symptoms
Dashboard takes significantly longer to load, particularly for users with large datasets.

### Evidence
From Vercel Speed Insights:
- LCP increased from 1.8s to 4.2s (baseline: <2.5s)
- 75th percentile load time: 8.5s (was 2.1s)

From `npx convex logs --prod`:
```
2/13/2026, 2:30:15 PM [CONVEX Q(getProjectData)] Function executed in 4823ms
2/13/2026, 2:31:42 PM [CONVEX Q(getProjectData)] Function executed in 5201ms
```

### Root Cause
`getProjectData` query not optimized for large datasets (>100k rows).
Missing database index on frequently queried column.

### Next Steps
1. ⏳ Add index to schema (Build Agent)
2. ⏳ Implement pagination for large results
3. ⏳ Add test cases for large dataset performance (Test Agent)
4. ⏳ Monitor LCP after fix

**Assigned to**: Build Agent (for optimization)
**Priority**: Within 1-2 days
```

---

## Resources

- **Convex Logs Skill**: `.agents/skills/convex-logs/SKILL.md`
- **Vercel Observability Skill**: `.agents/skills/vercel-observability/SKILL.md`
- **Convex Best Practices**: `.agents/skills/convex-best-practices/SKILL.md`
- **Known Issues**: `docs/internal/KNOWN_ISSUES.md`
- **Architecture**: `docs/agent-guides/ARCHITECTURE.md`

---

## Questions?

- For workflow questions: See `docs/agent-guides/WORKFLOW.md`
- For technical patterns: See `docs/internal/PATTERNS.md`
- For issue tracking: See GitHub Issues
