# QA Cycle 4 Findings - Deep Production Readiness Review

**Date**: 2026-02-19
**Reviewer**: QA Cycle 4 - Comprehensive Production QA Specialist
**Test Level**: COMPREHENSIVE (High-Tier)
**Focus**: Race conditions, edge cases, security, state consistency, data integrity

---

## Environment

- **Backend**: Kotlin + Spring Boot 3.x (`/Users/juneheo/Workspace/humanwrites/backend/`)
- **Frontend**: TypeScript + Next.js 15 monorepo (`/Users/juneheo/Workspace/humanwrites/frontend/`)
- **Backend Tests**: BUILD SUCCESSFUL (all pass)
- **Frontend Tests**: 176 tests passed across 17 test files (3 files with `act(...)` warnings)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 8 |
| MEDIUM | 9 |
| LOW | 4 |
| **Total** | **26** |

---

## CRITICAL Issues

### Issue #1 (SEVERITY: CRITICAL)
**Category**: race-condition
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`
**Line(s)**: 51-58, 105, 114, 118-135
**Problem**: `SessionState` uses mutable `var` fields (`totalKeystrokes`, `anomalyCount`) and a `MutableList` (`recentWindows`) without any synchronization. While `activeSessions` itself is a `ConcurrentHashMap`, the values within it are not thread-safe. When multiple STOMP messages arrive for the same session concurrently (Spring STOMP dispatches on multiple threads from the executor pool), the following race conditions occur:

1. **Lost updates on `totalKeystrokes`**: `state.totalKeystrokes += batch.events.size` is a read-modify-write that is not atomic. Two concurrent batches of 10 events each could result in `totalKeystrokes` being 10 instead of 20.
2. **Corrupted `recentWindows` list**: `MutableList.add()` is not thread-safe. Concurrent adds can cause `ConcurrentModificationException` or silently corrupt the list, leading to lost windows or IndexOutOfBoundsException during anomaly detection iteration.
3. **Non-atomic check-then-act on recentWindows.size**: Line 118 checks `state.recentWindows.size >= MIN_WINDOWS_FOR_DETECTION` then reads the list on line 119. Another thread could be modifying the list between these operations.

**Impact**: Under production load with fast typers sending 2Hz STOMP batches, keystroke counts will be inaccurate, anomaly detection will miss patterns or throw runtime exceptions, and certificates will be issued with wrong totalKeystrokes values.

**Suggested Fix**:
```kotlin
data class SessionState(
    val sessionId: UUID,
    val userId: String,
    val documentId: UUID,
    val totalKeystrokes: AtomicInteger = AtomicInteger(0),
    val anomalyCount: AtomicInteger = AtomicInteger(0),
    val recentWindows: CopyOnWriteArrayList<KeystrokeWindow> = CopyOnWriteArrayList(),
)

// In handleKeystrokeBatch:
state.totalKeystrokes.addAndGet(batch.events.size)
// ...
if (window != null) {
    state.recentWindows.add(window)
}
```
Alternatively, use a `ReentrantLock` per session or `synchronized(state)` blocks around all state mutations.

---

### Issue #2 (SEVERITY: CRITICAL)
**Category**: race-condition
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/domain/ai/AiUsageTracker.kt`
**Line(s)**: 11-22, 47-51
**Problem**: `MutableUsageData` has mutable `var` fields (`suggestionsAccepted`, `totalSuggestions`) and a `MutableList` (`featuresUsed`) that are accessed without synchronization. While `ConcurrentHashMap.getOrPut` is safe for the map, the `MutableUsageData` object itself is shared and mutated concurrently:

1. `data.totalSuggestions += count` is a non-atomic read-modify-write.
2. `data.featuresUsed.contains("spelling")` followed by `data.featuresUsed.add("spelling")` is a TOCTOU (time-of-check-time-of-use) race -- two threads could both see `contains` return false and both add "spelling".
3. `data.suggestionsAccepted += count` in `recordAcceptance` has the same non-atomic increment issue.

**Impact**: Certificate AI usage data will report incorrect suggestion counts. Under concurrent AI analysis requests for the same document, `suggestionsRejected` (calculated as `totalSuggestions - suggestionsAccepted`) could go negative, producing nonsensical certificate data.

**Suggested Fix**:
```kotlin
private class MutableUsageData(
    val featuresUsed: CopyOnWriteArrayList<String> = CopyOnWriteArrayList(),
    val suggestionsAccepted: AtomicInteger = AtomicInteger(0),
    val totalSuggestions: AtomicInteger = AtomicInteger(0),
)

fun recordSuggestions(documentId: UUID, count: Int, provider: String, model: String) {
    val data = usageMap.getOrPut(documentId) { MutableUsageData() }
    data.totalSuggestions.addAndGet(count)
    // addIfAbsent is atomic on CopyOnWriteArrayList
    data.featuresUsed.addIfAbsent("spelling")
}
```

---

