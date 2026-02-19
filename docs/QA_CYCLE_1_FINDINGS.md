# QA Cycle 1 - Comprehensive Test Expert Findings

## Summary
- **Total issues found**: 22
- **Critical**: 2 | **High**: 6 | **Medium**: 9 | **Low**: 5

### Test Results Overview
| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| Backend (Kotlin/Kotest) | 141 | 141 | 0 |
| Frontend core | 72 | 72 | 0 |
| Frontend editor-react | 176 | 176 | 0 |
| Frontend ui | 70 | 70 | 0 |
| **Total** | **459** | **459** | **0** |

### Code Quality Checks
| Check | Status |
|-------|--------|
| Backend compile | PASS |
| Backend spotlessCheck | PASS |
| Frontend type-check (6 packages) | PASS |
| Frontend lint (6 packages) | PASS |
| Frontend build (Next.js) | PASS |

### Test Coverage
| Package | Statements | Branch | Functions | Lines |
|---------|-----------|--------|-----------|-------|
| @humanwrites/core | 99.06% | 90% | 100% | 99.02% |
| @humanwrites/editor-react | 94.65% | 79.54% | 94.73% | 96.18% |
| @humanwrites/ui | 81.74% | 86.66% | 87.75% | 83.76% |

---

## Critical Issues (Must Fix)

### Issue 1: ORM Table Definition vs DB Migration Schema Mismatch
- **Severity**: Critical
- **Location**: `backend/src/main/kotlin/com/humanwrites/domain/session/KeystrokeEvents.kt:6-15` vs `backend/src/main/resources/db/migration/V4__create_keystroke_events.sql`
- **Description**: The Exposed ORM `KeystrokeEvents` table object defines columns for **individual keystroke events** (`id`, `session_id`, `event_type`, `key_category`, `timestamp_ms`, `dwell_time_ms`, `flight_time_ms`, `time`), but the Flyway V4 migration creates a table for **aggregated windows** (`time`, `session_id`, `window_start`, `window_end`, `keystroke_count`, `avg_wpm`, `wpm_std_dev`, `avg_dwell_time`, `avg_flight_time`, `flight_time_entropy`, `error_rate`, `pause_count`, `burst_pause_ratio`). These are completely different schemas.
- **Reproduction**: Start the backend against a real PostgreSQL database with Flyway migrations applied. Any call to `keystrokeRepository.batchInsert()` will fail with column-not-found errors.
- **Impact**: **Entire keystroke persistence pipeline is broken at runtime.** Writing sessions cannot store keystroke data in the real database. All 141 backend tests pass because they mock the repository — this bug is invisible to unit/integration tests.
- **Fix**: Align V4 migration with ORM table definition, OR update the ORM to match the migration schema. The ORM (individual events) appears to be the correct newer design since the WebSocket handler sends individual events. The V4 migration needs to be rewritten.

### Issue 2: Frontend↔Backend STOMP Field Name Mismatch
- **Severity**: Critical
- **Location**: `frontend/packages/realtime/src/keystroke-sender.ts:3-9` vs `backend/src/main/kotlin/com/humanwrites/presentation/dto/request/SessionRequests.kt:14-20`
- **Description**: The frontend `KeystrokeEvent` sends fields named `type`, `timestamp`, `dwellTime`, `flightTime`, but the backend `KeystrokeEventDto` expects `eventType`, `timestampMs`, `dwellTimeMs`, `flightTimeMs`. Jackson deserialization will produce null/zero values for all these fields.
- **Reproduction**: Send a keystroke batch over STOMP. Backend will receive events with `eventType=null`, `timestampMs=0`, `dwellTimeMs=null`, `flightTimeMs=null`.
- **Impact**: **All keystroke data received by the server is garbage.** WPM, dwell times, flight times — all analysis results will be meaningless. Scoring and anomaly detection are based on corrupted data.
- **Fix**: Either rename frontend fields to match backend (`eventType`, `timestampMs`, etc.) or add `@JsonProperty` annotations on the backend DTO, or add a serialization mapping layer.

