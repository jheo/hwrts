# Phase 2-5: 통합 테스트 + 최적화 (Week 10)

## 개발 목표

전체 E2E 플로우(에디터 → 키스트로크 수집 → 인증서 발행 → 검증 → AI 어시스트)를 통합 테스트하고, 성능 최적화(번들 크기, LCP, 타이핑 지연)와 접근성 검증을 수행한다. MVP 마일스톤 M2를 달성한다.

## 선행 조건

- Phase 2-1~2-4 완료: 전체 백엔드 API, 에디터, 키스트로크 수집, 인증서 시스템, AI 맞춤법
- 모든 유닛 테스트 통과 (프론트엔드 Vitest, 백엔드 Kotest)
- Docker Compose 환경에서 전체 서비스 기동 가능

## 아키텍처

```
[Playwright E2E]
    → 글 작성 (TipTap 에디터 입력)
    → 키스트로크 수집 확인 (STOMP WebSocket 연결)
    → AI 맞춤법 동작 확인 (인라인 피드백 표시)
    → 인증서 발행 (모달 4단계)
    → 검증 페이지 확인 (OG 메타태그)
    → 소셜 공유 링크 복사

[성능 프로파일링]
    → Lighthouse CI: LCP < 2s
    → Bundle Analyzer: 에디터 < 150KB gzip
    → Performance.now(): 타이핑 지연 < 16ms
```

## 상세 태스크

### Task 1: E2E 테스트 시나리오 작성

- **파일**: `frontend/apps/web/e2e/`
- **설명**: Playwright 기반 전체 사용자 플로우 E2E 테스트
- **핵심 구현**:
  - **시나리오 1: 기본 글쓰기 플로우**
    - 에디터 페이지 접속 → 제목 입력 → 본문 작성 (500단어+) → 자동 저장 확인
  - **시나리오 2: 키스트로크 수집 + 인증서 발행**
    - 글 작성 → Inspector 열기 → Recording 도트 확인 → "Ready to certify" 배지 → 인증서 발행 모달 → 4단계 완료 → 검증 URL 확인
  - **시나리오 3: AI 맞춤법 + 인증서**
    - 의도적 오타 입력 → 1.5초 대기 → wavy underline 표시 → Fix 클릭 → Inspector 리뷰 탭 확인 → 인증서 발행 시 AI 사용 기록 포함
  - **시나리오 4: 공개 검증 페이지**
    - 발행된 인증서 URL 접속 → 인증서 카드 렌더링 → OG 메타태그 확인
  - **시나리오 5: 에러 플로우**
    - AI 서버 다운 시 에디터 정상 작동 (Graceful Degradation)
    - 네트워크 끊김 → STOMP 재연결 → 로컬 버퍼 데이터 전송

### Task 2: 백엔드 통합 테스트

- **파일**: `backend/src/test/kotlin/com/humanwrites/integration/`
- **설명**: Testcontainers 기반 실제 DB/Redis 통합 테스트
- **핵심 구현**:
  - `CertificateIntegrationTest`: 세션 생성 → 키스트로크 배치 저장 → 인증서 발행 → Ed25519 서명 검증
  - `AiGatewayIntegrationTest`: Redis 캐시 히트/미스, Rate Limiting 동작
  - `WebSocketIntegrationTest`: STOMP 연결 → 배치 전송 → 이상 탐지 알림
  - 실행 시간 목표: 전체 통합 테스트 < 5분

### Task 3: 에디터 dynamic import + 번들 최적화

- **파일**: `frontend/apps/web/app/editor/page.tsx`, `frontend/next.config.ts`
- **설명**: 에디터 코드 분할 및 번들 크기 최적화
- **핵심 구현**:
  - TipTap 에디터 `dynamic(() => import(...), { ssr: false })` 적용
  - Tree-shaking 최적화: 사용하지 않는 TipTap 확장 제거
  - 번들 크기 목표: 에디터 청크 < 150KB (gzip), 인증서 페이지 < 50KB (gzip)
  - `@next/bundle-analyzer` 로 번들 구성 분석
  - 폰트 최적화: `next/font`로 자체 호스팅, `font-display: swap`

### Task 4: 성능 메트릭 검증

- **파일**: `frontend/apps/web/e2e/performance.spec.ts`
- **설명**: Core Web Vitals 및 타이핑 지연 측정
- **핵심 구현**:
  - **LCP < 2s**: 에디터 페이지 초기 로드 시간 측정 (Lighthouse CI)
  - **타이핑 지연 < 16ms**: `performance.now()` 기반 keydown → 화면 반영 지연 측정
  - **STOMP 연결 시간 < 1s**: WebSocket 핸드셰이크 ~ 첫 메시지 전송 시간
  - **AI 응답 시간 < 3s**: 맞춤법 검사 요청 → 응답 시간 (캐시 미스 기준)
  - CI 파이프라인에 성능 예산(Performance Budget) 게이트 추가

### Task 5: 접근성 검증

