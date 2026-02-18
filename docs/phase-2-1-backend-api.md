# Phase 2-1: 백엔드 API + Auth (Week 6)

## 개발 목표
- Flyway DB 마이그레이션으로 핵심 테이블 스키마 생성 (PostgreSQL + TimescaleDB)
- Spring Security + OAuth2 (Google) 인증 구현, JWT httpOnly Cookie 발급
- REST API 핵심 엔드포인트 구현 (Auth, Documents, Users)
- Exposed ORM 도메인 모델 + JDBC Virtual Threads 설정

## 선행 조건
- Phase 1-1 완료: Gradle + Spring Boot 3.x (MVC + Virtual Threads, Java 21) 초기 설정
- Docker Compose 로컬 환경: PostgreSQL + TimescaleDB, Redis 실행 가능
- Phase 1-5 완료: 프론트엔드 키스트로크 수집 동작 확인 (마일스톤 M1)
- `backend/src/main/kotlin/com/humanwrites/` 프로젝트 구조 존재

## 아키텍처

### 생성/수정 파일 구조
```
backend/src/main/kotlin/com/humanwrites/
├── config/
│   ├── SecurityConfig.kt             # Spring Security + OAuth2 설정
│   ├── JwtConfig.kt                  # JWT 생성/검증 유틸리티
│   ├── DatabaseConfig.kt             # Exposed + JDBC + Virtual Threads 설정
│   └── WebConfig.kt                  # CORS, Virtual Threads executor 설정
├── domain/
│   ├── user/
│   │   ├── User.kt                   # Exposed Table + Entity
│   │   ├── UserSettings.kt           # Exposed Table + Entity
│   │   ├── OAuthAccount.kt           # Exposed Table + Entity
│   │   ├── UserRepository.kt         # 리포지토리 인터페이스
│   │   └── UserService.kt            # 비즈니스 로직
│   └── document/
│       ├── Document.kt               # Exposed Table + Entity
│       ├── DocumentRepository.kt     # 리포지토리 인터페이스
│       └── DocumentService.kt        # CRUD 비즈니스 로직
├── infrastructure/
│   ├── persistence/
│   │   ├── ExposedUserRepository.kt  # Exposed 구현체
│   │   └── ExposedDocumentRepository.kt
│   └── security/
│       ├── JwtTokenProvider.kt       # JWT 생성/검증
│       ├── JwtAuthFilter.kt          # OncePerRequestFilter
│       ├── GoogleOAuth2Handler.kt    # Google OAuth2 콜백 처리
│       └── SecurityUserDetails.kt    # UserDetails 구현
├── presentation/
│   ├── rest/
│   │   ├── AuthController.kt         # /api/auth/** 엔드포인트
│   │   ├── DocumentController.kt     # /api/documents/** 엔드포인트
│   │   └── UserController.kt         # /api/users/** 엔드포인트
│   └── dto/
│       ├── AuthDto.kt                # RegisterRequest, LoginRequest, TokenResponse
│       ├── DocumentDto.kt            # DocumentCreateReq, DocumentUpdateReq, DocumentRes
│       └── UserDto.kt                # UserSettingsReq, UserSettingsRes

backend/src/main/resources/
├── db/migration/
│   ├── V1__create_users.sql          # users + oauth_accounts + user_settings
│   ├── V2__create_documents.sql      # documents + document_versions
│   ├── V3__create_writing_sessions.sql # writing_sessions
│   └── V4__create_keystroke_events.sql # keystroke_events (TimescaleDB hypertable)
├── application.yml                   # Spring 설정 (프로필별)
└── application-local.yml             # 로컬 개발 설정

backend/src/test/kotlin/com/humanwrites/
├── integration/
│   ├── AuthIntegrationTest.kt        # Testcontainers 기반 인증 테스트
│   └── DocumentIntegrationTest.kt    # Testcontainers 기반 문서 CRUD 테스트
└── unit/
    ├── JwtTokenProviderTest.kt
    └── DocumentServiceTest.kt
```

### 핵심 기술 결정
- **ORM**: Exposed (JDBC 모드) + Virtual Threads - blocking I/O를 가상 스레드가 처리
- **인증**: Spring Security OAuth2 Client (Google) + JWT(httpOnly Cookie, Secure, SameSite=Lax)
- **비밀번호**: Argon2id 해싱 (OAuth 전용 사용자는 password_hash NULL)
- **TimescaleDB**: `keystroke_events` hypertable (chunk_time_interval 1일)
- **테스트**: Testcontainers (PostgreSQL + TimescaleDB Docker) + Kotest