---

## High Priority Issues

### Issue 3: WebSocket Unauthenticated Connection Allowed
- **Severity**: High
- **Location**: `backend/src/main/kotlin/com/humanwrites/config/WebSocketConfig.kt:48-62`
- **Description**: The STOMP CONNECT interceptor validates JWT if present but does **not reject connections** when the token is missing or invalid. If `token == null` or `validateToken()` returns null, the connection proceeds without any user identity. The `@MessageMapping` handlers then receive a `principal` parameter, but Spring may provide a null principal or throw at runtime.
- **Reproduction**: Connect to `ws://localhost:8080/ws` without an Authorization header. The connection succeeds.
- **Impact**: Unauthenticated users could potentially send keystroke data or start writing sessions. The ownership check in `handleKeystrokeBatch` uses `principal.name`, which could NPE.
- **Fix**: Reject the STOMP CONNECT frame when the token is missing or invalid by throwing `MessageDeliveryException` or returning null from `preSend`.

### Issue 4: Client-Provided Certificate Scores (Score Manipulation)
- **Severity**: High
- **Location**: `backend/src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt:31-39`
- **Description**: The `IssueCertificateRequest` accepts optional client-provided scores (`overallScore`, `grade`, `label`, etc.). When `sessionId` is null, the service falls back to these client values. This allows a malicious user to POST a certificate with `overallScore: 100, grade: "Certified"` without any actual typing data.
- **Reproduction**: Call `POST /api/certificates` with `sessionId: null, overallScore: 100, grade: "Certified"` in the body.
- **Impact**: Certificate integrity is undermined. Anyone can forge a "Certified" certificate.
- **Fix**: Either make `sessionId` required (always use server-side scoring), or validate client scores against a minimum data threshold before accepting them.

### Issue 5: Frontend KeyCategory Type Mismatch Between Packages
- **Severity**: High
- **Location**: `frontend/packages/realtime/src/keystroke-sender.ts:5` vs `frontend/packages/core/src/typing-analyzer/keystroke.ts:2-9`
- **Description**: The `@humanwrites/core` package defines `KeyCategory` as `'letter' | 'number' | 'punct' | 'modifier' | 'navigation' | 'function' | 'other'` (7 values), but `@humanwrites/realtime` `KeystrokeEvent` uses `keyCategory: 'letter' | 'number' | 'punct' | 'modifier'` (4 values only). Navigation, function, and other categories are excluded from the realtime type.
- **Reproduction**: Type Backspace/Delete (navigation category) — these events won't match the `KeystrokeSender.KeystrokeEvent` type.
- **Impact**: Error rate calculation on the server side will always be 0 since `navigation` category events are never sent. The `errorRate` metric in `metrics-calculator.ts:127-131` uses `navigation` keyCategory to count errors, but these are dropped before server transmission.
- **Fix**: Unify the `KeystrokeEvent` type — either import from `@humanwrites/core` in the realtime package, or extend the realtime type to include all categories.

### Issue 6: No Input Validation on AI Spelling Request
- **Severity**: High
- **Location**: `backend/src/main/kotlin/com/humanwrites/presentation/dto/request/AiRequests.kt:3-7`
- **Description**: `SpellingRequest.text` has no `@Size` constraint. There's no maximum length validation on the text sent to the AI API. `locale` is unchecked (could be any string). `documentId` is a raw String without UUID format validation.
- **Reproduction**: Send `POST /api/ai/spelling` with a 10MB text body.
- **Impact**: Cost spike from sending massive text to Claude/OpenAI API. Potential DoS via large payload processing. The AI API call may time out, blocking the virtual thread.
- **Fix**: Add `@field:Size(max = 50000)` on `text`, validate `locale` against allowed values (e.g., `ko`, `en`), change `documentId` to `UUID` type or add `@Pattern` validation.

