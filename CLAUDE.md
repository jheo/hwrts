# HumanWrites AI 에이전트 기준 인스트럭션

> **버전**: 1.0
> **작성일**: 2026-02-18
> **대상**: HumanWrites 프로젝트 참여 모든 AI 코딩 에이전트
> **출처**: PROJECT_PLAN.md v3.0 (전원 합의), DESIGN_SYSTEM.md, TEST_STRATEGY.md, UX_STRATEGY.md

---

## 프로젝트 개요

**HumanWrites**: AI 시대에 당신의 글이 당신의 것임을 증명하는 글쓰기 도구

### 핵심 3가지 가치
1. **Zen 에디터**: 글 자체에만 집중하는 미니멀 인터페이스
2. **Human Written 인증**: 타이핑 행위를 기록하고 검증 가능한 Ed25519 인증서 발행
3. **AI 어시스트**: 맞춤법/팩트 제안만 제시하되, 글 생성은 절대 금지 (AI는 "조수", "저자" 아님)

**MVP 범위**: 10주, Desktop 전용, 핵심 경험 검증
**Post-MVP**: 2주 단위 이터레이션 (Focus Mode 고도화, Layer 2/3 인증, 플랫폼 확장)

---

## 확정 기술 스택

### Frontend (TypeScript)

| 계층 | 기술 | 용도 |
|------|------|------|
| **Framework** | Next.js 15 (App Router) | SSR/SSG, API Routes, SSE 프록시 |
| **Editor** | TipTap v2 + ProseMirror | 리치텍스트, 한국어 IME 지원, 플러그인 확장성 |
| **State** | Zustand + TanStack Query | 로컬 상태(에디터) + 서버 상태(orval hooks) 분리 |
| **Styling** | Tailwind v4 + CSS Variables | 디자인 토큰, 접근성 색상 대비 (WCAG AA) |
| **UI Components** | Radix UI Primitives | 접근성 기본 제공, Headless 컴포넌트 |
| **API Client** | orval (OpenAPI Generator) | 백엔드 OpenAPI → TypeScript hooks 자동 생성 |
| **Animation** | framer-motion | Inspector, 인증서 모달, 테마 전환 애니메이션 |
| **Realtime** | STOMP.js (순수 WebSocket) | 타이핑 이벤트 스트림 (SockJS 제거) |
| **Build** | Turborepo + pnpm | 패키지 독립 빌드, incremental 캐시 |
| **Testing** | Vitest + Playwright + MSW + Storybook | Unit/Integration/E2E, 컴포넌트 문서화, 타입 안전성 |

### Backend (Kotlin + Spring Boot 3.x)

| 계층 | 기술 | 용도 |
|------|------|------|
| **Framework** | Spring Boot 3.x MVC + Virtual Threads (Java 21) | WebFlux 제거, blocking I/O 효율화, suspend fun 컨트롤러 |
| **ORM** | Exposed (JDBC) | Kotlin DSL, Virtual Threads와 완벽 호환 (R2DBC 불필요) |
| **Auth** | Spring Security + OAuth2 | JWT + HttpOnly Cookie, MVP: Google만 (Post-MVP: GitHub/Apple) |
| **Database** | PostgreSQL 16 + TimescaleDB | 정규 데이터 + 키스트로크 시계열 (hypertable) |
| **Cache** | Redis 7 | 세션 + AI 응답 캐시 (24h TTL) + Rate Limiting |
| **API Docs** | SpringDoc OpenAPI | 자동 스키마 생성 (orval 클라이언트 기반) |
| **HTTP Client** | RestClient (Spring 6.1+) | AI API 호출, Virtual Threads 동기식 |
| **Serialization** | Jackson + jackson-module-kotlin | SpringDoc 호환, Kotlin 컴파일러 플러그인 불필요 |
| **Signing** | Ed25519 (JDK 17+ native) | 인증서 비대칭 서명, 공개키 오프라인 검증 |
| **Build** | Gradle Kotlin DSL | Spring Boot 공식 권장 |
| **Testing** | Kotest + MockK + Testcontainers | Kotlin 네이티브, 실제 DB 통합 테스트 (목표: < 5분) |
| **Migration** | Flyway | DB 버전 관리, TimescaleDB 호환 |