## 상세 태스크

### Task 1: Flyway DB 마이그레이션
- `V1__create_users.sql`: users, oauth_accounts(provider+provider_id UNIQUE), user_settings(1:1)
- `V2__create_documents.sql`: documents(status: draft/published/archived) + document_versions + 인덱스
- `V3__create_writing_sessions.sql`: writing_sessions (keystrokes_count, metadata JSONB)
- `V4__create_keystroke_events.sql`: keystroke_events + `create_hypertable('keystroke_events', 'time', chunk_time_interval => '1 day')`
  - 압축 정책 7일, 보존 정책 90일
- 스키마 상세는 PROJECT_PLAN.md 5.2절 참조 (SQL DDL 전문 수록)

### Task 2: Exposed ORM 도메인 모델
- `User.kt`: Exposed `Table` 객체 + `EntityClass` 정의
- `Document.kt`: 문서 CRUD, status(draft/published/archived)
- `UserSettings.kt`: 1:1 관계 (users ↔ user_settings)
- `OAuthAccount.kt`: 1:N 관계 (users ↔ oauth_accounts)
- Repository 인터페이스 + Exposed 구현체 분리 (포트/어댑터 패턴)

### Task 3: Spring Security + OAuth2 (Google)
- `SecurityConfig.kt`:
  - CSRF 비활성 (REST API, Cookie-based JWT)
  - CORS 설정 (로컬: `localhost:3000`, 프로덕션: `humanwrites.app`)
  - OAuth2 Login 설정: Google provider, 콜백 URL `/api/auth/oauth/google/callback`
  - 공개 엔드포인트: `/api/auth/**`, `/api/verify/**`, `/.well-known/**`
- `JwtTokenProvider.kt`:
  - Access Token: 15분 만료, httpOnly Cookie
  - Refresh Token: 7일 만료, httpOnly Cookie, path=/api/auth/refresh
  - 알고리즘: HS256 (MVP), 추후 RS256 전환 가능
- `JwtAuthFilter.kt`: OncePerRequestFilter, Cookie에서 JWT 추출 후 SecurityContext 설정
- `GoogleOAuth2Handler.kt`: OAuth2 성공 핸들러, 사용자 자동 생성/연결 + JWT 쿠키 발급

### Task 4: REST API 컨트롤러
- **Auth** (`AuthController.kt`): POST register, login(Argon2id), oauth/google, refresh, logout
- **Documents** (`DocumentController.kt`): GET 목록(페이지네이션), POST 생성, GET/{id} 상세(소유권 검증), PUT/{id} 수정, DELETE/{id} soft delete
- **Users** (`UserController.kt`): GET/PUT `/api/users/settings`, POST `/api/users/export` (GDPR 데이터 내보내기), DELETE `/api/users` (GDPR 계정 삭제)
- 모든 DTO에 `@Schema` 어노테이션 (SpringDoc OpenAPI 자동 생성용)
- 엔드포인트 전체 목록은 PROJECT_PLAN.md 9.2절 참조

### Task 5: Virtual Threads + 통합 설정
- `application.yml`: `spring.threads.virtual.enabled=true`
- `DatabaseConfig.kt`: Exposed `Database.connect()` + HikariCP (Virtual Threads 호환)
- `WebConfig.kt`: Virtual Threads executor를 Spring MVC 비동기 처리에 연결
- 프로필 분리: `local` (Docker Compose), `test` (Testcontainers), `prod`

### Task 6: Testcontainers 통합 테스트
- `AuthIntegrationTest.kt`: 회원가입 → 로그인 → JWT 검증 → 갱신 → 로그아웃 흐름
- `DocumentIntegrationTest.kt`: 생성 → 조회 → 수정 → 삭제 CRUD 전체 흐름
- Testcontainers로 PostgreSQL + TimescaleDB 이미지 사용
- Flyway 마이그레이션 자동 실행 검증

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 |
|----------|------|------------|:---------:|
| `executor` (sonnet) | 인프라 엔지니어 | Task 1 (Flyway 마이그레이션) | O |
| `executor` (sonnet) | 백엔드 엔지니어 | Task 2 (Exposed 도메인 모델) | O |
| `executor-high` (opus) | 보안 엔지니어 | Task 3 (Spring Security + OAuth2) | O |
| `executor-high` (opus) | 백엔드 엔지니어 | Task 4 (REST API 컨트롤러) | X (Task 2,3 완료 후) |
| `executor` (sonnet) | 인프라 엔지니어 | Task 5 (Virtual Threads 설정) | O |
| `qa-tester` (sonnet) | QA 엔지니어 | Task 6 (Testcontainers 통합 테스트) | X (Task 1-4 완료 후) |
| `architect` (opus) | 코드 리뷰 | 보안 감사 + 통합 검증 | X (최종) |

