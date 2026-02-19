# QA Cycle 2: Re-Test & Regression Report

> **Date**: 2026-02-19
> **Tester**: test-expert (QA Cycle 2)
> **Fix Commit**: `1f1124f` (qa-cycle-1: fix 20 of 22 issues)
> **Test Level**: COMPREHENSIVE (High-Tier)

---

## Environment

- **Backend**: Kotlin + Spring Boot 3.x, Gradle build
- **Frontend**: Next.js 15, Turborepo monorepo (pnpm)
- **Test Suites**:
  - Backend: **139 tests, 0 failures, 0 errors**
  - Frontend: **318 tests, 0 failures** (core: 72, ui: 70, editor-react: 176)
  - Type-check: **All 6 packages clean**
  - Build: **Backend + Frontend both succeed**

---

## Original Issue Verification (22 Issues from QA Cycle 1)

### FIXED (16 issues)

| # | Severity | Issue | Status | Evidence |
|---|----------|-------|--------|----------|
| 1 | CRITICAL | V4 migration schema mismatch with ORM | FIXED | V4 migration now matches `KeystrokeEvents` table exactly: `id BIGSERIAL`, `session_id UUID`, `event_type VARCHAR(10)`, `key_category VARCHAR(20)`, `timestamp_ms BIGINT`, `dwell_time_ms INTEGER`, `flight_time_ms INTEGER`, `time TIMESTAMPTZ` |
| 2 | CRITICAL | Realtime keystroke field name mismatch | FIXED | `keystroke-sender.ts` now uses `eventType`/`timestampMs`/`dwellTimeMs`/`flightTimeMs` matching backend DTO exactly |
| 3 | HIGH | STOMP WebSocket missing auth | FIXED | `WebSocketConfig.kt` `preSend()` now validates JWT Bearer token and throws `MessageDeliveryException` on failure |
| 4 | HIGH | Certificate endpoint accepts client-provided scores | FIXED | `IssueCertificateRequest` removed all score fields; `sessionId: UUID` is required; server always computes scores via `CertificateService` |
| 5 | HIGH | AI endpoint missing input validation | FIXED | `AiRequests.kt` has `@Size(max=50000)` on text, `@Pattern` on locale, `UUID` type for documentId |
| 6 | HIGH | Rate limiting returns 200 instead of 429 | FIXED | `RateLimitExceededException` thrown, `GlobalExceptionHandler` returns 429 with `Retry-After: 60` header |
| 7 | HIGH | CORS hardcoded to `*` | FIXED | `WebConfig.kt` reads from `@Value("\${app.cors.allowed-origins}")`, no more wildcard default |
| 8 | HIGH | Document endpoint missing pagination bounds | FIXED | `DocumentController.kt` uses `size.coerceIn(1, 100)` to cap page size |
| 11 | MEDIUM | Error key counting uses `modifier` instead of `navigation` | FIXED | `SessionWebSocketHandler.kt` now filters `navigation` category for error count |
| 12 | MEDIUM | Certificate accessibility missing description | FIXED | `CertificateModal.tsx` includes `<Dialog.Description>` with `sr-only` class |
| 13 | MEDIUM | Verify page unsafe JSON parsing | FIXED | `verify/[shortHash]/page.tsx` wraps `JSON.parse` in try-catch with fallback values |
| 14 | MEDIUM | Duplicated typing metric types | FIXED | `useTypingMetrics.ts` imports `KeystrokeEvent`, `KeyCategory`, `KeystrokeStatVector` from `@humanwrites/core` instead of re-declaring |
| 15 | MEDIUM | In-memory rate limit map unbounded growth | FIXED | `@Scheduled(fixedRate = 300_000)` cleanup removes expired entries every 5 minutes |
| 16 | MEDIUM | WebSocket session map unbounded growth | FIXED | Sessions cleaned up in `handleEndSession()` via `activeSessions.remove()` |
| 18 | LOW | Missing STOMP error frame handling | FIXED | `keystroke-sender.ts` has `onStompError` and `onWebSocketError` callbacks |
| 19 | LOW | Missing WebSocket disconnect handling | FIXED | Reconnect logic with exponential backoff and max 5 retries implemented in `keystroke-sender.ts` |

### NOT FIXED — By Design / Low Priority (6 issues)

| # | Severity | Issue | Status | Justification |
|---|----------|-------|--------|---------------|
| 9 | MEDIUM | No CSRF protection on REST endpoints | DEFERRED | Spring Security CSRF disabled; relies on JWT in HttpOnly cookie + SameSite=Lax. Acceptable for MVP API-only backend; full CSRF can be added post-MVP if needed. |
| 10 | MEDIUM | In-memory session store (not Redis) | DEFERRED | MVP single-instance deployment; sessions are write-through to DB. Redis session store is a post-MVP scalability concern, not a correctness bug. |
| 17 | MEDIUM | OpenAPI pipeline not wired | DEFERRED | `make openapi-generate` target exists but SpringDoc integration is not yet running. `api-client` package has placeholder structure. This is scheduled post-MVP integration work, not a regression. |
| 20 | LOW | React `act()` warnings in tests | DEFERRED | 2 warnings in `useKeyboardShortcuts.test.ts` for Cmd+Shift+I / Ctrl+Shift+I tests. Tests pass correctly; this is a React testing library timing issue, not a functionality bug. |
| 21 | LOW | Next.js ESLint extends from `next/core-web-vitals` | DEFERRED | Works correctly for current setup. Migration to flat config is cosmetic, not blocking. |
| 22 | LOW | Bundle size not measured | DEFERRED | No bundle analysis configured yet. Performance monitoring is a post-MVP concern. Initial JS bundle target is <150KB gzip per CLAUDE.md. |