### Issue #3 (SEVERITY: CRITICAL)
**Category**: security
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/config/SecurityConfig.kt`
**Line(s)**: 41-42
**Problem**: The WebSocket endpoint `/ws/**` is configured as `permitAll()`. While the `WebSocketConfig` STOMP interceptor validates JWT on CONNECT, the HTTP upgrade request itself is unauthenticated. This creates a security gap:

1. An attacker can establish WebSocket connections without any authentication, consuming server resources (file descriptors, memory for the WebSocket session).
2. The STOMP CONNECT frame authentication happens AFTER the WebSocket handshake is complete. A malicious client can hold open WebSocket connections without ever sending CONNECT, creating a resource exhaustion vector.
3. There is no rate limiting on WebSocket connection attempts.

**Impact**: Denial-of-service attack vector. An attacker can open thousands of WebSocket connections to exhaust server resources without ever authenticating. In production under load, legitimate users may be unable to establish WebSocket connections.

**Suggested Fix**: Add a `HandshakeInterceptor` that validates the JWT before allowing the WebSocket upgrade:
```kotlin
override fun registerStompEndpoints(registry: StompEndpointRegistry) {
    registry
        .addEndpoint("/ws")
        .setAllowedOrigins(*allowedOrigins.split(",").map { it.trim() }.toTypedArray())
        .addInterceptors(object : HandshakeInterceptor {
            override fun beforeHandshake(
                request: ServerHttpRequest, response: ServerHttpResponse,
                wsHandler: WebSocketHandler, attributes: MutableMap<String, Any>
            ): Boolean {
                // Extract token from query param or cookie
                val token = extractToken(request)
                return token != null && jwtTokenProvider.validateToken(token) != null
            }
            override fun afterHandshake(...) {}
        })
}
```

---

### Issue #4 (SEVERITY: CRITICAL)
**Category**: security
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`
**Line(s)**: 82-103
**Problem**: The `KeystrokeEventDto` fields `eventType` and `keyCategory` are raw strings with no validation. An attacker can send arbitrary string values via WebSocket that get persisted directly to the database:

1. `eventType` accepts any string (no check for "keydown"/"keyup").
2. `keyCategory` accepts any string (no check for "letter"/"number"/"punct"/"modifier"/"navigation").
3. `timestampMs` can be negative or arbitrarily large (Long.MAX_VALUE).
4. `dwellTimeMs` and `flightTimeMs` can be negative.

These values are persisted to TimescaleDB via `keystrokeRepository.batchInsert()` and later used in scoring calculations. Malicious input can:
- Produce `Infinity` or `NaN` in WPM calculations when duration is 0 or negative.
- Cause `ArithmeticException` in division operations.
- Corrupt the statistical analysis for certificate scoring.

**Impact**: An authenticated attacker can manipulate their typing metrics to always receive "Certified" grade by crafting keystroke events with specific statistical properties. This completely undermines the trust model of the certification system.

**Suggested Fix**:
```kotlin
// Add validation in handleKeystrokeBatch before persisting:
val validEventTypes = setOf("keydown", "keyup")
val validCategories = setOf("letter", "number", "punct", "modifier", "navigation")

val validatedEvents = batch.events.filter { event ->
    event.eventType in validEventTypes &&
    event.keyCategory in validCategories &&
    event.timestampMs >= 0 &&
    (event.dwellTimeMs == null || event.dwellTimeMs in 0..30000) &&
    (event.flightTimeMs == null || event.flightTimeMs in 0..300000)
}

if (validatedEvents.isEmpty()) return

keystrokeRepository.batchInsert(batch.sessionId, validatedEvents)
```

---

### Issue #5 (SEVERITY: CRITICAL)
**Category**: data-integrity
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`
**Line(s)**: 30, 38-49
**Problem**: All active writing sessions are stored in an in-memory `ConcurrentHashMap`. If the server restarts, crashes, or a rolling deployment occurs:

1. All active sessions are permanently lost.
2. Users currently writing will get "unknown session" errors for all subsequent keystroke batches.
3. The keystroke data already persisted to TimescaleDB becomes orphaned -- it cannot be linked to a certificate because the session state (including `recentWindows` for real-time analysis) is gone.
4. There is no mechanism to recover or resume a session after restart.

The `@PreDestroy` method on line 43 only logs a warning but takes no recovery action.

**Impact**: In production, any server restart (deployment, crash, scaling event) will cause data loss for all active writing sessions. Users mid-document will lose their certification eligibility for that session.

**Suggested Fix**: Persist session state to Redis with a TTL:
```kotlin
// On session start: save to Redis
redisTemplate.opsForValue().set(
    "session:${sessionId}", objectMapper.writeValueAsString(state),
    Duration.ofHours(24)
)

// On keystroke batch: update Redis periodically (every N batches)
if (state.totalKeystrokes % 100 == 0) {
    redisTemplate.opsForValue().set("session:${sessionId}", ...)
}

// On startup: recover active sessions from Redis
@PostConstruct
fun init() {
    val keys = redisTemplate.keys("session:*")
    keys?.forEach { key -> /* restore session state */ }
}
```

---

## HIGH Issues

### Issue #6 (SEVERITY: HIGH)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/domain/session/analysis/KeystrokeAnalyzer.kt`
**Line(s)**: 80-88
**Problem**: The `burstPauseRatio` calculation has an edge case that produces `Infinity`. When `pauseTime` is 0 (no pauses at all), line 88 returns `burstTime` directly. But `burstTime` equals `totalTime` in this case, and if the session is very long (e.g., 3600000ms = 1 hour), the ratio becomes an extremely large number that does not accurately represent "no pauses" behavior.

