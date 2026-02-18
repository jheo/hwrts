# HumanWrites Post-MVP 계획서

> **버전**: 1.0
> **작성일**: 2026-02-19
> **기준**: MVP 10주 (Phase 1-1 ~ Phase 2-5) 완료 후 기획 리뷰
> **출처**: 실제 코드베이스 분석 + PROJECT_PLAN.md v3.0 + LESSONS_LEARNED.md

---

## Part 1: MVP 완료 현황 리뷰

### 1.1 계획 대비 구현 현황

#### Frontend (Next.js 15 + TipTap v2)

| 계획 항목 | 상태 | 구현 상세 |
|-----------|------|-----------|
| Turborepo + pnpm 모노레포 | **완료** | `core`, `ui`, `editor-react`, `api-client`, `realtime` 5개 패키지 |
| TipTap v2 에디터 코어 | **완료** | 7개 확장 (starter-kit, heading, blockquote, link, paragraph-focus, focus-mode, inline-feedback, typing-collector) |
| 한국어 IME 지원 | **완료** | `isComposing` 플래그로 조합 상태 처리 |
| 디자인 토큰 + Light/Dark 모드 | **완료** | CSS Variables + Tailwind v4 통합 |
| 자동저장 (IndexedDB) | **완료** | Dexie.js 기반, 2초 디바운스 + visibilitychange 즉시 저장 |
| Inspector 패널 | **완료** | StatsTab, ReviewTab, SummaryTab 3개 탭 |
| Focus Mode Soft | **완료** | opacity 0.4 비활성 단락 |
| 키스트로크 수집기 | **완료** | EventBuffer + MetricsWorker (Web Worker) + BeaconSender |
| 인증서 모달 | **완료** | CertificateModal + framer-motion 애니메이션 |
| 검증 페이지 | **완료** | `/verify/[shortHash]` SSR 페이지, OG 메타태그 포함 |
| AI 맞춤법 인라인 피드백 | **완료** | inline-feedback TipTap 확장 + useAiFeedback 훅 |
| AI 설정 페이지 | **완료** | `/settings/ai` - 공급자 선택, 기능 토글 |
| RecordingIndicator | **완료** | 녹음 상태 표시 UI 컴포넌트 |
| orval 자동 생성 API 클라이언트 | **부분** | axios-instance 준비 완료, 실제 생성 코드는 주석 처리 상태 |
| STOMP/SSE 실시간 클라이언트 | **미구현** | `realtime` 패키지가 빈 `export {}` 상태 |

#### Backend (Spring Boot 3.x + Kotlin)

| 계획 항목 | 상태 | 구현 상세 |
|-----------|------|-----------|
| Spring Boot 3.x + Virtual Threads | **완료** | Java 21, MVC 기반 |
| Exposed ORM (JDBC) | **완료** | Users, Documents, WritingSessions, KeystrokeEvents, Certificates 테이블 |
| Flyway 마이그레이션 | **완료** | V1~V7 (users, documents, writing_sessions, keystroke_events, continuous_aggregate, certificates, ai_reviews) |
| Google OAuth2 | **완료** | GoogleOAuth2Handler + JwtTokenProvider + HttpOnly Cookie |
| JWT 인증 | **완료** | JwtAuthFilter + CookieUtils |
| REST API 컨트롤러 | **완료** | Auth, Document, Certificate, AI, User, Verification 6개 컨트롤러 |
| WebSocket (STOMP) | **완료** | SessionWebSocketHandler - session.start, session.keystroke, session.end |
| Ed25519 서명 | **완료** | SignatureService - 키 생성, 서명, 검증, PEM 공개키 제공 |
| KeystrokeAnalyzer | **완료** | Shannon 엔트로피, CV, 피로도 기울기, burst-pause 비율 등 6개 메트릭 |
| AnomalyDetector | **완료** | 4가지 이상 탐지 (비현실적 속도, 기계적 리듬, 과도 붙여넣기, 사고 일시정지 부재) |
| ScoringService | **완료** | 6개 차원 가중 평균, Certified/Not Certified 이분법 |
| AI Gateway (맞춤법) | **완료** | ProviderRouter + Claude/OpenAI 프로바이더 + 인메모리 Rate Limiting |
| AI 사용 추적 | **완료** | AiUsageTracker - 문서별 제안/수락 기록 |
| GDPR 엔드포인트 | **완료** | `/api/users/export` + `DELETE /api/users` |
| SpringDoc OpenAPI | **완료** | 모든 컨트롤러에 Swagger 어노테이션 |
| Redis 캐싱 | **미구현** | 의존성 추가 완료, 실제 캐싱 로직 미구현 (TODO 주석) |
| SSE 스트리밍 | **미구현** | SseEmitter 사용 코드 없음 (Post-MVP AI 요약용) |
| 키스트로크 TimescaleDB 저장 | **부분** | WebSocket에서 수신만 하고 실제 DB 삽입 미구현 (TODO 주석) |

#### 인프라/CI/CD

| 계획 항목 | 상태 | 구현 상세 |
|-----------|------|-----------|
| Docker Compose | **완료** | PostgreSQL+TimescaleDB + Redis |
| GitHub Actions CI | **완료** | frontend.yml + backend.yml (빌드, 린트, 테스트) |
| Makefile 통합 빌드 | **완료** | dev, build, test, lint, infra, openapi 명령 |
| OpenAPI 파이프라인 | **부분** | Makefile 명령 정의 완료, 실제 schema/openapi.yaml 미생성 |

### 1.2 주요 격차 (Gap) 분석

#### 격차 1: 실시간 통신 클라이언트 미완성 (심각도: 높음)

`@humanwrites/realtime` 패키지가 빈 export 상태이다. 백엔드 WebSocket 핸들러는 구현되어 있지만, 프론트엔드에서 STOMP 클라이언트를 통해 연결하는 코드가 없다. 현재 키스트로크 데이터는 클라이언트 Web Worker에서 수집/분석되지만, 서버로 전송되지 않는다. 이는 다음을 의미한다:

- **서버측 분석/저장 불가**: 키스트로크 메트릭이 서버에 도달하지 않으므로 TimescaleDB 시계열 저장, 서버측 이상 탐지가 작동하지 않음
- **인증서 발행 시 클라이언트 데이터만 사용**: `IssueCertificateRequest`에 스코어링 결과를 클라이언트가 직접 전달하므로 서버측 검증 부재

#### 격차 2: Redis 캐싱 미구현 (심각도: 중간)

`spring-boot-starter-data-redis` 의존성은 추가되어 있으나, 실제 `RedisTemplate` 또는 `@Cacheable` 사용 코드가 전혀 없다. AI 응답 캐시(24h TTL)와 세션 캐시가 미구현 상태이며, Rate Limiting도 인메모리 `ConcurrentHashMap`으로 대체되어 있어 서버 재시작 시 초기화된다.

#### 격차 3: OpenAPI 클라이언트 자동 생성 미완성 (심각도: 중간)

`api-client` 패키지에 orval 설정과 axios-instance만 존재하고, 실제 생성된 타입/훅 코드가 없다. `schema/openapi.yaml`도 생성되지 않았다. 프론트엔드 API 호출이 수동 fetch를 사용 중일 가능성이 높다.

#### 격차 4: 키스트로크 이벤트 DB 저장 미구현 (심각도: 중간)

WebSocket 핸들러에서 키스트로크 배치를 수신하면 `state.totalKeystrokes` 카운터만 증가시키고, 실제 TimescaleDB에 삽입하는 코드는 TODO로 남아있다. V4 마이그레이션에서 `keystroke_events` 테이블과 V5에서 continuous aggregate를 생성했지만 사용되지 않는다.

### 1.3 기술 부채 목록

| ID | 영역 | 내용 | 심각도 |
|----|------|------|--------|
| TD-01 | 백엔드 | WebSocket에서 키스트로크를 TimescaleDB에 저장하지 않음 (TODO 주석) | 높음 |
| TD-02 | 백엔드 | Redis 캐시 계층 미구현 - AI 응답, 세션, Rate Limiting 모두 인메모리 | 높음 |
| TD-03 | 프론트 | `@humanwrites/realtime` 패키지가 빈 상태 - STOMP 클라이언트 없음 | 높음 |
| TD-04 | 인프라 | OpenAPI 파이프라인이 end-to-end 동작하지 않음 (schema 미생성, orval 미실행) | 중간 |
| TD-05 | 보안 | 인증서 스코어링 결과를 클라이언트가 직접 전달 - 서버측 검증 부재 | 높음 |
| TD-06 | 백엔드 | `CertificateController.listCertificates`가 `Map<String, Any?>` 반환 - 타입 안전성 부족 | 낮음 |
| TD-07 | 프론트 | AI 설정이 localStorage에만 저장 - 서버 동기화 없음 | 낮음 |
| TD-08 | 백엔드 | AnomalyDetector가 WebSocket 핸들러와 통합되지 않음 (`sendAnomalyAlert` 미사용) | 중간 |
| TD-09 | 테스트 | 통합 테스트에서 Testcontainers 의존성 있으나 실제 DB 통합 테스트가 2개뿐 | 중간 |
| TD-10 | 백엔드 | SSE 엔드포인트 부재 - AI 스트리밍 응답 미구현 | 낮음 (Post-MVP) |

### 1.4 테스트 커버리지 평가

#### 백엔드 (13개 테스트 파일)

| 카테고리 | 파일 수 | 테스트 대상 |
|----------|---------|-------------|
| 단위 테스트 | 8 | KeystrokeAnalyzer, AnomalyDetector, ScoringService, SignatureService, JwtTokenProvider, AiGatewayService, AiUsageTracker, SessionWebSocketHandler |
| 통합 테스트 | 2 | AiGatewayIntegration, CertificateIntegration |
| 애플리케이션 | 1 | HumanWritesApplication (컨텍스트 로드) |
| WebSocket 플로우 | 1 | WebSocketFlow |
| 합계 | **13** | |

**평가**: 핵심 도메인 로직(분석, 스코어링, 서명)에 대한 단위 테스트는 양호하다. 그러나 컨트롤러 계층(AuthController, DocumentController, UserController)에 대한 테스트가 없고, Repository 계층 테스트도 부재하다. Testcontainers를 활용한 실제 DB 기반 통합 테스트가 2개뿐이므로 ORM 쿼리 검증이 부족하다.

#### 프론트엔드 (25개 단위 테스트 + 7개 E2E)

| 패키지 | 단위 테스트 수 | 주요 대상 |
|--------|---------------|-----------|
| `core` | 5 | keystroke-store, beacon-sender, event-buffer, document-store, metrics-calculator |
| `editor-react` | 12 | Editor, EditorProvider, extensions (paragraph-focus, focus-mode, inline-feedback, typing-collector), hooks (useEditorStore, useTypingMetrics, useInspector, useFocusMode, useAutoSave, useKeyboardShortcuts, useDocumentStats, useAiFeedback) |
| `ui` | 5 | Inspector, CertificateModal, ThemeProvider, RecordingIndicator, ReviewTab |
| E2E (Playwright) | 7 | accessibility, ai-spelling, certification-flow, editor-flow, error-flows, performance, verify-page |

**평가**: 프론트엔드 테스트 커버리지는 상대적으로 양호하다. E2E 스펙 7개가 핵심 사용자 플로우를 커버하며, 접근성과 성능 테스트까지 포함되어 있다. 다만 `api-client`와 `realtime` 패키지에 대한 테스트는 0개이다.

#### 종합 평가

- **백엔드 테스트**: 도메인 로직 양호, 프레젠테이션/인프라 계층 부족
- **프론트엔드 테스트**: 전반적으로 양호, 네트워크 계층 부재
- **E2E**: 핵심 플로우 7개 스펙으로 기본 커버리지 확보
- **목표 80% 커버리지 달성 여부**: 도메인 계층은 달성 추정, 전체 프로젝트 기준으로는 미달 가능성