### 공통 인프라

| 계층 | 기술 | 용도 |
|------|------|------|
| **AI** | Claude / OpenAI (RestClient 호출) | 맞춤법/팩트 검사 (한국어 + 영어), 스트리밍 응답 |
| **Build Orchestration** | Makefile | frontend/backend 통합 빌드, OpenAPI 파이프라인 |
| **Local Dev** | Docker Compose | PostgreSQL+TimescaleDB, Redis 컨테이너 |
| **CI/CD** | GitHub Actions | 분리된 frontend.yml, backend.yml |

---

## 프로젝트 구조

```
humanwrites/
├── frontend/                      # Turborepo monorepo
│   ├── apps/web/                  # Next.js 15 (App Router)
│   │   ├── app/                   # RSC + Client Components
│   │   ├── public/                # 정적 자산
│   │   └── .well-known/           # humanwrites-public-key.pem
│   ├── packages/
│   │   ├── core/                  # 순수 TypeScript (DOM 의존 없음)
│   │   │   ├── typing-analyzer/   # 키스트로크 분석, 점수 계산
│   │   │   ├── certificate/       # 인증서 자료구조, 검증 로직
│   │   │   ├── scoring/           # Layer 1 신뢰도 계산
│   │   │   └── ai-detector/       # 이상 탐지 (future)
│   │   ├── ui/                    # Radix 기반 컴포넌트 (atoms/molecules/organisms)
│   │   ├── editor-react/          # TipTap 래퍼, 에디터 상태 관리
│   │   ├── api-client/            # orval 자동 생성 (수동 편집 금지)
│   │   └── realtime/              # STOMP/SSE 클라이언트
│   ├── package.json               # pnpm workspaces
│   └── turbo.json                 # 빌드 캐시 정책
│
├── backend/                       # Gradle + Kotlin
│   ├── src/main/kotlin/com/humanwrites/
│   │   ├── config/                # Spring 설정 (@Configuration, @Bean)
│   │   ├── domain/                # DDD: user, document, session, certificate, ai
│   │   │   ├── user/
│   │   │   ├── document/
│   │   │   ├── session/           # writing-session (하이픈 불가 → session)
│   │   │   ├── certificate/
│   │   │   └── ai/                # ai-review (하이픈 불가 → ai)
│   │   ├── infrastructure/        # 기술 구현 (persistence, security, cache, external)
│   │   │   ├── persistence/       # Exposed ORM, Flyway
│   │   │   ├── security/          # Spring Security, JWT, OAuth2
│   │   │   ├── cache/             # Redis 클라이언트
│   │   │   └── external/          # AI API (RestClient)
│   │   └── presentation/          # Spring MVC 컨트롤러, WebSocket, SSE
│   │       ├── rest/              # REST API 엔드포인트
│   │       ├── dto/               # 요청/응답 DTO
│   │       │   ├── request/       # 요청 DTO
│   │       │   └── response/      # 응답 DTO
│   │       ├── websocket/         # STOMP @MessageMapping
│   │       └── sse/               # SseEmitter
│   ├── src/test/kotlin/           # Kotest 테스트
│   ├── build.gradle.kts
│   └── settings.gradle.kts
│
├── schema/                        # OpenAPI 스키마 (자동 생성)
│   └── openapi.yaml               # SpringDoc → orval
│
├── docker/
│   └── docker-compose.yml         # PG+TimescaleDB, Redis
│
├── PROJECT_PLAN.md                # 전체 계획서 (v3.0)
├── DESIGN_SYSTEM.md               # 디자인 토큰, 타이포그래피, 컴포넌트
├── TEST_STRATEGY.md               # 테스트 계획 (Vitest/Playwright/Kotest)
├── UX_STRATEGY.md                 # UX 페르소나, 사용자 시나리오
├── CLAUDE.md                      # 이 파일
└── Makefile                       # 빌드 오케스트레이션
```

---

## 아키텍처 핵심 원칙 (DO / DON'T)