---

## New Issues Found in QA Cycle 2

### NEW-1: Core vs Realtime KeystrokeEvent Type Incompatibility

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Location** | `frontend/packages/core/src/typing-analyzer/keystroke.ts:11` vs `frontend/packages/realtime/src/keystroke-sender.ts:5` |
| **Category** | Cross-Module Type Mismatch |

**Description**: Two separate `KeystrokeEvent` interfaces exist with incompatible field names:

| Field | `@humanwrites/core` | `@humanwrites/realtime` |
|-------|---------------------|------------------------|
| Event type | `type: 'keydown' \| 'keyup'` | `eventType: 'keydown' \| 'keyup'` |
| Timestamp | `timestamp: number` | `timestampMs: number` |
| Dwell time | `dwellTime?: number` | `dwellTimeMs?: number` |
| Flight time | `flightTime?: number` | `flightTimeMs?: number` |

The `core` package uses semantic names (`type`, `timestamp`) matching the CLAUDE.md contract, while `realtime` uses the backend wire format (`eventType`, `timestampMs`).

**Impact**: When these packages are wired together (editor captures keystrokes via core types, sends via realtime types), a mapping layer will be required. Currently the realtime package is not yet integrated into the app, so this is **latent** — no runtime failure today, but will surface during integration.

**Recommendation**: Add a `toWireFormat()` / `fromWireFormat()` mapping function in either `@humanwrites/core` or `@humanwrites/realtime` to explicitly convert between the two representations.

### NEW-2: V5 Continuous Aggregate Counts `modifier` Instead of `navigation`

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Location** | `backend/src/main/resources/db/migration/V5__add_continuous_aggregate.sql:13` |
| **Category** | Data Consistency |

**Description**: The V5 continuous aggregate view counts `modifier` keys in column `modifier_keys`:
```sql
COUNT(*) FILTER (WHERE key_category = 'modifier') AS modifier_keys,
```

While the application code (`SessionWebSocketHandler.kt`) was fixed to use `navigation` category for error counting, the aggregate view still counts `modifier`. The column is named `modifier_keys` (not `error_count`), so this is semantically correct — it counts modifier key usage, which is a separate metric from error counting.

**Impact**: LOW — The column name matches its content (`modifier_keys` counts modifier keys). No functional bug. However, if any future feature wants to use the aggregate for error-rate analysis, it would need a new column for `navigation` keys.

**Recommendation**: No immediate action needed. If error-rate analytics are added via the aggregate view, add a `navigation_keys` column in a new migration.

---

## Regression Testing

### Backend Regression Check

| Check | Result | Notes |
|-------|--------|-------|
| All 139 tests pass | PASS | 0 failures, 0 errors |
| WebSocket flow tests (12) | PASS | Full lifecycle, auth, concurrent sessions |
| JWT token tests (13) | PASS | Create, validate, expire, wrong key |
| Anomaly detector tests (11) | PASS | Speed, rhythm, paste, pause detection |
| Keystroke service tests (9) | PASS | Aggregation, windowing, WPM |
| AI gateway tests (5) | PASS | Routing, rate limiting, graceful degradation |
| Certificate service tests (14) | PASS | Signing, verification, server-side scoring |
| Document controller tests (8) | PASS | CRUD, pagination bounds |
| Writing session tests (10) | PASS | Start, end, keystroke batches |
| Scoring service tests (8) | PASS | Layer 1 calculation |
| Ed25519 signer tests (7) | PASS | Sign, verify, PEM export |
| Auth/user tests (19) | PASS | Register, login, OAuth, profile |
| Redis/cache tests (18) | PASS | Caching, rate limiting, fallback |
| Build succeeds | PASS | `./gradlew build` clean |

### Frontend Regression Check

| Check | Result | Notes |
|-------|--------|-------|
| Core package (72 tests) | PASS | Scoring, keystroke analysis, certificates |
| UI package (70 tests) | PASS | Components, accessibility |
| Editor-react package (176 tests) | PASS | Hooks, store, extensions, shortcuts |
| Type-check (6 packages) | PASS | All clean, zero errors |
| Build succeeds | PASS | Turborepo full build clean |

### No New Regressions Detected

The fix commit `1f1124f` did not introduce any test failures, type errors, or build breakages. All existing functionality continues to work as expected.

---

## Summary

| Category | Count |
|----------|-------|
| Original issues FIXED | **16** |
| Original issues DEFERRED (by design) | **6** |
| New issues found | **2** (1 MEDIUM, 1 LOW) |
| Regressions found | **0** |
| Total backend tests | **139 pass** |
| Total frontend tests | **318 pass** |
| Type-check errors | **0** |
| Build status | **All green** |

## Verdict

**PRODUCTION-READY (MVP)** with caveats:

1. All critical and high-severity issues from QA Cycle 1 have been fixed and verified.
2. The 6 deferred issues are all acceptable for MVP scope (documented trade-offs, not bugs).
3. NEW-1 (core/realtime type mismatch) is latent and will need a mapping layer before the realtime package is integrated — but it does not affect current functionality.
4. NEW-2 (V5 aggregate counting modifier vs navigation) is informational only, not a bug.
5. Zero regressions from the fix commit.

The application is ready for MVP deployment with the understanding that NEW-1 must be resolved before wiring the realtime keystroke pipeline end-to-end.
