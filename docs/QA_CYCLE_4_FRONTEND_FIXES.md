# QA Cycle 4 - Frontend Fixes

**Date**: 2026-02-19
**Scope**: Targeted bug fixes for Issues #18, #23, #26

---

## Summary

3 issues fixed with minimal, targeted changes across 2 files. All verification checks pass.

---

## Fixes Applied

### Issue #18 (MEDIUM): Negative values corrupt entropy calculation

**File**: `packages/core/src/typing-analyzer/collector/metrics-calculator.ts`

**Problem**: `calculateShannonEntropy` did not guard against negative values. A negative `v` would produce a negative index via `Math.floor(v / BUCKET_SIZE_MS)`, which JavaScript silently accepts as an array index — resulting in a phantom bucket that is never counted in `total`, corrupting the entropy calculation.

**Fix**: Added `if (v < 0) continue;` guard at the top of the bucket-filling loop.

```typescript
for (const v of values) {
    if (v < 0) continue;  // Skip negative values
    const idx = Math.min(Math.floor(v / BUCKET_SIZE_MS), bucketCount - 1);
    buckets[idx]!++;
}
```

---

### Issue #23 (LOW): fetch missing credentials

**File**: `packages/editor-react/src/hooks/useAiFeedback.ts`

**Problem**: The `fetch` call to the AI spelling endpoint omitted `credentials: 'include'`, causing the HttpOnly JWT cookie to be excluded from cross-origin requests. This would result in 401 Unauthorized responses from the backend.

**Fix**: Added `credentials: 'include'` to the fetch options object.

```typescript
const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: controller.signal,
    credentials: 'include',
});
```

---

### Issue #26 (LOW): lastCheckedTextRef not reset on editor change

**File**: `packages/editor-react/src/hooks/useAiFeedback.ts`

**Problem**: When the `editor` instance changed (e.g. component re-mount with a new editor), the cleanup function of the `useEffect` that attaches the `update` listener did not reset `lastCheckedTextRef`. This meant the new editor instance would skip the first AI check if the text happened to match what the previous editor had last checked.

**Fix**: Added `lastCheckedTextRef.current = null;` to the effect cleanup function.

```typescript
return () => {
    editor.off('update', handleUpdate);
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }
    lastCheckedTextRef.current = null;  // Reset on editor change
};
```

---

### Issue #24 (BACKEND): CORS for .well-known missing — SKIPPED

Per instructions, this is a backend fix and was skipped.

---

## Verification Results

| Check | Result | Details |
|-------|--------|---------|
| `pnpm type-check` | PASS | 6/6 packages, 0 errors |
| `pnpm lint` | PASS | 6/6 packages, 0 warnings |
| `pnpm test` | PASS | 249 tests across core + editor-react + ui, 0 failures |

### Test counts
- `@humanwrites/core`: 72 tests passed (7 test files)
- `@humanwrites/editor-react`: 176 tests passed (17 test files)
- `@humanwrites/ui`: 70 tests passed (5 test files)

Note: Several pre-existing `act(...)` warnings appear in stderr for `useOfflineBuffer`, `useAiFeedback`, and `useKeyboardShortcuts` tests. These are warnings only and do not affect test pass/fail status. They pre-date these fixes.