More critically, in the `ScoringService.burstPauseScore()` (line 137-144), a `burstPauseRatio` of `Double.POSITIVE_INFINITY` will not match any of the `when` ranges because `Infinity in 2.0..10.0` is `false`. It falls through to the `else` branch returning 40.0, which may not be the intended score for "no pauses detected."

Additionally, when `totalTime` is 0.0 (windows list not empty but first and last window have same timestamp), `pauseTime` could equal 0 and `burstTime` could equal 0, making the ratio `0.0 / 0.0 = NaN`. `NaN` comparisons all return false, so `burstPauseScore` would return 40.0 (the else branch) which is incorrect.

**Impact**: Scoring inconsistency for edge-case sessions. Short sessions or sessions with no pauses will get arbitrary scores.

**Suggested Fix**:
```kotlin
val burstPauseRatio = when {
    pauseTime > 0 && burstTime > 0 -> burstTime / pauseTime
    pauseTime == 0.0 -> Double.MAX_VALUE  // No pauses = max ratio
    else -> 0.0  // No burst time
}

// In burstPauseScore, handle extreme values:
internal fun burstPauseScore(ratio: Double): Double = when {
    ratio.isNaN() || ratio.isInfinite() -> 20.0  // Suspicious: no natural pattern
    ratio in 2.0..10.0 -> 100.0
    // ... rest unchanged
}
```

---

### Issue #7 (SEVERITY: HIGH)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/domain/session/analysis/KeystrokeAnalyzer.kt`
**Line(s)**: 62-63
**Problem**: When all windows have empty `flightTimes` lists (e.g., only single-key events with no flight time measured), `allFlightTimes` is an empty list. `calculateShannonEntropy(emptyList(), 50)` returns 0.0. This entropy of 0.0 is then scored by `thresholdScore(0.0, 3.0, 6.0)` which returns 0.0 (below `minExpected * 0.5 = 1.5`).

This means a legitimate user who types slowly (each keystroke is isolated with no measurable flight time between them) will get 0 entropy score, which contributes 25% weight (0.25) to the overall score, making it nearly impossible to reach the 60-point certification threshold.

**Impact**: Slow typists, users with accessibility needs, or users who type with significant pauses between every keystroke will be systematically denied certification even though they are genuinely human.

**Suggested Fix**: Return a sentinel or "insufficient data" indicator when flight time data is sparse:
```kotlin
val flightTimeEntropy = if (allFlightTimes.size >= 10) {
    calculateShannonEntropy(allFlightTimes, bucketSize = 50)
} else {
    -1.0  // Insufficient data sentinel
}

// In ScoringService, handle insufficient data:
val entropyScore = if (metrics.flightTimeEntropy < 0) {
    50.0  // Neutral score when insufficient data
} else {
    thresholdScore(metrics.flightTimeEntropy, config.entropyMin, maxExpected = 6.0)
}
```

---

### Issue #8 (SEVERITY: HIGH)
**Category**: security
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/infrastructure/security/JwtTokenProvider.kt`
**Line(s)**: 43-54
**Problem**: The `validateToken` method swallows ALL exceptions with `catch (_: Exception)` and returns null. This means:

1. **No distinction between expired, malformed, and tampered tokens**: A token with a valid signature but expired timestamp is treated the same as a completely invalid token. The caller cannot differentiate between "please refresh" and "this is an attack."
2. **No logging of security events**: Failed JWT validations (potential attack indicators) are silently discarded. There is no audit trail for security monitoring.
3. The same pattern exists in `getTokenType()` (lines 56-67).

**Impact**: Security monitoring blind spot. Token-based attacks (replay, brute-force, algorithm confusion) will be invisible in logs. Operators cannot detect or respond to authentication attacks.

**Suggested Fix**:
```kotlin
fun validateToken(token: String): UUID? = try {
    val claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token)
    UUID.fromString(claims.payload.subject)
} catch (e: ExpiredJwtException) {
    logger.debug("Expired JWT token: {}", e.message)
    null
} catch (e: SecurityException) {
    logger.warn("JWT signature validation failed - potential tampering: {}", e.message)
    null
} catch (e: MalformedJwtException) {
    logger.warn("Malformed JWT token received: {}", e.message)
    null
} catch (e: Exception) {
    logger.error("Unexpected JWT validation error: {}", e.message)
    null
}
```

---

### Issue #9 (SEVERITY: HIGH)
**Category**: security
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt`
**Line(s)**: 22-31, 41-57
**Problem**: The `IssueCertificateRequest` accepts `contentText` (the full document content) directly in the request body with no size limit. An attacker can:

1. Send multi-gigabyte `contentText` values to exhaust server memory (OOM attack).
2. Send extremely long `documentTitle` or `authorName` values.
3. The `contentText` is passed to `signatureService.contentHash()` which processes the entire string in memory with SHA-256.

There is no `@Size` or `@Length` validation annotation on any of the DTO fields. The `@Valid` annotation is not present on the request parameter.

**Impact**: A single authenticated user can crash the server by sending a certificate issuance request with a very large `contentText` value. This is a trivial denial-of-service attack.

**Suggested Fix**:
```kotlin
data class IssueCertificateRequest(
    val documentId: UUID,
    @field:Size(max = 500) val documentTitle: String,
    @field:Size(max = 200) val authorName: String,
    @field:Min(0) @field:Max(1_000_000) val wordCount: Int,
    @field:Min(0) val paragraphCount: Int,
    @field:Size(max = 5_000_000) val contentText: String,  // ~5MB max
    val totalEditTime: String,
    val sessionId: UUID,
)

// Add @Valid annotation:
fun issueCertificate(@Valid @RequestBody request: IssueCertificateRequest)
```

---

### Issue #10 (SEVERITY: HIGH)
**Category**: race-condition
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt`
**Line(s)**: 134-146
**Problem**: The in-memory rate limiting has a TOCTOU race in `checkInMemoryRateLimit`. The `compute` lambda (line 137) correctly handles creation, but the subsequent check on line 145 `(entry?.count?.get() ?: 0) <= aiConfig.rateLimitPerMinute` reads the count AFTER the compute. Between the `incrementAndGet()` inside compute and the check on line 145, another thread could also have incremented. However, the more subtle bug is:

The `compute` lambda creates a NEW `RateLimitEntry` when the window has expired (line 138-139), but it uses `AtomicInteger(1)` (initial count of 1). If two threads hit `compute` simultaneously for a newly expired window, `ConcurrentHashMap.compute` is atomic -- only one will create. But the thread that does NOT create will increment `existing.count` (line 142) on the NEW entry, making the count 2. This is actually correct behavior.

The REAL race is between `checkRedisRateLimit` and `checkInMemoryRateLimit`: if Redis is flaky (sometimes succeeds, sometimes fails), a user could bypass rate limits by having some requests go through Redis (which has its own counter) and others through in-memory (which has a separate counter). The two counters are never synchronized.

**Impact**: Under Redis instability, effective rate limit is doubled (N requests via Redis + N requests via in-memory fallback).

**Suggested Fix**: When Redis fails, carry the known Redis count into the in-memory check, or use a single source of truth:
```kotlin
internal fun checkRateLimit(userId: UUID): Boolean {
    // Try Redis first
    val redisResult = checkRedisRateLimit(userId)
    if (redisResult != null) return redisResult

    // Fallback: use in-memory, but log that we're in degraded mode
    logger.warn("Rate limiting in degraded mode (in-memory) for user {}", userId)
    return checkInMemoryRateLimit(userId)
}
```
Consider also syncing the in-memory counter when Redis comes back.

---

### Issue #11 (SEVERITY: HIGH)
**Category**: data-integrity
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/resources/db/migration/V5__add_continuous_aggregate.sql`
**Line(s)**: 1-34
**Problem**: V5 migration creates a TimescaleDB continuous aggregate unconditionally, but V4 creates the `keystroke_events` hypertable CONDITIONALLY (only if TimescaleDB extension exists). If TimescaleDB is NOT installed:

1. V4 succeeds -- creates a regular table.
2. V5 FAILS -- `CREATE MATERIALIZED VIEW ... WITH (timescaledb.continuous)` requires TimescaleDB.
3. Flyway halts with a migration error. The database is now in a broken state (V4 applied, V5 failed).
4. All subsequent startups will fail because Flyway sees a failed migration.

V4 has a graceful `DO $$ ... IF EXISTS ... END$$` fallback, but V5 has no such guard.

**Impact**: The application will fail to start on any environment where TimescaleDB is not installed (local dev without Docker, CI without TimescaleDB, any PostgreSQL-only deployment).

**Suggested Fix**: Wrap V5 in the same conditional guard:
```sql
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        -- Create continuous aggregate
        EXECUTE 'CREATE MATERIALIZED VIEW keystroke_stats_5s ...';
        -- Add policies
        PERFORM add_continuous_aggregate_policy(...);
    ELSE
        RAISE NOTICE 'TimescaleDB not available, skipping continuous aggregate';
    END IF;
END$$;
```

---

### Issue #12 (SEVERITY: HIGH)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`
**Line(s)**: 196-203
**Problem**: In `buildWindow`, the WPM calculation uses `duration = (windowEnd - windowStart).coerceAtLeast(1L)`. When `duration` is 1ms (minimum coerced value), and there are, say, 5 typing keys, WPM becomes:
```
wpm = (5 / 5.0) / (1 / 60000.0) = 1.0 / 0.0000167 = 60000 WPM
```
This astronomically high WPM will cause:
1. The `detectUnrealisticSpeed` in `AnomalyDetector` to flag every single batch with very close timestamps.
2. The `avgWpm` metric in `KeystrokeAnalyzer` to be wildly skewed.

