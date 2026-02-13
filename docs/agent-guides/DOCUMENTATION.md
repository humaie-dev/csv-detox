# Documentation Guide — CSV Detox

Guidelines for maintaining and updating agent documentation.

---

## Documentation Principle

**All agent guides must be succinct and to the point.**

- Avoid verbosity
- Focus on actionable information
- Link to details elsewhere when needed
- No redundant explanations

---

## Meta-Rules for Agent Guides

### AGENTS.md Must Stay Minimal

**Rule**: `AGENTS.md` must be **succinct and clean**, serving only as a pointer document.

**Why**:
- Prevents duplication between AGENTS.md and detailed guides
- Forces information into proper modular documentation
- Makes AGENTS.md quick to scan
- Keeps maintenance burden low

**What Belongs in AGENTS.md**:
- ✅ Link to docs/agent-guides/INDEX.md
- ✅ Multi-agent system table (4 agents, one-line purposes)
- ✅ Essential commands (4-5 most common)
- ✅ Quick links table to agent guides

**What Does NOT Belong in AGENTS.md**:
- ❌ Detailed TypeScript/React conventions → Goes in [CODE_STYLE.md](./CODE_STYLE.md)
- ❌ Workflow steps/procedures → Goes in [WORKFLOW.md](./WORKFLOW.md)
- ❌ Folder structure details → Goes in [ARCHITECTURE.md](./ARCHITECTURE.md)
- ❌ "What NOT to do" lists → Goes in [CODE_STYLE.md](./CODE_STYLE.md)
- ❌ "When to ask for help" details → Goes in [WORKFLOW.md](./WORKFLOW.md#when-to-ask-for-help)
- ❌ Testing conventions → Goes in [TESTING.md](./TESTING.md)
- ❌ Verbose explanations (use links instead)

**Agent Responsibility**:
When asked to update conventions/rules:
1. First determine which agent guide should contain the information
2. Update the appropriate guide (not AGENTS.md)
3. Only update AGENTS.md if adding a new essential command or agent

---

## When to Update Documentation

| Change Type | Documentation to Update |
|-------------|-------------------------|
| New transformation | COMMON_TASKS.md, ARCHITECTURE.md |
| New Convex mutation | ARCHITECTURE.md (Database Schema) |
| New UI pattern | CODE_STYLE.md, PATTERNS.md |
| New test pattern | TESTING.md |
| New workflow | WORKFLOW.md |
| New skill | SKILLS_REFERENCE.md |
| Architecture change | ARCHITECTURE.md, PATTERNS.md |
| User-facing feature | docs/public/USAGE.md |
| Code style rule | CODE_STYLE.md |

---

## Documentation Structure

```
AGENTS.md (pointer)
  ↓
INDEX.md (navigation)
  ↓
Specific Guides:
  ├── WORKFLOW.md (process)
  ├── CODE_STYLE.md (rules)
  ├── ARCHITECTURE.md (system design)
  ├── TESTING.md (testing)
  ├── COMMON_TASKS.md (how-to)
  ├── HOUSEKEEPING.md (maintenance)
  └── DOCUMENTATION.md (this file)
```

---

## Keeping Guides Updated

**When patterns change**: Update [CODE_STYLE.md](./CODE_STYLE.md) and [docs/internal/PATTERNS.md](../internal/PATTERNS.md)

**When architecture changes**: Update [ARCHITECTURE.md](./ARCHITECTURE.md)

**When new common tasks emerge**: Add to [COMMON_TASKS.md](./COMMON_TASKS.md)

**When skills added**: Update [SKILLS_REFERENCE.md](./SKILLS_REFERENCE.md)

**When workflow changes**: Update [WORKFLOW.md](./WORKFLOW.md)

The Maintenance Agent checks documentation health daily.

---

## Documentation Checklist

Before marking work complete:

- [ ] Updated relevant agent guides
- [ ] Updated PATTERNS.md if new pattern introduced
- [ ] Updated ARCHITECTURE.md if system design changed
- [ ] Updated public docs if user-visible change
- [ ] Verified all internal links still work
- [ ] Added examples where helpful

---

## Writing Style

### Do
- ✅ Use tables for comparisons
- ✅ Use code blocks for examples
- ✅ Link to other guides instead of repeating
- ✅ Keep sections focused and short
- ✅ Use bullet points over paragraphs
- ✅ Include "Quick Reference" sections

### Don't
- ❌ Repeat information from other guides
- ❌ Write long prose paragraphs
- ❌ Include unnecessary background
- ❌ Over-explain obvious concepts
- ❌ Create deep nesting (>3 levels)
