# QA Cycle 1 — Backend Fix Results

> **Date**: 2026-02-19
> **Developer**: Backend Developer Agent

---

## Verification Results

- **spotlessApply**: PASS
- **compileKotlin**: PASS
- **test**: PASS (139 tests, 0 failures, 0 ignored)

---

## Fix Group 1 (CRITICAL): V4 Migration Schema Rewrite

**Files modified**:
- `backend/src/main/resources/db/migration/V4__create_keystroke_events.sql`

**Changes**: Rewrote entire V4 migration to match the Exposed ORM (`KeystrokeEvents.kt`). Old schema had aggregated window columns (`window_start`, `window_end`, `keystroke_count`, `avg_wpm`, etc.). New schema has individual event columns (`id`, `session_id`, `event_type`, `key_category`, `timestamp_ms`, `dwell_time_ms`, `flight_time_ms`, `time`). Added additional index on `(session_id, timestamp_ms)`.

---

## Fix Group 3 (HIGH): WebSocket Authentication Enforcement

**Files modified**:
- `backend/src/main/kotlin/com/humanwrites/config/WebSocketConfig.kt`

**Changes**: STOMP CONNECT interceptor now **rejects** connections with missing or invalid JWT tokens by throwing `MessageDeliveryException`. Previously, control fell through allowing unauthenticated WebSocket connections.

---

## Fix Group 4 (HIGH): Certificate Score Forgery Prevention

**Files modified**:
- `backend/src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt`
- `backend/src/main/kotlin/com/humanwrites/domain/certificate/CertificateService.kt`
- `backend/src/test/kotlin/com/humanwrites/unit/CertificateServiceTest.kt`
- `backend/src/test/kotlin/com/humanwrites/integration/CertificateIntegrationTest.kt`

**Changes**:
- `IssueCertificateRequest`: Removed all client-provided score fields (`overallScore`, `grade`, `label`, `keystrokeDynamicsScore`, etc.). Made `sessionId` required (non-nullable).
- `CertificateService.issueCertificate()`: Now takes `sessionId: UUID` (required). Removed all `client*` parameters. Scoring is always server-computed from keystroke data.
- Removed `resolveScoring()`, `ResolvedScoring`, and `ScoringSource` — no longer needed.
- Changed `keystrokeService` from nullable to required.
- Throws `IllegalArgumentException` if session has no keystroke data.
- Updated all tests to match new API.

---

## Fix Group 5 (HIGH): Input Validation & Rate Limiting

**Files modified**:
- `backend/src/main/kotlin/com/humanwrites/presentation/dto/request/AiRequests.kt`
- `backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt`
- `backend/src/main/kotlin/com/humanwrites/presentation/rest/GlobalExceptionHandler.kt`
- `backend/src/main/kotlin/com/humanwrites/presentation/dto/request/DocumentRequests.kt`
- `backend/src/main/kotlin/com/humanwrites/presentation/rest/DocumentController.kt`
- `backend/src/main/kotlin/com/humanwrites/presentation/rest/AiController.kt`
- `backend/src/test/kotlin/com/humanwrites/unit/AiGatewayServiceTest.kt`
- `backend/src/test/kotlin/com/humanwrites/unit/RedisRateLimiterTest.kt`
- `backend/src/test/kotlin/com/humanwrites/integration/AiGatewayIntegrationTest.kt`

**New files**:
- `backend/src/main/kotlin/com/humanwrites/domain/ai/RateLimitExceededException.kt`

**Changes**:
- `SpellingRequest`: Added `@Size(max=50000)` on text, `@Pattern(regexp="^(ko|en)$")` on locale, changed `documentId` from `String` to `UUID`.
- `AcceptSuggestionsRequest`: Changed `documentId` from `String` to `UUID`.
- `AiGatewayService`: Rate limit now throws `RateLimitExceededException` instead of returning empty list. Added `@Scheduled` cleanup method for expired rate limit entries (every 5 minutes).
- `GlobalExceptionHandler`: Added handler for `RateLimitExceededException` returning HTTP 429 with `Retry-After: 60` header.
- `DocumentCreateRequest/UpdateRequest`: Added `@Size(max=500000)` on content fields.
- `DocumentController.list()`: Page size clamped to `1..100`.
- `AiController`: Added `@Valid` on request body, removed manual `UUID.fromString()` calls.
- Updated 3 test files to expect `RateLimitExceededException` instead of empty list.

---

## Fix Group 6 (MEDIUM): Error Count Bug

**Files modified**:
- `backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt` (line 181)
- `backend/src/main/kotlin/com/humanwrites/domain/session/KeystrokeService.kt` (line 78)

**Changes**: Fixed `errorCount` calculation in both files. Was counting `keyCategory == "modifier"` (Shift, Ctrl, Alt) instead of `keyCategory == "navigation"` (Backspace, Delete). This bug made error rates always zero, breaking scoring accuracy.

---

## Fix Group 9 (MEDIUM): CORS Configuration

**Files modified**:
- `backend/src/main/resources/application.yml`
- `backend/src/main/kotlin/com/humanwrites/config/WebConfig.kt`
- `backend/src/main/kotlin/com/humanwrites/config/WebSocketConfig.kt`

**Changes**: CORS allowed origins are now configurable via `app.cors.allowed-origins` in `application.yml` (defaults to `http://localhost:3000`). Supports comma-separated list of origins via `CORS_ALLOWED_ORIGINS` env var. Both REST (`WebConfig`) and WebSocket (`WebSocketConfig`) share the same config.

---

## Fix Group 10 (MEDIUM): Rate Limit Map Cleanup

**Files modified**:
- `backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt`
- `backend/src/main/kotlin/com/humanwrites/HumanWritesApplication.kt`

**Changes**: Added `@Scheduled(fixedRate = 300_000)` cleanup method to evict expired rate limit entries from the in-memory `ConcurrentHashMap`. Added `@EnableScheduling` to the main application class.

---

## Fix Group 11 (MEDIUM): Session State Warning

**Files modified**:
- `backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`

**Changes**: Added `@PostConstruct` init log ("sessions are in-memory and will be lost on restart") and `@PreDestroy` shutdown warning (logs count of active sessions being lost).

---

## Fix Group 12 (MEDIUM): CSRF Documentation

**Files modified**:
- `backend/src/main/kotlin/com/humanwrites/config/SecurityConfig.kt`

**Changes**: Added explicit documentation comment explaining why CSRF is disabled (API-only backend with SameSite=Lax cookies + CORS).

---

## Summary

| Fix Group | Severity | Status |
|-----------|----------|--------|
| 1. V4 Migration Schema | Critical | FIXED |
| 3. WebSocket Auth | High | FIXED |
| 4. Certificate Score Forgery | High | FIXED |
| 5. Input Validation + Rate Limiting | High | FIXED |
| 6. Error Count Bug | Medium | FIXED |
| 9. CORS Configuration | Medium | FIXED |
| 10. Rate Limit Cleanup | Medium | FIXED |
| 11. Session State Warning | Medium | FIXED |
| 12. CSRF Documentation | Medium | FIXED |

**Note**: Fix Group 2 (STOMP field name alignment) and Fix Groups 7, 8, 13 are frontend-only fixes and were not included in this backend fix batch.