---

## Part 2: Post-MVP 기능 로드맵

### Iter 0: 기술 부채 해소 (2주, MVP 직후 필수)

> MVP에서 발견된 핵심 격차를 해소하여 이후 이터레이션의 기반을 안정화한다.

#### Iter 0-1: 실시간 통신 파이프라인 완성

- **설명**: `@humanwrites/realtime` 패키지에 STOMP.js 클라이언트를 구현하고, 백엔드 WebSocket 핸들러와 통합하여 키스트로크 이벤트가 클라이언트 -> 서버 -> TimescaleDB로 저장되는 전체 파이프라인을 완성한다.
- **우선순위**: P0 (필수)
- **노력도**: M
- **의존성**: 없음
- **수용 기준**:
  - [ ] STOMP.js 클라이언트가 WebSocket으로 백엔드에 연결
  - [ ] 키스트로크 배치가 200ms 주기로 서버에 전송
  - [ ] 서버에서 수신한 키스트로크가 TimescaleDB `keystroke_events` 테이블에 배치 삽입
  - [ ] 연결 끊김 시 자동 재연결 + 오프라인 버퍼링
  - [ ] 프론트엔드 `useConnectionStatus` 훅이 실제 연결 상태 반영

#### Iter 0-2: 서버측 스코어링 검증 도입

- **설명**: 인증서 발행 시 클라이언트가 보낸 스코어를 그대로 사용하는 현재 구조를 개선하여, 서버가 TimescaleDB에 저장된 키스트로크 데이터를 기반으로 독립적으로 스코어를 계산하고 검증한다.
- **우선순위**: P0 (필수)
- **노력도**: M
- **의존성**: Iter 0-1 (키스트로크 서버 저장 필요)
- **수용 기준**:
  - [ ] `CertificateController`가 서버측 `ScoringService`를 호출하여 스코어 계산
  - [ ] 클라이언트가 보낸 스코어와 서버 계산 스코어를 비교 검증
  - [ ] 불일치 시 서버 스코어를 우선하고 경고 로그 기록
  - [ ] `IssueCertificateRequest`에서 스코어링 관련 필드 제거 또는 선택적(optional)으로 변경

#### Iter 0-3: Redis 캐시 계층 구현

- **설명**: 이미 추가된 `spring-boot-starter-data-redis` 의존성을 활용하여, AI 응답 캐싱(24h TTL), 분산 Rate Limiting, 세션 상태 캐시를 구현한다.
- **우선순위**: P1 (중요)
- **노력도**: S
- **의존성**: 없음
- **수용 기준**:
  - [ ] `RedisTemplate` 또는 Spring Cache 추상화(`@Cacheable`)로 AI 응답 캐싱 구현
  - [ ] Rate Limiting이 Redis 기반으로 전환 (서버 재시작 시에도 유지)
  - [ ] Redis 연결 실패 시 인메모리 폴백 동작

#### Iter 0-4: OpenAPI 파이프라인 end-to-end 완성

- **설명**: SpringDoc에서 `openapi.yaml` 자동 생성, orval로 TypeScript hooks 생성, `api-client` 패키지에 타입 안전한 API 호출 코드를 완성한다.
- **우선순위**: P1 (중요)
- **노력도**: S
- **의존성**: 없음
- **수용 기준**:
  - [ ] `make openapi-generate` 실행 시 `schema/openapi.yaml` 생성
  - [ ] orval이 `api-client/src/generated/` 에 엔드포인트 + 모델 코드 생성
  - [ ] 프론트엔드에서 자동 생성된 훅으로 API 호출 (수동 fetch 제거)
  - [ ] CI에서 OpenAPI 스키마 일관성 검증

---

### Iter 1: Focus Mode 심화 + 에디터 확장 (2주)

#### Iter 1-1: Focus Mode Deep/Zen

- **설명**: MVP의 Soft(opacity 0.4)에 더해 Deep(opacity 0.2 + blur 0.5px)과 Zen(opacity 0.1 + blur 1px) 모드를 추가한다. Deep은 여백 상하 160px 확장, Zen은 Inspector 완전 숨김.
- **우선순위**: P0 (필수)
- **노력도**: S
- **의존성**: 없음
- **수용 기준**:
  - [ ] Focus Mode 3단계 전환 (Soft -> Deep -> Zen)
  - [ ] 단축키로 모드 전환 (Cmd/Ctrl+Shift+F 순환)
  - [ ] Deep 모드에서 비활성 단락 blur 적용
  - [ ] Zen 모드에서 Inspector 접근 불가, 최대 여백
  - [ ] 모드 전환 시 framer-motion 전환 애니메이션

#### Iter 1-2: Typewriter Mode

- **설명**: 현재 편집 줄을 화면 40% 위치에 고정하는 타이프라이터 모드. Focus Mode와 중첩 동작을 정의한다.
- **우선순위**: P0 (필수)
- **노력도**: S
- **의존성**: 없음
- **수용 기준**:
  - [ ] 현재 커서 줄이 화면 세로 40% 위치에 고정
  - [ ] Focus Mode와 조합 가능 (Typewriter + Soft/Deep/Zen)
  - [ ] 단축키 토글 (Cmd/Ctrl+Shift+T)
  - [ ] 스크롤 애니메이션 부드러움 (CSS scroll-behavior 또는 framer-motion)

#### Iter 1-3: Floating Toolbar + Slash Commands