| ✅ DO | ❌ DON'T |
|-------|----------|
| **Spring MVC + Virtual Threads (Java 21)** | WebFlux / Reactive 스택 (Mono, Flux) |
| **Exposed ORM (JDBC)** 단독 | R2DBC, JPA/Hibernate, 이중 ORM |
| **Ed25519 비대칭 서명** (MVP부터) | HMAC-SHA256 대칭 서명 |
| **OpenAPI 스키마 → orval 자동 생성** | 수동 API 클라이언트 / 타입 작성 |
| **Jackson + jackson-module-kotlin** | kotlinx.serialization |
| **Radix UI 접근성 기본** | 접근성 없는 커스텀 컴포넌트 |
| **IndexedDB (Dexie.js) 로컬 저장** | localStorage (대용량 데이터) |
| **Web Worker로 메트릭 계산 분리** | 메인 스레드에서 키스트로크 분석 |
| **Feature별 디렉토리 구조** | 기술별 디렉토리 구조 (layers, services) |
| **HttpOnly Cookie + JWT** | localStorage에 토큰 저장 |
| **STOMP over WebSocket** (SockJS 제거) | Socket.io, SockJS |
| **타이핑 분석은 클라이언트 먼저** | 서버에서만 분석 (레이턴시 증가) |

---

## 핵심 보안 원칙

1. **XSS 방지**: TipTap DOMPurify 정화 필수, `dangerouslySetInnerHTML` 금지
2. **CSRF 방지**: HttpOnly Cookie + SameSite=Lax (OAuth 리다이렉트 호환), STOMP 연결 시 JWT Bearer 재검증
3. **키스트로크 프라이버시**: 원시 키값 서버 전송 금지 — 메트릭(dwell/flight time, 카테고리)만 전송
4. **GDPR**: `/api/users/export` 데이터 내보내기 + `/api/users` 계정 삭제 MVP 필수 구현
5. **Ed25519 키 관리**: 개인키는 환경변수만, 공개키는 `/.well-known/` 노출 (오프라인 검증 지원)

## 성능 목표

| 지표 | 목표 | 비고 |
|------|------|------|
| 타이핑 입력 지연 | < 16ms | 메인 스레드 블로킹 금지, Web Worker 분리 |
| LCP (Largest Contentful Paint) | < 2s | Next.js SSR + 코드 분할 |
| 초기 JS 번들 | < 150KB gzip | TipTap tree-shaking, dynamic import |
| STOMP 배치 전송 주기 | 200ms (2Hz) | 키스트로크 배치 집계 후 전송 |

---

## 타입 및 인터페이스 (핵심만)

### 클라이언트 ↔ 서버 WebSocket (STOMP)

```typescript
// 타이핑 스트림 (2Hz, 200ms 간격)
interface KeystrokeEvent {
  type: 'keydown' | 'keyup';
  keyCategory: 'letter' | 'number' | 'punct' | 'modifier';
  timestamp: number;           // performance.now()
  dwellTime?: number;          // ms, keydown → keyup
  flightTime?: number;         // ms, keyup → next keydown
}

// 편집 이벤트
interface EditEvent {
  type: 'insert' | 'delete' | 'replace' | 'cursor_move' | 'paste';
  position: { from: number; to: number };
  contentLength?: number;      // 내용 길이만, 실제 내용 아님
  timestamp: number;
  source: 'keyboard' | 'paste' | 'ai_suggestion';
}
```

### 인증서 구조

> **참고**: 아래는 PROJECT_PLAN.md 2.2절의 원본 중첩 구조를 따른다. 에이전트는 이 구조를 그대로 구현해야 한다.

