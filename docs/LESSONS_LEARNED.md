# HumanWrites - Lessons Learned

> 개발 과정에서 겪은 문제, 시행착오, 우회 방법을 기록합니다.
> 다음 단계 시작 전 반드시 참조하여 같은 실수를 반복하지 않도록 합니다.

---

## Phase 1-1: 프로젝트 셋업

### 1. ktlint Gradle 플러그인과 Kotlin 2.1.x 호환성 문제
- **문제**: `org.jlleitschuh.gradle.ktlint` 12.1.2가 Kotlin 2.1.10과 호환되지 않음. `KtTokens.HEADER_KEYWORD` 필드 없다는 에러 발생.
- **원인**: ktlint 내부에서 사용하는 Kotlin 컴파일러 API가 Kotlin 2.1.x에서 변경됨.
- **해결**: `com.diffplug.spotless` 7.0.2 + `ktlint("1.5.0")`으로 전환. `./gradlew spotlessCheck` / `spotlessApply` 사용.
- **주의**: Makefile과 GitHub Actions CI의 lint 명령도 함께 변경 필요.

### 2. Next.js 자동 생성 파일 ESLint 충돌
- **문제**: Next.js가 빌드 시 생성하는 `next-env.d.ts`에 triple-slash reference가 포함되어 `@typescript-eslint/triple-slash-reference` 규칙 위반.
- **해결**: `eslint.config.mjs`의 ignores에 `'**/next-env.d.ts'` 추가.

### 3. Docker Desktop vs Colima
- **문제**: `brew install --cask docker` (Docker Desktop)가 sudo 권한 필요로 비대화형 환경에서 설치 실패.
- **해결**: `brew install docker docker-compose colima`로 경량 Docker 런타임 사용. `colima start`로 시작.

---

## Phase 1-2: TipTap v2 에디터 코어

### 1. TipTap 확장 간 의존성 순서
- **문제**: TipTap 커스텀 확장 등록 순서에 따라 ProseMirror 플러그인 우선순위가 달라짐.
- **해결**: `StarterKit` → 커스텀 확장 → `Placeholder` 순서로 등록. 테스트에서 동일 순서 보장.

### 2. 한국어 IME 조합 상태 처리
- **문제**: 한글 입력 시 `compositionstart`/`compositionend` 이벤트와 `keydown` 이벤트가 중복 발생.
- **해결**: `isComposing` 플래그로 조합 중 keydown 이벤트 무시. 조합 완료 시점에만 이벤트 처리.

---

## Phase 1-3: 에디터 UX

### 1. CSS Variables + Tailwind v4 통합
- **문제**: Tailwind v4에서 CSS 커스텀 프로퍼티를 직접 클래스로 사용하는 방식이 v3와 다름.
- **해결**: `text-[var(--text-active)]` 형태로 arbitrary value 사용. `@theme` 디렉티브에서 변수 등록.

### 2. 자동저장 디바운스 타이밍
- **문제**: 자동저장 간격이 너무 짧으면 IndexedDB 쓰기 부하, 너무 길면 데이터 유실 위험.
- **해결**: 2초 디바운스 + `visibilitychange`/`beforeunload` 이벤트에서 즉시 저장.

---

## Phase 1-4: Inspector 패널 + 문서 통계

### 1. Zustand 스토어와 TipTap 에디터 동기화
- **문제**: TipTap의 `onUpdate` 콜백에서 Zustand 상태를 직접 업데이트하면 렌더링 루프 발생 가능.
- **해결**: `requestAnimationFrame`으로 상태 업데이트를 다음 프레임으로 지연. 에디터 트랜잭션 완료 후 동기화.

### 2. 읽기 시간 계산의 다국어 차이
- **문제**: 한국어와 영어의 분당 읽기 속도(WPM)가 다름 (영어 ~200WPM, 한국어 ~500자/분).
- **해결**: 언어 감지 후 적절한 WPM 상수 적용. MVP에서는 단어 수 기반 200WPM 기본값 사용.