- **설명**: 텍스트 선택 시 팝업 서식 도구(Bold, Italic, Link, Heading)와 빈 줄에서 "/" 입력 시 명령 메뉴(Heading, Quote, Code, List).
- **우선순위**: P1 (중요)
- **노력도**: M
- **의존성**: 없음
- **수용 기준**:
  - [ ] 텍스트 선택 시 Floating Toolbar 표시 (Bold, Italic, Strikethrough, Link, Code, H1-H3)
  - [ ] "/" 입력 시 필터링 가능한 명령 메뉴
  - [ ] 키보드 탐색 지원 (화살표 키 + Enter)
  - [ ] TipTap Extension으로 구현 (BubbleMenu, Suggestion)

#### Iter 1-4: 코드 블록 구문 강조 + 폰트 설정

- **설명**: highlight.js 기반 코드 블록 구문 강조와 본문 폰트 선택(Lora, Source Serif 4, Inter, JetBrains Mono), 폰트 크기 조절(14-24px).
- **우선순위**: P1 (중요)
- **노력도**: S
- **의존성**: 없음
- **수용 기준**:
  - [ ] CodeBlock 확장에 highlight.js 통합
  - [ ] 10개 이상 언어 자동 감지
  - [ ] 설정 UI에서 본문 폰트 4종 선택
  - [ ] 폰트 크기 슬라이더 (14-24px, 2px 단위)
  - [ ] 선택 값이 서버 설정과 동기화

---

### Iter 2: 인증 고도화 (Layer 2 + 6등급 체계) (2주)

#### Iter 2-1: Layer 2 편집 패턴 분석 알고리즘

- **설명**: 기존 Layer 1(키스트로크 다이나믹스 40%)에 Layer 2(편집 패턴 35%)를 추가한다. 비선형 편집 비율, 수정 빈도, 커서 점프 엔트로피를 분석한다.
- **우선순위**: P0 (필수)
- **노력도**: L
- **의존성**: Iter 0-1 (키스트로크 서버 저장)
- **수용 기준**:
  - [ ] EditEvent 시계열 데이터 서버 저장
  - [ ] `EditPatternAnalyzer` 구현: nonLinearEditRatio, revisionFrequency, cursorJumpEntropy
  - [ ] ScoringService에 Layer 2 가중치 통합 (Layer 1: 40%, Layer 2: 35%, 나머지: 25% 예비)
  - [ ] Layer 2 메트릭을 인증서 `verification.editPattern` 필드에 포함
  - [ ] 경계값 테스트 (10명 이상 파일럿)

#### Iter 2-2: 6등급 체계 활성화

- **설명**: MVP의 이분법(Certified/Not Certified)을 6등급(A+/A/B/C/D/F)으로 확장한다. 사용자에게는 3단계 단순화 레이어(Highly Trusted / Trusted / Inconclusive)로 표시한다.
- **우선순위**: P0 (필수)
- **노력도**: M
- **의존성**: Iter 2-1
- **수용 기준**:
  - [ ] 6등급 스코어 매핑 (A+: 95+, A: 85+, B: 70+, C: 60+, D: 40+, F: 40 미만)
  - [ ] 사용자 표시 3단계 (A+/A -> "Highly Trusted", B/C -> "Trusted", D/F -> "Inconclusive")
  - [ ] 인증서 UI에 등급 배지 디자인 (색상, 아이콘 차별화)
  - [ ] 검증 페이지에서 등급별 상세 분석 정보 표시
  - [ ] 기존 MVP 인증서와의 하위 호환성 유지

#### Iter 2-3: 인증 경계값 교정

- **설명**: 실제 사용자 데이터를 기반으로 Layer 1 + Layer 2의 임계값을 교정한다. 시나리오별(정상 타이핑, AI 읽고 타이핑, 붙여넣기) 분포를 분석한다.
- **우선순위**: P0 (필수)
- **노력도**: M
- **의존성**: Iter 2-1
- **수용 기준**:
  - [ ] 30명 이상 파일럿 데이터 수집
  - [ ] 시나리오별 분포 차트 생성
  - [ ] False Positive / False Negative 비율 5% 이하 달성
  - [ ] 교정된 임계값으로 ScoringConfig 업데이트
  - [ ] 한계 보고서 작성 (탐지 불가 시나리오 투명 공개)

---

### Iter 3: AI 확장 (팩트 체크 + 스타일 + 요약) (2주)

#### Iter 3-1: 팩트 체크 엔진

- **설명**: 문서 내 사실 주장을 추출하고 외부 소스와 대조하는 팩트 체크 기능. dotted underline(opacity 0.3)으로 인라인 표시.
- **우선순위**: P1 (중요)
- **노력도**: L
- **의존성**: 없음
- **수용 기준**:
  - [ ] `AiProvider.analyzeFactCheck(text, locale)` 인터페이스 구현
  - [ ] 팩트 체크 결과를 ReviewItem(type: 'fact_check')으로 반환
  - [ ] 인라인 dotted underline 표시 (inline-feedback 확장 확장)
  - [ ] Inspector ReviewTab에 팩트 체크 결과 + 출처 링크 표시
  - [ ] `/api/ai/fact-check` REST 엔드포인트

#### Iter 3-2: 스타일 제안 엔진

- **설명**: 문체, 가독성, 중복 표현, 문장 길이 등을 분석하여 개선 제안. dashed underline(opacity 0.2)으로 인라인 표시.
- **우선순위**: P1 (중요)
- **노력도**: M
- **의존성**: 없음
- **수용 기준**:
  - [ ] `AiProvider.analyzeStyle(text, locale)` 인터페이스 구현
  - [ ] 스타일 제안을 ReviewItem(type: 'style')으로 반환
  - [ ] 인라인 dashed underline 표시
  - [ ] 기능별 On/Off 토글 (설정 페이지에서 개별 제어)
  - [ ] `/api/ai/style` REST 엔드포인트

#### Iter 3-3: AI 요약 SSE 스트리밍