- **파일**: `frontend/apps/web/e2e/accessibility.spec.ts`
- **설명**: axe-core + 키보드 네비게이션 테스트
- **핵심 구현**:
  - `@axe-core/playwright` 통합: 모든 주요 페이지 자동 스캔
  - 에디터 페이지, 인증서 발행 모달, 검증 페이지 각각 axe-core 통과
  - 키보드 네비게이션: Tab 순서, Escape 닫기, Enter 확인 동작 검증
  - ARIA 레이블: Inspector 패널, 리뷰 아이템, 인라인 팝오버
  - 고대비 모드(`prefers-contrast: more`): 인라인 밑줄 가시성 확인

### Task 6: 에러 플로우 및 Graceful Degradation

- **파일**: 프론트/백 다수 파일
- **설명**: 장애 상황에서의 사용자 경험 보장
- **핵심 구현**:
  - **AI 서버 장애**: 에디터 정상 작동, Inspector에 "AI 서비스 일시 중단" 메시지, 재시도 버튼
  - **STOMP 연결 끊김**: 로컬 이벤트 버퍼에 누적, 황색 도트, 재연결 후 버퍼 일괄 전송
  - **인증서 발행 실패**: 모달에 에러 표시, 재시도 안내, 로컬 데이터 보존
  - **네트워크 완전 오프라인**: 에디터 + 로컬 저장(IndexedDB)은 정상 동작, 온라인 기능 비활성 표시

### Task 7: 버그 수정 및 코드 정리

- **파일**: 전체 코드베이스
- **설명**: 통합 테스트에서 발견된 버그 수정 + 코드 품질 정리
- **핵심 구현**:
  - E2E 테스트 실패 항목 수정
  - 콘솔 에러/경고 제거
  - 미사용 코드 정리, import 정리
  - TypeScript strict mode 에러 0건 확인 (`tsc --noEmit`)
  - Kotlin lint 통과 (`./gradlew spotlessCheck`)
  - 주석 및 JSDoc/KDoc 보완

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 |
|----------|------|-------------|-----------|
| `qa-tester` (sonnet) | QA 엔지니어 | Task 1, 5 | Yes (T1↔T2) |
| `qa-tester` (sonnet) | 백엔드 QA | Task 2 | Yes (T2↔T1) |
| `executor-high` (opus) | 성능 엔지니어 | Task 3, 4 | T1 이후 병렬 가능 |
| `executor` (sonnet) | 프론트 엔지니어 | Task 6 | Yes (T6↔T1) |
| `executor` (sonnet) | 버그 수정 | Task 7 | T1, T2 완료 후 |
| `architect` (opus) | 최종 검증 | 전체 M2 검증 | 모든 태스크 완료 후 |

## 고려 사항

- **테스트 환경**: E2E 테스트는 Docker Compose로 전체 스택(프론트+백+DB+Redis) 기동 후 실행
- **CI 통합**: GitHub Actions에서 E2E 테스트 자동 실행, 성능 예산 게이트
- **Flaky 테스트 방지**: WebSocket 연결, AI 응답 등 비동기 작업에 적절한 `waitForSelector`/`waitForResponse` 사용
- **성능 기준선**: Week 10에서 측정한 메트릭을 기준선으로 저장, 이후 PR에서 회귀 방지
- **MVP 범위 확인**: Post-MVP 기능(팩트 체크, 스타일 제안, 반응형 등)이 포함되지 않았는지 확인

## 검증 기준 (체크리스트)

- [ ] E2E 시나리오 5개 전체 통과 (Playwright)
- [ ] 백엔드 통합 테스트 전체 통과 (Testcontainers, < 5분)
- [ ] 에디터 번들 크기 < 150KB (gzip)
- [ ] LCP < 2s (Lighthouse CI)
- [ ] 타이핑 지연 < 16ms (performance.now 측정)
- [ ] axe-core 접근성 검사 통과 (에디터, 모달, 검증 페이지)
- [ ] 키보드 네비게이션 정상 동작 (Tab, Escape, Enter)
- [ ] Graceful Degradation: AI 장애, 네트워크 끊김 시 에디터 정상 작동
- [ ] TypeScript 에러 0건 (`tsc --noEmit`)
- [ ] Kotlin lint 통과 (`./gradlew spotlessCheck`)
- [ ] 전체 유닛 테스트 통과 (프론트: Vitest, 백엔드: Kotest)

## 산출물

- Playwright E2E 테스트 스위트 (5개 시나리오)
- 백엔드 통합 테스트 스위트 (Testcontainers)
- 성능 최적화된 번들 (dynamic import, tree-shaking)
- 접근성 테스트 스위트 (axe-core)
- Graceful Degradation 처리 코드
- 성능 기준선 리포트

## 다음 단계 연결

- **마일스톤 M2 달성**: "글 작성 → 인증서 발행 → 공유 → 검증 + 맞춤법 AI 동작"
- **Post-MVP Iter 1**: Focus Mode Deep/Zen, Typewriter Mode, Floating Toolbar, Slash Commands
- **Post-MVP Iter 2**: Layer 2(편집 패턴) + Layer 3(콘텐츠 무결성), 6등급 체계 활성화
- **Post-MVP Iter 3**: 팩트 체크, 스타일 제안, AI 요약 SSE 스트리밍
