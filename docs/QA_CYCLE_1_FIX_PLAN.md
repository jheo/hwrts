# QA Cycle 1 — Architect Fix Plan

> **Authored by**: Architect Agent (Oracle)
> **Date**: 2026-02-19
> **Based on**: `docs/QA_CYCLE_1_FINDINGS.md` (22 issues: 2 critical, 6 high, 9 medium, 5 low)

---

## Fix Priority Order

Fixes are grouped by logical dependency and ordered by severity. Within a group, the developer should work top-to-bottom.

---

### Fix Group 1: Flyway V4 Migration — Schema Alignment (Critical)

**Issues addressed**: #1 (ORM vs DB migration schema mismatch)
**Severity**: Critical

**Root cause**: The Flyway V4 migration (`V4__create_keystroke_events.sql`) creates a table for **aggregated windows** (columns: `window_start`, `window_end`, `keystroke_count`, `avg_wpm`, etc.), but the Exposed ORM (`KeystrokeEvents.kt`) defines columns for **individual keystroke events** (`id`, `session_id`, `event_type`, `key_category`, `timestamp_ms`, `dwell_time_ms`, `flight_time_ms`, `time`). The V5 continuous aggregate migration references the ORM's columns (e.g., `event_type`, `key_category`, `dwell_time_ms`), confirming the ORM is correct and V4 is wrong.

**Files to modify**:
1. `backend/src/main/resources/db/migration/V4__create_keystroke_events.sql`

**Exact changes needed**:

Replace the entire V4 migration body with a table matching the ORM:

```sql
-- Individual keystroke events (matches Exposed ORM: KeystrokeEvents.kt)
CREATE TABLE keystroke_events (
    id BIGSERIAL,
    session_id UUID NOT NULL REFERENCES writing_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(10) NOT NULL,
    key_category VARCHAR(20) NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    dwell_time_ms INTEGER,
    flight_time_ms INTEGER,
    time TIMESTAMPTZ NOT NULL
);

-- Convert to hypertable (TimescaleDB)
-- Falls back gracefully if TimescaleDB extension is not available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('keystroke_events', 'time', chunk_time_interval => INTERVAL '1 day');
        ALTER TABLE keystroke_events SET (
            timescaledb.compress,
            timescaledb.compress_segmentby = 'session_id'
        );
        PERFORM add_compression_policy('keystroke_events', INTERVAL '7 days');
        PERFORM add_retention_policy('keystroke_events', INTERVAL '90 days');
    ELSE
        RAISE NOTICE 'TimescaleDB not available, creating regular table';
    END IF;
END$$;

CREATE INDEX idx_keystroke_events_session_id ON keystroke_events(session_id, time DESC);
CREATE INDEX idx_keystroke_events_timestamp ON keystroke_events(session_id, timestamp_ms);
```

**Important Flyway consideration**: If this migration has already been applied to any dev database, developers must either:
- Drop and recreate the database (`docker compose down -v && docker compose up -d`), or
- Create a new V8 migration that `DROP TABLE IF EXISTS keystroke_events CASCADE;` then recreates it.

For MVP, **recommend the clean DB approach** since there's no production data.

**Verification**:
1. `./gradlew bootRun` — server starts without Flyway errors
2. V5 continuous aggregate creation succeeds (depends on V4 columns)
3. Send keystroke batch over STOMP → confirm rows appear in `keystroke_events` table with correct columns

---

### Fix Group 2: Frontend↔Backend STOMP Field Name Alignment (Critical)

**Issues addressed**: #2 (STOMP field name mismatch), #5 (KeyCategory type mismatch)
**Severity**: Critical + High

