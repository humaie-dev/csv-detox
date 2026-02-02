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
