# Phase 1-5: 키스트로크 수집 + 파일럿 검증 (Week 5)

## 개발 목표
- ProseMirror Plugin으로 키스트로크/편집 이벤트를 수집하는 Collector 구현
- Web Worker로 메트릭 계산을 메인 스레드에서 분리 (타이핑 지연 < 16ms 보장)
- 로컬 버퍼 (50이벤트 OR 500ms) + IndexedDB 배치 저장
- Beacon API로 페이지 언로드 시 데이터 유실 방지
- 10명 대상 3 시나리오 파일럿 검증 수행 및 Layer 1 임계값 교정

## 선행 조건
- Phase 1-4 완료: Inspector 패널, 문서 통계, Focus Mode Soft, 키보드 단축키
- TipTap v2 에디터 코어에서 `handleKeyDown`, `appendTransaction` 접근 가능
- IndexedDB 자동 저장 인프라 (Phase 1-3에서 구현)
- Inspector 하단에 상태 표시 영역 확보 (Phase 1-4 Inspector 컴포넌트)

## 아키텍처

### 생성/수정 파일 구조
```
frontend/packages/core/typing-analyzer/
├── keystroke.ts                      # KeystrokeEvent, KeystrokeStatVector, SessionData 타입
├── edit.ts                           # EditEvent, PasteEvent 타입
└── collector/
    ├── EventBuffer.ts                # 로컬 이벤트 버퍼 (50이벤트 OR 500ms 플러시)
    ├── MetricsWorker.ts              # Web Worker 진입점 (5초 윈도우 집계)
    ├── MetricsWorker.worker.ts       # Worker 스크립트 (통계 벡터 생성)
    └── BeaconSender.ts               # Beacon API 페이지 언로드 보장

frontend/packages/editor-react/
├── extensions/
│   └── TypingCollector.ts            # ProseMirror Plugin (handleKeyDown + appendTransaction)
├── hooks/
│   └── useTypingMetrics.ts           # Collector 상태 관리 훅

frontend/packages/ui/
├── molecules/
│   └── RecordingIndicator/
│       └── RecordingIndicator.tsx    # 녹색 Recording 도트 + Confidence 바

scripts/
└── pilot/
    ├── pilot-runner.ts               # 파일럿 검증 실행 스크립트
    ├── pilot-scenarios.md            # 3 시나리오 가이드
    └── pilot-analysis.ts             # 데이터 분석 + 임계값 교정
```

### 핵심 기술 결정
- **프라이버시**: 키 카테고리(letter/number/punct/modifier)만 수집, 실제 키 값 절대 수집 안 함
- **성능**: Web Worker에서 통계 계산, 메인 스레드는 이벤트 버퍼링만 수행
- **배치 전략**: 50이벤트 OR 500ms 중 먼저 도달하면 Worker로 전송
- **5초 윈도우**: Worker가 5초 단위로 `KeystrokeStatVector` 집계 생성
- **저장**: MVP에서는 IndexedDB 로컬 저장, Phase 2-2에서 WebSocket(STOMP) 서버 전송 추가

## 상세 태스크

### Task 1: 코어 타입 정의
- `keystroke.ts`: `KeystrokeEvent` (type, keyCategory, timestamp, dwellTime?, flightTime?)
- `keystroke.ts`: `KeystrokeStatVector` - 5초 윈도우 집계 벡터
  - 필드: keystrokeCount, avgWpm, wpmStdDev, avgDwellTime, avgFlightTime, flightTimeEntropy(Shannon), errorRate, pauseCount(2초+), burstPauseRatio
- `edit.ts`: `EditEvent` (type: insert/delete/replace/cursor_move/paste, position, contentLength, timestamp, source)
- 인터페이스 전문은 PROJECT_PLAN.md 11.1절 참조