- **설명**: Inspector에서 문서 AI 요약을 SSE로 스트리밍 제공. `SseEmitter` -> Next.js Route Handler 프록시 구조.
- **우선순위**: P2 (선호)
- **노력도**: M
- **의존성**: 없음
- **수용 기준**:
  - [ ] 백엔드 `/api/ai/summary/{documentId}` SSE 엔드포인트 (SseEmitter)
  - [ ] Next.js Route Handler에서 SSE 프록시
  - [ ] Inspector SummaryTab에서 스트리밍 텍스트 표시
  - [ ] 500단어 변화 시 자동 갱신 또는 수동 요청

#### Iter 3-4: Screen Recording (Opt-in)

- **설명**: 글쓰기 과정을 화면 녹화하여 추가 검증 자료로 활용. 명시적 동의(opt-in) 필수.
- **우선순위**: P2 (선호)
- **노력도**: L
- **의존성**: Iter 0-1 (실시간 통신)
- **수용 기준**:
  - [ ] MediaRecorder API로 화면 녹화
  - [ ] 녹화 시작 전 명시적 동의 모달
  - [ ] 녹화 상태 UI 표시 (RecordingIndicator 활용)
  - [ ] 서버 업로드 + 90일 보존 정책
  - [ ] GDPR: 사용자 요청 시 즉시 삭제

---

### Iter 4: 클라우드 동기화 + 다중 문서 (2주)

#### Iter 4-1: 다중 문서 관리

- **설명**: 현재 단일 문서 에디터를 확장하여 폴더 기반 다중 문서 관리 지원. 문서 목록, 검색, 정렬 기능.
- **우선순위**: P0 (필수)
- **노력도**: L
- **의존성**: 없음
- **수용 기준**:
  - [ ] 문서 목록 페이지 (`/documents`)
  - [ ] 폴더 생성/이름 변경/삭제
  - [ ] 문서 검색 (제목, 본문)
  - [ ] 정렬 (최근 수정, 이름, 생성일)
  - [ ] IndexedDB 로컬 저장에서 서버 저장으로 전환 옵션

#### Iter 4-2: 클라우드 동기화

- **설명**: 로컬(IndexedDB) + 서버(PostgreSQL) 간 양방향 동기화. 오프라인 편집 후 온라인 복귀 시 충돌 해결.
- **우선순위**: P1 (중요)
- **노력도**: L
- **의존성**: Iter 4-1
- **수용 기준**:
  - [ ] 문서 저장 시 서버 자동 동기화
  - [ ] 오프라인 편집 지원 (IndexedDB 캐시)
  - [ ] 충돌 감지 및 해결 UI (타임스탬프 기반 또는 수동 선택)
  - [ ] 동기화 상태 표시 (Synced / Syncing / Offline / Conflict)

#### Iter 4-3: OAuth 추가 (GitHub, Apple)

- **설명**: 현재 Google OAuth만 지원하는 인증에 GitHub OAuth와 Apple Sign-In을 추가한다.
- **우선순위**: P1 (중요)
- **노력도**: M
- **의존성**: 없음
- **수용 기준**:
  - [ ] GitHub OAuth2 로그인/회원가입
  - [ ] Apple Sign-In 로그인/회원가입
  - [ ] 기존 계정에 추가 OAuth 연결 (계정 병합)
  - [ ] `oauth_accounts` 테이블 provider 확장

#### Iter 4-4: 내보내기 (Markdown, PDF, DOCX)

- **설명**: 작성한 문서를 Markdown, PDF, DOCX 형식으로 내보내기.
- **우선순위**: P2 (선호)
- **노력도**: M
- **의존성**: 없음
- **수용 기준**:
  - [ ] Markdown 내보내기 (TipTap -> Markdown 변환)
  - [ ] PDF 내보내기 (서버측 렌더링 또는 클라이언트 jsPDF)
  - [ ] DOCX 내보내기 (docx 라이브러리)
  - [ ] 인증서 정보 포함 옵션 (워터마크 또는 메타데이터)

---

### Iter 5: 반응형 + 접근성 + i18n (2주)

#### Iter 5-1: 반응형 레이아웃 4단계

- **설명**: Desktop(1440px+) 전용에서 Laptop(1024px), Tablet(768px), Mobile(375px)까지 확장.
- **우선순위**: P0 (필수)
- **노력도**: L
- **의존성**: 없음
- **수용 기준**:
  - [ ] Laptop: 본문 640px, Inspector 오버레이 사이드바
  - [ ] Tablet: 본문 640px, Inspector 바텀 시트
  - [ ] Mobile: 본문 풀 폭, Inspector 전체 높이 바텀 시트
  - [ ] 최소 터치 타겟 44x44px
  - [ ] 모바일 키보드 위 액세서리 바 (서식 도구)

#### Iter 5-2: 접근성 강화 (WCAG 2.1 AA)

- **설명**: 기존 Radix UI 기반 접근성을 강화하여 WCAG 2.1 AA 전면 준수. 스크린 리더, 키보드 네비게이션, 고대비 모드.
- **우선순위**: P1 (중요)
- **노력도**: M
- **의존성**: Iter 5-1
- **수용 기준**:
  - [ ] Axe-core 자동 검사 0 violations
  - [ ] 모든 인터랙티브 요소 키보드 접근 가능
  - [ ] ARIA 라이브 리전으로 상태 변경 알림
  - [ ] 고대비 모드 지원
  - [ ] 스크린 리더 네비게이션 테스트 (VoiceOver, NVDA)

#### Iter 5-3: i18n (한국어/영어)

- **설명**: UI 텍스트의 한국어/영어 이중 언어 지원. next-intl 또는 react-i18next 활용.
- **우선순위**: P1 (중요)
- **노력도**: M
- **의존성**: 없음
- **수용 기준**:
  - [ ] 모든 UI 텍스트 번역 키 치환
  - [ ] 언어 전환 UI (설정 페이지 + 헤더)
  - [ ] 브라우저 언어 자동 감지
  - [ ] 날짜/숫자 포맷 지역화

#### Iter 5-4: PWA 오프라인 지원