### Issue 7: Rate Limiting Returns Empty List Instead of HTTP 429
- **Severity**: High
- **Location**: `backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt:38-41`
- **Description**: When rate limit is exceeded, `analyzeSpelling()` returns an empty list. The client has no way to distinguish between "no spelling errors found" and "you've been rate limited."
- **Reproduction**: Make more than `rateLimitPerMinute` requests in 60 seconds. Response will be `{ "items": [] }` with HTTP 200.
- **Impact**: Poor UX — user thinks their text has no errors when actually the AI wasn't consulted. No client-side retry or notification possible.
- **Fix**: Throw a custom `RateLimitExceededException` that the `GlobalExceptionHandler` maps to HTTP 429 with `Retry-After` header.

### Issue 8: No Document Content Size Limit
- **Severity**: High
- **Location**: `backend/src/main/kotlin/com/humanwrites/presentation/dto/request/DocumentRequests.kt:12`
- **Description**: `DocumentCreateRequest.content` and `DocumentUpdateRequest.content` have no `@Size` constraint. Title is limited to 500 chars, but content is unbounded.
- **Reproduction**: Send `POST /api/documents` with a 100MB content body.
- **Impact**: Database storage abuse, potential OOM on the server during JSON parsing.
- **Fix**: Add a reasonable content size limit (e.g., `@field:Size(max = 500_000)` for ~500KB text).

---

## Medium Priority Issues

### Issue 9: CSRF Disabled with HttpOnly Cookie Auth
- **Severity**: Medium
- **Location**: `backend/src/main/kotlin/com/humanwrites/config/SecurityConfig.kt:24`
- **Description**: CSRF protection is disabled (`csrf { it.disable() }`), but authentication uses HttpOnly cookies. The CLAUDE.md specifies "CSRF 방지: HttpOnly Cookie + SameSite=Lax". While SameSite helps, it's not sufficient in all browsers/scenarios (e.g., top-level navigations).
- **Impact**: A malicious website could potentially craft requests that include the user's auth cookies (cross-site request forgery). The impact is mitigated by SameSite cookies and the API-only nature (no form submissions), but still a concern for cookie-based auth.
- **Fix**: Either enable CSRF with a cookie-to-header token pattern, or ensure all cookies have `SameSite=Strict` (currently likely `Lax` for OAuth redirect compatibility).

### Issue 10: In-Memory Session State Not Persisted
- **Severity**: Medium
- **Location**: `backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt:28`
- **Description**: `activeSessions` is a `ConcurrentHashMap` in JVM memory. All active writing sessions are lost on server restart/deploy.
- **Impact**: Users lose their writing session state during deployments. Keystroke analysis may be incomplete. No recovery mechanism.
- **Fix**: Back session state with Redis, or implement session recovery from persisted keystroke data. For MVP, at minimum log a warning on startup about lost sessions.

### Issue 11: Error Count Misidentified as Modifier Keys
- **Severity**: Medium
- **Location**: `backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt:181`
- **Description**: `val errorCount = keydowns.count { it.keyCategory == "modifier" }` — modifier keys (Shift, Ctrl, Alt, Meta) are counted as errors. Actual error corrections would be Backspace/Delete keys, which are typically `navigation` category.
- **Impact**: The `errorCount` in `KeystrokeWindow` is always wrong. It counts Shift presses as errors rather than actual correction keys, inflating or deflating the anomaly detection error rate.
- **Fix**: Change to `it.keyCategory == "navigation"` or create a specific "error" category for Backspace/Delete.

### Issue 12: In-Memory Rate Limit Map Never Cleaned Up
- **Severity**: Medium
- **Location**: `backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt:29`
- **Description**: The `rateLimitMap: ConcurrentHashMap<UUID, RateLimitEntry>` grows unboundedly. Old entries from users who no longer make requests are never removed.
- **Impact**: Slow memory leak over time proportional to unique users. Eventually causes increased GC pressure.
- **Fix**: Add a scheduled task to clean up expired entries, or use a Caffeine/Guava cache with TTL.

