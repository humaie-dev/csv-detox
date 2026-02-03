# Known Issues

## Next.js @next/swc Version Warning

### Issue
You may see this warning during builds:
```
⚠ Mismatching @next/swc version, detected: 15.5.7 while Next.js is on 15.5.11
```

### Explanation
This is a **harmless warning** caused by Next.js 15.5.11 being released without corresponding @next/swc packages. The @next/swc-* packages are only available up to version 15.5.7.

### Impact
- **No functional impact** - the build succeeds and the application runs correctly
- This is a known issue in the Next.js ecosystem
- The warning can be safely ignored

### Why Not Downgrade?
- Next.js 15.5.7 has security vulnerabilities (GHSA-w37m-7fhw-fmv9 and others)
- Next.js 15.5.11 is the patched version
- Security > Warning messages

### Resolution
This will be resolved when:
1. Next.js releases 15.5.12+ with matching @next/swc packages, OR
2. We upgrade to Next.js 16.x (major version)

For now, keep Next.js at 15.5.11 for security reasons.

---

## Convex "Could not resolve convex/server" Error (RESOLVED)

### Issue
```
✘ [ERROR] Could not resolve "convex/server"
```

### Cause
This was caused by corrupted `optionalDependencies` in package.json from troubleshooting the @next/swc warning.

### Resolution
✅ **Fixed** - Removed the problematic `optionalDependencies` section and reinstalled packages.

If you encounter this error:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Convex Memory Limits (64MB)

### Issue
Convex actions have a **64MB memory limit** per execution. When working with large CSV/Excel files:
- Files with >10,000 rows can cause OOM (Out of Memory) errors
- Error message: `JavaScript execution ran out of memory (maximum memory usage: 64 MB)`

### Our Solutions

#### 1. Preview Page (`parseFile` action)
- ✅ **Limited to 5000 rows** for preview
- Shows warning when capped: "Preview limited to 5000 rows..."
- Sufficient for most data exploration needs

#### 2. Validation Preview (`validateCast` action)
- ✅ **Limited to 500 rows** for validation
- UI shows: "Validates first 500 rows"
- 500-row sample provides reliable statistics

#### 3. Full Data Processing
- **Pipeline execution**: Processes full files (uses Convex's streaming capabilities)
- **Export**: Gets complete data (not limited)

### Best Practices
- Use preview page to explore data structure (first 5000 rows)
- Use validation preview to check cast compatibility (first 500 rows)
- Run pipeline transformations for full data processing
- Export to get complete results

### Why Not Parse Entire File?
- Convex's 64MB limit is hard (cannot be increased)
- Large files (50MB+) with many columns can exceed this
- Streaming isn't available for parse actions (file must be loaded)
- 5000-row preview is a good balance between usability and memory

### Alternative Approaches Considered
1. **Client-side parsing** - Would require downloading entire file to browser (slow)
2. **DuckDB in Convex** - Not available/supported yet
3. **Chunked parsing** - Complex and doesn't work well with type inference

Current approach is best for Convex's constraints.
