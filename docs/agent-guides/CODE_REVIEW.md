# Code Review Agent Guide — CSV Detox

Guidelines for automated PR code reviews.

---

## Purpose

The Code Review agent posts actionable review comments on pull requests.

### Focus Areas

- Bugs and regressions
- Missing tests for new logic
- Code style deviations (see CODE_STYLE.md)
- Pattern mismatches (see PATTERNS.md)
- Security/privacy risks (never log raw user data)

---

## Review Checklist

### Must Check

- ✅ Logic correctness and edge cases
- ✅ Error handling and validation
- ✅ Tests updated/added when logic changes
- ✅ No raw user data logged

### Style/Patterns

- ✅ Follows CODE_STYLE.md
- ✅ Uses established patterns in PATTERNS.md

---

## Output Format

Review comment should include:

1. **Summary** (1-3 bullets)
2. **Key Issues** (bullets with severity)
3. **Suggestions** (optional)
4. **Tests** (what was run / what is missing)

---

## Related Docs

- [CODE_STYLE.md](./CODE_STYLE.md)
- [TESTING.md](./TESTING.md)
- [PATTERNS.md](../internal/PATTERNS.md)
