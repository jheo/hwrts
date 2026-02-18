# Phase 1-1: 프로젝트 셋업 (Week 1)

## 개발 목표

- Turborepo + pnpm 모노레포 프론트엔드 스캐폴딩 완료
- Gradle Kotlin DSL + Spring Boot 3.x (MVC + Virtual Threads) 백엔드 스캐폴딩 완료
- Docker Compose로 PostgreSQL+TimescaleDB, Redis 로컬 환경 구동
- Makefile로 프론트/백 통합 빌드 명령 실행 가능
- ESLint + Prettier + ktlint 린트 통과
- GitHub Actions CI 기본 파이프라인 동작
- 디자인 토큰 시스템 (CSS Variables, Light/Dark) 정의 완료

## 선행 조건

- 없음 (첫 단계)

## 아키텍처

```
humanwrites/
├── frontend/
│   ├── apps/
│   │   └── web/                    # Next.js 15 (App Router)
│   ├── packages/
│   │   ├── core/                   # 순수 TS 코어 (빈 스캐폴드)
│   │   ├── ui/                     # Radix + Tailwind 공유 UI
│   │   │   └── tokens/             # CSS Variables 디자인 토큰
│   │   ├── editor-react/           # TipTap 에디터 (빈 스캐폴드)
│   │   ├── api-client/             # orval 자동 생성 (빈 스캐폴드)
│   │   └── realtime/               # WebSocket/SSE (빈 스캐폴드)
│   ├── turbo.json
│   ├── pnpm-workspace.yaml
│   └── package.json
├── backend/
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── src/main/kotlin/com/humanwrites/
│       └── Application.kt          # Spring Boot 엔트리포인트
├── docker/
│   └── docker-compose.yml          # PostgreSQL+TimescaleDB, Redis
├── Makefile
└── .github/workflows/
    ├── frontend.yml
    └── backend.yml
```

### 핵심 기술 결정

- **프론트 빌드**: Turborepo + pnpm workspace (패키지별 독립 빌드, incremental 캐시)
- **백엔드 프레임워크**: Spring Boot 3.x + Spring MVC + Virtual Threads (Java 21). WebFlux 사용 안 함
- **ORM**: Exposed (JDBC). R2DBC 사용 안 함 (Virtual Threads가 blocking I/O 처리)
- **Serialization**: Jackson + jackson-module-kotlin (Spring Boot starter 포함)
- **DB**: PostgreSQL 16 + TimescaleDB 확장 / Redis 7
- **스타일링**: Tailwind CSS v4 + CSS Variables (디자인 토큰)
- **UI 기반**: Radix UI Primitives (headless, 접근성 기본 제공)

## 상세 태스크

### Task 1: Turborepo + pnpm 모노레포 초기화

- `pnpm init` + `pnpm-workspace.yaml` 작성
- `turbo.json` 파이프라인 설정 (build, lint, test, dev)
- `frontend/apps/web`: `npx create-next-app@latest` (App Router, TypeScript, Tailwind v4)
- `frontend/packages/{core,ui,editor-react,api-client,realtime}`: 빈 패키지 스캐폴딩
- 각 패키지 `package.json`, `tsconfig.json` 설정
- TypeScript strict mode 필수, path alias 설정

### Task 2: Next.js 15 웹앱 기본 설정

- App Router 구조: `app/layout.tsx`, `app/page.tsx`, `app/editor/page.tsx`
- Tailwind CSS v4 설정 + CSS Variables 연동
- Radix UI 설치 및 기본 Provider 구성
- Zustand 설치 + 기본 스토어 스캐폴드
- `framer-motion` 설치 (Inspector 애니메이션, 인증서 모달 등에서 사용)
- `next.config.ts` 최적화 설정

### Task 3: 디자인 토큰 시스템

- `frontend/packages/ui/tokens/` 에 CSS Variables 정의
- DESIGN_SYSTEM.md 기반 시맨틱 토큰 구현:
  - Surface: `--surface-primary`, `--surface-secondary`, ...
  - Text: `--text-primary`, `--text-body`, `--text-active`, ...
  - Border, Review, Accent 토큰
- Light/Dark 모드 쌍 (`[data-theme="dark"]`)
- 타이포그래피 토큰: Playfair Display (제목) + Inter (본문/UI)
- Tailwind 커스텀 설정에서 CSS Variables 참조

### Task 4: 공통 UI Atoms 스캐폴딩

- `frontend/packages/ui/atoms/` 디렉터리에 기본 Atom 컴포넌트 스캐폴딩
- Radix UI Primitives 기반 공통 컴포넌트 초기 구현:
  - `Badge`: 상태 표시 배지 (색상, 크기 variant)
  - `Toggle`: On/Off 토글 스위치
  - `Tooltip`: 호버 툴팁 (Radix Tooltip)
  - `IconButton`: 아이콘 버튼 (Inspector 트리거 등에서 사용)
- Phase 1-4(Inspector)에서 필요한 `StatItem` molecule도 빈 스캐폴드 생성
- Storybook 설정 + 각 Atom의 기본 스토리 파일