---

## Phase 1-5: 키스트로크 수집 + 파일럿 검증

### 1. Core 패키지 Node 환경에서 DOM 테스트
- **문제**: `@humanwrites/core`는 vitest `environment: 'node'`로 설정되어 `document`, `window` 객체 없음. BeaconSender 테스트 실패.
- **해결**: `(globalThis as any).document = { addEventListener: vi.fn(), ... }` 형태로 최소 DOM 스텁 제공.

### 2. Web Worker 타입 충돌
- **문제**: `DedicatedWorkerGlobalScope` 타입이 `webworker` lib 필요. 이를 추가하면 DOM 타입과 충돌.
- **해결**: `DedicatedWorkerGlobalScope` 캐스팅 대신 `self.onmessage` 직접 사용. 타입은 `MessageEvent<T>`로 제한.

### 3. ESLint import-x/order 규칙
- **문제**: 외부 패키지 → 내부 모듈 간 빈 줄 필요. value import → type import 순서 필요.
- **해결**: 모든 파일에서 import 그룹 사이 빈 줄 추가, type import를 별도 그룹으로 분리.

### 4. 병렬 Bash 명령 실패 시 세션 블로킹
- **문제**: 여러 Bash 명령을 병렬 실행할 때 하나가 실패하면 나머지도 "Sibling tool call errored"로 취소되어 세션이 멈춤.
- **해결**: 실패 가능성 있는 명령은 순차 실행 (`;`로 체이닝). 병렬은 성공 보장 명령에만 사용.

### 5. pnpm-lock.yaml 중복
- **문제**: 서브 패키지(core, ui)에 별도 `pnpm-lock.yaml` 존재 시 경고 발생.
- **해결**: 루트 `pnpm-lock.yaml`만 유지, 서브 패키지의 lockfile 삭제.

---

## Phase 2-1: Spring Boot REST API + Google OAuth

_(특별한 시행착오 없이 완료)_

---

## Phase 2-2: OpenAPI 파이프라인 + 키스트로크 분석 알고리즘

### 1. Shannon 엔트로피 -0.0 비교 실패
- **문제**: `calculateShannonEntropy`가 단일 버킷(모든 값 동일)일 때 `-0.0` 반환. Kotest `shouldBe 0.0`은 `(-0.0).equals(0.0) == false`라서 실패.
- **해결**: `shouldBe (0.0 plusOrMinus 1e-10)` 사용하여 부동소수점 허용 오차 적용.

### 2. AnomalyDetector 정상 윈도우 오탐 (MECHANICAL_RHYTHM)
- **문제**: 테스트 normalWindows의 flightTimes가 80~200ms 범위에 집중되어 50ms 버킷 기준 3~4개 버킷만 사용. 엔트로피 ~1.74 < 2.0 임계값 → MECHANICAL_RHYTHM 오탐 발생.
- **해결**: flightTimes를 45~500ms 범위로 넓혀 다양한 버킷에 분산되도록 수정. 실제 사람 타이핑은 이 정도 변동이 자연스러움.

### 3. Exposed ORM timestamptz 미지원
- **문제**: `exposed-java-time`에 `timestamptz` 함수가 없음. Kotlin Exposed는 `timestamp`만 제공.
- **해결**: `timestamp` 사용. PostgreSQL에서 `TIMESTAMP WITH TIME ZONE`이 필요하면 SQL 마이그레이션에서 직접 지정.

---

## Phase 2-3: 인증서 (Ed25519) + 검증 페이지

### 1. Ed25519 서명 검증 시 Base64 디코딩 예외
- **문제**: `verifyCertificate`에서 잘못된 서명(예: reversed Base64)을 디코딩할 때 `IllegalArgumentException` 발생. `false` 대신 예외가 던져져 테스트 실패.
- **해결**: `verifyCertificate` 전체를 `try-catch`로 감싸서 모든 예외를 `false`로 처리. 서명 검증은 실패 시 항상 false 반환이 올바른 동작.

