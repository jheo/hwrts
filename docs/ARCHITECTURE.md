# HumanWrites Architecture

This document describes the architecture of HumanWrites as implemented in the codebase. Every statement is derived from reading the actual source files, not from planning documents.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Backend Architecture](#2-backend-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Data Flow: Keystroke Collection to Certification](#4-data-flow-keystroke-collection-to-certification)
5. [Security Architecture](#5-security-architecture)
6. [Real-time Communication](#6-real-time-communication)
7. [AI Integration](#7-ai-integration)
8. [Database Schema](#8-database-schema)
9. [Testing Strategy](#9-testing-strategy)
10. [Key Design Decisions](#10-key-design-decisions)

---

## 1. High-Level Architecture

HumanWrites is a split-stack application with a clear frontend/backend separation.

```
                       +-----------------------+
                       |   Next.js 15 (SSR)    |
                       |  http://localhost:3000 |
                       +-----------+-----------+
                                   |
                 +-----------------+-----------------+
                 |                 |                 |
            REST API         WebSocket          SSR Fetch
           (JSON/HTTP)     (STOMP/WS)        (Server-side)
                 |                 |                 |
                 +-----------------+-----------------+
                                   |
                       +-----------+-----------+
                       | Spring Boot 3.x (MVC) |
                       |  http://localhost:8080 |
                       |  Virtual Threads (J21) |
                       +-----------+-----------+
                                   |
                 +-----------------+-----------------+
                 |                                   |
       +---------+---------+               +---------+---------+
       |  PostgreSQL 16    |               |     Redis 7       |
       |  + TimescaleDB    |               |  (cache/sessions) |
       +-------------------+               +-------------------+
```

**Communication Protocols:**

| Protocol | Use Case | Implementation |
|----------|----------|----------------|
| REST (HTTP/JSON) | CRUD operations, authentication, AI spelling, certificate issuance | Spring MVC `@RestController`, OpenAPI via SpringDoc |
| WebSocket (STOMP) | Real-time keystroke streaming during writing sessions | `@MessageMapping` handlers, `SimpMessagingTemplate` |
| SSR Fetch | Public certificate verification page (SEO-friendly, server-rendered) | Next.js `async` server components fetching from backend |

**Build Orchestration:**

A root `Makefile` coordinates both stacks. The frontend uses Turborepo with pnpm workspaces. The backend uses Gradle Kotlin DSL with Spring Boot plugin.

---

## 2. Backend Architecture

### 2.1 Application Bootstrap

The entry point is `HumanWritesApplication.kt`, a standard Spring Boot application with `@ConfigurationPropertiesScan` to auto-discover typed config beans (`JwtConfig`, `AiConfig`, `ScoringConfig`).

Virtual Threads are enabled via `spring.threads.virtual.enabled: true` in `application.yml`, allowing all blocking I/O (JDBC, HTTP calls to AI APIs) to run efficiently on virtual threads without explicit coroutine or reactive patterns.

### 2.2 Package Structure (Feature-Oriented DDD)

```
com.humanwrites/
  config/                  # Spring @Configuration beans
    AiConfig.kt            # AI provider keys, rate limit, default provider
    DatabaseConfig.kt      # Exposed ORM initialization via DataSource
    JwtConfig.kt           # JWT secret, token expiry, cookie settings
    OpenApiConfig.kt       # SpringDoc OpenAPI metadata
    SecurityConfig.kt      # Spring Security filter chain, OAuth2, CSRF policy
    WebConfig.kt           # CORS mapping for localhost:3000
    WebSocketConfig.kt     # STOMP broker, endpoint registration, JWT auth interceptor

  domain/                  # Pure domain logic (DDD aggregate roots)
    ai/                    # AI review bounded context
      AiProvider.kt        # Interface: analyzeSpelling(text, locale) -> List<ReviewItem>
      ClaudeProvider.kt    # Anthropic Claude implementation (claude-haiku-4-5)
      OpenAiProvider.kt    # OpenAI implementation (gpt-4o-mini)
      ProviderRouter.kt    # Strategy pattern: routes to configured default or named provider
      AiGatewayService.kt  # Facade: rate limiting + provider dispatch
      AiUsageTracker.kt    # In-memory per-document AI usage counters
      AiReviews.kt         # Exposed table definition for ai_reviews
      ReviewItem.kt        # Value object: type, severity, range, message, suggestion

    certificate/           # Certificate issuance bounded context
      Certificates.kt      # Exposed table definition
      CertificateService.kt # Issuance, lookup by shortHash/userId, revocation
      SignatureService.kt  # Ed25519 key management, signing, verification, content hashing

    document/              # Document bounded context
      Documents.kt         # Exposed table definition
      DocumentEntity.kt    # Value object
      DocumentRepository.kt # Repository interface (domain layer)
      DocumentService.kt   # Ownership-checked CRUD operations

    session/               # Writing session bounded context
      WritingSessions.kt   # Exposed table definition
      KeystrokeEvents.kt   # Exposed table for time-series keystroke data
      KeystrokeStatsView.kt # Exposed mapping for TimescaleDB continuous aggregate
      analysis/
        KeystrokeAnalyzer.kt # Pure function: List<KeystrokeWindow> -> KeystrokeMetrics
        ScoringService.kt    # Weighted scoring: CV, entropy, error rate, fatigue, burst/pause
        AnomalyDetector.kt   # Real-time anomaly detection: speed, rhythm, paste, pauses

    user/                  # User bounded context
      Users.kt             # Exposed table definition
      UserEntity.kt        # Value objects: UserEntity, UserSettingsEntity, UserExportData
      UserRepository.kt    # Repository interfaces (User, OAuth, Settings)
      UserService.kt       # Registration, OAuth find-or-create, settings, GDPR export/delete
      OAuthAccount.kt      # Exposed table + entity for OAuth accounts
      UserSettingsTable.kt  # Exposed table for user_settings

  infrastructure/          # Technical implementations
    persistence/
      ExposedDocumentRepository.kt  # DocumentRepository implementation
      ExposedUserRepository.kt      # UserRepository implementation
      ExposedOAuthAccountRepository.kt # OAuthAccountRepository implementation
      ExposedUserSettingsRepository.kt # UserSettingsRepository implementation
    security/
      JwtTokenProvider.kt   # HMAC-SHA256 JWT generation and validation (access + refresh)
      JwtAuthFilter.kt      # OncePerRequestFilter extracting JWT from HttpOnly cookies
      GoogleOAuth2Handler.kt # OAuth2 success handler: find-or-create user, set JWT cookies
      CookieUtils.kt        # HttpOnly, SameSite=Lax cookie management

  presentation/            # HTTP/WebSocket interface layer
    rest/
      AuthController.kt       # /api/auth: register, login, refresh, logout, me
      DocumentController.kt   # /api/documents: CRUD with ownership checks
      CertificateController.kt # /api/certificates: issue, list, revoke
      (VerificationController) # /api/verify/{shortHash}: public certificate lookup
      AiController.kt         # /api/ai/spelling, /api/ai/suggestions/accept
      UserController.kt       # /api/users: settings CRUD, GDPR export, account deletion
      GlobalExceptionHandler.kt # @RestControllerAdvice for validation, auth, 404, 500 errors
    websocket/
      SessionWebSocketHandler.kt # STOMP @MessageMapping: session.start, session.keystroke, session.end
    dto/
      request/   # RegisterRequest, LoginRequest, DocumentCreateRequest, etc.
      response/  # AuthResponse, DocumentResponse, SessionResponses, ErrorResponse, etc.
```

### 2.3 Layering Rules Observed in Code

- **Domain layer** has zero Spring annotations except `@Service` on service classes. The analysis engine (`KeystrokeAnalyzer`, `ScoringService`, `AnomalyDetector`) are pure Kotlin classes with no framework dependencies.
- **Repository interfaces** are defined in the domain layer. Implementations live in `infrastructure/persistence/` and use the `@Repository` annotation.
- **Presentation layer** only calls domain services. Data transformation (`toResponse()`, `toAuthResponse()`) happens as extension functions within controllers.
- **Config layer** holds all `@Configuration` and `@ConfigurationProperties` beans, cleanly separated from domain logic.

---

## 3. Frontend Architecture

### 3.1 Monorepo Structure

```
frontend/
  turbo.json              # Turborepo task pipeline (build, lint, test, dev, type-check)
  apps/
    web/                  # Next.js 15 App Router application
      app/
        layout.tsx        # Root layout: Inter + Playfair Display fonts, theme script, Providers
        providers.tsx     # Client-side provider tree: ThemeProvider
        page.tsx          # Landing page
        editor/
          page.tsx        # Main editor page (client component, dynamic import)
          EditorLayout.tsx # Inspector + trigger composition
          layout.tsx      # Editor-specific layout
        verify/
          [shortHash]/
            page.tsx      # SSR certificate verification (async server component)
            not-found.tsx # 404 for invalid certificate hashes
        settings/
          layout.tsx      # Settings sidebar navigation
          ai/page.tsx     # AI assistant settings (provider selection, feature toggles)
      e2e/                # Playwright E2E tests

  packages/
    core/                 # Pure TypeScript (no DOM, no React)
      typing-analyzer/    # Keystroke/edit event types and analysis
      storage/            # Dexie.js IndexedDB wrapper (documents + keystroke sessions)
      collector/          # EventBuffer, MetricsWorker, BeaconSender, metrics-calculator

    editor-react/         # TipTap/ProseMirror React integration
      Editor.tsx          # Main editor component (DOMPurify sanitization, useEditor)
      EditorProvider.tsx  # React context for editor instance
      store/
        useEditorStore.ts # Zustand store: title, wordCount, isDirty, focusMode
      extensions/
        starter-kit.ts    # TipTap StarterKit customization
        paragraph-focus.ts # Active paragraph highlighting
        focus-mode.ts     # Soft focus mode (opacity dimming)
        inline-feedback.ts # AI review decorations (spelling/grammar underlines)
        typing-collector.ts # ProseMirror plugin: keystroke/edit event collection
        link.ts, heading.ts, blockquote.ts # Customized TipTap extensions
      hooks/
        useAutoSave.ts      # Debounced IndexedDB persistence (2s interval)
        useTypingMetrics.ts # Rolling WPM, keystroke/edit counters, session tracking
        useAiFeedback.ts    # Debounced paragraph-level AI spelling requests
        useFocusMode.ts     # Focus mode state management
        useDocumentStats.ts # Word/paragraph/character/reading-time computation
        useInspector.ts     # Inspector panel open/close/tab state (Zustand)
        useKeyboardShortcuts.ts # Keyboard shortcut bindings
        useConnectionStatus.ts  # Online/offline + WebSocket state tracking
        useOfflineBuffer.ts     # Offline event buffering with localStorage persistence
        useEditorState.ts       # Syncs TipTap editor state to Zustand store

    ui/                   # Design system (Radix UI + framer-motion + Tailwind)
      atoms/              # Button, Badge, IconButton, Toggle, Tooltip
      molecules/          # RecordingIndicator, StatItem
      organisms/
        Inspector/        # Slide-in panel: Stats, Review, Summary tabs
        CertificateModal/ # Multi-step modal: analyzing -> review -> signing -> complete
      theme-provider.tsx  # Light/Dark/System theme with localStorage + data-theme attribute
      lib/cn.ts           # clsx + tailwind-merge utility

    api-client/           # Axios instance (auto-generated hooks placeholder via orval)
    realtime/             # STOMP/SSE client (stub, pending implementation)
```

### 3.2 State Management

| Concern | Technology | Location |
|---------|------------|----------|
| Editor state (title, dirty, focus mode) | Zustand | `useEditorStore.ts` |
| Document stats (word count, paragraphs) | Derived from TipTap | `useDocumentStats.ts` |
| Inspector state (open/close, active tab) | Zustand | `useInspector.ts` |
| Theme (light/dark/system) | React Context | `theme-provider.tsx` |
| Server state (API data) | TanStack Query (planned via orval) | `api-client/` |
| Typing metrics (WPM, keystroke count) | React useState + refs | `useTypingMetrics.ts` |
| AI feedback (review items, loading) | React useState | `useAiFeedback.ts` |
| Local persistence | Dexie.js (IndexedDB) | `core/storage/` |
| Offline buffer | React useState + localStorage | `useOfflineBuffer.ts` |

### 3.3 Component Architecture (Atomic Design)

The UI package follows atomic design:

- **Atoms**: `Button`, `Badge`, `IconButton`, `Toggle`, `Tooltip` -- all built on Radix UI primitives with CSS variable theming.
- **Molecules**: `RecordingIndicator` (keystroke recording status), `StatItem` (label+value pairs).
- **Organisms**: `Inspector` (slide-in panel with tabs), `CertificateModal` (multi-step certification flow).

All components use CSS variables (`var(--text-active)`, `var(--surface-primary)`, etc.) rather than hard-coded colors, enabling the theme system to work through the `data-theme` attribute on `<html>`.

---

## 4. Data Flow: Keystroke Collection to Certification

This is the core value proposition. The flow spans both frontend and backend:

### 4.1 Keystroke Collection (Frontend)

```
User Types in Editor
        |
        v
TypingCollector (ProseMirror Plugin)
  - Classifies keys into categories (letter/number/punct/modifier/navigation)
  - Computes dwellTime (keydown -> keyup) and flightTime (keyup -> next keydown)
  - NEVER stores actual key values (privacy by design)
  - Handles IME composition events for Korean input
        |
        v
EventBuffer (packages/core)
  - Accumulates events up to 50 or 500ms
  - Flushes to callback (MetricsWorker.processEvents)
        |
        v
MetricsWorker (Web Worker or requestIdleCallback fallback)
  - Aggregates events into 5-second windows
  - Calculates: WPM, WPM std dev, avg dwell/flight time,
    Shannon entropy, error rate, pause count, burst/pause ratio
  - Produces KeystrokeStatVector objects
        |
        v
keystrokeStore (Dexie.js / IndexedDB)
  - Persists stat vectors locally
  - Auto-cleanup: 7-day max age, 500KB per document limit
        |
        v
BeaconSender
  - On visibilitychange/beforeunload: saves unsent buffer to IndexedDB
  - Future: navigator.sendBeacon() to server
```

### 4.2 Real-time Streaming (WebSocket)

```
EventBuffer flush
        |
        v
STOMP client (planned in realtime package)
  - Publishes to /app/session.keystroke
  - Batch: KeystrokeBatchMessage { sessionId, events[] }
        |
        v
SessionWebSocketHandler (Backend)
  - Validates session ownership via Principal
  - Tracks totalKeystrokes per session in ConcurrentHashMap
  - Sends status updates to /user/queue/session.status
  - TODO: Forward to KeystrokeAnalyzer for real-time analysis
  - TODO: Batch insert into TimescaleDB
```

### 4.3 Analysis and Scoring (Backend)

```
KeystrokeAnalyzer (pure domain logic)
  Input: List<KeystrokeWindow> (5-second aggregates)
  Output: KeystrokeMetrics
    - avgWpm, wpmVariance, typingSpeedCV
    - flightTimeEntropy (Shannon entropy, 50ms buckets)
    - errorCorrectionRate
    - pausePatternEntropy (pauses >= 2s, 500ms buckets)
    - burstPauseRatio
    - fatigueSlope (linear regression of WPM over time)
    - thinkingPauseFrequency
        |
        v
ScoringService
  Input: KeystrokeMetrics
  Scoring dimensions (weighted average):
    - typingSpeedCV (20%): range score [0.15, 0.60]
    - flightTimeEntropy (25%): threshold score [3.0, 6.0]
    - errorCorrectionRate (15%): range score [0.03, 0.20]
    - thinkingPauseFrequency (15%): range score [0.5, 8.0]
    - fatigueSlope (10%): negative slope = human-like
    - burstPauseRatio (15%): ideal range [2.0, 10.0]

  Output: ScoringResult
    - overallScore: 0-100
    - grade: "Certified" (>= 60) or "Not Certified"
    - label: "Highly likely human-written" / "Likely human-written" / "Inconclusive" / "Unlikely human-written"
        |
        v
AnomalyDetector (real-time, during active sessions)
  Detects:
    - UNREALISTIC_SPEED: CV < 0.05 with WPM > 30
    - MECHANICAL_RHYTHM: entropy < 2.0
    - EXCESSIVE_PASTE: paste ratio >= 0.30 (warning) or >= 0.50 (critical)
    - NO_THINKING_PAUSES: pause frequency < 0.3 per minute
```

### 4.4 Certificate Issuance

```
CertificateController.issueCertificate()
        |
        v
CertificateService.issueCertificate()
  1. Generate UUID + 32-char SHA-256 shortHash
  2. Compute content SHA-256 hash via SignatureService
  3. Build CertificateSignPayload (certId, contentHash, score, grade, issuedAt)
  4. Sign payload with Ed25519 private key -> Base64URL signature
  5. Fetch AI usage data from AiUsageTracker
  6. Insert into certificates table (Exposed ORM transaction)
  7. Return CertificateResponse with nested document, verification, aiAssistance, meta
```

### 4.5 Public Verification

```
GET /api/verify/{shortHash}    (public, no auth required)
        |
        v
VerificationController
  - Looks up certificate by shortHash
  - Returns all verification data, signature, content hash

Next.js Verify Page (SSR)
  - Server component fetches from backend
  - Renders certificate card with:
    - Grade, score, label
    - Keystroke dynamics breakdown (speed variance, error rate, entropy)
    - AI usage transparency
    - Ed25519 signature reference
    - Link to public key at /.well-known/humanwrites-public-key.pem
```

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
             [Register/Login]                   [Google OAuth2]
                   |                                  |
                   v                                  v
         AuthController                    GoogleOAuth2Handler
      (email + Argon2 hash)              (OAuth2User attributes)
                   |                                  |
                   +------> JwtTokenProvider <--------+
                            |           |
                       accessToken  refreshToken
                            |           |
                            v           v
                    HttpOnly Cookie  HttpOnly Cookie
                    Path: /          Path: /api/auth/refresh
                    SameSite: Lax    SameSite: Lax
                    15min expiry     7 day expiry
```

**Key Security Properties:**

| Property | Implementation |
|----------|----------------|
| Passwords | Argon2 via `Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()` |
| JWT signing | HMAC-SHA256 via jjwt library (`Keys.hmacShaKeyFor`) |
| Token storage | HttpOnly cookies only (never exposed to JavaScript) |
| CSRF protection | Disabled (stateless JWT + SameSite=Lax cookies provide CSRF protection) |
| Session policy | `STATELESS` -- no server-side sessions |
| XSS prevention | DOMPurify sanitization on all editor content before rendering |

### 5.2 Ed25519 Digital Signatures

The `SignatureService` manages Ed25519 key pairs for certificate signing:

- **Production**: Loads key pair from `ED25519_PRIVATE_KEY` and `ED25519_PUBLIC_KEY` environment variables (Base64-encoded PKCS#8/X509).
- **Development**: Generates an ephemeral key pair at startup (new keys each restart).
- **Signing**: JSON-serializes `CertificateSignPayload` -> `Signature.getInstance("Ed25519")` -> Base64URL-encoded.
- **Verification**: Same process in reverse with public key.
- **Public Key Distribution**: Exposed at `/.well-known/humanwrites-public-key.pem` in PEM format for offline verification.

### 5.3 Authorization

`SecurityConfig` defines the access control rules:

| Path Pattern | Access |
|--------------|--------|
| `/actuator/**` | Public |
| `/api-docs/**`, `/swagger-ui/**` | Public |
| `/api/auth/**` | Public |
| `/api/verify/**` | Public |
| `/.well-known/**` | Public |
| `/ws/**` | Public (JWT verified at STOMP CONNECT) |
| All other paths | Authenticated |

The `JwtAuthFilter` extracts the `access_token` cookie on every request and populates `SecurityContextHolder`. Controllers retrieve the user ID via `SecurityContextHolder.getContext().authentication.principal as UUID`.

### 5.4 WebSocket Authentication

The STOMP connection is authenticated via a channel interceptor in `WebSocketConfig`:
1. On `CONNECT` frame, extracts `Authorization: Bearer <token>` header.
2. Validates JWT via `JwtTokenProvider`.
3. Sets `UsernamePasswordAuthenticationToken` as the STOMP user principal.
4. Subsequent `@MessageMapping` handlers receive the `Principal` for ownership verification.

### 5.5 Keystroke Privacy

Privacy is enforced at the collection layer:
- `TypingCollector` classifies keys into categories (`letter`, `number`, `punct`, etc.) but **never stores the actual key value**.
- Only timing metrics (dwell time, flight time) and categories are transmitted.
- `EditEvent` includes `contentLength` but never the actual content text.
- Raw keystroke values never leave the browser.

---

## 6. Real-time Communication

### 6.1 STOMP over WebSocket

Configured in `WebSocketConfig`:

```
Client -> Server (publish):
  /app/session.start      -> SessionWebSocketHandler.handleSessionStart()
  /app/session.keystroke   -> SessionWebSocketHandler.handleKeystrokeBatch()
  /app/session.end         -> SessionWebSocketHandler.handleSessionEnd()

Server -> Client (subscribe):
  /user/queue/session.status   <- Session status updates (active/ended, keystroke count)
  /user/queue/session.anomaly  <- Anomaly alerts (unrealistic speed, mechanical rhythm, etc.)
```

**No SockJS**: The WebSocket endpoint at `/ws` uses pure WebSocket only (comment in code: "No SockJS - pure WebSocket only"). The frontend is expected to connect via native WebSocket or STOMP.js.

### 6.2 Session State Management (Backend)

`SessionWebSocketHandler` maintains an in-memory `ConcurrentHashMap<UUID, SessionState>` tracking:
- `sessionId`, `userId`, `documentId`
- `totalKeystrokes` (incremented per batch)
- `anomalyCount`

Session lifecycle: `start` creates state, `keystroke` updates it, `end` removes it.

### 6.3 Connection Resilience (Frontend)

The `useConnectionStatus` hook tracks:
- `isOnline`: Browser `navigator.onLine` + `online`/`offline` events.
- `isWsConnected`: Custom events (`humanwrites:ws:connect`, `humanwrites:ws:disconnect`) dispatched by the realtime layer.
- `reconnectAttempts`: Counter for reconnection tracking.

The `useOfflineBuffer` hook provides offline resilience:
- Buffers events in memory when offline.
- Optionally persists to `localStorage` for page-reload survival.
- Auto-flushes when connection is restored.
- Configurable max buffer size (default 500 events, oldest dropped on overflow).

---

## 7. AI Integration

### 7.1 Provider Architecture

```
AiController
     |
     v
AiGatewayService (facade)
  - Per-user in-memory rate limiting (ConcurrentHashMap, 60s sliding window)
  - Default: 20 requests/minute per user
  - Graceful degradation: returns empty list on provider failure
     |
     v
ProviderRouter (strategy pattern)
  - Collects all AiProvider beans via Spring DI (List<AiProvider>)
  - Routes to default provider (from AiConfig) or named provider
     |
     +-----> ClaudeProvider           +-----> OpenAiProvider
             - Model: claude-haiku-4-5-20251001   - Model: gpt-4o-mini
             - API: api.anthropic.com/v1/messages  - API: api.openai.com/v1/chat/completions
             - Auth: x-api-key header              - Auth: Bearer token
             - RestClient (Spring 6.1+)            - RestClient (Spring 6.1+)
```

Both providers:
1. Build a structured prompt requesting JSON array output with `type`, `severity`, `range`, `message`, `suggestion` fields.
2. Parse the AI response by extracting the JSON array from the text content.
3. Map to `ReviewItem` domain objects.

### 7.2 AI Usage Tracking

`AiUsageTracker` maintains per-document counters in-memory:
- `totalSuggestions`: Incremented when spelling analysis returns results.
- `suggestionsAccepted`: Incremented via `/api/ai/suggestions/accept` endpoint.
- `featuresUsed`: List of feature names (currently only "spelling").

This data is embedded in certificates to provide AI transparency.

### 7.3 Frontend AI Integration

The `useAiFeedback` hook:
1. Listens to TipTap editor `update` events.
2. Debounces (1.5s default) after typing stops.
3. Extracts the current paragraph text and its absolute document range.
4. Sends POST to `/api/ai/spelling` with the paragraph text.
5. Maps response items to `ReviewItem` objects with absolute positions.
6. Dispatches to the `InlineFeedback` TipTap extension via `editor.commands.setReviewItems()`.
7. The extension renders ProseMirror `Decoration.inline` with CSS classes (`inline-feedback-spelling`, `inline-feedback-grammar`).
8. Supports abort on rapid typing (new request aborts previous in-flight request).

---

## 8. Database Schema

### 8.1 Flyway Migrations

Seven versioned migrations establish the schema:

| Version | File | Description |
|---------|------|-------------|
| V1 | `V1__create_users.sql` | `users`, `oauth_accounts`, `user_settings` tables |
| V2 | `V2__create_documents.sql` | `documents` table with user FK, status, timestamps |
| V3 | `V3__create_writing_sessions.sql` | `writing_sessions` table linking documents to sessions |
| V4 | `V4__create_keystroke_events.sql` | `keystroke_events` TimescaleDB hypertable with compression and retention |
| V5 | `V5__add_continuous_aggregate.sql` | `keystroke_stats_5s` materialized view (continuous aggregate) |
| V6 | `V6__create_certificates.sql` | `certificates` table with JSONB verification/AI data, Ed25519 signature |
| V7 | `V7__create_ai_reviews.sql` | `ai_reviews` table for persisting AI review results |

### 8.2 Entity-Relationship Diagram

```
users (1) ----< (N) oauth_accounts
  |
  |--- (1:1) user_settings
  |
  +----< (N) documents
              |
              +----< (N) writing_sessions
              |          |
              |          +----< (N) keystroke_events  [TimescaleDB hypertable]
              |                      |
              |                      +----> keystroke_stats_5s  [continuous aggregate]
              |
              +----< (N) certificates
              |
              +----< (N) ai_reviews
```

### 8.3 TimescaleDB Integration

The `keystroke_events` table is conditionally converted to a TimescaleDB hypertable:

```sql
-- Hypertable with 1-day chunk interval
create_hypertable('keystroke_events', 'time', chunk_time_interval => INTERVAL '1 day')

-- Compression: chunks older than 7 days, segmented by session_id
timescaledb.compress, timescaledb.compress_segmentby = 'session_id'
add_compression_policy('keystroke_events', INTERVAL '7 days')

-- Retention: drop data older than 90 days
add_retention_policy('keystroke_events', INTERVAL '90 days')
```

The continuous aggregate `keystroke_stats_5s` pre-computes 5-second window statistics:
- Keystroke count, keydown count, typing keys vs modifier keys
- Average, min, max, stddev of dwell and flight times
- Auto-refreshes every 5 seconds with 1-minute lookback

The Exposed ORM table `KeystrokeStatsView` provides read-only access to this materialized view.

**Graceful fallback**: If TimescaleDB extension is not installed, `keystroke_events` remains a regular PostgreSQL table (the migration checks for `pg_extension` before calling TimescaleDB functions).

### 8.4 Exposed ORM Usage

The Exposed ORM is used in JDBC mode (not R2DBC). Table definitions are Kotlin `object` singletons inheriting from `Table`:

```kotlin
object Documents : Table("documents") {
    val id = uuid("id").autoGenerate()
    val userId = uuid("user_id").references(Users.id)
    val title = varchar("title", 500).default("")
    // ...
}
```

All database operations are wrapped in `transaction { }` blocks. `DatabaseConfig` connects Exposed to the Spring-managed `DataSource` (HikariCP) at `@PostConstruct`.

---

## 9. Testing Strategy

### 9.1 Backend Testing Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Unit Tests | Kotest + MockK | Domain logic (KeystrokeAnalyzer, ScoringService, AnomalyDetector) |
| Integration Tests | Kotest + Spring Boot Test + Testcontainers | Full Spring context with real PostgreSQL |
| API Tests | Spring Security Test | Controller endpoint testing with mock authentication |
| Coverage | JaCoCo 0.8.12 | XML + HTML reports |
| Linting | Spotless + ktlint 1.5.0 | Kotlin code style enforcement |

The `application-test.yml` configures Testcontainers JDBC driver (`jdbc:tc:postgresql:16-alpine`) so integration tests spin up a real PostgreSQL container with Flyway migrations.

### 9.2 Frontend Testing Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Unit Tests | Vitest | Pure logic (metrics-calculator, EventBuffer, stores) |
| Component Tests | Vitest + Testing Library | React hooks and components |
| E2E Tests | Playwright | Full browser flows (editor, certification, verification) |
| Accessibility | axe-core (via Playwright) | WCAG compliance checking |

**Vitest configuration** is per-package (`core/vitest.config.ts`, `editor-react/vitest.config.ts`, `ui/vitest.config.ts`).

### 9.3 E2E Test Coverage

Playwright specs in `apps/web/e2e/`:
- `editor-flow.spec.ts`: Editor loading, typing, auto-save
- `certification-flow.spec.ts`: Full certificate issuance flow
- `ai-spelling.spec.ts`: AI feedback integration
- `verify-page.spec.ts`: Public verification page rendering
- `accessibility.spec.ts`: Axe-core accessibility scans
- `performance.spec.ts`: LCP and bundle size checks
- `error-flows.spec.ts`: Error handling scenarios

---

## 10. Key Design Decisions

### 10.1 Spring MVC + Virtual Threads over WebFlux

**Evidence**: `application.yml` has `spring.threads.virtual.enabled: true`. All controllers are `@RestController` (not `@RestController` with `Mono`/`Flux`). All database calls use blocking `transaction { }` blocks.

**Rationale inferred**: Virtual Threads (Java 21) make blocking I/O cheap. This allows using Exposed ORM in JDBC mode, standard `RestClient` for AI API calls, and simple imperative code without the complexity of reactive programming. The WebSocket layer uses Spring's STOMP support which is also MVC-compatible.

### 10.2 Exposed ORM (JDBC) as Single ORM

**Evidence**: Only `exposed-core`, `exposed-dao`, `exposed-jdbc`, `exposed-java-time` dependencies. No JPA/Hibernate or R2DBC drivers.

**Rationale inferred**: Exposed provides a Kotlin-native DSL that is more idiomatic than JPA. The JDBC mode pairs naturally with Virtual Threads. Table definitions as Kotlin objects serve as both schema documentation and query builders.

### 10.3 Ed25519 from Day One (Not HMAC-SHA256)

**Evidence**: `SignatureService` uses `Signature.getInstance("Ed25519")` and `KeyPairGenerator.getInstance("Ed25519")`. JDK 17+ native support (no external crypto library needed).

**Rationale inferred**: Asymmetric signatures enable offline verification. Anyone with the public key (served at `/.well-known/`) can verify a certificate without contacting the server. HMAC would require sharing the secret key.

### 10.4 Client-Side Keystroke Analysis First

**Evidence**: The `MetricsWorker`, `metrics-calculator`, and `EventBuffer` all live in the frontend `core` package. The backend `KeystrokeAnalyzer` and `ScoringService` exist but the WebSocket handler has TODO comments for integration.

**Rationale inferred**: Computing metrics on the client (in a Web Worker) avoids the latency of round-tripping raw events to the server. The backend serves as a second analysis layer and the source of truth for certification scoring.

### 10.5 Privacy-by-Design Keystroke Collection

**Evidence**: `classifyKey()` in `typing-collector.ts` maps keys to categories. The `KeystrokeEvent` interface has `keyCategory` but no `key` or `code` field. Comments explicitly state "PRIVACY: actual key values are NEVER stored".

**Rationale inferred**: Keystroke dynamics analysis needs timing patterns, not what was typed. Sending categories instead of actual keys prevents the system from becoming a keylogger. This is critical for user trust.

### 10.6 IndexedDB (Dexie.js) for Local Persistence

**Evidence**: `HumanWritesDB` extends `Dexie` with two tables: `documents` and `keystroke_stats`. Auto-cleanup policies enforce 7-day TTL and 500KB per-document limits.

**Rationale inferred**: Editor content and keystroke statistics can be substantial (multi-KB per session). IndexedDB handles large structured data better than localStorage (which has a ~5MB limit and no indexing). Dexie provides a clean Promise-based API.

### 10.7 DOMPurify for XSS Prevention

**Evidence**: `Editor.tsx` imports `DOMPurify` and sanitizes all content before passing to TipTap. An explicit allowlist limits tags to basic formatting (`p`, `strong`, `em`, `h1-h3`, `a`, `blockquote`, lists) and attributes to `href`, `target`, `rel`.

**Rationale inferred**: TipTap renders HTML content. Without sanitization, malicious HTML in saved documents or pasted content could execute scripts. The allowlist approach ensures only safe markup passes through.

### 10.8 Two-Font Design System

**Evidence**: `layout.tsx` loads Inter (sans-serif, `--font-inter`) and Playfair Display (serif, `--font-playfair`). The editor title uses `var(--font-display)` (Playfair). The certificate card uses `font-serif`.

**Rationale inferred**: Inter provides clean UI typography for the interface. Playfair Display provides a ceremonial, document-like feel for titles and certificates, reinforcing the "your words matter" brand identity.

### 10.9 CSS Variables for Theming (Not Tailwind Themes)

**Evidence**: Components reference `var(--text-active)`, `var(--surface-primary)`, `var(--border-default)` etc. The `ThemeProvider` sets `data-theme` attribute. `layout.tsx` injects a blocking script to read theme from localStorage before paint.

**Rationale inferred**: CSS variables with a `data-theme` attribute allow instant theme switching without re-rendering the component tree. The blocking script prevents flash of wrong theme (FOUC). This is more performant than Tailwind's `dark:` variant approach which requires class-based toggling.

### 10.10 Strategy Pattern for AI Providers

**Evidence**: `AiProvider` is an interface with two implementations (`ClaudeProvider`, `OpenAiProvider`). `ProviderRouter` collects all implementations via Spring DI and routes by name or default. `AiConfig.defaultProvider` is configurable.

**Rationale inferred**: Decoupling the AI integration from specific providers allows easy switching (Claude optimized for Korean, OpenAI for English) and future provider additions without modifying the gateway service.

---

## Appendix: API Endpoint Summary

| Method | Path | Auth | Controller |
|--------|------|------|------------|
| POST | `/api/auth/register` | Public | AuthController |
| POST | `/api/auth/login` | Public | AuthController |
| POST | `/api/auth/refresh` | Cookie | AuthController |
| POST | `/api/auth/logout` | Auth | AuthController |
| GET | `/api/auth/me` | Auth | AuthController |
| GET | `/api/documents` | Auth | DocumentController |
| POST | `/api/documents` | Auth | DocumentController |
| GET | `/api/documents/{id}` | Auth | DocumentController |
| PUT | `/api/documents/{id}` | Auth | DocumentController |
| DELETE | `/api/documents/{id}` | Auth | DocumentController |
| POST | `/api/certificates` | Auth | CertificateController |
| GET | `/api/certificates` | Auth | CertificateController |
| DELETE | `/api/certificates/{id}` | Auth | CertificateController |
| GET | `/api/verify/{shortHash}` | Public | VerificationController |
| GET | `/.well-known/humanwrites-public-key.pem` | Public | VerificationController |
| POST | `/api/ai/spelling` | Auth | AiController |
| POST | `/api/ai/suggestions/accept` | Auth | AiController |
| GET | `/api/users/settings` | Auth | UserController |
| PUT | `/api/users/settings` | Auth | UserController |
| POST | `/api/users/export` | Auth | UserController |
| DELETE | `/api/users` | Auth | UserController |
| PUB | `/app/session.start` | STOMP JWT | SessionWebSocketHandler |
| PUB | `/app/session.keystroke` | STOMP JWT | SessionWebSocketHandler |
| PUB | `/app/session.end` | STOMP JWT | SessionWebSocketHandler |
| SUB | `/user/queue/session.status` | STOMP JWT | SessionWebSocketHandler |
| SUB | `/user/queue/session.anomaly` | STOMP JWT | SessionWebSocketHandler |