```typescript
interface HumanWrittenCertificate {
  // 식별
  id: string;                    // UUID v4
  version: string;               // 인증 프로토콜 버전
  shortHash: string;             // 32자 short hash (URL용)

  // 문서 정보
  document: {
    title: string;
    author: string;
    wordCount: number;
    paragraphCount: number;
    createdAt: ISO8601;
    completedAt: ISO8601;
    totalEditTime: Duration;     // 실제 활성 편집 시간
    contentHash: string;         // SHA-256
  };

  // 검증 결과
  verification: {
    overallScore: number;        // 0-100
    grade: 'Certified' | 'Not Certified'; // MVP 이분법 (Post-MVP: A+~F 6등급)
    label: string;

    keystrokeDynamics: {
      score: number;
      typingSpeedVariance: number;
      errorCorrectionRate: number;
      pausePatternEntropy: number;
    };

    // Post-MVP (Iter 2+)
    editPattern?: {
      score: number;
      nonLinearEditRatio: number;
      revisionFrequency: number;
      cursorJumpEntropy: number;
    };

    // Post-MVP (Iter 2+)
    contentIntegrity?: {
      score: number;
      aiSimilarityIndex: number;
      pasteRatio: number;
      stylistic_consistency: number;
    };
  };

  // AI 사용 투명성
  aiAssistance: {
    enabled: boolean;
    features_used: string[];
    suggestions_accepted: number;
    suggestions_rejected: number;
    total_suggestions: number;
  };

  // 검증 메타
  meta: {
    issuedAt: ISO8601;
    expiresAt: ISO8601 | null;
    verifyUrl: string;           // humanwrites.app/verify/{shortHash}
    signature: string;           // Ed25519 디지털 서명
    publicKeyUrl: string;        // /.well-known/humanwrites-public-key.pem
  };
}
```

### AI 리뷰 아이템

```typescript
interface ReviewItem {
  id: string;
  type: 'spelling' | 'grammar' | 'fact_check' | 'style';
  range: { from: number; to: number };
  message: string;
  suggestion?: string;
  severity: 'info' | 'warning' | 'error';
  source: 'ai_model' | 'user_ignore';
}
```

---

## MVP 범위 (10주)

### ✅ 포함 기능
- **에디터**: Zen 인터페이스, 단락 포커스, Light/Dark 모드, 자동저장 (IndexedDB)
- **Inspector**: 통계 (단어/단락/읽기시간), 미리보기, Focus Mode Soft (0.4 투명도만, Week 3 Phase 1-3에서 구현)
- **인증 (Layer 1만)**: 키스트로크 다이나믹스 (40%), 이분법 (Certified/Not Certified)
- **인증서**: Ed25519 디지털 서명, 공개 검증 페이지, 소셜 공유 (Twitter/LinkedIn)
- **AI**: 맞춤법/문법 검사만 (한국어+영어), 인라인 밑줄, Inspector 연동
- **인증**: Google OAuth만, JWT + HttpOnly Cookie
- **플랫폼**: Desktop (1440px+) 전용

### ❌ 제외 (Post-MVP)
- Focus Mode Deep/Zen, Typewriter Mode
- Layer 2 (편집 패턴), Layer 3 (콘텐츠 무결성), 6등급 체계
- 팩트 체크, 스타일 제안, AI 요약, 스크린 레코딩
- GitHub/Apple OAuth
- 클라우드 동기화, 다중 문서, 내보내기
- 모바일/태블릿, 반응형 (Desktop only)
- RabbitMQ, 클라우드 스토리지, ONNX DistilBERT

---

## 코딩 컨벤션

### Frontend (TypeScript)

```typescript
// 엄격 모드 필수
"strict": true, "noUncheckedIndexedAccess": true, "noImplicitAny": true

// 컴포넌트: function + named export
export function EditorPane({ docId }: Props) {
  // 컴포넌트 로직
}

// 스타일: Tailwind utility + CSS Variables
// ✅ className="text-[var(--text-active)] bg-[var(--surface-primary)]"
// ❌ className="text-black bg-white" (토큰 무시)

// 상태: 로컬 = Zustand, 서버 = TanStack Query hooks
const { content, updateContent } = useDocumentStore();
const { data: reviews } = useGetDocumentReviews(docId);

// API 호출: orval 자동 생성 hooks만 사용
const { mutate: publishCert } = usePublishCertificate();
```

### Backend (Kotlin)