Events with identical timestamps (common when batched from the same `performance.now()` call or clock skew) will always produce `duration=1ms` due to the coerce, generating unrealistic WPM values.

**Impact**: False anomaly alerts during normal typing. Inflated WPM values corrupt scoring calculations.

**Suggested Fix**:
```kotlin
val duration = (windowEnd - windowStart).coerceAtLeast(100L) // Minimum 100ms window
val wpm = if (duration >= 1000L) {
    (typingKeys / 5.0) / (duration / 60000.0)
} else {
    0.0  // Insufficient duration for meaningful WPM
}
```

---

### Issue #13 (SEVERITY: HIGH)
**Category**: security
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/presentation/rest/AuthController.kt`
**Line(s)**: 58-78
**Problem**: The login endpoint reveals user existence through different HTTP status codes:
- Email not found: returns 401 (line 66)
- Email found but wrong password: returns 401 (line 69)

While both return 401, the timing difference is observable:
- Non-existent email: fast return (just a DB lookup).
- Existing email with wrong password: slow return (Argon2 hash comparison is deliberately slow, ~100-500ms).

This is a **timing side-channel attack** that allows an attacker to enumerate valid email addresses by measuring response times.

**Impact**: User enumeration enables targeted attacks (credential stuffing, phishing, social engineering).

**Suggested Fix**: Always perform the password hash comparison even when the user is not found:
```kotlin
fun login(@Valid @RequestBody req: LoginRequest, response: HttpServletResponse): ResponseEntity<AuthResponse> {
    val user = userService.findByEmail(req.email)

    // Always hash-compare to prevent timing attacks
    val dummyHash = "\$argon2id\$v=19\$m=16384,t=2,p=1\$dummysaltvalue\$dummyhashvalue"
    val passwordHash = user?.passwordHash ?: dummyHash
    val matches = passwordEncoder.matches(req.password, passwordHash)

    if (user == null || !matches) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
    }
    // ... proceed with token generation
}
```

---

## MEDIUM Issues

### Issue #14 (SEVERITY: MEDIUM)
**Category**: memory-leak
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`
**Line(s)**: 57, 114
**Problem**: The `recentWindows` MutableList in `SessionState` grows unboundedly. For a user writing for hours, this list accumulates one `KeystrokeWindow` object every ~200ms (per batch), resulting in:
- 1 hour = ~18,000 windows
- 8 hours = ~144,000 windows
- Each window contains a `flightTimes: List<Long>` which could have dozens of entries

There is no size cap or eviction of old windows. Additionally, `activeSessions` itself never cleans up sessions where the user disconnects without sending `session.end` (e.g., browser crash, network drop).

**Impact**: Memory leak. Over time, the JVM heap will grow, leading to increased GC pressure and eventual OOM for long-running sessions.

**Suggested Fix**:
```kotlin
// Cap recent windows (keep only last N for anomaly detection)
if (window != null) {
    state.recentWindows.add(window)
    while (state.recentWindows.size > MAX_RECENT_WINDOWS) {
        state.recentWindows.removeAt(0)
    }
}

companion object {
    const val MAX_RECENT_WINDOWS = 100  // ~8 minutes of data
}

// Add session cleanup for abandoned sessions (no activity for 30 min)
@Scheduled(fixedRate = 300_000)
fun cleanupAbandonedSessions() {
    val cutoff = System.currentTimeMillis() - 1_800_000
    activeSessions.entries.removeIf { (_, state) ->
        state.recentWindows.lastOrNull()?.windowEnd?.let { it < cutoff } ?: true
    }
}
```

---

### Issue #15 (SEVERITY: MEDIUM)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/domain/session/analysis/ScoringService.kt`
**Line(s)**: 96-105
**Problem**: The `rangeScore` function has a division by zero when `min == max`:
```kotlin
val halfRange = (max - min) / 2  // = 0.0 when min == max
val distance = ...
return (100.0 * (1.0 - (distance / halfRange).coerceAtMost(1.0)))
//                       ^^^^^^^^^^^^^^^^^ division by zero = Infinity
```
When `halfRange` is 0, `distance / halfRange` produces `Infinity`, `.coerceAtMost(1.0)` returns `1.0`, so the result is `0.0`. This happens to produce a sane result by accident, but it relies on IEEE 754 floating point behavior that is fragile and unclear.

If the scoring config is misconfigured such that `cvMin == cvMax`, all values outside that exact point will score 0, which is probably not intended.

**Impact**: Config misconfiguration silently produces extreme scoring behavior.

**Suggested Fix**:
```kotlin
internal fun rangeScore(value: Double, min: Double, max: Double): Double {
    if (min >= max) return if (value == min) 100.0 else 0.0  // Explicit guard
    if (value in min..max) return 100.0
    val halfRange = (max - min) / 2
    val distance = if (value < min) min - value else value - max
    return (100.0 * (1.0 - (distance / halfRange).coerceAtMost(1.0))).coerceAtLeast(0.0)
}
```

