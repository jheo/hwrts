# QA Cycle 5 Frontend Fixes

**Date**: 2026-02-19
**Issue**: useAiFeedback sends incomplete request body

---

## Issue #1 (HIGH): useAiFeedback sends incomplete request body

**File**: `packages/editor-react/src/hooks/useAiFeedback.ts`

**Problem**: The fetch call to `/api/ai/spelling` only sent `{ text }`, but the backend requires `text`, `locale`, and `documentId`.

### Changes Made

**a) Extended `UseAiFeedbackOptions` interface** to accept `documentId` and `locale`:

```typescript
export interface UseAiFeedbackOptions {
  enabled?: boolean;
  debounceMs?: number;
  apiEndpoint?: string;
  documentId?: string;   // NEW
  locale?: string;       // NEW
}
```

**b) Added `detectLocale` helper** after imports:

```typescript
/** Simple locale detection: Korean chars present → 'ko', otherwise 'en'. */
function detectLocale(text: string): string {
  return /[\u3131-\u3163\uac00-\ud7a3]/.test(text) ? 'ko' : 'en';
}
```

**c) Destructured `documentId` and `locale`** from options at hook level (required for correct `useCallback` deps):

```typescript
const documentId = options?.documentId;
const locale = options?.locale;
```

**d) Updated fetch body** in `fetchFeedback` to include locale and documentId:

```typescript
body: JSON.stringify({
  text,
  locale: locale ?? detectLocale(text),
  documentId,
}),
```

**e) Added `documentId` and `locale` to `useCallback` dependency array** to satisfy `react-hooks/exhaustive-deps`:

```typescript
[editor, apiEndpoint, documentId, locale],
```

---

## Verification Results

### Type Check
```
Tasks: 6 successful, 6 total
```
PASSED

### Lint
```
Tasks: 6 successful, 6 total
```
PASSED (exhaustive-deps warning resolved by destructuring options and adding to deps array)

### Tests
```
@humanwrites/editor-react: 17 test files, 176 tests — all passed
@humanwrites/ui:            5 test files,  70 tests — all passed
@humanwrites/core:          7 test files,  72 tests — all passed

Tasks: 3 successful, 3 total
```
PASSED — 318 tests total, 0 failures