```kotlin
// Domain: 순수 Kotlin (Spring 의존성 금지)
data class WritingSession(val id: UUID, val documentId: UUID) {
  fun calculateTypingScore(): Float = TODO("순수 함수")
}

// Presentation: domain Service만 호출, 데이터 변환 금지
@RestController @RequestMapping("/api/sessions")
class WritingSessionController(private val service: WritingSessionService) {
  @PostMapping
  fun createSession(@RequestBody req: CreateSessionRequest): SessionResponse =
    service.create(req.documentId, req.userId).toResponse()
}

// Virtual Threads 주의: suspend fun은 선택적.
// 일반 blocking 함수도 Virtual Thread에서 자동으로 non-blocking 처리됨.
// suspend fun은 Coroutines 스타일 선호 시에만 사용.
@MessageMapping("/session.keystroke")
fun handleKeystroke(event: KeystrokeEvent) { /* Virtual Threads가 IO 처리 */ }
```

---

## API & 타입 계약

### OpenAPI 스키마 기반 계약

```
Spring Boot (Kotlin DTO) → SpringDoc → openapi.yaml → orval → TypeScript hooks
```

**규칙**:
1. 백엔드 DTO 변경 → SpringDoc 자동 생성 → orval 재생성
2. 프론트엔드는 자동 생성된 `api-client/` 패키지만 사용
3. `api-client/` 내 파일 수동 편집 금지 (`.openapi-generator-ignore` 설정)
4. 모든 API는 REST 기반, WebSocket(STOMP)과 SSE 보조

**프로토콜**:
| 프로토콜 | 용도 | 구현 |
|----------|------|------|
| **REST** | CRUD, 인증, 검증 | Spring MVC + SpringDoc |
| **WebSocket (STOMP)** | 타이핑 스트림, 실시간 세션 | @MessageMapping, 순수 WebSocket |
| **SSE** | AI 응답 스트리밍 | SseEmitter → Next.js Route Handler 프록시 |

### 핵심 API 엔드포인트 요약

| 도메인 | Method | 엔드포인트 |
|--------|--------|-----------|
| **Auth** | POST | `/api/auth/{register,login,oauth/{provider},refresh,logout}` |
| **Docs** | GET\|POST | `/api/documents` |
| **Docs** | GET\|PUT\|DELETE | `/api/documents/{id}` |
| **Certs** | POST\|GET | `/api/certificates` |
| **Certs** | DELETE | `/api/certificates/{id}` |
| **Verify** | GET | `/api/verify/{shortHash}` (비인증) |
| **AI** | POST | `/api/ai/{spelling,fact-check,style}` |
| **AI** | GET | `/api/ai/summary/{documentId}` (SSE 스트리밍) |
| **Users** | GET\|PUT | `/api/users/settings` |
| **Users** | POST | `/api/users/export` |
| **Users** | DELETE | `/api/users` |
| **Public** | GET | `/.well-known/humanwrites-public-key.pem` |
| **STOMP** | PUB | `/app/session.{keystroke,start,end}` |
| **STOMP** | SUB | `/user/queue/session.{status,anomaly}` |

> 전체 엔드포인트 상세는 PROJECT_PLAN.md 5.2절 참조.

---

## 테스트 규칙

### 커버리지 기준 (필수)
- **Frontend**: 단위 테스트 커버리지 **70% 이상** 필수. 가능한 모든 기능에 대해 E2E 테스트를 수행한다.
- **Backend**: 단위 테스트 커버리지 **70% 이상** 필수.
- 각 Phase 개발 완료 전 반드시 커버리지 기준을 달성해야 한다.

**Frontend** (`npm run test:unit` / `test:integration` / `test:e2e`):
- 타이핑 분석: 경계값 + IME 테스트 (한글 조합 상태 포함)
- 에디터 상태: 일관성 검증 (이벤트 순서, 텍스트 동기화)
- 인증서 발행: 전 과정 자동화 (E2E), 접근성: Axe-core
- E2E: Playwright로 가능한 모든 사용자 시나리오 테스트

**Backend** (`./gradlew test`):
- 키스트로크 분석: 통계 정확도, 이상 탐지 임계값
- Ed25519 서명: 공개키 오프라인 검증
- WebSocket: 메시지 순서, 배치 처리
- 모든 PR: lint + type check + test 통과 필수

---

## 아키텍처 제약과 가정

### 타이핑 분석의 한계