---

### Issue #16 (SEVERITY: MEDIUM)
**Category**: data-integrity
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/domain/certificate/CertificateService.kt`
**Line(s)**: 226-233
**Problem**: The `generateShortHash` method uses `System.currentTimeMillis()` as part of the hash input. This makes short hashes non-deterministic and non-reproducible. If the same certificate needs to be regenerated (e.g., after a failed DB insert that left an orphan record), it will get a different short hash.

More importantly, the UNIQUE constraint on `short_hash` in the database (V6 migration line 5) means if there is a hash collision (32 hex chars = 128 bits, very unlikely but possible at scale), the `transaction` block on line 96 will throw a SQL unique constraint violation that is not caught specifically. It bubbles up as a generic Exception, handled by `GlobalExceptionHandler` as a 500 Internal Server Error with no retry logic.

**Impact**: At scale, rare hash collisions will cause 500 errors during certificate issuance with no automatic recovery.

**Suggested Fix**:
```kotlin
private fun generateShortHash(certId: UUID): String {
    // Retry loop for collision resistance
    repeat(3) { attempt ->
        val input = "${certId}${System.nanoTime()}${attempt}"
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(input.toByteArray())
            .joinToString("") { "%02x".format(it) }
            .take(32)
        // Check uniqueness before returning
        val exists = transaction {
            Certificates.selectAll()
                .where { Certificates.shortHash eq hash }
                .count() > 0
        }
        if (!exists) return hash
    }
    throw IllegalStateException("Failed to generate unique short hash after 3 attempts")
}
```

---

### Issue #17 (SEVERITY: MEDIUM)
**Category**: error-handling
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/config/RedisConfig.kt`
**Line(s)**: 17-26
**Problem**: The `RedisConfig` creates `RedisTemplate` and `CacheManager` beans that assume Redis is available. If Redis is down on application startup:

1. `RedisTemplate` bean creation succeeds (it just configures, does not connect).
2. But `CacheManager` bean from `RedisCacheManager.builder()` will fail on first cache access.
3. The `@EnableCaching` annotation means Spring will try to use Redis caching for any `@Cacheable` methods, which will throw `RedisConnectionFailureException`.

While `AiGatewayService` handles Redis failures gracefully with try-catch blocks, any future use of Spring's `@Cacheable` annotations will crash without fallback.

**Impact**: Future development adding `@Cacheable` annotations will crash when Redis is unavailable, with no fallback to in-memory caching.

**Suggested Fix**: Add a composite cache manager with in-memory fallback:
```kotlin
@Bean
fun cacheManager(connectionFactory: RedisConnectionFactory): CacheManager {
    val redisCacheManager = RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(cacheConfig).build()
    val caffeineCacheManager = CaffeineCacheManager() // fallback
    return CompositeCacheManager(redisCacheManager, caffeineCacheManager)
}
```

---

### Issue #18 (SEVERITY: MEDIUM)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/frontend/packages/core/src/typing-analyzer/collector/metrics-calculator.ts`
**Line(s)**: 20-23
**Problem**: In `calculateShannonEntropy`, when a negative value is passed (e.g., from a negative `flightTime`), `Math.floor(v / BUCKET_SIZE_MS)` produces a negative index. `Math.min(negativeIndex, bucketCount - 1)` returns the negative index. Accessing `buckets[negativeIndex]` returns `undefined`, and `undefined++` becomes `NaN`, silently corrupting the entropy calculation.