- **설명**: Progressive Web App으로 변환하여 오프라인 글쓰기 지원. Service Worker + IndexedDB 기반.
- **우선순위**: P2 (선호)
- **노력도**: M
- **의존성**: Iter 4-2 (클라우드 동기화)
- **수용 기준**:
  - [ ] Service Worker 등록 + 캐시 전략
  - [ ] 오프라인 상태에서 에디터 사용 가능
  - [ ] 온라인 복귀 시 자동 동기화
  - [ ] 설치 가능한 PWA (manifest.json)

---

### Iter 6+: 플랫폼 확장 (계속)

#### Iter 6-1: Layer 3 콘텐츠 무결성 검증

- **설명**: AI 텍스트 유사도(Perplexity/Burstiness 통계), 문체 일관성, 외부 소스 붙여넣기 비율 분석. 선택적으로 DistilBERT(ONNX) 통합.
- **우선순위**: P1 (중요)
- **노력도**: L
- **의존성**: Iter 2 (Layer 2 안정화 후)
- **수용 기준**:
  - [ ] 통계 기반 AI 텍스트 탐지 (Perplexity, Burstiness)
  - [ ] 문체 일관성 스코어
  - [ ] ScoringService 3-Layer 가중치 적용 (40/35/25)
  - [ ] 인증서에 Layer 3 결과 포함

#### Iter 6-2: 공개 API + Webhook

- **설명**: 외부 서비스에서 HumanWrites 인증을 활용할 수 있는 공개 API와 이벤트 알림 Webhook.
- **우선순위**: P1 (중요)
- **노력도**: M
- **의존성**: Iter 2 (인증 안정화)
- **수용 기준**:
  - [ ] API Key 기반 인증
  - [ ] `/api/v1/verify/{hash}` 공개 검증 엔드포인트
  - [ ] Webhook 등록/관리 (인증서 발행/폐기 이벤트)
  - [ ] Rate Limiting + 사용량 대시보드

#### Iter 6-3: Tauri v2 데스크톱 앱

- **설명**: Tauri v2로 네이티브 데스크톱 앱 빌드. 웹 코드 재사용 + 시스템 트레이, 파일 시스템 접근.
- **우선순위**: P2 (선호)
- **노력도**: L
- **의존성**: Iter 5-1 (반응형 완성)
- **수용 기준**:
  - [ ] macOS/Windows/Linux 빌드
  - [ ] 시스템 트레이 + 글로벌 단축키
  - [ ] 로컬 파일 시스템 저장 옵션
  - [ ] 자동 업데이트

#### Iter 6-4: Capacitor 모바일 앱

- **설명**: Capacitor로 iOS/Android 모바일 앱 빌드. 웹 코드 90%+ 재사용.
- **우선순위**: P2 (선호)
- **노력도**: L
- **의존성**: Iter 5-1 (반응형 완성)
- **수용 기준**:
  - [ ] iOS/Android 빌드
  - [ ] 모바일 키보드 최적화
  - [ ] 푸시 알림 (인증서 발행 완료)
  - [ ] 앱 스토어 배포

#### Iter 6-5: VS Code Extension

- **설명**: VS Code에서 HumanWrites 인증 기능을 사용할 수 있는 확장. `packages/core` 재사용.
- **우선순위**: P2 (선호)
- **노력도**: M
- **의존성**: Iter 6-2 (공개 API)
- **수용 기준**:
  - [ ] VS Code Extension API 통합
  - [ ] 인라인 데코레이션 (맞춤법/스타일 밑줄)
  - [ ] 사이드바 Inspector
  - [ ] 상태 바 통계 표시

#### Iter 6-6: 협업 편집 (CRDT)

- **설명**: Yjs 또는 Automerge 기반 실시간 협업 편집. 여러 사용자가 동시에 같은 문서 편집.
- **우선순위**: P2 (선호)
- **노력도**: L (매우 큼)
- **의존성**: Iter 4-2 (클라우드 동기화), Iter 5 (반응형)
- **수용 기준**:
  - [ ] CRDT 기반 실시간 동기화
  - [ ] 사용자별 커서 표시
  - [ ] 충돌 없는 동시 편집
  - [ ] 인증서는 개인별 독립 발행

---

## Part 3: 기술 부채 해소 계획

### 3.1 리팩토링 대상

| ID | 영역 | 현재 상태 | 목표 | 이터레이션 | 노력도 |
|----|------|-----------|------|-----------|--------|
| RF-01 | 인증서 발행 | 클라이언트가 스코어를 직접 전달 | 서버측 독립 스코어링 | Iter 0-2 | M |
| RF-02 | API 응답 타입 | `Map<String, Any?>` 반환 | 타입 안전한 DTO 클래스 | Iter 0-4 | S |
| RF-03 | AI 설정 저장 | localStorage만 사용 | 서버 설정 동기화 | Iter 1 | S |
| RF-04 | AnomalyDetector | WebSocket과 미통합 | 실시간 이상 탐지 + 알림 | Iter 0-1 | M |
| RF-05 | CertificateEntity | 서비스 파일에 Entity/DTO 혼재 | 계층별 파일 분리 | Iter 1 | S |
| RF-06 | 프론트 API 호출 | 수동 fetch 사용 추정 | orval 자동 생성 훅 전환 | Iter 0-4 | M |

### 3.2 성능 최적화

| ID | 영역 | 현재 상태 | 최적화 방안 | 이터레이션 | 노력도 |
|----|------|-----------|-------------|-----------|--------|
| PF-01 | 키스트로크 DB 삽입 | 미구현 | Redis 버퍼 + 배치 INSERT (1000건 단위) | Iter 0-1 | M |
| PF-02 | TimescaleDB 쿼리 | continuous aggregate 미활용 | V5 마이그레이션 활용, 조회 쿼리 최적화 | Iter 0-1 | S |
| PF-03 | AI 응답 지연 | 캐시 없음 | Redis 캐시 (24h TTL) + 동일 텍스트 중복 요청 방지 | Iter 0-3 | S |
| PF-04 | 에디터 번들 크기 | 목표 150KB gzip | TipTap tree-shaking 검증, 코드 블록 highlight.js lazy load | Iter 1 | S |
| PF-05 | WebSocket 재연결 | 미구현 | 지수 백오프 재연결 + 오프라인 큐 | Iter 0-1 | S |
| PF-06 | SSR/ISR 최적화 | 검증 페이지 1시간 revalidate | ISR + 온디맨드 재검증 | Iter 1 | S |