**현재 가정 (Layer 1 MVP)**:
- 키스트로크 패턴(dwell time, flight time, WPM)만으로 "사람이 타이핑했는지" 검증
- 편집 패턴(회문, 복사-붙여넣기 비율)은 보조 신호만 역할
- AI 생성 텍스트를 타이핑 후 검증 ("AI 읽고 타이핑") 시나리오는 탐지 불가

**Post-MVP Iter 2에서 완화**:
- Layer 2: 편집 패턴 고도화 (40% → 35%)
- Layer 3: 콘텐츠 통계 분석 + DistilBERT ML (Post-MVP Iter 3)

**투명성**: MVP 인증서에 "Layer 1만 사용" 명시, 사용자에게 한계 공개

### 인증 임계값 파일럿

**Phase 1 (Week 1-5)에서 파일럿 검증** 필수:
- 실제 사용자 데이터로 Layer 1 임계값 교정
- 시나리오 (b) "AI 읽고 타이핑" 한계 측정
- MVP 릴리스 전 임계값 확정

---

## 개발 프로세스

### 모듈 간 계약 (병렬 개발)

**모듈 A (Editor) ↔ 모듈 B (Collector)**:
```typescript
interface DataCollector {
  onKeystroke(event: KeystrokeEvent): void;
  onEdit(event: EditEvent): void;
  getSessionData(): SessionData;
}
```

**모듈 B (Collector) ↔ 모듈 C (Certifier)**:
```typescript
interface SessionData {
  keystrokeStats: KeystrokeStatVector[];  // 5초 윈도우 집계
  editEvents: EditEvent[];
  // 원시 데이터 미포함 (프라이버시)
}
```

### 단계별 개발 워크플로우 규칙

1. **커밋 & 푸시 정책**
   - 각 Phase 단계가 완료되면 반드시 커밋하고 원격에 푸시한다.
   - 단계 중간이라도 중요한 변경(새 모듈 추가, 설정 완료, 주요 기능 동작 확인 등)이 있으면 즉시 커밋하고 푸시한다.
   - 커밋 메시지는 `phase-X-Y: 변경 요약` 형식을 따른다. (예: `phase-1-1: monorepo scaffold with Turborepo + pnpm`)

2. **시행착오 기록 (Lessons Learned)**
   - 작업 중 문제가 된 부분, 시행착오, 예상과 다른 동작, 우회한 이슈 등은 `docs/LESSONS_LEARNED.md`에 기록한다.
   - 형식: `## Phase X-Y: 제목` → 문제 상황, 원인, 해결 방법을 간결히 작성한다.
   - 같은 실수를 반복하지 않도록 다음 단계 시작 전 해당 문서를 참조한다.

3. **단계 완료 전 반복 검증**
   - 각 Phase 종료 전, 해당 단계의 검증 기준(`phase-X-Y-*.md`의 "검증 기준" 섹션)을 하나씩 체크한다.
   - 빌드, 타입 체크, 린트, 테스트를 반복 실행하여 에러 0을 확인한다.
   - 검증 실패 시 수정 → 재검증을 통과할 때까지 반복한다. 통과하지 못하면 단계를 완료로 표시하지 않는다.

4. **진행 상태 업데이트 (DEVELOPMENT_OVERVIEW.md)**
   - 각 Phase 단계가 완료되면 `docs/DEVELOPMENT_OVERVIEW.md`의 "단계별 요약표"에서 해당 단계의 상태를 `⬜`에서 `✅`로 변경한다.
   - 검증 기준을 모두 통과하고 커밋/푸시까지 완료된 후에만 체크한다.

### 빌드 오케스트레이션

```bash
# 전체 빌드
make build

# Frontend만
make build-frontend

# Backend만
make build-backend

# OpenAPI 파이프라인
make openapi-generate  # SpringDoc → orval
```

---

## 디자인 & 접근성 규칙

### 컬러 토큰 (WCAG AA 4.5:1 최소)