### Task 5: Gradle + Spring Boot 백엔드 초기화

- `backend/build.gradle.kts`: Spring Boot 3.x + Kotlin + Java 21
- 의존성: Spring Web (MVC), Spring Security, Exposed (JDBC), Jackson Kotlin, Flyway, SpringDoc OpenAPI
- `application.yml`: 프로파일 분리 (local, test, prod)
- Virtual Threads 활성화 (`spring.threads.virtual.enabled=true`)
- Health check 엔드포인트 (`/actuator/health`)
- ktlint Gradle 플러그인 설정
- 테스트 인프라: Kotest(`kotest-runner-junit5`, `kotest-assertions-core`), MockK, Testcontainers(`testcontainers-postgresql`), JaCoCo 플러그인 설정
- 샘플 테스트: `ApplicationTest.kt` (Spring Boot context load 테스트) 작성으로 테스트 파이프라인 검증

### Task 6: Docker Compose 로컬 환경

- `docker/docker-compose.yml`:
  - PostgreSQL 16 + TimescaleDB 확장 (port 5432)
  - Redis 7 (port 6379)
- 볼륨 마운트로 데이터 영속성
- 환경 변수: DB 이름 `humanwrites`, 사용자/비밀번호

### Task 7: Makefile 통합 오케스트레이션

- 주요 타겟: `make dev`, `make build`, `make test`, `make lint`, `make clean`
- `make dev`: Docker Compose up + 프론트 dev + 백엔드 bootRun 동시 실행
- `make build`: 프론트 빌드 + 백엔드 빌드
- `make lint`: ESLint + Prettier + ktlint

### Task 8: ESLint + Prettier 설정

- 루트 `.eslintrc.js` + `frontend/.prettierrc`
- TypeScript 엄격 규칙, import 순서 자동 정렬
- lint-staged + husky pre-commit 훅

### Task 9: GitHub Actions CI 기초

- `.github/workflows/frontend.yml`: pnpm install → tsc --noEmit → ESLint → Vitest
- `.github/workflows/backend.yml`: Gradle compileKotlin → ktlint → Kotest
- PR 트리거, 캐시 설정 (pnpm store, Gradle)

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 여부 |
|----------|------|------------|:--:|
| executor-high (FE) | 프론트엔드 셋업 | Task 1, 2, 3, 4, 8 | ✅ |
| executor-high (BE) | 백엔드 셋업 | Task 5 | ✅ |
| executor (인프라) | 인프라 셋업 | Task 6, 7, 9 | ✅ |

> Task 1~4(프론트), Task 5(백엔드), Task 6~7(인프라)는 완전 병렬 가능.
> Task 8(린트)은 Task 1 이후. Task 9(CI)은 Task 1, 5 이후.

## 고려 사항

- **pnpm workspace vs npm workspace**: pnpm의 symlink 방식이 Turborepo와 최적 호환. phantom dependency 방지.
- **Java 21 필수**: Virtual Threads는 Java 21+ 필요. `build.gradle.kts`에서 `jvmToolchain(21)` 명시.
- **TimescaleDB Docker 이미지**: `timescale/timescaledb:latest-pg16` 사용. 일반 PostgreSQL 이미지가 아님.
- **Tailwind v4**: v3과 설정 방식이 다름. `@import "tailwindcss"` 방식, `tailwind.config.ts` 대신 CSS 기반 설정.
- **디자인 토큰 우선**: UI 컴포넌트 개발 전 토큰이 확정되어야 모든 팀이 일관된 스타일로 작업 가능.

## 검증 기준

- [ ] `pnpm install` 에러 없이 완료
- [ ] `pnpm turbo build` 전 패키지 빌드 성공
- [ ] `pnpm turbo lint` 에러 0건
- [ ] `./gradlew compileKotlin` 성공
- [ ] `./gradlew ktlintCheck` 에러 0건
- [ ] `docker compose up -d` 후 PostgreSQL, Redis 접속 확인
- [ ] `make dev` 로 프론트(3000) + 백엔드(8080) 동시 구동
- [ ] Spring Boot `/actuator/health` → 200 OK
- [ ] Next.js `http://localhost:3000` → 페이지 렌더링
- [ ] Light/Dark 디자인 토큰 CSS Variables 브라우저에서 확인
- [ ] GitHub Actions frontend.yml, backend.yml PR에서 동작

## 산출물

- `frontend/` 전체 모노레포 구조 (6개 패키지)
- `backend/` Spring Boot 프로젝트 (빈 도메인)
- `docker/docker-compose.yml`
- `Makefile`
- `.github/workflows/frontend.yml`, `backend.yml`
- `frontend/packages/ui/tokens/` 디자인 토큰
- `.eslintrc.js`, `.prettierrc`, lint-staged 설정

## 다음 단계 연결

→ **Phase 1-2** (에디터 코어)에서 `frontend/packages/editor-react/`에 TipTap v2 초기화.
→ `frontend/apps/web/app/editor/page.tsx`에 에디터 컴포넌트 마운트.
→ 디자인 토큰이 에디터 스타일링의 기반이 됨.