### Issue 13: Missing Dialog.Description (Accessibility / WCAG)
- **Severity**: Medium
- **Location**: `frontend/packages/ui/src/organisms/CertificateModal/CertificateModal.tsx:276-334`
- **Description**: The Radix UI `Dialog.Content` component is missing a `Dialog.Description` (or `aria-describedby`). This triggers a console warning: `Warning: Missing Description or aria-describedby={undefined} for {DialogContent}`.
- **Impact**: Screen readers won't announce the dialog's purpose to users. WCAG AA compliance issue per project requirements.
- **Fix**: Add `<Dialog.Description>` or `<VisuallyHidden><Dialog.Description>...</Dialog.Description></VisuallyHidden>` inside the Dialog.Content.

### Issue 14: Verify Page JSON.parse Without Error Handling
- **Severity**: Medium
- **Location**: `frontend/apps/web/app/verify/[shortHash]/page.tsx:133-134`
- **Description**: `JSON.parse(cert.verificationData)` and `JSON.parse(cert.aiUsageData)` have no try-catch. If the stored JSON is malformed, this crashes the entire server-side render.
- **Impact**: A single certificate with corrupted data would make the verification page return a 500 error. Since this is SSR, it affects all users trying to verify that certificate.
- **Fix**: Wrap in try-catch with a fallback UI showing "Verification data unavailable."

### Issue 15: CORS Hardcoded to localhost:3000
- **Severity**: Medium
- **Location**: `backend/src/main/kotlin/com/humanwrites/config/WebConfig.kt:12` and `WebSocketConfig.kt:36`
- **Description**: Both REST and WebSocket CORS are hardcoded to `http://localhost:3000`. No production URL configuration via environment variables.
- **Impact**: Application won't work in production without code changes. Should be configurable.
- **Fix**: Use `@Value` or `application.yml` property for allowed origins with environment-specific profiles.

### Issue 16: No Pagination Size Limit on Document List
- **Severity**: Medium
- **Location**: `backend/src/main/kotlin/com/humanwrites/presentation/rest/DocumentController.kt:36`
- **Description**: The `size` parameter defaults to 20 but has no maximum. A request with `?size=999999` would attempt to load all documents at once.
- **Impact**: Memory pressure and slow response for users with many documents.
- **Fix**: Add `@Max(100)` validation on the `size` parameter.

### Issue 17: OpenAPI Schema Not Generated / Orval Pipeline Incomplete
- **Severity**: Medium
- **Location**: `schema/` (empty directory), `frontend/packages/api-client/src/generated/` (empty)
- **Description**: The OpenAPI → orval pipeline hasn't been executed. The `schema/` directory is empty, and `api-client` generated exports are commented out. Frontend REST API calls are not using auto-generated typed hooks.
- **Impact**: No type safety between frontend REST calls and backend API contracts. Manual type definitions may drift from actual API responses.
- **Fix**: Run the full pipeline: start backend → SpringDoc generates openapi.yaml → orval generates TypeScript hooks.

---

## Low Priority Issues

### Issue 18: Duplicated Type Definitions in useTypingMetrics
- **Severity**: Low
- **Location**: `frontend/packages/editor-react/src/hooks/useTypingMetrics.ts:6-24`
- **Description**: Comment says "mirrors typing-collector.ts — will unify later". `KeyCategory`, `KeystrokeEvent`, and `EditEvent` types are duplicated from `@humanwrites/core` instead of imported.
- **Impact**: Types can drift between packages. Maintenance burden.
- **Fix**: Import types from `@humanwrites/core` package.

### Issue 19: Missing `await` on `act()` in Test
- **Severity**: Low
- **Location**: `frontend/packages/editor-react/src/__tests__/useOfflineBuffer.test.ts:193`
- **Description**: `const flushPromise = act(async () => {` — React warns about calling `act(async () => ...)` without `await`. This could lead to interleaved test scopes and flaky behavior.
- **Impact**: Tests pass but may have subtle timing issues. Console warnings clutter test output.
- **Fix**: Change to `const flushPromise = await act(async () => {` or restructure the test.