```css
/* Light Mode */
--text-active: #0A0A0A;       /* 본문 활성 단락 */
--text-body: #767676;         /* 비활성 단락 (4.54:1 대비) */

/* Dark Mode */
--text-active: #F5F5F5;
--text-body: #A3A3A3;         /* #1A1A1A 배경 대비 4.64:1 */

/* 피드백 (인라인 밑줄) */
--feedback-spelling: #92400E; /* wavy, opacity 0.3 */
--feedback-fact: #991B1B;     /* dotted, opacity 0.3 */
--feedback-style: #3730A3;    /* dashed, opacity 0.2 */
```

### UI 원칙

1. **Invisible Interface**: 글쓰기 중 UI 요소 < 5% 화면
2. **Progressive Disclosure**: Inspector 숨김, 필요시 슬라이드인
3. **Quiet Feedback**: 밑줄 투명도 낮게, 소리/진동 없음
4. **Ceremonial Certification**: 인증서는 물리적 문서 격식 (serif, 크림색 배경)
5. **Light & Dark Harmony**: 반전 아닌 독립 설계

---

## 로컬 개발 환경 셋업

```bash
# 1. 인프라 기동 (PostgreSQL+TimescaleDB, Redis)
docker compose -f docker/docker-compose.yml up -d

# 2. 백엔드 실행
cd backend && ./gradlew bootRun          # http://localhost:8080

# 3. 프론트엔드 실행
cd frontend && pnpm install && pnpm dev  # http://localhost:3000

# 4. OpenAPI 파이프라인 (백엔드 기동 후)
make openapi-generate                    # SpringDoc → orval → api-client/
```

**필수 환경변수** (`backend/src/main/resources/application-local.yml`):

```yaml
GOOGLE_CLIENT_ID: ...
GOOGLE_CLIENT_SECRET: ...
JWT_SECRET: ...           # 최소 256비트 랜덤
ED25519_PRIVATE_KEY: ...  # Base64URL 인코딩 PEM
OPENAI_API_KEY: ...       # 또는 CLAUDE_API_KEY
```

---

## 브랜치 전략 및 Git 워크플로우

```
브랜치 네이밍:
  feat/{module}/{description}   예: feat/editor/tiptap-core
  fix/{module}/{description}    예: fix/backend/google-oauth

베이스 브랜치: main
PR 단위:       모듈 단위, 단일 기능
머지 전략:     Squash merge
```

---

## 참조 문서

- `PROJECT_PLAN.md` - 전체 계획 (v3.0)
- `DESIGN_SYSTEM.md` - 디자인 토큰, 타이포그래피, 컴포넌트
- `TEST_STRATEGY.md` - 테스트 계획 (Vitest/Playwright/Kotest)
- `UX_STRATEGY.md` - UX 페르소나, 사용자 여정

---

## 주요 의사결정 이력 (v3.0)

| 의사결정 | 변경사항 | 이유 |
|---------|---------|------|
| **1. Spring MVC + Virtual Threads** | WebFlux 제거 | Kotlin Coroutines 호환, JDBC 효율화 |
| **2. Ed25519 MVP부터** | HMAC-SHA256 제거 | 비대칭 서명으로 오프라인 검증 가능 |
| **3. MVP 범위 축소** | 10주 MVP + Post-MVP 이터레이션 | 핵심 가치 10주 내 검증, 피드백 반영 |
| **4. Exposed + JDBC** | R2DBC 제거 | Virtual Threads가 blocking I/O 처리 |
| **5. Layer 1만 MVP** | Layer 2/3은 Post-MVP | 파일럿 데이터로 임계값 교정 후 확장 |

---

## PR 체크리스트

모든 PR은 다음을 만족해야 함:

- [ ] 타입 체크: `npm run type-check` (Frontend) / `./gradlew build` (Backend)
- [ ] Lint: `npm run lint` (Frontend) / `./gradlew spotlessCheck` (Backend)
- [ ] Unit Test: 80%+ 커버리지
- [ ] 주요 변경: E2E 테스트 추가
- [ ] 문서 동기화: PROJECT_PLAN.md와 CLAUDE.md 일관성
- [ ] API 변경: OpenAPI 스키마 커밋
- [ ] 보안: 원시 키값 서버 전송 없음, HttpOnly Cookie 사용 확인
