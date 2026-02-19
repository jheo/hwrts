# QA Cycle 1 — Fix Results

> **Date**: 2026-02-19
> **Fixes applied**: 13 fix groups from architect plan
> **Verification**: ALL PASS

## Verification Results

| Check | Status |
|-------|--------|
| Backend spotlessApply | PASS |
| Backend compileKotlin | PASS |
| Backend tests (139) | PASS (0 failures) |
| Frontend type-check (6 packages) | PASS |
| Frontend lint (6 packages) | PASS |
| Frontend tests (318) | PASS (0 failures) |

---

## Fixes Applied

### Fix Group 1 (Critical): V4 Migration Schema Alignment
- **Issue**: #1 — ORM defines individual keystroke event columns, V4 migration created aggregated window columns
- **Files modified**: `backend/src/main/resources/db/migration/V4__create_keystroke_events.sql`
- **Change**: Rewrote V4 migration to match Exposed ORM `KeystrokeEvents.kt` — individual event columns (id, session_id, event_type, key_category, timestamp_ms, dwell_time_ms, flight_time_ms, time)

### Fix Group 2 (Critical): STOMP Field Name Alignment + KeyCategory Unification
- **Issues**: #2, #5
- **Files modified**: `frontend/packages/realtime/src/keystroke-sender.ts`, `frontend/packages/realtime/src/index.ts`, `frontend/packages/realtime/package.json`
- **Change**: Updated KeystrokeSender to map frontend field names to backend expectations (type→eventType, timestamp→timestampMs, dwellTime→dwellTimeMs, flightTime→flightTimeMs). Unified KeyCategory to import from `@humanwrites/core`.

### Fix Group 3 (High): WebSocket Authentication Enforcement
- **Issue**: #3
- **Files modified**: `backend/src/main/kotlin/com/humanwrites/config/WebSocketConfig.kt`
- **Change**: STOMP CONNECT interceptor now throws MessageDeliveryException when Authorization header is missing or JWT is invalid

### Fix Group 4 (High): Certificate Score Forgery Prevention
- **Issue**: #4
- **Files modified**: `backend/src/main/kotlin/com/humanwrites/domain/certificate/CertificateService.kt`, `backend/src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt`
- **Change**: Made sessionId required (non-nullable). Removed client-provided score parameters. Server always computes scores from keystroke session data.

### Fix Group 5 (High): Input Validation + HTTP 429
- **Issues**: #6, #7, #8, #16
- **Files modified**: `backend/src/main/kotlin/com/humanwrites/presentation/dto/request/AiRequests.kt`, `backend/src/main/kotlin/com/humanwrites/presentation/dto/request/DocumentRequests.kt`, `backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt`, `backend/src/main/kotlin/com/humanwrites/presentation/rest/GlobalExceptionHandler.kt`, `backend/src/main/kotlin/com/humanwrites/presentation/rest/AiController.kt`, `backend/src/main/kotlin/com/humanwrites/presentation/rest/DocumentController.kt`
- **New file**: `backend/src/main/kotlin/com/humanwrites/domain/ai/RateLimitExceededException.kt`
- **Changes**: Added @Size validation on text (50K) and content (500K). Added locale @Pattern validation. Rate limiting now throws RateLimitExceededException → HTTP 429 with Retry-After header. Page size clamped to max 100.

### Fix Group 6 (Medium): Error Count Bug
- **Issue**: #11
- **Files modified**: `backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`, `backend/src/main/kotlin/com/humanwrites/domain/session/KeystrokeService.kt`
- **Change**: Changed error counting from `keyCategory == "modifier"` to `keyCategory == "navigation"` in both locations

### Fix Group 7 (Medium): Verify Page JSON.parse Safety
- **Issue**: #14
- **Files modified**: `frontend/apps/web/app/verify/[shortHash]/page.tsx`
- **Change**: Wrapped JSON.parse calls in try-catch with fallback values for corrupted certificate data

### Fix Group 8 (Medium): CertificateModal Accessibility
- **Issue**: #13
- **Files modified**: `frontend/packages/ui/src/organisms/CertificateModal/CertificateModal.tsx`, `frontend/packages/ui/package.json`
- **New dependency**: `@radix-ui/react-visually-hidden`
- **Change**: Added VisuallyHidden Dialog.Description for WCAG AA screen reader support

### Fix Group 9 (Medium): CORS Configuration
- **Issue**: #15
- **Files modified**: `backend/src/main/kotlin/com/humanwrites/config/WebConfig.kt`, `backend/src/main/kotlin/com/humanwrites/config/WebSocketConfig.kt`, `backend/src/main/resources/application.yml`
- **Change**: CORS allowed origins now configurable via `CORS_ALLOWED_ORIGINS` environment variable (defaults to localhost:3000)

### Fix Group 10 (Medium): Rate Limit Map Cleanup
- **Issue**: #12
- **Files modified**: `backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt`, `backend/src/main/kotlin/com/humanwrites/HumanWritesApplication.kt`
- **Change**: Added @Scheduled cleanup every 5 minutes for expired rate limit entries. Added @EnableScheduling.

### Fix Group 11 (Medium): Session State Warning
- **Issue**: #10
- **Files modified**: `backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`
- **Change**: Added @PostConstruct/@PreDestroy logging for in-memory session state lifecycle

### Fix Group 12 (Medium): CSRF Documentation
- **Issue**: #9
- **Files modified**: `backend/src/main/kotlin/com/humanwrites/config/SecurityConfig.kt`
- **Change**: Added explicit comment documenting CSRF disabled rationale (API-only, SameSite cookies, CORS)

### Fix Group 13 (Low): Code Hygiene
- **Issues**: #18, #19
- **Files modified**: `frontend/packages/editor-react/src/hooks/useTypingMetrics.ts`, `frontend/packages/editor-react/src/__tests__/useOfflineBuffer.test.ts`
- **Changes**: Replaced duplicated types with imports from `@humanwrites/core`. Fixed missing await on act().

---

## Additional Fixes During Verification
- Fixed `CertificateIntegrationTest.kt`: replaced null KeystrokeService with mockk
- Fixed `CertificateServiceTest.kt`: removed incorrect verify call
- Fixed `useTypingMetrics.ts` import order (ESLint import-x/order)
- Installed `@radix-ui/react-visually-hidden` dependency

## Test Updates
- `AiGatewayServiceTest.kt`: Updated for RateLimitExceededException
- `AiGatewayIntegrationTest.kt`: Updated for rate limit behavior change
- `CertificateServiceTest.kt`: Updated for required sessionId, server-only scoring
- `CertificateIntegrationTest.kt`: Updated for non-null KeystrokeService
- `RedisRateLimiterTest.kt`: Updated for exception-based rate limiting

---

## Total Files Changed: ~33
## Issues Addressed: 20 of 22 (Issues #17 OpenAPI pipeline and #22 bundle size deferred)