### Issue 20: act() Warnings in Multiple Tests
- **Severity**: Low
- **Location**: `frontend/packages/editor-react/src/__tests__/use-ai-feedback.test.ts`, `useKeyboardShortcuts.test.ts`
- **Description**: Multiple tests produce "An update to TestComponent inside a test was not wrapped in act(...)" warnings. While tests pass, these indicate state updates happening outside the expected React testing lifecycle.
- **Impact**: Tests may become flaky as React becomes stricter about these warnings. Console noise.
- **Fix**: Wrap the state-triggering operations in `act()` blocks.

### Issue 21: Next.js ESLint Plugin Warning
- **Severity**: Low
- **Location**: Build output for `@humanwrites/web`
- **Description**: `⚠ The Next.js plugin was not detected in your ESLint configuration.` The build completes successfully but warns about missing the Next.js ESLint plugin.
- **Impact**: Missing Next.js-specific linting rules (e.g., Image component usage, link component patterns).
- **Fix**: Add `eslint-plugin-next` or `@next/eslint-plugin-next` to the web app's ESLint config.

### Issue 22: Editor Page Bundle Size Exceeds Target
- **Severity**: Low
- **Location**: Build output — `/editor` route: 336kB First Load JS
- **Description**: The project target is `< 150KB gzip` for initial JS bundle. The editor page loads 336kB First Load JS (likely ~100-120KB gzipped). The largest chunk is 317KB (likely TipTap/ProseMirror).
- **Impact**: Slower initial load on poor connections. May miss performance targets.
- **Fix**: Investigate TipTap tree-shaking, lazy-load non-critical extensions, consider splitting Inspector into a separate chunk.

---

## Code Quality Observations

### Positive Findings
1. **All 459 tests pass** across backend and frontend — zero failures
2. **Code style is clean** — spotlessCheck and ESLint both pass with zero warnings
3. **DOMPurify sanitization** is properly implemented for editor content (XSS protection)
4. **Good test coverage** — core: 99%, editor-react: 94.65%, ui: 81.74%
5. **Proper authorization** — Document controller checks ownership on all operations
6. **GDPR compliance** — Export and delete endpoints implemented
7. **Global exception handler** — No stack traces leaked to clients
8. **Ed25519 signing** — Proper implementation with dev-mode ephemeral key fallback
9. **Exponential backoff** in STOMP reconnection logic
10. **Web Worker fallback** — MetricsWorker gracefully degrades to requestIdleCallback

### Architecture Concerns
1. **All backend tests use mocks** — no Testcontainers-based integration tests that verify actual DB operations. The critical schema mismatch (Issue 1) went undetected because of this.
2. **Frontend↔Backend contract verification is manual** — the OpenAPI pipeline that should enforce type contracts isn't operational yet.
3. **No session limit per user** in WebSocket handler — no cap on `activeSessions` map size.

---

## Test Coverage Gaps

### Backend
- No integration test with real DB (Testcontainers) for keystroke persistence
- No test for WebSocket authentication rejection (unauthenticated CONNECT)
- No test for concurrent session limits
- No test for certificate score manipulation (client-provided scores)
- No load/stress test for WebSocket message handling

### Frontend
- `CertificateModal` has lowest coverage at 61.7% statements
- No test for `JSON.parse` failure in verify page
- No test for very large documents (performance/memory)
- No test for Korean IME edge cases in actual editor (only in collector unit tests)
- E2E tests exist but were not executed (require running backend)

---

## Verdict

**NOT PRODUCTION-READY**

Two critical issues (schema mismatch and STOMP field name mismatch) would cause the entire keystroke analysis pipeline to fail at runtime. The application compiles, tests pass, and builds succeed, but these runtime integration failures mean:
- Writing sessions cannot persist keystroke data correctly
- All scoring and certification results would be based on corrupted data
- The core value proposition (proving human authorship) is broken

**Recommended priority:**
1. Fix Critical Issues 1-2 first (schema alignment + field name mapping)
2. Fix High Issues 3-8 (security: WebSocket auth, score manipulation, input validation)
3. Fix Medium Issues 9-17 (accessibility, resilience, configuration)
4. Address Low Issues 18-22 (code quality, test hygiene)