### Task 2: ProseMirror Plugin (TypingCollector)
- `TypingCollector.ts` ProseMirror Plugin:
  - `handleKeyDown`: KeystrokeEvent 생성, dwellTime/flightTime 계산
  - `appendTransaction`: EditEvent 생성 (insert/delete/replace 감지)
  - 붙여넣기 감지: `handlePaste` 핸들러로 PasteEvent 별도 기록
  - 생성된 이벤트를 `EventBuffer`로 전달
- 성능 제약: `handleKeyDown` 내부 로직 1ms 이내 완료

### Task 3: 이벤트 버퍼 + Web Worker
- `EventBuffer.ts`:
  - 이벤트 큐에 추가, 50개 도달 OR 500ms 경과 시 Worker로 `postMessage`
  - `flush()` 메서드: 강제 플러시 (페이지 언로드 시 호출)
- `MetricsWorker.worker.ts`:
  - 수신된 이벤트를 5초 윈도우로 집계
  - `KeystrokeStatVector` 생성: WPM, 엔트로피, 에러율, 일시정지 패턴 계산
  - Shannon entropy 계산: `H = -sum(p_i * log2(p_i))` (flight_time 분포)
  - 집계 결과를 메인 스레드로 `postMessage` 반환
- `BeaconSender.ts`:
  - `visibilitychange` + `beforeunload` 이벤트 리스너
  - `navigator.sendBeacon()`으로 미전송 버퍼 데이터를 IndexedDB에 저장
  - Phase 2에서 서버 엔드포인트로 전환 시 Beacon URL만 교체

### Task 4: IndexedDB 배치 저장
- Worker에서 생성된 `KeystrokeStatVector`를 IndexedDB `keystroke_stats` 스토어에 저장
- 세션 단위로 그룹핑: `{ sessionId, documentId, vectors: KeystrokeStatVector[] }`
- 저장 용량 관리: 문서당 최대 500KB, 오래된 세션 자동 정리 (7일)

### Task 5: Recording 상태 표시 UI
- `RecordingIndicator.tsx`: Inspector 하단 녹색 도트 + "Recording" 텍스트
  - 수집 활성: 녹색 도트 (펄스 애니메이션)
  - 수집 비활성: 회색 도트
- `useTypingMetrics.ts` 훅: Collector 활성 상태, 현재 세션 통계 제공

### Task 6: 파일럿 검증 수행
- **대상**: 10명 (다양한 타이핑 속도/습관)
- **3 시나리오**:
  | 시나리오 | 설명 | 예상 결과 |
  |----------|------|-----------|
  | (a) 직접 작성 | 주어진 주제로 자유롭게 작성 | 자연스러운 패턴 (기준선) |
  | (b) AI 보고 타이핑 | ChatGPT 결과를 보면서 직접 타이핑 | Layer 1만으로 구분 어려울 수 있음 |
  | (c) 복사-붙여넣기 | 외부 텍스트를 복사하여 붙여넣기 | 명확한 비인간 패턴 |
- **산출물**: 교정된 임계값 테이블, 시나리오별 분포 분석 차트, 한계 보고서
- **한계 인정**: 시나리오 (b)의 구분 한계를 문서에 명시, Post-MVP Layer 2/3로 보완 계획

### Task 7: Vitest 유닛 테스트 작성

- `EventBuffer`: 50이벤트/500ms 플러시 조건 테스트, flush() 강제 플러시 테스트
- `MetricsWorker`: KeystrokeStatVector 생성 정확성, Shannon entropy 계산 테스트
- `TypingCollector` ProseMirror Plugin: KeystrokeEvent 생성, dwellTime/flightTime 계산 정확성 테스트
- 프라이버시: 키 카테고리만 수집되고 실제 키 값이 포함되지 않음을 검증
- `BeaconSender`: visibilitychange 이벤트 핸들링 테스트

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 |
|----------|------|------------|:---------:|
| `executor-high` (opus) | 프론트엔드 코어 | Task 2 (ProseMirror Plugin) | O |
| `executor` (sonnet) | 알고리즘 엔지니어 | Task 1 (타입 정의), Task 3 (버퍼 + Worker) | O |
| `executor` (sonnet) | 인프라 엔지니어 | Task 4 (IndexedDB 배치 저장) | O |
| `designer` (sonnet) | UI 엔지니어 | Task 5 (Recording 표시 UI) | O |
| `executor-high` (opus) | 알고리즘 검증 | Task 6 (파일럿 검증 + 임계값 교정) | X (Task 1-4 완료 후) |
| `qa-tester` (sonnet) | 테스트 엔지니어 | Task 7 (Vitest 유닛 테스트) | Task 1~5 완료 후 |
| `architect` (opus) | 코드 리뷰 | 전체 통합 + 성능 검증 | X (최종) |