While the backend validates that `flightTimeMs` can be null, it does not validate against negative values (see Issue #4). If a negative value makes it to the client via sync or the client itself computes a negative flight time due to clock skew, the entropy calculation silently returns `NaN`.

**Impact**: `NaN` entropy propagates through all downstream calculations, producing `NaN` stat vectors that corrupt the scoring pipeline.

**Suggested Fix**:
```typescript
for (const v of values) {
    if (v < 0) continue;  // Skip negative values
    const idx = Math.min(Math.floor(v / BUCKET_SIZE_MS), bucketCount - 1);
    buckets[idx]!++;
}
```

---

### Issue #19 (SEVERITY: MEDIUM)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/frontend/packages/editor-react/src/hooks/useOfflineBuffer.ts`
**Line(s)**: 126-129
**Problem**: The flush success handler uses `prev.slice(toFlush.length)` to remove flushed events. This assumes the events at the BEGINNING of `prev` are the same as `toFlush`. However, if new events were added during the async `onFlush` call (via the `buffer` function), `prev` will have extra items APPENDED. The slice correctly preserves these new items.

BUT: if the `onFlush` call takes a very long time, and more than `maxBufferSize` events are buffered during the flush, the buffer function's trim logic (line 154-156) will have already dropped events from the beginning of `prev`. Now `prev.slice(toFlush.length)` will skip events that were NOT in `toFlush`, causing silent data loss.

Sequence:
1. Buffer has [A, B, C] (3 events). Flush starts with `toFlush = [A, B, C]`.
2. During flush, events D, E, F, ..., Z are added. Buffer trim kicks in, drops oldest.
3. Flush completes. `prev` is now [H, I, J, ..., Z] (after trimming). `prev.slice(3)` removes H, I, J which were NOT in `toFlush`.

**Impact**: Silent keystroke data loss during high-frequency typing while a slow network flush is in progress.

**Suggested Fix**: Track events by identity or sequence number rather than positional slice:
```typescript
// Use a sequence counter
let seq = 0;
// Tag each event with a sequence number
// On flush success, remove events with seq <= lastFlushedSeq
```

---

### Issue #20 (SEVERITY: MEDIUM)
**Category**: security
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt`
**Line(s)**: 117-141
**Problem**: The `verifyCertificate` endpoint (public, no auth required) returns the full `signature`, `contentHash`, `verificationData`, and `aiUsageData` fields. While this data is needed for offline verification, it also exposes:

1. The full verification scoring breakdown (`verificationData` contains individual metric scores).
2. AI usage details for the document.
3. Combined with the content hash, an attacker could attempt to correlate documents across users.

The endpoint also has no rate limiting, so an attacker could enumerate all certificates by brute-forcing short hashes (32 hex chars = 128 bits, but only lowercase hex, so birthday attack at ~2^64).

**Impact**: Information disclosure. Certificate verification data exposure could be used to reverse-engineer the scoring algorithm thresholds.

**Suggested Fix**: Return only the minimum data needed for verification:
```kotlin
return ResponseEntity.ok(mapOf(
    "shortHash" to cert.shortHash,
    "grade" to cert.grade,
    "overallScore" to cert.overallScore,
    "status" to cert.status,
    "issuedAt" to cert.issuedAt.toString(),
    "signature" to cert.signature,
    "contentHash" to cert.contentHash,
    "publicKeyUrl" to "/.well-known/humanwrites-public-key.pem",
))
// Remove: verificationData, aiUsageData, label (internal details)
```

---

### Issue #21 (SEVERITY: MEDIUM)
**Category**: error-handling
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/domain/certificate/CertificateService.kt`
**Line(s)**: 43-49, 96-115
**Problem**: The `issueCertificate` method performs keystroke analysis AND database insertion in a non-atomic sequence:
1. Lines 44-51: Read keystroke data and compute score (no transaction).
2. Lines 96-115: Insert certificate into DB (within transaction).

If the application crashes between step 1 and step 2, no data is lost. But if the DB insert on line 96 fails (e.g., constraint violation, connection timeout), the computed score is lost and must be recomputed. More importantly, there is no idempotency protection: calling `issueCertificate` twice for the same document/session will create two different certificates with potentially different scores (if keystroke data changed between calls).

**Impact**: Duplicate certificates for the same document, or orphaned computation work on DB failure.

**Suggested Fix**: Add idempotency check:
```kotlin
fun issueCertificate(...): CertificateResponse {
    // Check for existing certificate for this session
    val existing = transaction {
        Certificates.selectAll().where {
            (Certificates.documentId eq documentId) and
            (Certificates.status eq "active")
        }.firstOrNull()
    }
    if (existing != null) {
        throw IllegalStateException("Active certificate already exists for document $documentId")
    }
    // ... proceed with issuance
}
```

---

### Issue #22 (SEVERITY: MEDIUM)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/domain/session/analysis/AnomalyDetector.kt`
**Line(s)**: 81-86
**Problem**: `detectMechanicalRhythm` instantiates a new `KeystrokeAnalyzer()` on every call (line 85). `AnomalyDetector` is a `@Service` (singleton), but `KeystrokeAnalyzer` is also a `@Component` (singleton) -- yet instead of injecting it, the detector creates a new instance each time. This is:
1. Wasteful (object creation on every anomaly check, which runs on every keystroke batch).
2. Architecturally inconsistent (bypasses Spring DI).
3. If `KeystrokeAnalyzer` ever gets dependencies injected, this manually-created instance will not have them.

**Impact**: Performance waste and future maintenance risk. If `KeystrokeAnalyzer` gains constructor parameters, this code will silently break.

**Suggested Fix**: Inject `KeystrokeAnalyzer` via constructor:
```kotlin
@Service
class AnomalyDetector(
    private val keystrokeAnalyzer: KeystrokeAnalyzer,
) {
    // Replace: val analyzer = KeystrokeAnalyzer()
    // With: use this.keystrokeAnalyzer
}
```

---

## LOW Issues

### Issue #23 (SEVERITY: LOW)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/frontend/packages/editor-react/src/hooks/useAiFeedback.ts`
**Line(s)**: 134-138
**Problem**: The `fetch` call to the AI endpoint does not include credentials (`credentials: 'include'` or `credentials: 'same-origin'`). Since authentication uses HttpOnly cookies, the AI spelling endpoint at `/api/ai/spelling` requires the cookie to be sent. Without `credentials`, the browser will not include cookies in the request, and the server will return 401/403.

The Next.js proxy route handler might add credentials, but if the request goes directly to the backend (e.g., in development without proxy), authentication will fail silently.

**Impact**: AI feedback may fail in certain deployment configurations where requests are not proxied through Next.js.

**Suggested Fix**:
```typescript
const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: controller.signal,
    credentials: 'include',  // Send HttpOnly cookies
});
```

---

### Issue #24 (SEVERITY: LOW)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/backend/src/main/kotlin/com/humanwrites/config/WebConfig.kt`
**Line(s)**: 12-20
**Problem**: CORS mapping is only configured for `/api/**` but not for `/.well-known/**`. The `VerificationController` serves the public key at `/.well-known/humanwrites-public-key.pem`. Cross-origin requests to this endpoint (e.g., a third-party verification tool) will be blocked by CORS.

**Impact**: Third-party tools that want to verify certificates offline by fetching the public key will be blocked by CORS.

**Suggested Fix**:
```kotlin
override fun addCorsMappings(registry: CorsRegistry) {
    registry.addMapping("/api/**")
        .allowedOrigins(*origins).allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowCredentials(true).maxAge(3600)

    // Public key endpoint - allow all origins for offline verification
    registry.addMapping("/.well-known/**")
        .allowedOrigins("*").allowedMethods("GET").maxAge(86400)
}
```

---

### Issue #25 (SEVERITY: LOW)
**Category**: error-handling
**File**: `/Users/juneheo/Workspace/humanwrites/frontend/packages/core/src/typing-analyzer/collector/BeaconSender.ts`
**Line(s)**: 67-84
**Problem**: Both `onVisibilityChange` and `onBeforeUnload` call `void this.saveToIndexedDB(data)` in a fire-and-forget manner. If the IndexedDB write fails (e.g., storage quota exceeded), the data is silently lost. For `beforeunload`, this is unavoidable (the page is closing). But for `visibilitychange` (tab hidden), the write failure could be retried or the data could be preserved in memory for the next flush attempt.

Additionally, `getBufferData()` returns the current buffer but does not clear it. If the tab becomes visible again and the buffer flushes normally, the same data may be saved twice to IndexedDB, creating duplicates.

**Impact**: Minor data duplication in IndexedDB on tab hide/show cycles. Silent data loss on storage failures.

**Suggested Fix**: Clear buffer after successful save, or mark saved data to prevent duplication.

---

### Issue #26 (SEVERITY: LOW)
**Category**: edge-case
**File**: `/Users/juneheo/Workspace/humanwrites/frontend/packages/editor-react/src/hooks/useAiFeedback.ts`
**Line(s)**: 207-238
**Problem**: The `useEffect` that registers the editor `update` listener has `fetchFeedback` in its dependency array. `fetchFeedback` is a `useCallback` that depends on `editor` and `apiEndpoint`. If `editor` reference changes (e.g., editor re-creation on hot reload), the effect will:
1. Unsubscribe from old editor's `update` event.
2. Resubscribe to new editor's `update` event.
3. But `lastCheckedTextRef.current` retains the old value, so the first update on the new editor may be skipped if the text hasn't changed.

This is a minor issue but could cause AI feedback to not trigger after editor re-initialization until the user modifies the paragraph.

**Impact**: Minor UX issue: AI feedback may not appear immediately after editor re-creation until the next text change.

**Suggested Fix**: Reset `lastCheckedTextRef.current = null` in the cleanup function of the effect.

---

## Test Quality Observations

### act(...) Warnings in Frontend Tests
**Files**: `use-ai-feedback.test.ts`, `useOfflineBuffer.test.ts`, `useKeyboardShortcuts.test.ts`
**Problem**: Multiple tests trigger React state updates outside of `act(...)` wrappers. While tests pass, this indicates:
1. Tests may not be testing the final rendered state.
2. Assertions may run before state updates complete.
3. These tests may become flaky in future React versions that enforce `act()` more strictly.

**Recommendation**: Wrap all state-triggering operations in `act()` and use `waitFor()` for async state updates.

---

## Verdict

**NOT PRODUCTION-READY**

### Blocking Issues (must fix before production):
1. **Issue #1**: Race conditions in SessionWebSocketHandler (data corruption under load)
2. **Issue #3**: WebSocket endpoint allows unauthenticated connections (DoS vector)
3. **Issue #4**: No input validation on keystroke data (certification bypass)
4. **Issue #5**: In-memory session state lost on restart (data loss)

### High-Priority Fixes (fix before or immediately after launch):
5. **Issue #2**: AiUsageTracker race conditions
6. **Issue #6, #7**: Edge cases in scoring that deny legitimate users
7. **Issue #8**: JWT validation provides no security audit trail
8. **Issue #9**: No size limits on certificate request payload (OOM DoS)
9. **Issue #11**: V5 migration fails without TimescaleDB
10. **Issue #12**: Unrealistic WPM from short-duration windows
11. **Issue #13**: Login timing attack enables user enumeration

### Estimated Effort:
- CRITICAL fixes: ~3-4 days
- HIGH fixes: ~3-4 days
- MEDIUM fixes: ~2-3 days
- LOW fixes: ~1 day
- **Total**: ~9-12 days of engineering work

---

*Report generated by QA Cycle 4 - Comprehensive Production QA Specialist*