## 고려 사항
- **JWT Cookie 보안**: httpOnly, Secure (HTTPS), SameSite=Lax, 도메인 제한
- **OAuth 전용 사용자**: password_hash NULL 허용, 이메일 로그인 불가 상태
- **TimescaleDB 의존성**: Flyway V4에서 `create_hypertable` 실패 시 일반 테이블로 폴백 가능하도록 설계
- **Exposed + Virtual Threads**: HikariCP 풀 사이즈를 Virtual Threads 환경에 맞게 튜닝 (기본 10 → 50)
- **CORS**: 프론트엔드 Next.js dev 서버(localhost:3000)와 백엔드(localhost:8080) 간 쿠키 전송 허용
- **API 버전관리**: URL prefix `/api/v1/`은 MVP에서 미적용, Post-MVP에서 도입
- **CSRF 전략**: SameSite=Lax + httpOnly Cookie로 CSRF를 방어하되, Spring Security CSRF 토큰은 비활성화한다. REST API에서는 SameSite=Lax 정책이 cross-origin POST를 차단하므로 별도 CSRF 토큰이 불필요하다.
- **JWT HS256 vs Ed25519 구분**: JWT 서명(HS256)은 세션 인증용이며, 인증서 서명(Ed25519)과는 별개 시스템이다. CLAUDE.md의 'HMAC-SHA256 금지'는 인증서 서명에만 해당된다.

## 검증 기준 (체크리스트)
- [ ] Flyway 마이그레이션이 Docker Compose PostgreSQL+TimescaleDB에서 성공한다
- [ ] `keystroke_events` 테이블이 TimescaleDB hypertable로 생성된다
- [ ] 이메일 회원가입 → 로그인 → JWT Cookie 발급 흐름이 동작한다
- [ ] Google OAuth 로그인 → 사용자 자동 생성 → JWT Cookie 발급이 동작한다
- [ ] JWT Access Token 만료 후 Refresh Token으로 갱신이 된다
- [ ] 로그아웃 시 Cookie가 무효화된다
- [ ] 문서 CRUD (생성/조회/수정/삭제)가 REST API로 동작한다
- [ ] 타 사용자의 문서에 접근 시 403 Forbidden이 반환된다
- [ ] 사용자 설정 조회/변경 API가 동작한다
- [ ] Virtual Threads가 활성화되어 blocking I/O를 효율적으로 처리한다
- [ ] Testcontainers 통합 테스트가 CI 환경에서 통과한다
- [ ] 모든 DTO에 `@Schema` 어노테이션이 적용되어 SpringDoc이 OpenAPI 스키마를 생성한다

## 산출물
- `backend/src/main/resources/db/migration/V1~V4__*.sql`
- `backend/src/main/kotlin/com/humanwrites/domain/` 전체 도메인 모델
- `backend/src/main/kotlin/com/humanwrites/config/` Security, JWT, DB, Web 설정
- `backend/src/main/kotlin/com/humanwrites/infrastructure/` 구현체
- `backend/src/main/kotlin/com/humanwrites/presentation/` 컨트롤러 + DTO
- `backend/src/test/kotlin/com/humanwrites/` 통합 테스트

## 다음 단계 연결
- **Phase 2-2** (Week 7): SpringDoc → openapi.yaml → orval TypeScript 클라이언트 자동 생성 파이프라인
- **Phase 2-2** (Week 7): STOMP WebSocket 핸들러 + JDBC 배치 Insert로 키스트로크 서버 저장
- **Phase 2-3** (Week 8): 인증서 생성 API (`/api/certificates`)가 이 단계의 도메인 모델 위에 구축
- **Phase 2-4** (Week 9): AI 게이트웨이가 이 단계의 인증 체계(JWT)를 사용하여 사용자 식별