## 고려 사항
- **타이핑 지연 < 16ms**: handleKeyDown에서 무거운 계산 금지, Worker 위임 필수
- **프라이버시**: 키 카테고리만 수집, 원시 키 값 절대 미수집, 통계 벡터만 저장
- **한국어 IME 대응**: compositionstart/compositionend 이벤트 처리, 조합 중 키스트로크 정확도 확보
- **Worker 미지원 환경**: 폴백으로 `requestIdleCallback` + 메인 스레드 계산 (성능 저하 감수)
- **배치 타이밍 2단계 구분**: (1) 로컬 버퍼 → IndexedDB: 50이벤트 OR 500ms (Phase 1-5, 로컬 저장). (2) IndexedDB → STOMP 서버 전송: 200ms (2Hz) (Phase 2-2, 네트워크). CLAUDE.md의 "200ms 배치 전송"은 서버 전송 주기이며, 로컬 버퍼링과는 별개 계층이다.
- **파일럿 검증 일정**: 에디터 + Collector 완성 후 최소 2일 소요

## 검증 기준 (체크리스트)
- [ ] 에디터에서 타이핑 시 KeystrokeEvent가 생성된다
- [ ] 키 카테고리만 기록되고 실제 키 값은 수집되지 않는다
- [ ] 50이벤트 OR 500ms 도달 시 Worker로 배치 전송된다
- [ ] Worker가 5초 윈도우 KeystrokeStatVector를 정확히 생성한다
- [ ] Shannon entropy 계산이 올바르다 (단위 테스트)
- [ ] IndexedDB에 세션별 통계 벡터가 저장된다
- [ ] 페이지 언로드 시 Beacon API로 미전송 데이터가 보존된다
- [ ] 한국어 IME 조합 중 이벤트가 정확히 처리된다
- [ ] Inspector 하단 Recording 도트가 수집 상태를 표시한다
- [ ] 메인 스레드 타이핑 지연이 16ms 미만이다 (Performance 프로파일링)
- [ ] 파일럿 검증: 시나리오 (a)와 (c)가 통계적으로 구분된다
- [ ] 교정된 임계값 테이블과 한계 보고서가 작성된다

## 산출물
- `frontend/packages/core/typing-analyzer/keystroke.ts`, `edit.ts`
- `frontend/packages/core/typing-analyzer/collector/` (EventBuffer, MetricsWorker, BeaconSender)
- `frontend/packages/editor-react/extensions/TypingCollector.ts`
- `frontend/packages/editor-react/hooks/useTypingMetrics.ts`
- `frontend/packages/ui/molecules/RecordingIndicator/`
- `scripts/pilot/` (검증 스크립트 + 시나리오 가이드)
- **파일럿 산출물**: 교정된 임계값 테이블, 시나리오별 분포 분석, 한계 보고서

## 다음 단계 연결
- **Phase 2-1** (Week 6): 백엔드 API에서 `writing_sessions`, `keystroke_events` 테이블 생성 (Flyway)
- **Phase 2-2** (Week 7): WebSocket(STOMP) 배치 전송으로 IndexedDB 로컬 저장을 서버 전송으로 확장
- **Phase 2-2** (Week 7): 파일럿 교정 임계값을 반영한 Layer 1 분석 알고리즘 서버 구현
- **마일스톤 M1**: 에디터에서 글을 쓰고 키스트로크가 수집된다. 파일럿 검증 완료.
