# Phase 2-2: OpenAPI 파이프라인 + 인증 알고리즘 (Week 7)

## 개발 목표

백엔드-프론트엔드 타입 안전 파이프라인(SpringDoc → orval)을 구축하고, Layer 1 키스트로크 다이나믹스 분석 알고리즘을 구현한다. WebSocket(STOMP) 기반 실시간 타이핑 데이터 수집 및 이상 탐지 시스템을 완성한다.

## 선행 조건

- Phase 2-1 완료: Spring Boot API 서버, Spring Security + Google OAuth, Flyway 마이그레이션, Exposed ORM 설정
- Phase 1 Week 5 파일럿 검증: 교정된 임계값 테이블, 시나리오별 분포 분석 보고서
- Docker Compose 환경: PostgreSQL+TimescaleDB, Redis 가동 중

## 아키텍처

```
[Kotlin DTO + @Schema] → SpringDoc → openapi.yaml → orval → [TypeScript TanStack Query hooks]

[ProseMirror Plugin] → [Web Worker 5초 집계] → STOMP /app/session.keystroke → [Spring @MessageMapping]
    → Redis 버퍼(5분) → JDBC 배치 INSERT → TimescaleDB keystroke_events (hypertable)
    → 이상 탐지 → /user/queue/session.anomaly
```

## 상세 태스크

### Task 1: SpringDoc OpenAPI 스키마 자동 생성

- **파일**: `backend/build.gradle.kts`, `backend/src/main/kotlin/com/humanwrites/config/OpenApiConfig.kt`
- **설명**: SpringDoc 의존성 추가, OpenAPI 3.0 스키마 자동 생성 설정
- **핵심 구현**:
  - `springdoc-openapi-starter-webmvc-ui` 의존성 추가
  - Gradle task `generateOpenApiDocs`: 서버 기동 → `openapi.yaml` export → `schema/` 디렉터리 복사
  - 모든 REST DTO에 `@Schema` 어노테이션 검증

### Task 2: orval TypeScript 클라이언트 자동 생성

- **파일**: `frontend/orval.config.ts`, `frontend/packages/api-client/`
- **설명**: `schema/openapi.yaml`에서 TanStack Query hooks 자동 생성
- **핵심 구현**:
  - orval 설정: `client: 'react-query'`, `target: 'packages/api-client/src/generated'`
  - `pnpm run generate:api` 스크립트 등록
  - 생성된 코드 수동 편집 금지 규칙 (`.eslintignore`, 주석 헤더)

### Task 3: Makefile 통합 커맨드

- **파일**: `Makefile`
- **설명**: `make openapi-generate` = schema-generate + client-generate 통합
- **핵심 구현**:
  - `schema-generate`: `cd backend && ./gradlew generateOpenApiDocs` + `cp` to `schema/`
  - `client-generate`: `cd frontend && npx orval --config orval.config.ts`
  - `api-sync`: 위 두 타겟 순차 실행

### Task 4: 키스트로크 분석 알고리즘 (Layer 1)

- **파일**: `backend/src/main/kotlin/com/humanwrites/domain/session/analysis/KeystrokeAnalyzer.kt`
- **설명**: 파일럿 교정 임계값 기반 Layer 1 분석 엔진
- **핵심 구현**:
  - 타이핑 속도 변동성(CV): WPM 표준편차/평균, 인간 기대값 0.15~0.4
  - 키 간 간격 엔트로피: flight_time 분포의 Shannon entropy, 인간 >3.0
  - 오류 수정 비율: backspace/delete 비율, 인간 5~15%
  - 일시정지 패턴: 2초+ 일시정지 빈도, 자연스러운 분포
  - 버스트-일시정지 비율, 피로도 곡선 (시간에 따른 WPM 변화)

### Task 5: 신뢰도 스코어 산정 로직

- **파일**: `backend/src/main/kotlin/com/humanwrites/domain/session/analysis/ScoringService.kt`
- **설명**: MVP 이분법 (Certified / Not Certified) 판정
- **핵심 구현**:
  - `calculateKeystrokeScore()`: Layer 1 지표 종합 → 0-100 점수
  - `determineGrade(score)`: 임계값 이상 → Certified, 미만 → Not Certified
  - 파일럿 교정 임계값을 설정 파일(`application.yml`)에서 로드

### Task 6: WebSocket(STOMP) 엔드포인트