### 3.3 보안 강화

| ID | 영역 | 현재 상태 | 강화 방안 | 이터레이션 | 노력도 |
|----|------|-----------|-----------|-----------|--------|
| SC-01 | 인증서 무결성 | 클라이언트 스코어 신뢰 | 서버측 독립 검증 | Iter 0-2 | M |
| SC-02 | Rate Limiting | 인메모리 (서버 재시작 초기화) | Redis 기반 분산 Rate Limiting | Iter 0-3 | S |
| SC-03 | WebSocket 인증 | STOMP 연결 시 검증 | JWT Bearer 재검증 + 세션 타임아웃 | Iter 0-1 | S |
| SC-04 | CSRF 방어 | SameSite=Lax 설정 | Double Submit Cookie 패턴 추가 검증 | Iter 1 | S |
| SC-05 | Ed25519 키 로테이션 | 단일 키 영구 사용 | 키 로테이션 정책 + 이전 키로 검증 지원 | Iter 2 | M |
| SC-06 | API 입력 검증 | @Valid 부분 적용 | 모든 Request DTO에 Bean Validation 전면 적용 | Iter 0 | S |
| SC-07 | 의존성 취약점 | 미점검 | Dependabot + OWASP dependency-check CI 추가 | Iter 1 | S |

### 3.4 모니터링 및 관찰 가능성

| ID | 항목 | 구현 방안 | 이터레이션 | 노력도 |
|----|------|-----------|-----------|--------|
| MO-01 | 구조화 로깅 | Logback + JSON 포맷 + 상관 ID | Iter 1 | S |
| MO-02 | 메트릭 수집 | Micrometer + Prometheus 엔드포인트 (/actuator/prometheus) | Iter 1 | S |
| MO-03 | 헬스 체크 | Spring Boot Actuator health (DB, Redis, WebSocket) | Iter 0 | S |
| MO-04 | 에러 추적 | Sentry 통합 (프론트엔드 + 백엔드) | Iter 1 | S |
| MO-05 | 성능 APM | 요청 지연 시간, WebSocket 처리량, AI API 응답 시간 | Iter 2 | M |
| MO-06 | 비즈니스 메트릭 | 인증서 발행 수, AI 사용량, 활성 세션 수 대시보드 | Iter 2 | M |
| MO-07 | 알림 | 에러율 임계치, AI API 장애, DB 연결 풀 고갈 알림 | Iter 2 | S |

---

## Part 4: 권장 우선순위

### 4.1 실행 순서 로드맵

```
Iter 0 (2주) ─── 기술 부채 해소 (반드시 먼저)
  │
  ├─ 0-1: 실시간 통신 파이프라인 ──────────────────┐
  ├─ 0-2: 서버측 스코어링 검증 (0-1 의존) ─────────┤
  ├─ 0-3: Redis 캐시 계층 (독립) ──────────────────┤
  └─ 0-4: OpenAPI 파이프라인 완성 (독립) ──────────┤
  │                                                  │
  ▼                                                  ▼
Iter 1 (2주) ─── Focus Mode + 에디터 UX            기반 안정화 완료
  │
  ├─ 1-1: Focus Mode Deep/Zen
  ├─ 1-2: Typewriter Mode
  ├─ 1-3: Floating Toolbar + Slash Commands
  └─ 1-4: 코드 블록 + 폰트 설정
  │
  ▼
Iter 2 (2주) ─── 인증 고도화 (핵심 차별화)
  │
  ├─ 2-1: Layer 2 편집 패턴 분석
  ├─ 2-2: 6등급 체계 활성화
  └─ 2-3: 인증 경계값 교정
  │
  ▼
Iter 3 (2주) ─── AI 확장
  │
  ├─ 3-1: 팩트 체크
  ├─ 3-2: 스타일 제안
  ├─ 3-3: AI 요약 SSE
  └─ 3-4: Screen Recording (선택)
  │
  ▼
Iter 4 (2주) ─── 다중 문서 + 클라우드
  │
  ├─ 4-1: 다중 문서 관리
  ├─ 4-2: 클라우드 동기화
  ├─ 4-3: OAuth GitHub/Apple
  └─ 4-4: 내보내기
  │
  ▼
Iter 5 (2주) ─── 반응형 + 접근성
  │
  ├─ 5-1: 반응형 레이아웃
  ├─ 5-2: 접근성 WCAG 2.1 AA
  ├─ 5-3: i18n
  └─ 5-4: PWA
  │
  ▼
Iter 6+ ─── 플랫폼 확장
  ├─ 6-1: Layer 3 콘텐츠 무결성
  ├─ 6-2: 공개 API + Webhook
  ├─ 6-3: Tauri 데스크톱
  ├─ 6-4: Capacitor 모바일
  ├─ 6-5: VS Code Extension
  └─ 6-6: 협업 편집 (CRDT)
```

### 4.2 우선순위 결정 근거