**Root cause (Issue #2)**: Frontend `KeystrokeSender.KeystrokeEvent` uses camelCase names (`type`, `timestamp`, `dwellTime`, `flightTime`) while backend `KeystrokeEventDto` expects `eventType`, `timestampMs`, `dwellTimeMs`, `flightTimeMs`. Jackson deserialization maps by field name, so all fields arrive as null/0.

**Root cause (Issue #5)**: Frontend `@humanwrites/realtime` defines `KeystrokeEvent.keyCategory` with only 4 categories (`letter | number | punct | modifier`), while `@humanwrites/core` has 7 (`+ navigation | function | other`). Navigation events (Backspace/Delete) are never sent, breaking error rate calculation on server.

**Recommended approach**: Fix on the **frontend side** — rename to match the backend DTO. The backend naming is more explicit and includes units (`Ms` suffix), which is clearer. Also unify the type by importing from `@humanwrites/core`.

**Files to modify**:
1. `frontend/packages/realtime/src/keystroke-sender.ts`
2. `frontend/packages/core/src/typing-analyzer/keystroke.ts` (reference only — this is the source of truth, no changes needed)

**Exact changes for `keystroke-sender.ts`**:

```typescript
import type { StompClientManager } from './stomp-client.js';
import type { KeyCategory } from '@humanwrites/core';

export interface KeystrokeEvent {
  eventType: 'keydown' | 'keyup';
  keyCategory: KeyCategory;
  timestampMs: number;
  dwellTimeMs?: number;
  flightTimeMs?: number;
}
```

This means the **callers** of `KeystrokeSender.addEvents()` must also be updated to provide the renamed fields. Search for all usages of `KeystrokeSender` and `addEvents` to find callsites that construct `KeystrokeEvent` objects.

**Files to check for callsite updates**:
- `frontend/packages/editor-react/src/hooks/useTypingMetrics.ts` — this constructs events to send. Update field mapping: `type` → `eventType`, `timestamp` → `timestampMs`, `dwellTime` → `dwellTimeMs`, `flightTime` → `flightTimeMs`.
- Any other file that imports from `@humanwrites/realtime` and constructs `KeystrokeEvent`.

**Verification**:
1. `pnpm -r run type-check` passes
2. `pnpm -r run test:unit` passes
3. Manual test: start a writing session, type some text, verify backend logs show non-null `eventType`, non-zero `timestampMs`, and varying `keyCategory` including `navigation` when pressing Backspace

---

### Fix Group 3: WebSocket Authentication Enforcement (High)

**Issues addressed**: #3 (WebSocket unauthenticated connection)
**Severity**: High (Security)

**Root cause**: `WebSocketConfig.kt:48-62` — the STOMP CONNECT interceptor validates JWT only if present, but does not reject connections when the token is missing or invalid. Control falls through to `return message`, allowing unauthenticated STOMP connections.

**Files to modify**:
1. `backend/src/main/kotlin/com/humanwrites/config/WebSocketConfig.kt`

**Exact changes in `preSend` method (lines 46-64)**:

```kotlin
override fun preSend(
    message: Message<*>,
    channel: MessageChannel,
): Message<*> {
    val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)
    if (accessor != null && StompCommand.CONNECT == accessor.command) {
        val token = accessor.getFirstNativeHeader("Authorization")?.removePrefix("Bearer ")
        if (token == null) {
            throw org.springframework.messaging.MessageDeliveryException("Missing Authorization header")
        }
        val userId = jwtTokenProvider.validateToken(token)
            ?: throw org.springframework.messaging.MessageDeliveryException("Invalid or expired JWT token")
        val auth = UsernamePasswordAuthenticationToken(
            userId.toString(),
            null,
            listOf(SimpleGrantedAuthority("ROLE_USER")),
        )
        accessor.user = auth
    }
    return message
}
```

**Verification**:
1. Connect to `ws://localhost:8080/ws` without Authorization header → connection rejected
2. Connect with invalid JWT → connection rejected
3. Connect with valid JWT → connection succeeds, `principal.name` is populated

---

### Fix Group 4: Certificate Score Forgery Prevention (High)

**Issues addressed**: #4 (Client-provided certificate scores)
**Severity**: High (Security)

**Root cause**: `CertificateService.resolveScoring()` falls back to client-provided scores when `sessionId` is null or has no keystroke data. `IssueCertificateRequest` accepts optional client scores without requiring a valid session. A malicious user can POST `sessionId: null, overallScore: 100, grade: "Certified"`.

**Recommended approach**: Make `sessionId` required. Remove client-provided score fields from the request DTO entirely. The server should always compute scores from session data.

**Files to modify**:
1. `backend/src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt`
2. `backend/src/main/kotlin/com/humanwrites/domain/certificate/CertificateService.kt`

**Exact changes**:

**`CertificateController.kt` — `IssueCertificateRequest` (lines 22-40)**:
```kotlin
data class IssueCertificateRequest(
    val documentId: UUID,
    val documentTitle: String,
    val authorName: String,
    val wordCount: Int,
    val paragraphCount: Int,
    val contentText: String,
    val totalEditTime: String,
    val sessionId: UUID, // REQUIRED, no longer nullable
)
```

Remove client score parameters (`overallScore`, `grade`, `label`, `keystrokeDynamicsScore`, `typingSpeedVariance`, `errorCorrectionRate`, `pausePatternEntropy`) from the request DTO.

**`CertificateController.kt` — `issueCertificate()` method (lines 50-73)**:
Remove all `client*` parameters from the `certificateService.issueCertificate()` call. Pass only `sessionId`.

**`CertificateService.kt` — `issueCertificate()` method**:
- Change `sessionId` parameter from `UUID?` to `UUID`
- Remove all `client*` parameters
- Remove the `resolveScoring()` method entirely; replace with direct server scoring

**`CertificateService.kt` — replace `resolveScoring` call (around line 52-62)**:
```kotlin
// Server-side scoring only (no client fallback)
val windows = keystrokeService?.getKeystrokeWindows(sessionId)
    ?: throw IllegalStateException("KeystrokeService not available")
if (windows.isEmpty()) {
    throw IllegalArgumentException("No keystroke data for session $sessionId. Cannot issue certificate without typing analysis.")
}
val metrics = keystrokeAnalyzer.analyze(windows)
val serverResult = scoringService.score(metrics)
```

Use `serverResult` directly to populate the certificate. Delete `resolveScoring()`, `ResolvedScoring`, and `ScoringSource`.

**Verification**:
1. `POST /api/certificates` without `sessionId` → 400 Bad Request
2. `POST /api/certificates` with valid `sessionId` but no keystroke data → 400 with message about missing data
3. `POST /api/certificates` with valid session with keystroke data → certificate issued with server-computed score
4. Existing tests update: any test that passes client scores needs to be updated

---

### Fix Group 5: Input Validation & Rate Limiting (High)

**Issues addressed**: #6 (AI input validation), #7 (Rate limit 200→429), #8 (Document content size limit), #16 (Pagination size limit)
**Severity**: High

**Root cause**: Multiple DTOs lack validation constraints. Rate limiting returns empty results instead of proper HTTP 429.

**Files to modify**:
1. `backend/src/main/kotlin/com/humanwrites/presentation/dto/request/AiRequests.kt`
2. `backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt`
3. `backend/src/main/kotlin/com/humanwrites/presentation/rest/GlobalExceptionHandler.kt`
4. `backend/src/main/kotlin/com/humanwrites/presentation/dto/request/DocumentRequests.kt`
5. `backend/src/main/kotlin/com/humanwrites/presentation/rest/DocumentController.kt`

**Exact changes**:

**5a. `AiRequests.kt`** — Add validation:
```kotlin
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class SpellingRequest(
    @field:Size(max = 50000, message = "Text must be at most 50,000 characters")
    val text: String,
    @field:Pattern(regexp = "^(ko|en)$", message = "Locale must be 'ko' or 'en'")
    val locale: String,
    val documentId: UUID, // Change from String to UUID
)
```

Also add `import java.util.UUID` and update the `AcceptSuggestionsRequest.documentId` to `UUID` type too.

**5b. Add `RateLimitExceededException.kt`** — New file:
```
backend/src/main/kotlin/com/humanwrites/domain/ai/RateLimitExceededException.kt
```
```kotlin
package com.humanwrites.domain.ai

class RateLimitExceededException(
    message: String = "Rate limit exceeded. Please try again later.",
) : RuntimeException(message)
```

**5c. `AiGatewayService.kt:38-41`** — Throw exception instead of returning empty:
```kotlin
// Rate limiting check
if (!checkRateLimit(userId)) {
    logger.warn("Rate limit exceeded for user {}", userId)
    throw RateLimitExceededException()
}
```

**5d. `GlobalExceptionHandler.kt`** — Add 429 handler:
```kotlin
@ExceptionHandler(RateLimitExceededException::class)
fun handleRateLimit(ex: RateLimitExceededException): ResponseEntity<ErrorResponse> =
    ResponseEntity
        .status(HttpStatus.TOO_MANY_REQUESTS)
        .header("Retry-After", "60")
        .body(
            ErrorResponse(
                error = "RATE_LIMIT_EXCEEDED",
                message = ex.message ?: "Rate limit exceeded",
                status = HttpStatus.TOO_MANY_REQUESTS.value(),
            ),
        )
```

Add import: `import com.humanwrites.domain.ai.RateLimitExceededException`

**5e. `DocumentRequests.kt`** — Add content size limit:
```kotlin
data class DocumentCreateRequest(
    @field:Size(max = 500)
    @Schema(description = "문서 제목")
    val title: String = "",
    @field:Size(max = 500000, message = "Content must be at most 500,000 characters")
    @Schema(description = "문서 내용")
    val content: String = "",
)

data class DocumentUpdateRequest(
    @field:Size(max = 500)
    @Schema(description = "문서 제목")
    val title: String? = null,
    @field:Size(max = 500000, message = "Content must be at most 500,000 characters")
    @Schema(description = "문서 내용")
    val content: String? = null,
    @Schema(description = "단어 수")
    val wordCount: Int? = null,
)
```

**5f. `DocumentController.kt:36`** — Add max page size:
```kotlin
@GetMapping
@Operation(summary = "문서 목록 조회")
fun list(
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") @jakarta.validation.constraints.Max(100) size: Int,
): ResponseEntity<DocumentListResponse> {
```

Alternatively, clamp the size in the method body: `val clampedSize = size.coerceIn(1, 100)`.

**Verification**:
1. `POST /api/ai/spelling` with 10MB text → 400 validation error
2. `POST /api/ai/spelling` with `locale: "xx"` → 400 validation error
3. Exceed rate limit → HTTP 429 with `Retry-After: 60` header
4. `POST /api/documents` with 1MB content → 400 validation error
5. `GET /api/documents?size=99999` → clamped to 100

---

### Fix Group 6: Error Count Bug — Modifier vs Navigation (Medium)

**Issues addressed**: #11 (Error count misidentified as modifier keys)
**Severity**: Medium (affects scoring accuracy)

**Root cause**: Error counting uses `keyCategory == "modifier"` (Shift, Ctrl, Alt, Meta) instead of `"navigation"` (Backspace, Delete). This bug exists in **two independent locations**:

1. `SessionWebSocketHandler.kt:181` — real-time window building
2. `KeystrokeService.kt:78` — server-side window building for scoring

Both have identical buggy line: `val errorCount = keydowns.count { it.keyCategory == "modifier" }`

**Files to modify**:
1. `backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt` (line 181)
2. `backend/src/main/kotlin/com/humanwrites/domain/session/KeystrokeService.kt` (line 78)

**Exact changes** (same fix in both files):
```kotlin
// Before:
val errorCount = keydowns.count { it.keyCategory == "modifier" }

// After:
val errorCount = keydowns.count { it.keyCategory == "navigation" }
```

**Verification**:
1. Existing unit tests for `KeystrokeAnalyzer` and `ScoringService` should still pass
2. New test: build a window with known navigation events → verify `errorCount` matches navigation key count, not modifier key count

---

### Fix Group 7: Verify Page JSON.parse Safety (Medium)

**Issues addressed**: #14 (JSON.parse without error handling)
**Severity**: Medium

**Root cause**: `frontend/apps/web/app/verify/[shortHash]/page.tsx:133-134` calls `JSON.parse()` without try-catch. Malformed stored JSON crashes SSR.

**Files to modify**:
1. `frontend/apps/web/app/verify/[shortHash]/page.tsx`

**Exact changes** (around lines 133-135):
```typescript
let verification: VerificationData;
let aiUsage: AiUsageData;
try {
  verification = JSON.parse(cert.verificationData);
  aiUsage = JSON.parse(cert.aiUsageData);
} catch {
  // Corrupted certificate data — show fallback
  verification = {
    overallScore: cert.overallScore,
    grade: cert.grade,
    label: cert.label ?? '',
    keystrokeDynamics: {
      score: 0,
      typingSpeedVariance: 0,
      errorCorrectionRate: 0,
      pausePatternEntropy: 0,
    },
  };
  aiUsage = {
    enabled: false,
    features_used: [],
    suggestions_accepted: 0,
    suggestions_rejected: 0,
    total_suggestions: 0,
  };
}
```

**Verification**:
1. Normal certificate displays correctly
2. Certificate with `verificationData: "invalid{json"` → page still renders with fallback values

---

### Fix Group 8: CertificateModal Accessibility (Medium)

**Issues addressed**: #13 (Missing Dialog.Description)
**Severity**: Medium (WCAG AA)

**Root cause**: `CertificateModal.tsx` has `Dialog.Title` but no `Dialog.Description`. Radix UI requires both for screen reader support.

**Files to modify**:
1. `frontend/packages/ui/src/organisms/CertificateModal/CertificateModal.tsx`

**Exact changes** — Add after `Dialog.Title` (around line 288):
```tsx
<Dialog.Title className="mb-4 text-center text-lg font-semibold text-[var(--text-active)]">
  {step === 'analyzing' && 'Analyzing Writing Patterns'}
  {step === 'review' && 'Analysis Result'}
  {step === 'signing' && 'Signing Certificate'}
  {step === 'complete' && 'Certificate Issued'}
</Dialog.Title>
<VisuallyHidden>
  <Dialog.Description>
    Human Written certification analysis and issuance dialog
  </Dialog.Description>
</VisuallyHidden>
```

Import `VisuallyHidden` from Radix: `import * as VisuallyHidden from '@radix-ui/react-visually-hidden';`
Or if already using a VisuallyHidden utility, use that.

**Verification**:
1. No Radix console warning about missing Description
2. Screen reader announces dialog purpose

---

### Fix Group 9: CORS Configuration (Medium)

**Issues addressed**: #15 (CORS hardcoded to localhost:3000)
**Severity**: Medium

**Root cause**: Both `WebConfig.kt:12` and `WebSocketConfig.kt:36` hardcode `http://localhost:3000`.

**Files to modify**:
1. `backend/src/main/resources/application.yml`
2. `backend/src/main/kotlin/com/humanwrites/config/WebConfig.kt`
3. `backend/src/main/kotlin/com/humanwrites/config/WebSocketConfig.kt`

**Exact changes**:

**`application.yml`** — Add under `app:`:
```yaml
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3000}
```

Create a config class or add to existing config:
```kotlin
@ConfigurationProperties(prefix = "app.cors")
data class CorsConfig(
    val allowedOrigins: String = "http://localhost:3000",
)
```

**`WebConfig.kt`**:
```kotlin
@Configuration
class WebConfig(private val corsConfig: CorsConfig) : WebMvcConfigurer {
    override fun addCorsMappings(registry: CorsRegistry) {
        registry
            .addMapping("/api/**")
            .allowedOrigins(*corsConfig.allowedOrigins.split(",").toTypedArray())
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600)
    }
}
```

**`WebSocketConfig.kt:36`**:
```kotlin
// Inject CorsConfig
class WebSocketConfig(
    private val jwtTokenProvider: JwtTokenProvider,
    private val corsConfig: CorsConfig,
) : WebSocketMessageBrokerConfigurer {
    // ...
    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry
            .addEndpoint("/ws")
            .setAllowedOrigins(*corsConfig.allowedOrigins.split(",").toTypedArray())
    }
```

**Verification**:
1. Default (`localhost:3000`) still works
2. Setting `CORS_ALLOWED_ORIGINS=https://humanwrites.app` → only that origin allowed

---

### Fix Group 10: In-Memory Rate Limit Cleanup (Medium)

**Issues addressed**: #12 (Rate limit map never cleaned)
**Severity**: Medium

**Root cause**: `AiGatewayService.rateLimitMap` is a `ConcurrentHashMap` that grows unboundedly.

**Files to modify**:
1. `backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt`

**Exact changes** — Add a scheduled cleanup:
```kotlin
import org.springframework.scheduling.annotation.Scheduled

// Add in the class body:
@Scheduled(fixedRate = 300_000) // Every 5 minutes
fun cleanupExpiredRateLimits() {
    val now = System.currentTimeMillis()
    val expired = rateLimitMap.entries.filter {
        now - it.value.windowStart.get() > RATE_LIMIT_WINDOW_MS * 2
    }.map { it.key }
    expired.forEach { rateLimitMap.remove(it) }
    if (expired.isNotEmpty()) {
        logger.debug("Cleaned up {} expired rate limit entries", expired.size)
    }
}
```

Also ensure `@EnableScheduling` is present on the main application class or a config class.

**Verification**:
1. After 5+ minutes, old entries are cleaned from the map
2. Rate limiting still works correctly for active users

---

### Fix Group 11: In-Memory Session State Warning (Medium)

**Issues addressed**: #10 (In-memory session state not persisted)
**Severity**: Medium

**Root cause**: `SessionWebSocketHandler.activeSessions` is a JVM-memory `ConcurrentHashMap`. All sessions are lost on restart.

**Recommended approach for MVP**: Add startup logging + graceful shutdown warning. Full Redis persistence is post-MVP.

**Files to modify**:
1. `backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`

**Exact changes** — Add `@PostConstruct` and `@PreDestroy`:
```kotlin
import jakarta.annotation.PostConstruct
import jakarta.annotation.PreDestroy

@PostConstruct
fun init() {
    logger.info("SessionWebSocketHandler initialized. Note: active sessions are in-memory and will be lost on restart.")
}

@PreDestroy
fun shutdown() {
    val count = activeSessions.size
    if (count > 0) {
        logger.warn("Server shutting down with {} active writing sessions. These sessions will be lost.", count)
    }
    activeSessions.clear()
}
```

**Verification**: Check startup and shutdown logs for appropriate messages.

---

### Fix Group 12: CSRF Considerations (Medium)

**Issues addressed**: #9 (CSRF disabled with HttpOnly cookies)
**Severity**: Medium

**Analysis**: This is an API-only backend with no form submissions. CSRF risk is mitigated by:
- SameSite=Lax cookies (prevent cross-site POST)
- CORS restricting origins
- JWT-based WebSocket auth (separate from cookies)

**Recommendation for MVP**: Document the decision explicitly. Do NOT enable CSRF for now — it adds complexity with the SPA architecture and STOMP connections. Ensure all cookies are set with `SameSite=Lax`.

**Files to verify**:
- Check that `JwtTokenProvider` or cookie-setting code includes `SameSite=Lax` explicitly.

**No code change needed for MVP**, but add a comment in `SecurityConfig.kt`:
```kotlin
// CSRF disabled: API-only backend with SameSite=Lax cookies + CORS origin restriction.
// SPA (Next.js) sends requests via fetch with credentials; no form submissions.
// Re-evaluate if adding server-rendered forms or non-API endpoints.
.csrf { it.disable() }
```

---

### Fix Group 13: Low Priority — Code Hygiene (Low)

**Issues addressed**: #18 (Duplicated types), #19 (Missing await on act()), #20 (act() warnings), #21 (Next.js ESLint plugin), #22 (Bundle size)

**13a. Issue #18 — Duplicated types in useTypingMetrics**
- **File**: `frontend/packages/editor-react/src/hooks/useTypingMetrics.ts`
- **Change**: Replace lines 5-33 with imports:
  ```typescript
  import type { KeyCategory, KeystrokeEvent, EditEvent } from '@humanwrites/core';
  ```
  Then remove the local type definitions. Note: `EditEvent` in `@humanwrites/core` may need a `source` field check.

**13b. Issue #19 — Missing await on act()**
- **File**: `frontend/packages/editor-react/src/__tests__/useOfflineBuffer.test.ts:193`
- **Change**: `const flushPromise = act(async () => {` → `const flushPromise = await act(async () => {`

**13c. Issue #20 — act() warnings in tests**
- **Files**: `use-ai-feedback.test.ts`, `useKeyboardShortcuts.test.ts`
- **Change**: Wrap state-triggering operations in `await act(async () => { ... })`.

**13d. Issue #21 — Next.js ESLint plugin**
- **File**: `frontend/apps/web/eslint.config.mjs` (or equivalent)
- **Change**: Add `@next/eslint-plugin-next` to the ESLint config. Check if `eslint-config-next` is already a dependency — if so, ensure it's properly imported.

**13e. Issue #22 — Bundle size**
- **Defer to post-MVP.** TipTap/ProseMirror is inherently large. Can investigate lazy-loading Inspector and non-critical editor extensions in a future iteration.

---

## Additional Architectural Observations

### 1. Test Coverage Gap: No DB Integration Tests
The most critical finding from this QA cycle is that **Issue #1 (schema mismatch) was invisible to all 141 backend tests** because they all mock the repository. The V4 migration and ORM have been out of sync since creation.

**Recommendation**: After this fix cycle, add at least one Testcontainers-based integration test that:
- Runs Flyway migrations against a real PostgreSQL + TimescaleDB container
- Performs a `batchInsert` of keystroke events
- Reads them back and verifies data integrity

This single test would have caught Issues #1 and #2.

### 2. Dual Error Count Bug Pattern
The `errorCount = keydowns.count { it.keyCategory == "modifier" }` bug (Issue #11) exists in TWO files independently (`SessionWebSocketHandler.kt:181` and `KeystrokeService.kt:78`). This is a code duplication smell. Consider extracting the window-building logic into a shared utility that both callers use.

### 3. Frontend-Backend Contract Enforcement
The OpenAPI pipeline (Issue #17) isn't operational. Until it is, field name mismatches like Issue #2 will keep occurring. Making the `schema/ → orval` pipeline work should be a priority in the next development iteration.

---

## Estimated Scope

| Metric | Count |
|--------|-------|
| Total files to modify | ~16 |
| New files needed | 1 (`RateLimitExceededException.kt`) |
| Tests to add/update | ~5-8 (certificate, rate limit, WebSocket auth, error count) |
| Estimated fix groups | 13 |
| Critical fixes | 2 groups (Groups 1-2) |
| High fixes | 3 groups (Groups 3-5) |
| Medium fixes | 6 groups (Groups 6-12) |
| Low fixes | 1 group (Group 13) |

---

## Developer Execution Order

1. **Group 1** → Fix V4 migration (clean DB reset)
2. **Group 2** → Fix STOMP field names + KeyCategory type (depends on knowing the correct schema)
3. **Group 6** → Fix error count bug (quick, affects scoring accuracy)
4. **Group 3** → WebSocket auth enforcement
5. **Group 4** → Certificate score forgery prevention
6. **Group 5** → Input validation + rate limiting (multiple files, independent of above)
7. **Group 7** → Verify page JSON.parse safety
8. **Group 8** → CertificateModal accessibility
9. **Group 9** → CORS configuration
10. **Group 10** → Rate limit map cleanup
11. **Group 11** → Session state warning
12. **Group 12** → CSRF documentation
13. **Group 13** → Low priority code hygiene