- **파일**: `backend/src/main/kotlin/com/humanwrites/config/WebSocketConfig.kt`, `backend/src/main/kotlin/com/humanwrites/presentation/websocket/SessionWebSocketHandler.kt`
- **설명**: STOMP over 순수 WebSocket 핸들러 구현
- **핵심 구현**:
  - STOMP 엔드포인트: `/ws` (SockJS 제거, 순수 WebSocket. STOMP는 하위 destination으로 라우팅)
  - 클라이언트→서버: `/app/session.keystroke`(KEYSTROKE_BATCH), `/app/session.start`, `/app/session.end`
  - 서버→클라이언트: `/user/queue/session.status`(SESSION_STATUS), `/user/queue/session.anomaly`(ANOMALY_ALERT)
  - `KeystrokeBatchMessage`, `SessionStatusMessage` DTO 정의

### Task 7: 이상 탐지 서비스

- **파일**: `backend/src/main/kotlin/com/humanwrites/domain/session/analysis/AnomalyDetector.kt`
- **설명**: 실시간 이상 패턴 감지 후 클라이언트 알림
- **핵심 구현**:
  - `unrealistic_speed`: 비현실적 일정 속도 (CV < 0.05)
  - `mechanical_rhythm`: 기계적 리듬 (flight_time 엔트로피 < 2.0)
  - `excessive_paste`: 과도한 붙여넣기 비율
  - `no_thinking_pauses`: 사고 일시정지 부재

### Task 8: Continuous Aggregate 마이그레이션

- **파일**: `backend/src/main/resources/db/migration/V5__add_continuous_aggregate.sql`
- **설명**: Phase 2-1에서 생성된 V3(writing_sessions), V4(keystroke_events) 기반으로 Continuous Aggregate 추가
- **핵심 구현**:
  - Continuous Aggregate `keystroke_stats_5s`: 5초 윈도우 집계 뷰 생성
  - `SELECT create_continuous_aggregate_policy(...)` 자동 갱신 정책
  - 참고: 압축 정책(7일)과 보존 정책(90일)은 V4에서 이미 설정됨. V5에서는 Continuous Aggregate만 추가

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 |
|----------|------|-------------|-----------|
| `executor` (sonnet) | 인프라 엔지니어 | Task 1, 2, 3 | Yes (T1↔T8) |
| `executor-high` (opus) | 알고리즘 엔지니어 | Task 4, 5, 7 | Yes (T4↔T1) |
| `executor-high` (opus) | 백엔드 엔지니어 | Task 6 | T8 완료 후 |
| `executor` (sonnet) | DB 엔지니어 | Task 8 | Yes (T8↔T1) |
| `architect` (opus) | 코드 리뷰 | 전체 검증 | 모든 태스크 완료 후 |

## 고려 사항

- **openapi.yaml git 전략**: 자동 생성하되 수동 커밋. CI에서 스키마 변경 감지 시 클라이언트 재생성 알림
- **파일럿 임계값 반영**: Week 5 파일럿 결과를 `application.yml`에 설정값으로 외부화하여 재빌드 없이 조정 가능
- **프라이버시**: 키 카테고리(letter, number, punct)만 수집, 실제 키 값 수집 금지. 통계 벡터만 서버 전송
- **TimescaleDB**: hypertable 전환 시 기존 데이터 없는 상태에서 수행. 압축/보존 정책은 프로덕션 배포 시 활성화

## 검증 기준 (체크리스트)

- [ ] `make openapi-generate` 실행 시 `schema/openapi.yaml` 생성 확인
- [ ] orval 생성 코드가 `frontend/packages/api-client/src/generated/`에 정상 출력
- [ ] 생성된 TanStack Query hooks의 타입이 백엔드 DTO와 일치
- [ ] KeystrokeAnalyzer 유닛 테스트: 인간 시뮬레이션 → Certified, 봇 시뮬레이션 → Not Certified
- [ ] STOMP WebSocket 연결 테스트: 클라이언트 배치 전송 → 서버 수신 확인
- [ ] 이상 탐지: 4가지 패턴(unrealistic_speed, mechanical_rhythm, excessive_paste, no_thinking_pauses) 각각 감지 확인
- [ ] TimescaleDB hypertable 생성 확인 (`\d+ keystroke_events`)
- [ ] Continuous Aggregate `keystroke_stats_5s` 정상 작동

## 산출물

- `schema/openapi.yaml` (자동 생성 스키마)
- `frontend/packages/api-client/` (orval 생성 클라이언트)
- `KeystrokeAnalyzer`, `ScoringService`, `AnomalyDetector` (Layer 1 분석 엔진)
- `SessionWebSocketHandler` (STOMP 핸들러)
- Flyway 마이그레이션 V5 (Continuous Aggregate)

## 다음 단계 연결

- **Phase 2-3**: `ScoringService`의 결과를 인증서 생성 서비스가 소비. `CertificateService`가 `KeystrokeAnalyzer` 결과 + Ed25519 서명으로 인증서 발행
- **Phase 2-4**: OpenAPI 파이프라인으로 생성된 `api-client`를 AI 맞춤법 API 호출에 활용