| 순위 | 이터레이션 | 근거 |
|------|-----------|------|
| **1** | Iter 0: 기술 부채 | 실시간 통신 미완성과 서버측 스코어링 부재는 제품 무결성의 핵심 결함이다. 이 기반이 없으면 이후 모든 인증 고도화가 의미 없다. Redis 캐시와 OpenAPI 파이프라인도 개발 효율성에 직결된다. |
| **2** | Iter 1: 에디터 UX | 글쓰기 도구의 핵심 경쟁력은 에디터 경험이다. Focus Mode Deep/Zen, Typewriter Mode는 사용자가 즉시 체감하는 가치이며 경쟁 제품 대비 차별화 요소다. 기술적으로 프론트엔드만 변경하면 되므로 백엔드 안정화와 병렬 진행 가능하다. |
| **3** | Iter 2: 인증 고도화 | Layer 2 도입과 6등급 체계는 HumanWrites의 핵심 가치 제안("당신의 글이 당신의 것임을 증명")을 강화한다. Layer 1만으로는 탐지 정확도에 한계가 있으며, 파일럿 데이터 기반 교정이 시급하다. |
| **4** | Iter 3: AI 확장 | 팩트 체크와 스타일 제안은 사용자 리텐션을 높이는 기능이다. 맞춤법 검사만으로는 AI 어시스트의 가치가 제한적이며, 경쟁 도구(Grammarly 등) 대비 부족하다. |
| **5** | Iter 4: 클라우드 | 다중 문서와 클라우드 동기화는 유료 전환의 핵심 트리거다. Free 사용자는 로컬 저장, Pro 사용자는 클라우드 동기화로 자연스러운 업셀 경로를 만든다. |
| **6** | Iter 5: 반응형 | 모바일/태블릿 지원은 사용자 확장에 필수적이지만, MVP 직후보다는 핵심 기능이 안정된 후에 진행하는 것이 효율적이다. |
| **7** | Iter 6+: 플랫폼 | 네이티브 앱, VS Code 확장, 협업 편집은 장기 비전이며, 웹 버전이 충분히 성숙한 후 투자해야 한다. |

### 4.3 리스크 평가

| 이터레이션 | 리스크 | 발생 확률 | 영향도 | 완화 방안 |
|-----------|--------|-----------|--------|-----------|
| Iter 0 | 키스트로크 대량 삽입 시 TimescaleDB 성능 병목 | 중 | 높음 | Redis 버퍼 + 배치 삽입, continuous aggregate 활용 |
| Iter 0 | 서버측 스코어링 전환 시 기존 인증서와의 일관성 | 중 | 중간 | 마이그레이션 기간 동안 듀얼 모드 운영 (클라이언트 + 서버 모두 기록) |
| Iter 1 | Focus Mode Deep/Zen의 blur 성능 이슈 (저사양 기기) | 낮 | 중간 | CSS will-change 힌트, 성능 프로파일링, 선택적 비활성화 옵션 |
| Iter 2 | Layer 2 편집 패턴 분석의 정확도 불확실 | 높 | 높음 | 충분한 파일럿(30명+), A/B 테스트, 보수적 가중치 시작 (30% -> 점진 증가) |
| Iter 2 | 6등급 체계 도입 시 사용자 혼란 | 중 | 중간 | 사용자 대면 3단계 단순화, 상세는 "자세히 보기"로 숨김 |
| Iter 3 | 팩트 체크 AI의 환각(hallucination) | 높 | 높음 | 출처 링크 필수 표시, 신뢰도 레이블, "AI가 확인한 내용이며 오류가 있을 수 있습니다" 면책 |
| Iter 3 | AI API 비용 급증 | 중 | 중간 | 공격적 캐싱 (24h TTL), Free 사용자 일일 제한, 경량 모델 우선 |
| Iter 4 | 클라우드 동기화 충돌 해결 복잡성 | 높 | 높음 | 최종 수정 우선(Last-Write-Wins) 시작, 이후 수동 병합 UI 추가 |
| Iter 5 | 모바일 TipTap 에디터 안정성 | 중 | 높음 | ProseMirror 모바일 이슈 선제 조사, Capacitor WebView 테스트 |
| Iter 6 | CRDT 협업 편집 복잡성 | 높 | 높음 | Yjs 검증된 라이브러리 사용, 최소 기능(동시 편집)부터 점진 확장 |

### 4.4 병렬 실행 가능 항목

각 이터레이션 내에서 프론트엔드와 백엔드 작업을 병렬로 진행할 수 있다:

| 이터레이션 | 프론트엔드 (병렬) | 백엔드 (병렬) |
|-----------|-------------------|---------------|
| Iter 0 | STOMP 클라이언트, OpenAPI orval 설정 | TimescaleDB 저장, Redis 캐시, 서버 스코어링 |
| Iter 1 | Focus Mode, Typewriter, Toolbar, Slash Commands | 모니터링 셋업 (MO-01~04) |
| Iter 2 | 6등급 UI, 등급 배지 디자인 | Layer 2 알고리즘, 임계값 교정 |
| Iter 3 | 인라인 피드백 확장, SSE 클라이언트 | 팩트체크/스타일 AI 엔드포인트, SSE 서버 |
| Iter 4 | 문서 목록 UI, 동기화 UX | OAuth 추가, 동기화 API, 내보내기 엔진 |

---

## 부록: 이터레이션별 예상 일정

| 이터레이션 | 기간 | 누적 주 | 마일스톤 |
|-----------|------|---------|----------|
| Iter 0 | 2주 | 12주 | 실시간 파이프라인 완성, 서버 스코어링, 개발 인프라 안정화 |
| Iter 1 | 2주 | 14주 | Focus Mode 3단계, Typewriter, Floating Toolbar 출시 |
| Iter 2 | 2주 | 16주 | Layer 2 인증, 6등급 체계, 교정된 임계값 |
| Iter 3 | 2주 | 18주 | 팩트 체크, 스타일 제안, AI 요약 SSE |
| Iter 4 | 2주 | 20주 | 다중 문서, 클라우드 동기화, Pro 구독 출시 가능 |
| Iter 5 | 2주 | 22주 | 반응형 4단계, WCAG AA, i18n, PWA |
| Iter 6+ | 지속 | 24주+ | 플랫폼 확장 (네이티브 앱, 공개 API, 협업) |

> **참고**: Iter 0는 MVP 직후 즉시 시작한다. Iter 1은 Iter 0 완료 후 시작하되, 프론트엔드 작업은 Iter 0과 부분 병렬 가능하다.
