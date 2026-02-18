# HumanWrites QA 테스트 전략 및 계획서

> 작성일: 2026-02-18
> 작성자: QA Lead (Senior QA Engineer)
> 대상: HumanWrites 글쓰기 서비스 전체
> 테스트 레벨: COMPREHENSIVE (Production-Ready)

---

## 목차

1. [테스트 전략 총괄](#1-테스트-전략-총괄)
2. [에디터 테스트 계획](#2-에디터-테스트-계획)
3. [타이핑 분석 / 인증 테스트](#3-타이핑-분석--인증-테스트)
4. [AI 어시스트 테스트](#4-ai-어시스트-테스트)
5. [보안 테스트](#5-보안-테스트)
6. [성능 테스트](#6-성능-테스트)
7. [접근성 테스트](#7-접근성-테스트)
8. [멀티플랫폼 테스트](#8-멀티플랫폼-테스트)
9. [CI/CD 통합](#9-cicd-통합)
10. [개발 중 검증 계획](#10-개발-중-검증-계획)

---

## 1. 테스트 전략 총괄

### 1.1 테스트 피라미드

```
                    /\
                   /  \
                  / E2E \          10% (약 50개 시나리오)
                 /--------\
                /Integration\      25% (약 150개 테스트)
               /--------------\
              /     Unit        \  65% (약 400개 테스트)
             /____________________\
```

| 계층 | 목표 커버리지 | 대상 | 실행 시간 목표 |
|------|-------------|------|---------------|
| Unit | 80% 라인 커버리지 | 순수 함수, 유틸리티, 상태 관리, 파서 | < 30초 |
| Integration | 70% 기능 커버리지 | 컴포넌트 조합, API 연동, 스토어 연동 | < 2분 |
| E2E | 100% 크리티컬 경로 | 사용자 시나리오, 전체 플로우 | < 10분 |

### 1.2 테스트 도구 선택

| 도구 | 용도 | 선택 근거 |
|------|------|----------|
| **Vitest** | Unit / Integration 테스트 | Vite 네이티브 호환, ESM 지원, 빠른 실행, HMR 연동 |
| **Testing Library** | 컴포넌트 테스트 | 사용자 중심 테스트 철학, 접근성 쿼리 내장 |
| **Playwright** | E2E 테스트 | 크로스 브라우저, 자동 대기, 네트워크 인터셉트, 트레이스 |
| **MSW (Mock Service Worker)** | API 모킹 | 네트워크 수준 모킹, 테스트/개발 환경 공유 |
| **Axe-core** | 접근성 자동 검사 | WCAG 2.1 AA 룰셋, Playwright 통합 |
| **Lighthouse CI** | 성능 리그레션 | Core Web Vitals 추적, CI 통합 |
| **k6** | 부하 테스트 | 스크립트 기반 시나리오, 클라우드 실행 가능 |
| **Storybook** | 비주얼 리그레션 | 컴포넌트 카탈로그, Chromatic 연동 |

### 1.3 테스트 환경 구성

```
환경 구조:
  local       -> 개발자 머신 (Vitest watch mode + Playwright UI mode)
  ci          -> GitHub Actions (모든 테스트 자동 실행)
  staging     -> Vercel Preview (E2E + 성능 테스트)
  production  -> 모니터링 + Synthetic 테스트

환경별 설정:
  local:
    - DB: PostgreSQL 16 + TimescaleDB (Docker Compose) + Testcontainers
    - AI API: MSW 모킹
    - 인증: 테스트 토큰
    - 키스트로크 분석: 고정 시드 데이터

  ci:
    - DB: Testcontainers (PostgreSQL + TimescaleDB Docker, 매 실행 초기화)
    - AI API: MSW 모킹 (고정 응답)
    - 브라우저: Chromium, Firefox, WebKit
    - 병렬 실행: 4 workers

  staging:
    - DB: PostgreSQL + TimescaleDB 인스턴스
    - AI API: 실제 API (rate-limited 테스트 키)
    - Synthetic 모니터링: 15분 간격 핵심 플로우 실행
```

### 1.4 테스트 데이터 전략

| 데이터 유형 | 관리 방식 | 예시 |
|------------|----------|------|
| 고정 시드 데이터 | `fixtures/` 디렉터리 | 샘플 문서, 키스트로크 로그, 인증서 |
| 팩토리 함수 | `test/factories/` | `createDocument()`, `createKeystrokeLog()` |
| 스냅샷 | `__snapshots__/` | 인증서 렌더링, 에디터 상태 |
| Mock 응답 | `test/mocks/handlers.ts` | AI API 응답, 인증 토큰 |

### 1.5 테스트 네이밍 컨벤션

```typescript
// Unit 테스트
describe('calculateTypingSpeed', () => {
  it('should return WPM from keystroke intervals', () => {})
  it('should return 0 for empty keystroke array', () => {})
  it('should handle copy-paste events by excluding them', () => {})
})

// Integration 테스트
describe('Editor + Inspector integration', () => {
  it('should update word count when text changes', () => {})
  it('should highlight review item location in editor on click', () => {})
})

// E2E 테스트
test('User writes article and publishes certificate', async () => {})
test('Visitor verifies certificate on public page', async () => {})
```

---

## 2. 에디터 테스트 계획

### 2.1 텍스트 입력/편집 기능

#### Unit 테스트

| ID | 테스트 케이스 | 입력 | 기대 결과 | 우선순위 |
|----|-------------|------|----------|---------|
| ED-U-001 | 일반 텍스트 입력 | 'Hello World' 타이핑 | 에디터 상태에 텍스트 반영 | P0 |
| ED-U-002 | 엔터키로 단락 분리 | 텍스트 중간에 Enter | 두 개의 단락으로 분리 | P0 |
| ED-U-003 | 백스페이스로 단락 병합 | 단락 시작에서 Backspace | 이전 단락 끝에 병합 | P0 |
| ED-U-004 | 텍스트 선택 후 타이핑 | 선택 영역 + 'a' | 선택 텍스트가 'a'로 교체 | P0 |
| ED-U-005 | 빈 문서에서 타이핑 | 빈 상태에서 타이핑 | 첫 단락 생성 + 텍스트 반영 | P0 |
| ED-U-006 | 매우 긴 단락 입력 | 10,000자 연속 입력 | 성능 저하 없이 렌더링 | P1 |
| ED-U-007 | 이모지 입력 | 이모지 키보드 | 이모지 정상 표시 + 커서 위치 정확 | P1 |
| ED-U-008 | CJK 문자 입력 (한글/일본어/중국어) | IME 조합 입력 | 조합 중 상태 + 확정 후 반영 | P0 |
| ED-U-009 | RTL 텍스트 입력 (아랍어/히브리어) | RTL 문자 | 방향 자동 감지 + 올바른 렌더링 | P2 |
| ED-U-010 | 특수 문자 입력 | `<script>`, `&amp;`, `\n` | 이스케이프 처리, XSS 방지 | P0 |

#### Integration 테스트

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| ED-I-001 | 타이핑 시 Inspector 통계 실시간 갱신 | 단어수, 단락수, 읽기 시간 동기화 | P0 |
| ED-I-002 | 단락 이동 시 활성/비활성 스타일 전환 | 활성 단락: `--text-active`, 비활성: `--text-body` | P0 |
| ED-I-003 | 에디터 상태와 자동 저장 동기화 | 타이핑 멈춤 후 debounce 시간 내 저장 호출 | P0 |
| ED-I-004 | AI 피드백 인라인 밑줄과 에디터 텍스트 동기화 | 텍스트 수정 시 밑줄 위치 재계산 | P1 |

### 2.2 마크다운 파싱/렌더링

| ID | 테스트 케이스 | 입력 | 기대 결과 | 우선순위 |
|----|-------------|------|----------|---------|
| MD-U-001 | 제목 렌더링 (H1~H6) | `# Title` ~ `###### Title` | 각 레벨별 올바른 크기/스타일 | P0 |
| MD-U-002 | 굵기/기울임 | `**bold**`, `*italic*`, `***both***` | 올바른 폰트 스타일 적용 | P0 |
| MD-U-003 | 링크 렌더링 | `[text](url)` | 클릭 가능한 링크, 새 탭 열기 | P1 |
| MD-U-004 | 인라인 코드 | `` `code` `` | 모노스페이스 배경 처리 | P1 |
| MD-U-005 | 코드 블록 (펜스) | ` ```js ... ``` ` | 구문 강조 + 다크 배경(`--surface-code`) | P0 |
| MD-U-006 | 번호 목록/불릿 목록 | `1. item`, `- item` | 올바른 들여쓰기 + 번호/불릿 표시 | P1 |
| MD-U-007 | 인용문 | `> quote` | 왼쪽 보더 + 들여쓰기 스타일 | P1 |
| MD-U-008 | 수평선 | `---` | 구분선 렌더링 | P2 |
| MD-U-009 | 이미지 | `![alt](url)` | 이미지 렌더링 + alt 텍스트 | P2 |
| MD-U-010 | 중첩 마크다운 | 목록 내 굵기, 인용 내 코드 등 | 올바른 중첩 렌더링 | P1 |
| MD-U-011 | 불완전한 마크다운 | `**unclosed`, `[no link` | 깨지지 않고 원본 텍스트 표시 | P0 |
| MD-U-012 | XSS 시도 마크다운 | `[click](javascript:alert(1))` | 스크립트 실행 차단 | P0 |

### 2.3 코드 블록 구문 강조

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| CB-U-001 | JavaScript 구문 강조 | 키워드, 문자열, 주석 각각 구분 색상 | P1 |
| CB-U-002 | Python 구문 강조 | Python 키워드 정확 인식 | P1 |
| CB-U-003 | 언어 미지정 코드 블록 | 기본 모노스페이스 렌더링 (강조 없음) | P1 |
| CB-U-004 | 매우 긴 코드 블록 (500줄) | 가로 스크롤 + 성능 유지 | P2 |
| CB-U-005 | 다크 모드 코드 블록 | `--surface-code` 배경 유지, 가독성 확보 | P1 |
| CB-U-006 | 코드 블록 내 특수 문자 | `<div>`, `&amp;` 등 이스케이프 처리 | P0 |

### 2.4 Focus Mode / Typewriter Mode

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| FM-U-001 | `Cmd+Shift+F`로 진입 | Inspector 숨김, 인라인 피드백 숨김, 여백 확장 | P0 |
| FM-U-002 | 비활성 단락 디밍 레벨 | Soft(0.4)만 MVP, Medium(0.2+blur) [Post-MVP], Strict(0.1+blur) [Post-MVP] | P1 |
| FM-U-003 | Focus Mode 해제 | 역순 애니메이션, Inspector 접근 가능 복원 | P0 |
| FM-U-004 | Focus Mode 중 Inspector 단축키 | `Cmd+I` 무시 또는 Focus Mode 자동 해제 | P1 |
| FM-U-005 | `prefers-reduced-motion` 환경에서 Focus Mode | 즉시 전환 (애니메이션 없음) | P1 |
| FM-U-006 | [Post-MVP] Typewriter Mode (현재 줄 중앙 고정) | 스크롤 위치가 항상 현재 편집 줄 중심 | P1 |

### 2.5 키보드 단축키

| ID | 단축키 | 기대 동작 | 우선순위 |
|----|--------|----------|---------|
| KS-001 | `Cmd+I` / `Ctrl+I` | Inspector 토글 | P0 |
| KS-002 | `Cmd+Shift+F` | Focus Mode 토글 | P0 |
| KS-003 | `Cmd+,` | 설정 모달 열기 | P1 |
| KS-004 | `Escape` | 현재 모달/패널 닫기 | P0 |
| KS-005 | `Cmd+Z` / `Ctrl+Z` | Undo | P0 |
| KS-006 | `Cmd+Shift+Z` / `Ctrl+Y` | Redo | P0 |
| KS-007 | `Cmd+B` | 굵기 토글 | P1 |
| KS-008 | `Cmd+I` (텍스트 선택 상태) | 기울임 토글 vs Inspector 충돌 해결 | P0 |
| KS-009 | `Tab` | 포커스 순서 이동 (에디터 외부) | P1 |
| KS-010 | OS별 단축키 차이 | Mac/Windows/Linux 매핑 정확성 | P0 |

### 2.6 Undo/Redo

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| UR-U-001 | 단일 문자 Undo | 마지막 입력 문자 제거 | P0 |
| UR-U-002 | 연속 타이핑 후 Undo | 단어 단위 또는 타이핑 세션 단위 Undo | P0 |
| UR-U-003 | 붙여넣기 Undo | 붙여넣기된 전체 텍스트 한 번에 제거 | P0 |
| UR-U-004 | Undo 후 Redo | Undo 취소, 원래 텍스트 복원 | P0 |
| UR-U-005 | Undo 후 새 입력 시 Redo 히스토리 | Redo 스택 초기화 | P0 |
| UR-U-006 | 100단계 Undo | 히스토리 깊이 한계 테스트 | P2 |
| UR-U-007 | 마크다운 서식 변경 Undo | 서식 적용 전 상태로 복원 | P1 |

### 2.7 대용량 문서 성능

| ID | 테스트 케이스 | 성능 기준 | 우선순위 |
|----|-------------|----------|---------|
| PF-ED-001 | 50,000자 문서 로딩 | < 1초 | P0 |
| PF-ED-002 | 50,000자 문서에서 타이핑 지연 | < 16ms (60fps 유지) | P0 |
| PF-ED-003 | 100개 단락 문서 스크롤 | 부드러운 스크롤 (jank 없음) | P1 |
| PF-ED-004 | 10,000자 붙여넣기 | < 500ms 처리 완료 | P1 |
| PF-ED-005 | 대용량 문서 + Inspector 열기 | Inspector 통계 계산 < 200ms | P1 |

### 2.8 다크 모드 렌더링

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| DM-001 | 라이트 -> 다크 전환 | 모든 시맨틱 토큰 정확히 전환 (500ms 애니메이션) | P0 |
| DM-002 | 다크 모드 에디터 배경 | `#1A1A1A` (`--surface-primary` dark) 정확 적용 | P0 |
| DM-003 | 다크 모드 활성/비활성 단락 | 활성 `#F5F5F5` (`--text-active` dark), 비활성 `#A3A3A3` (`--text-body` dark) | P0 |
| DM-004 | 다크 모드 코드 블록 | `--surface-code` 배경, 구문 색상 가독성 유지 | P1 |
| DM-005 | 다크 모드 인증서 | 디자인 토큰 기반 배경 + 테두리 색상 적용 | P1 |
| DM-006 | 시스템 설정 연동 | `prefers-color-scheme` 미디어 쿼리 반영 | P1 |
| DM-007 | 다크 모드 리뷰 배지 색상 | 다크 전용 색상 매핑 정확 적용 | P1 |

---

## 3. 타이핑 분석 / 인증 테스트

### 3.1 키스트로크 수집 정확성

#### Unit 테스트

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| KA-U-001 | keydown 이벤트 캡처 | 타임스탬프, keyCode, 위치 정확 기록 | P0 |
| KA-U-002 | keyup 이벤트 캡처 | 키 누름 지속 시간(dwell time) 계산 | P0 |
| KA-U-003 | 연속 키 간격(flight time) | 키 간 시간 간격 밀리초 단위 정확 | P0 |
| KA-U-004 | IME 입력 중 이벤트 | compositionstart/end 이벤트 정확 처리 | P0 |
| KA-U-005 | 수정 키 (Shift, Alt, Cmd) | 수정 키 조합 정확 기록 | P1 |
| KA-U-006 | 브라우저 탭 전환 중 키 이벤트 | 포커스 잃은 동안 이벤트 누락 감지 | P1 |
| KA-U-007 | 데이터 수집 버퍼 오버플로 | 100,000 이벤트 후에도 메모리 안정 | P1 |

#### 데이터 정합성 테스트

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| KA-D-001 | 최종 텍스트와 키스트로크 재구성 일치 | 키스트로크 로그 재생 시 동일 텍스트 생성 | P0 |
| KA-D-002 | 키스트로크 타임스탬프 단조 증가 | 시간 순서 보장 | P0 |
| KA-D-003 | 삭제 키 포함 재구성 | Backspace/Delete 반영 후 일치 | P0 |

### 3.2 타이핑 패턴 분석 알고리즘

| ID | 테스트 케이스 | 입력 | 기대 결과 | 우선순위 |
|----|-------------|------|----------|---------|
| TP-U-001 | WPM 계산 정확도 | 60초간 300자 입력 로그 | 60 WPM (허용 오차 +/-2) | P0 |
| TP-U-002 | 타이핑 리듬 일관성 점수 | 균일 간격 키스트로크 | 높은 일관성 점수 (>0.8) | P0 |
| TP-U-003 | 타이핑 리듬 불일관성 감지 | 갑자기 속도가 3배 증가하는 구간 | 이상 구간 플래그 | P0 |
| TP-U-004 | 편집 패턴 분석 | 빈번한 되돌아가기, 삽입 | 자연스러운 편집 패턴 인식 | P1 |
| TP-U-005 | 세션 내 피로도 곡선 | 장시간 타이핑 속도 변화 | 자연스러운 감소 패턴 인식 | P2 |
| TP-U-006 | 구간별 속도 분포 | 통계적 분포 계산 | 정규분포에 가까운 자연 패턴 | P1 |

### 3.3 복사/붙여넣기 탐지

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| CP-U-001 | `Cmd+V` 붙여넣기 감지 | paste 이벤트 정확 캡처, 붙여넣기 텍스트 길이 기록 | P0 |
| CP-U-002 | 컨텍스트 메뉴 붙여넣기 감지 | 동일하게 감지 | P0 |
| CP-U-003 | 드래그 앤 드롭 텍스트 감지 | drop 이벤트 캡처 | P1 |
| CP-U-004 | 소량 붙여넣기 (10자 미만) | 자연스러운 자기 복사로 분류 | P1 |
| CP-U-005 | 대량 붙여넣기 (500자 이상) | 외부 소스 복사로 플래그 | P0 |
| CP-U-006 | 전체 문서 붙여넣기 | 비인간 작성 의심 플래그 | P0 |
| CP-U-007 | 붙여넣기 비율 계산 | (붙여넣기 글자수 / 전체 글자수) 정확 산출 | P0 |

### 3.4 AI 생성 텍스트 탐지

| ID | 테스트 케이스 | 입력 | 기대 결과 | 우선순위 |
|----|-------------|------|----------|---------|
| AI-D-001 | 100% 인간 작성 텍스트 | 직접 타이핑한 에세이 | 인간 작성 판정 (신뢰도 > 0.9) | P0 |
| AI-D-002 | 100% GPT-4 생성 텍스트 | ChatGPT 출력 붙여넣기 | AI 생성 의심 플래그 | P0 |
| AI-D-003 | 혼합 텍스트 (50:50) | 절반 직접 작성 + 절반 AI | 부분 AI 사용 감지, 비율 추정 | P1 |
| AI-D-004 | AI 생성 후 수동 편집 | AI 텍스트를 사람이 다듬은 경우 | 편집 흔적 감지 + 원본 AI 의심 | P1 |
| AI-D-005 | 다국어 텍스트 (한국어) | 한국어 AI vs 인간 | 한국어 탐지 정확도 검증 | P1 |
| AI-D-006 | 기술 문서 (코드 포함) | 코드 스니펫 포함 글 | 코드 영역 제외하고 본문만 분석 | P2 |

### 3.5 인증서 발행 플로우 E2E

```
E2E 시나리오: CERT-E2E-001 "Happy Path - 인증서 발행 및 검증"

전제조건:
  - 사용자 로그인 상태
  - 에디터에 500자 이상 직접 타이핑한 문서 존재
  - 키스트로크 로그 수집 완료

Steps:
  1. 에디터에서 "Publish" 액션 트리거
     -> 기대: 오버레이 페이드인 (300ms) + 모달 등장 (350ms)
  2. 인증서 미리보기 확인
     -> 기대: 제목, 저자, 단어수, 날짜 정확 표시
  3. 검증 체크리스트 확인
     -> 기대: 3개 항목 순차 체크 애니메이션 (150ms 간격)
     -> 기대: "[v] AI 도구 미사용 확인"
     -> 기대: "[v] 작성 과정 타이핑 패턴 분석 완료"
     -> 기대: "[v] 문체 일관성 검증 통과"
  4. "인증서 발급 및 링크 생성" 버튼 클릭
     -> 기대: 로딩 스피너 (600ms~2s)
  5. 발급 완료
     -> 기대: 성공 화면, 공유 링크 표시
  6. 공유 링크로 검증 페이지 이동
     -> 기대: URL 형식 humanwrites.app/verify/{id}
     -> 기대: 인증서 카드 정확 렌더링
     -> 기대: 본문 미리보기 표시

E2E 시나리오: CERT-E2E-002 "인증 실패 - AI 사용 감지"

전제조건:
  - 에디터에 AI 생성 텍스트 붙여넣기

Steps:
  1. "Publish" 액션 트리거
     -> 기대: 모달 표시
  2. 검증 체크리스트 확인
     -> 기대: "[x] AI 도구 미사용 확인" 실패 표시
     -> 기대: 발행 버튼 비활성화 또는 경고 메시지
  3. 사용자에게 AI 사용 고지
     -> 기대: 인증서 등급 하향 또는 발행 불가 안내
```

### 3.6 인증서 검증 정확성

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| CV-001 | 유효한 인증서 ID로 접근 | 인증서 정보 + 글 본문 정확 표시 | P0 |
| CV-002 | 존재하지 않는 인증서 ID | 404 페이지 또는 "인증서를 찾을 수 없습니다" | P0 |
| CV-003 | 만료된 인증서 | 만료 상태 표시 + 발행 당시 정보 유지 | P1 |
| CV-004 | 인증서 통계 정확성 | 단어수, 편집 횟수, 소요 시간 = 실제 값 | P0 |
| CV-005 | 인증서 페이지 SEO 메타 태그 | og:title, og:description, og:image 정확 | P2 |
| CV-006 | 인증서 페이지 공유 미리보기 | SNS 공유 시 카드 미리보기 정확 | P2 |

### 3.7 인증서 위변조 방지

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| CT-S-001 | 인증서 데이터 서명 검증 | 디지털 서명 유효성 확인 | P0 |
| CT-S-002 | 인증서 데이터 변조 시도 | 서명 불일치 감지 -> "변조된 인증서" 경고 | P0 |
| CT-S-003 | 인증서 ID 추측 공격 | UUID v4 사용, 추측 불가 | P0 |
| CT-S-004 | 인증서 메타데이터 변조 | 단어수/날짜 변경 시 서명 무효화 | P0 |
| CT-S-005 | 타이핑 로그 사후 조작 | 로그 해시 불일치 감지 | P1 |

### 3.8 엣지 케이스

| ID | 시나리오 | 기대 결과 | 우선순위 |
|----|---------|----------|---------|
| EC-001 | 매우 빠른 타이핑 (200+ WPM) | 이상 속도 플래그, 봇 의심 경고 | P0 |
| EC-002 | 매우 느린 타이핑 (5 WPM 미만) | 정상 처리 (사고하며 작성) | P1 |
| EC-003 | 음성 입력 (Speech-to-Text) | 타이핑 패턴 없음 감지, 별도 분류 | P1 |
| EC-004 | 자동 완성/자동 수정 사용 | IME 자동 완성 구간 식별 | P1 |
| EC-005 | 외부 에디터에서 복사 후 수정 | 초기 붙여넣기 + 이후 편집 패턴 기록 | P0 |
| EC-006 | 장시간 세션 (4시간 이상) | 메모리 누수 없음, 키스트로크 버퍼 안정 | P1 |
| EC-007 | 네트워크 끊김 중 타이핑 | 로컬 버퍼 보존, 재연결 시 동기화 | P0 |
| EC-008 | 브라우저 크래시 후 복구 | 마지막 저장 지점 + 미저장 키스트로크 복구 | P0 |
| EC-009 | 매크로/오토핫키 사용 | 일정 간격 타이핑 패턴 감지 | P1 |
| EC-010 | 여러 디바이스에서 동시 편집 | 충돌 해결 또는 단일 세션 강제 | P1 |

---

## 4. AI 어시스트 테스트

### 4.1 맞춤법 검사 정확도

| ID | 테스트 케이스 | 입력 | 기대 결과 | 우선순위 |
|----|-------------|------|----------|---------|
| SP-001 | 일반적인 오타 감지 | "teh" -> "the" | wavy 밑줄 + 수정 제안 | P0 |
| SP-002 | 고유명사 오인 방지 | "GitHub", "iPhone" | 오류로 표시하지 않음 | P0 |
| SP-003 | 한국어 맞춤법 | "되"/"돼" 구분 | 올바른 교정 제안 | P0 |
| SP-004 | 문법 오류 감지 | "I goes to school" | 문법 경고 표시 | P1 |
| SP-005 | 의도적 비표준 표현 | 시적 표현, 신조어 | False positive 최소화 | P2 |
| SP-006 | 빈 텍스트 | 빈 문서 | 오류 없음 | P0 |
| SP-007 | 코드 블록 내 텍스트 | `function myFunc()` | 코드 블록 검사 제외 | P0 |

### 4.2 팩트 체크 결과 검증 [Post-MVP]

> **Note**: 팩트 체크는 Post-MVP (Iter 3) 기능입니다. MVP에서는 맞춤법/문법 검사만 포함됩니다.

| ID | 테스트 케이스 | 입력 | 기대 결과 | 우선순위 |
|----|-------------|------|----------|---------|
| FC-001 | [Post-MVP] 명백한 사실 오류 | "지구는 태양계에서 가장 큰 행성이다" | 팩트 체크 경고 + 교정 소스 링크 | P0 |
| FC-002 | [Post-MVP] 정확한 사실 | "물의 화학식은 H2O이다" | 경고 없음 | P0 |
| FC-003 | [Post-MVP] 의견/주장 텍스트 | "이것이 최고의 방법이다" | 사실 확인 불가 표시 (경고 아님) | P1 |
| FC-004 | [Post-MVP] 모호한 수치 | "약 100만 명이 참석했다" | 검증 가능한 경우에만 플래그 | P2 |
| FC-005 | [Post-MVP] 출처 링크 유효성 | 팩트 체크 출처 URL | 링크 접근 가능 + 관련 내용 포함 | P1 |

### 4.3 스타일 제안 품질 [Post-MVP]

> **Note**: 스타일 제안은 Post-MVP (Iter 3) 기능입니다. MVP에서는 맞춤법/문법 검사만 포함됩니다.

| ID | 테스트 케이스 | 입력 | 기대 결과 | 우선순위 |
|----|-------------|------|----------|---------|
| ST-001 | [Post-MVP] 과도하게 긴 문장 | 80단어 이상 단일 문장 | "문장 분리 제안" dashed 밑줄 | P1 |
| ST-002 | [Post-MVP] 수동태 과다 사용 | 연속 3문장 수동태 | 능동태 전환 제안 | P2 |
| ST-003 | [Post-MVP] 반복 단어 감지 | 같은 단어 한 단락 내 5회 | 동의어 제안 | P1 |
| ST-004 | [Post-MVP] 가독성 점수 | Flesch-Kincaid 계산 | Inspector에 가독성 레벨 표시 | P2 |

### 4.4 AI 요약 품질 [Post-MVP]

> **Note**: AI 요약은 Post-MVP (Iter 3) 기능입니다. MVP에서는 맞춤법/문법 검사만 포함됩니다.

| ID | 테스트 케이스 | 입력 | 기대 결과 | 우선순위 |
|----|-------------|------|----------|---------|
| AS-001 | [Post-MVP] 500자 에세이 요약 | 일반 에세이 | 2~3문장 핵심 요약, 주제 포함 | P1 |
| AS-002 | [Post-MVP] 매우 짧은 텍스트 (50자 미만) | 짧은 메모 | "요약할 내용이 부족합니다" 메시지 | P1 |
| AS-003 | [Post-MVP] 다국어 혼합 텍스트 | 한영 혼합 | 주요 언어로 요약 생성 | P2 |
| AS-004 | [Post-MVP] 요약 위치 | Inspector 하단 | AI Summary 섹션에 정확 표시 | P0 |

### 4.5 AI 서비스 장애 시 Graceful Degradation

| ID | 테스트 케이스 | 조건 | 기대 결과 | 우선순위 |
|----|-------------|------|----------|---------|
| GD-001 | AI API 완전 다운 | 500 응답 | 에디터 정상 동작, AI 기능 비활성 표시 | P0 |
| GD-002 | AI API 타임아웃 (10초) | 응답 지연 | 로딩 인디케이터 -> 타임아웃 메시지 | P0 |
| GD-003 | 부분 API 장애 (맞춤법만 다운) | 개별 서비스 장애 | 다른 AI 기능은 정상 동작 | P1 |
| GD-004 | API 키 만료/무효 | 401 응답 | 설정에서 API 키 재입력 안내 | P0 |
| GD-005 | Rate Limit 도달 | 429 응답 | 재시도 대기 안내 + 에디터 정상 동작 | P0 |
| GD-006 | 네트워크 오프라인 | fetch 실패 | 오프라인 모드 전환, 저장된 결과 표시 | P0 |

### 4.6 AI API 응답 지연 시 UX

| ID | 시나리오 | 기대 UX | 우선순위 |
|----|---------|---------|---------|
| DL-001 | 응답 < 500ms | 즉시 결과 표시, 로딩 인디케이터 없음 | P0 |
| DL-002 | 응답 500ms~2초 | 미세한 로딩 인디케이터 (opacity 낮은 pulse) | P1 |
| DL-003 | 응답 2초~10초 | 명확한 로딩 상태 + "분석 중..." 텍스트 | P0 |
| DL-004 | 응답 > 10초 | 타임아웃 + 재시도 버튼 | P0 |
| DL-005 | 타이핑 중 응답 도착 | debounce 존중, 타이핑 방해 없이 조용히 반영 | P0 |

---

## 5. 보안 테스트

### 5.1 XSS 방지 테스트 (에디터 콘텐츠)

| ID | 공격 벡터 | 입력 | 기대 결과 | 우선순위 |
|----|----------|------|----------|---------|
| XSS-001 | 에디터 텍스트 입력 | `<script>alert('xss')</script>` | 텍스트로 렌더링, 스크립트 미실행 | P0 |
| XSS-002 | 마크다운 링크 | `[click](javascript:alert(1))` | javascript: 프로토콜 차단 | P0 |
| XSS-003 | 마크다운 이미지 | `![img](x onerror=alert(1))` | onerror 핸들러 제거 | P0 |
| XSS-004 | 인증서 제목 | `<img src=x onerror=alert(1)>` | HTML 이스케이프 처리 | P0 |
| XSS-005 | 인증서 검증 페이지 URL 파라미터 | `?id=<script>` | URL 파라미터 새니타이즈 | P0 |
| XSS-006 | Inspector AI 요약 표시 | AI가 HTML 포함 응답 반환 | HTML 이스케이프 후 표시 | P0 |
| XSS-007 | 설정 입력 필드 (API Key) | `"><script>alert(1)</script>` | 이스케이프 처리 | P0 |
| XSS-008 | Stored XSS via 문서 저장 | 악성 콘텐츠 저장 후 재로딩 | 재로딩 시에도 실행 차단 | P0 |
| XSS-009 | DOM Clobbering | `<form id=document>` | DOM 요소 충돌 방지 | P1 |
| XSS-010 | SVG 기반 XSS | `<svg onload=alert(1)>` | SVG 이벤트 핸들러 제거 | P0 |

### 5.2 CSRF 방지 테스트

> **전략**: REST API + HttpOnly Cookie JWT 구조에서 Spring Security CSRF 토큰은 비활성화하고, SameSite=Lax 쿠키 정책 + Origin 헤더 검증으로 CSRF를 방지한다. (OAuth 리다이렉트 호환을 위해 SameSite=Lax 채택)

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| CSRF-001 | Cross-origin POST 요청 차단 (SameSite=Lax) | 다른 도메인에서의 POST/PUT/DELETE 요청 시 쿠키 미전송으로 401 Unauthorized | P0 |
| CSRF-002 | Origin 헤더 검증 | 허용되지 않은 Origin에서의 요청 -> 차단 (CORS preflight 실패) | P0 |
| CSRF-003 | SameSite=Lax 쿠키 속성 확인 | 모든 인증 쿠키(JWT)에 `SameSite=Lax; Secure; HttpOnly` 속성 설정 검증 | P0 |
| CSRF-004 | 인증서 발행 API cross-origin 차단 | 외부 도메인에서 인증서 발행 POST 요청 시 SameSite=Lax 정책으로 쿠키 미전송 -> 401 | P0 |

### 5.3 인증/인가 테스트

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| AUTH-001 | 미인증 사용자 에디터 접근 | 로그인 페이지 리다이렉트 | P0 |
| AUTH-002 | 다른 사용자 문서 접근 시도 | 403 Forbidden | P0 |
| AUTH-003 | 다른 사용자 인증서 발행 시도 | 403 Forbidden | P0 |
| AUTH-004 | 만료된 세션으로 API 호출 | 401 + 재로그인 안내 | P0 |
| AUTH-005 | 인증서 검증 페이지 (공개) | 인증 불필요, 누구나 접근 가능 | P0 |
| AUTH-006 | JWT 토큰 변조 | 서명 검증 실패 -> 401 | P0 |
| AUTH-007 | Refresh Token 탈취 시나리오 | Token Rotation으로 이전 토큰 무효화 | P1 |

### 5.4 타이핑 데이터 암호화 검증

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| ENC-001 | 키스트로크 전송 시 암호화 | HTTPS(TLS 1.3) 전송, 평문 전송 차단 | P0 |
| ENC-002 | 키스트로크 로컬 저장 암호화 | IndexedDB/LocalStorage 암호화 저장 | P0 |
| ENC-003 | 키스트로크 서버 저장 암호화 | AES-256 at-rest 암호화 | P0 |
| ENC-004 | 개인 타이핑 패턴 비식별화 | 분석 후 원본 키스트로크 삭제 또는 익명화 | P0 |
| ENC-005 | 키 입력 내용 vs 패턴 분리 | 패턴 데이터에 실제 입력 문자 미포함 | P0 |

### 5.5 인증서 무결성 테스트

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| INT-001 | 인증서 해시 검증 | SHA-256 해시 일치 확인 | P0 |
| INT-002 | 인증서 발행 후 원본 수정 시 | 인증서 무효화 또는 "수정됨" 표시 | P0 |
| INT-003 | 인증서 JSON 데이터 직접 수정 | 서명 검증 실패 | P0 |
| INT-004 | 인증서 체이닝 (블록체인 유사) | 이전 인증서와의 연결 무결성 | P2 |

### 5.6 API Rate Limiting 테스트

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| RL-001 | 일반 사용 패턴 | Rate limit에 걸리지 않음 | P0 |
| RL-002 | 분당 100회 API 호출 | 429 Too Many Requests + Retry-After 헤더 | P0 |
| RL-003 | 인증서 발행 무차별 시도 | 시간당 최대 10회 제한 | P0 |
| RL-004 | AI API 과다 호출 | 사용자당 일일 한도 적용 | P1 |
| RL-005 | Rate limit 후 복구 | 제한 시간 후 정상 이용 가능 | P0 |

---

## 6. 성능 테스트

### 6.1 에디터 타이핑 지연 벤치마크

| 메트릭 | 목표 | 측정 방법 | 우선순위 |
|--------|------|----------|---------|
| Input Latency (키 입력 -> 화면 반영) | < 16ms (P95) | `PerformanceObserver` + `Event.timeStamp` | P0 |
| First Input Delay (FID) | < 100ms | Lighthouse / Web Vitals | P0 |
| Interaction to Next Paint (INP) | < 200ms | Web Vitals API | P0 |
| 커서 이동 지연 | < 8ms | 화살표 키 입력 -> 커서 위치 변경 | P0 |
| 선택 영역 렌더링 | < 16ms | 드래그 선택 -> 하이라이트 표시 | P1 |

```javascript
// 성능 벤치마크 테스트 예시
test('typing latency should be under 16ms at P95', async ({ page }) => {
  const latencies = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await page.keyboard.type('a');
    await page.waitForSelector('.editor-content:has-text("a")');
    latencies.push(performance.now() - start);
  }
  const p95 = percentile(latencies, 95);
  expect(p95).toBeLessThan(16);
});
```

### 6.2 타이핑 분석의 메인 스레드 영향

| 메트릭 | 목표 | 측정 방법 | 우선순위 |
|--------|------|----------|---------|
| Long Task (>50ms) 발생 빈도 | 0회 (타이핑 중) | `PerformanceObserver('longtask')` | P0 |
| 키스트로크 수집 오버헤드 | < 1ms per keystroke | `performance.mark()` 측정 | P0 |
| 분석 알고리즘 실행 시간 | < 50ms (Web Worker 내) | Worker postMessage 라운드트립 | P1 |
| 메인 스레드 블로킹 | 0ms (분석은 Worker에서) | `navigator.scheduling.isInputPending()` | P0 |

```
아키텍처 검증:
  - 키스트로크 수집: 메인 스레드 (경량 이벤트 리스너)
  - 패턴 분석: Web Worker (메인 스레드 분리)
  - 결과 저장: IndexedDB (비동기)
  - AI API 호출: Web Worker 또는 Service Worker
```

### 6.3 동시 사용자 부하 테스트 (k6)

```javascript
// k6 부하 테스트 시나리오
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Steady state
    { duration: '2m', target: 500 },   // Peak load
    { duration: '5m', target: 500 },   // Sustained peak
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};
```

| 시나리오 | 동시 사용자 | 목표 | 우선순위 |
|---------|-----------|------|---------|
| 에디터 자동 저장 API | 100 | P95 < 200ms | P0 |
| 인증서 발행 API | 50 | P95 < 2초 | P0 |
| 인증서 검증 페이지 | 500 | P95 < 500ms | P0 |
| AI 분석 API | 100 | P95 < 5초 | P1 |
| 동시 키스트로크 동기화 | 100 | 데이터 유실 0% | P0 |

### 6.4 대용량 문서 렌더링 성능

| 문서 크기 | FCP | LCP | TTI | 메모리 | 우선순위 |
|----------|-----|-----|-----|--------|---------|
| 1,000자 | < 0.5s | < 1s | < 1s | < 50MB | P0 |
| 10,000자 | < 1s | < 1.5s | < 2s | < 100MB | P0 |
| 50,000자 | < 2s | < 3s | < 4s | < 200MB | P1 |
| 100,000자 | < 3s | < 5s | < 6s | < 400MB | P2 |

### 6.5 스크린 레코딩 시 성능 영향 [Post-MVP]

| 조건 | 추가 CPU 사용률 | 추가 메모리 | FPS 영향 |
|------|---------------|-----------|---------|
| 레코딩 OFF | 기준 | 기준 | 60fps |
| 레코딩 ON (720p) | < +15% | < +100MB | > 55fps |
| 레코딩 ON (1080p) | < +25% | < +200MB | > 50fps |

### 6.6 API 응답 시간 벤치마크

| API Endpoint | P50 | P95 | P99 | 우선순위 |
|-------------|-----|-----|-----|---------|
| `POST /api/documents/save` | < 50ms | < 200ms | < 500ms | P0 |
| `POST /api/certificates/issue` | < 500ms | < 2s | < 5s | P0 |
| `GET /api/certificates/{id}` | < 50ms | < 100ms | < 200ms | P0 |
| `POST /api/ai/spelling` | < 200ms | < 1s | < 3s | P1 |
| `POST /api/ai/fact-check` | < 1s | < 3s | < 5s | P1 |
| `POST /api/ai/summary` | < 500ms | < 2s | < 5s | P1 |
| `POST /api/keystroke/analyze` | < 200ms | < 1s | < 3s | P0 |

---

## 7. 접근성 테스트

### 7.1 스크린 리더 호환성

| ID | 테스트 케이스 | 스크린 리더 | 기대 결과 | 우선순위 |
|----|-------------|-----------|----------|---------|
| SR-001 | 에디터 영역 식별 | VoiceOver/NVDA | "텍스트 에디터, main" 안내 | P0 |
| SR-002 | 문서 제목 읽기 | VoiceOver/NVDA | "Heading level 1, The Art of Simplicity" | P0 |
| SR-003 | 활성 단락 표시 | VoiceOver/NVDA | `aria-current="true"` 인식 | P1 |
| SR-004 | Inspector 상태 안내 | VoiceOver/NVDA | `aria-hidden` 토글에 따른 접근성 트리 반영 | P0 |
| SR-005 | 리뷰 아이템 실시간 알림 | VoiceOver/NVDA | `aria-live="polite"` 영역에서 새 리뷰 안내 | P1 |
| SR-006 | 인증서 모달 안내 | VoiceOver/NVDA | `aria-modal="true"`, 역할 "dialog" 인식 | P0 |
| SR-007 | 리뷰 배지 상태 읽기 | VoiceOver/NVDA | "맞춤법 경고: Possible typo detected" | P1 |
| SR-008 | 설정 네비게이션 | VoiceOver/NVDA | 현재 활성 탭 식별 가능 | P1 |

### 7.2 키보드 네비게이션

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| KN-001 | Tab 순서 일관성 | 논리적 순서로 모든 인터랙티브 요소 순회 | P0 |
| KN-002 | 포커스 가시성 | 모든 포커스 가능 요소에 명확한 포커스 링 | P0 |
| KN-003 | 모달 포커스 트랩 | 모달 내부에서만 Tab 순환 | P0 |
| KN-004 | Escape로 모달 닫기 | 닫기 후 트리거 요소로 포커스 복원 | P0 |
| KN-005 | Inspector 내 Tab 네비게이션 | 리뷰 아이템 간 Tab 이동 | P1 |
| KN-006 | Inspector 리뷰 아이템 Enter | 에디터 해당 위치로 이동 + 포커스 | P1 |
| KN-007 | 에디터와 Inspector 간 전환 | Cmd+I로 포커스 컨텍스트 전환 | P1 |
| KN-008 | Skip-to-content 링크 | 첫 Tab에서 "본문으로 건너뛰기" 링크 | P1 |

### 7.3 색상 대비 (라이트/다크 모드)

| ID | 요소 | 현재 대비비 | WCAG AA 기준 | 판정 | 조치 |
|----|------|-----------|-------------|------|------|
| CC-001 | 활성 본문 (Light) | 21:1 | 4.5:1 | PASS | - |
| CC-002 | 비활성 본문 (Light) | 3.54:1 | 4.5:1 | FAIL | `#767676` 변경 (4.54:1) |
| CC-003 | Inspector 라벨 (Light) | 3.40:1 | 4.5:1 | FAIL | `#6B6B6B` 변경 (4.89:1) |
| CC-004 | 메타 정보 (Light) | 2.32:1 | 4.5:1 | FAIL | `#767676` 변경 |
| CC-005 | 활성 본문 (Dark) | 14.7:1 | 4.5:1 | PASS | - |
| CC-006 | 비활성 본문 (Dark) | 3.13:1 | 4.5:1 | FAIL | `#737373` 변경 (4.56:1) |
| CC-007 | Spelling 배지 | 5.03:1 | 4.5:1 | PASS | - |
| CC-008 | Fact Check 배지 | 5.87:1 | 4.5:1 | PASS | - |
| CC-009 | Style 배지 | 5.14:1 | 4.5:1 | PASS | - |
| CC-010 | CTA 버튼 (Light) | 21:1 | 4.5:1 | PASS | - |
| CC-011 | CTA 버튼 (Dark) | 21:1 | 4.5:1 | PASS | - |

**자동화**: `axe-core`의 `color-contrast` 룰을 Playwright 테스트에 통합하여 매 빌드 검사

```javascript
// Playwright + axe-core 색상 대비 자동 테스트
test('should pass color contrast checks', async ({ page }) => {
  await page.goto('/editor');
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### 7.4 WCAG 2.1 AA 준수 체크리스트

| 기준 | 설명 | 테스트 방법 | 우선순위 |
|------|------|-----------|---------|
| 1.1.1 Non-text Content | 모든 이미지에 alt 텍스트 | axe-core `image-alt` | P0 |
| 1.3.1 Info and Relationships | 시맨틱 마크업 | axe-core `aria-roles` | P0 |
| 1.4.3 Contrast (Minimum) | 4.5:1 텍스트 대비 | axe-core `color-contrast` | P0 |
| 1.4.11 Non-text Contrast | 3:1 UI 요소 대비 | 수동 검사 + 도구 | P0 |
| 2.1.1 Keyboard | 모든 기능 키보드 접근 | 수동 키보드 테스트 | P0 |
| 2.1.2 No Keyboard Trap | 포커스 트랩 없음 (모달 제외) | 수동 테스트 | P0 |
| 2.4.3 Focus Order | 논리적 포커스 순서 | Tab 순서 수동 검증 | P0 |
| 2.4.7 Focus Visible | 포커스 인디케이터 표시 | 비주얼 검사 | P0 |
| 2.5.3 Label in Name | 접근 가능한 이름 = 시각적 라벨 | axe-core `label` | P1 |
| 3.2.1 On Focus | 포커스 시 컨텍스트 변경 없음 | 수동 테스트 | P1 |
| 4.1.2 Name, Role, Value | 모든 UI에 접근 가능한 이름/역할 | axe-core 전체 스캔 | P0 |

### 7.5 모션 접근성

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| MA-001 | `prefers-reduced-motion: reduce` 설정 | 모든 애니메이션 비활성화 | P0 |
| MA-002 | Inspector 슬라이드 (reduced motion) | 즉시 표시/숨김 | P0 |
| MA-003 | 인증서 체크 순차 등장 (reduced motion) | 즉시 모두 표시 | P1 |
| MA-004 | 테마 전환 (reduced motion) | 즉시 전환 (crossfade 없음) | P1 |

---

## 8. 멀티플랫폼 테스트

### 8.1 크로스 브라우저 테스트 전략

#### 지원 브라우저 매트릭스

| 브라우저 | 최소 버전 | 테스트 레벨 | 우선순위 |
|---------|----------|-----------|---------|
| Chrome | 최신 2 버전 | Full E2E | P0 |
| Firefox | 최신 2 버전 | Full E2E | P0 |
| Safari | 최신 2 버전 | Full E2E | P0 |
| Edge | 최신 2 버전 | Smoke E2E | P1 |
| Samsung Internet | 최신 | Smoke E2E | P2 |
| iOS Safari | iOS 16+ | Core E2E | P0 |
| Chrome Android | 최신 | Core E2E | P1 |

#### Playwright 프로젝트 설정

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
    { name: 'tablet', use: { ...devices['iPad Pro 11'] } },
  ],
});
```

#### 브라우저별 주의 사항

| 브라우저 | 주요 리스크 | 테스트 포커스 |
|---------|-----------|-------------|
| Safari | IME 입력 처리 차이, IndexedDB 제한 | 한글 입력, 로컬 저장 |
| Firefox | contenteditable 동작 차이 | 에디터 텍스트 입력 |
| iOS Safari | 가상 키보드, viewport 변화 | 키보드 올라올 때 레이아웃 |
| Edge | Chromium 기반이지만 일부 API 차이 | 기본 기능 Smoke 테스트 |

### 8.2 데스크톱 앱 테스트 (Tauri) [Post-MVP]

> **Note**: 데스크톱 앱은 Post-MVP 기능입니다. MVP는 Desktop 브라우저(1440px+) 전용입니다.

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| DT-001 | [Post-MVP] 앱 설치 및 실행 | 정상 실행 + 초기 화면 로드 | P0 |
| DT-002 | [Post-MVP] 오프라인 에디터 사용 | 네트워크 없이 편집 + 로컬 저장 | P0 |
| DT-003 | [Post-MVP] 파일 시스템 저장/불러오기 | 로컬 파일로 저장 + 열기 | P0 |
| DT-004 | [Post-MVP] 자동 업데이트 | 새 버전 감지 + 업데이트 프롬프트 | P1 |
| DT-005 | [Post-MVP] 시스템 트레이 아이콘 | 최소화 시 트레이로 이동 | P2 |
| DT-006 | [Post-MVP] OS별 네이티브 메뉴 | 파일/편집/보기 메뉴 정상 동작 | P1 |
| DT-007 | [Post-MVP] 다중 윈도우 | 여러 문서 동시 편집 | P2 |

### 8.3 모바일 앱 테스트 [Post-MVP]

> **Note**: 모바일 앱(Capacitor)은 Post-MVP 기능입니다. MVP는 Desktop 브라우저(1440px+) 전용입니다.

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| MB-001 | [Post-MVP] 터치 기반 텍스트 편집 | 탭으로 커서 위치 지정 + 가상 키보드 표시 | P0 |
| MB-002 | [Post-MVP] 가상 키보드와 레이아웃 | 에디터 영역 키보드 위로 스크롤 | P0 |
| MB-003 | [Post-MVP] 텍스트 선택 (롱프레스) | 네이티브 선택 UI + 복사/붙여넣기 메뉴 | P0 |
| MB-004 | [Post-MVP] Inspector (모바일) | 바텀 시트 또는 풀스크린 전환 | P0 |
| MB-005 | [Post-MVP] 인증서 모달 (모바일) | 풀스크린 모달 | P0 |
| MB-006 | [Post-MVP] 세로/가로 방향 전환 | 레이아웃 정상 재배치 | P1 |
| MB-007 | [Post-MVP] 제스처 (스와이프) | Inspector 열기/닫기 스와이프 | P2 |
| MB-008 | [Post-MVP] 다크 모드 (시스템 연동) | OS 다크 모드 설정 반영 | P1 |

### 8.4 VS Code Extension 테스트 [Post-MVP]

> **Note**: VS Code Extension은 Post-MVP 기능입니다. MVP는 웹 브라우저 전용입니다.

| ID | 테스트 케이스 | 기대 결과 | 우선순위 |
|----|-------------|----------|---------|
| VSC-001 | [Post-MVP] Extension 설치/활성화 | 마켓플레이스 설치 + 명령 팔레트 등록 | P0 |
| VSC-002 | [Post-MVP] 에디터 내 인라인 피드백 | VS Code Diagnostics API 연동 | P0 |
| VSC-003 | [Post-MVP] 사이드바 Inspector | VS Code Webview Panel | P0 |
| VSC-004 | [Post-MVP] 키스트로크 수집 | VS Code 에디터 이벤트 캡처 | P0 |
| VSC-005 | [Post-MVP] 인증서 발행 커맨드 | 명령 팔레트에서 발행 플로우 실행 | P1 |
| VSC-006 | [Post-MVP] 다른 Extension과의 충돌 | Prettier, ESLint 등과 공존 | P1 |
| VSC-007 | [Post-MVP] VS Code 버전 호환성 | 최신 3 버전 지원 | P1 |

---

## 9. CI/CD 통합

### 9.1 Pre-commit 훅

```yaml
# .husky/pre-commit
#!/bin/sh

# 1. Lint (변경 파일만)
npx lint-staged

# 2. Type Check (변경 파일 관련)
npx tsc --noEmit --incremental

# 3. Unit 테스트 (관련 테스트만)
npx vitest related --run
```

```json
// lint-staged.config.js
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.css": ["stylelint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

### 9.2 PR 자동 테스트

```yaml
# .github/workflows/pr-check.yml
name: PR Quality Gate

on:
  pull_request:
    branches: [main, develop]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit -- --coverage
      - name: Coverage Gate
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:integration

  e2e-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps ${{ matrix.browser }}
      - run: pnpm test:e2e --project=${{ matrix.browser }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/

  accessibility-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install chromium
      - run: pnpm test:a11y

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsc --noEmit

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm audit --audit-level=high
```

### 9.3 스테이징 환경 자동 배포 및 E2E

```yaml
# .github/workflows/staging-deploy.yml
name: Staging Deploy + E2E

on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    outputs:
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - id: deploy
        run: |
          URL=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$URL" >> $GITHUB_OUTPUT

  e2e-staging:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: |
          BASE_URL=${{ needs.deploy-staging.outputs.url }} \
          pnpm test:e2e:staging
      - name: Performance Audit
        run: |
          npx lhci autorun \
            --collect.url=${{ needs.deploy-staging.outputs.url }} \
            --assert.assertions.first-contentful-paint=error:2000 \
            --assert.assertions.largest-contentful-paint=error:3000 \
            --assert.assertions.cumulative-layout-shift=error:0.1
```

### 9.4 성능 리그레션 탐지

```yaml
# .github/workflows/performance.yml
name: Performance Regression

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install && pnpm build
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: ./lighthouserc.json
          uploadArtifacts: true
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm preview",
      "url": [
        "http://localhost:4173/",
        "http://localhost:4173/editor",
        "http://localhost:4173/verify/sample-cert-id"
      ]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interactive": ["error", { "maxNumericValue": 4000 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**번들 사이즈 모니터링**:

```yaml
# size-limit 설정
# .size-limit.json
[
  { "path": "dist/assets/editor-*.js", "limit": "150 KB" },
  { "path": "dist/assets/certificate-*.js", "limit": "50 KB" },
  { "path": "dist/assets/ai-*.js", "limit": "30 KB" },
  { "path": "dist/assets/index-*.css", "limit": "30 KB" }
]
```

---

## 10. 개발 중 검증 계획

### 10.1 주차별 QA 체크포인트 (2-Phase / 10-Week MVP)

#### Phase 1: 코어 에디터 (Week 1~5)

| Week | 기능 | QA 체크포인트 | 자동화 |
|------|------|-------------|--------|
| Week 1 | 프로젝트 셋업 (Turborepo, Spring Boot, Docker Compose, CI) | 빌드 파이프라인 검증, Docker Compose(PG+TimescaleDB, Redis) 기동 확인, CI 워크플로우 Green | GitHub Actions |
| Week 2 | 에디터 코어 (TipTap, 텍스트 입력, 마크다운 파싱) | ED-U-001~010, MD-U-001~012, UR-U-001~005 Unit 테스트 완료 | Vitest |
| Week 3 | 에디터 UX (단락 포커스, Focus Mode Soft, Light/Dark, 단축키) | ED-I-001~002, DM-001~007, FM-U-001/003~005, KS-001~010 통합/E2E 테스트 | Testing Library + Playwright |
| Week 4 | Inspector + 통계 (단어수, 단락수, 읽기시간, 자동저장) | ED-I-003~004, PF-ED-001~005, SR-004~005, KN-005~007 | Vitest + Playwright |
| Week 5 | 키스트로크 수집 + 파일럿 (Layer 1 임계값 교정) | KA-U-001~007, KA-D-001~003, TP-U-001~006, 메인 스레드 영향 측정, 파일럿 데이터 수집 | Vitest + Performance API |
| Phase 1 End | **통합 QA** | 에디터 전체 E2E 시나리오 (5개), 접근성 axe-core 스캔, 성능 벤치마크 기준선 설정 | All |

#### Phase 2: 인증 + AI + 통합 (Week 6~10)

| Week | 기능 | QA 체크포인트 | 자동화 |
|------|------|-------------|--------|
| Week 6 | 백엔드 API + Auth (Spring Security, Google OAuth, JWT) | AUTH-001~007, RL-001~005, CSRF 테스트, API Key 보안 | Kotest + Testcontainers |
| Week 7 | OpenAPI + 인증 알고리즘 (Layer 1 점수 산출, Certified/Not Certified) | CP-U-001~007, AI-D-001~006, 복사/붙여넣기 탐지, orval 자동 생성 검증 | Vitest + Kotest |
| Week 8 | 인증서 + 검증 페이지 (Ed25519 서명, 발행 모달, 공개 검증) | CERT-E2E-001~002, CT-S-001~005, CV-001~006, INT-001~003 | Playwright + Kotest |
| Week 9 | AI 맞춤법 (인라인 밑줄, Inspector 연동, Graceful Degradation) | SP-001~007, GD-001~006, DL-001~005, XSS-001~010 보안 테스트 | MSW + Playwright |
| Week 10 | 통합 테스트 + 릴리스 준비 (전체 플로우, 크로스 브라우저, 성능) | CF-001~004, 전체 E2E 스위트, 크로스 브라우저 3종, 접근성 전체 스캔, 보안 감사, 부하 테스트 (k6), 성능 리포트 | All |
| Phase 2 End | **릴리스 QA** | 전체 E2E 스위트, 크로스 브라우저, 접근성 전체 스캔, 보안 감사, 성능 리포트, 번들 사이즈 체크 | All |

### 10.2 에이전트 팀 개발 시 작업 결과 검증

#### 에이전트별 검증 게이트

| 에이전트 역할 | 산출물 | 자동 검증 | 수동 검증 |
|-------------|--------|----------|----------|
| **executor** (기능 구현) | 소스 코드 | `tsc --noEmit` + `vitest related` + `eslint` | 코드 리뷰 (architect) |
| **designer** (UI 구현) | 컴포넌트 코드 | Storybook 스냅샷 + axe-core + 비주얼 리그레션 | 디자인 시스템 준수 검토 |
| **architect** (설계 검증) | 설계 문서/코드 리뷰 | 의존성 순환 검사, 번들 사이즈 체크 | 설계 원칙 준수 |
| **qa-tester** (테스트 작성) | 테스트 코드 | 테스트 실행 + 커버리지 측정 | 테스트 품질 리뷰 |
| **security-reviewer** (보안 검토) | 보안 리포트 | `pnpm audit` + 정적 분석 | 수동 취약점 검토 |

#### 에이전트 작업 완료 조건 (Definition of Done)

```
모든 에이전트 작업에 적용되는 완료 조건:

1. [필수] TypeScript 컴파일 에러 0건
2. [필수] ESLint 에러 0건 (경고 허용, 상한선 있음)
3. [필수] 관련 Unit 테스트 추가 또는 업데이트
4. [필수] 관련 Unit 테스트 통과율 100%
5. [필수] 전체 테스트 스위트 통과율 100%
6. [필수] 커버리지 80% 이상 유지 (신규 코드)
7. [조건부] UI 변경 시: axe-core 접근성 검사 통과
8. [조건부] API 변경 시: 통합 테스트 추가
9. [조건부] 사용자 플로우 변경 시: E2E 테스트 추가/업데이트
10. [조건부] 보안 관련 변경 시: 보안 리뷰어 승인
```

#### 통합 검증 파이프라인

```
에이전트 작업 완료
  |
  v
[자동] Pre-merge 검증
  ├── tsc --noEmit
  ├── eslint
  ├── vitest (전체)
  ├── playwright (크리티컬 E2E)
  └── axe-core (접근성)
  |
  v
[자동] 결과 판정
  ├── 모두 통과 -> Merge 가능
  └── 실패 -> 에이전트에게 수정 요청
  |
  v
[자동] Post-merge 검증
  ├── 스테이징 배포
  ├── E2E 전체 스위트
  ├── Lighthouse 성능 측정
  └── 번들 사이즈 체크
  |
  v
[수동] QA 리드 최종 확인 (주 1회)
  ├── 탐색적 테스트
  ├── 크로스 브라우저 스팟 체크
  └── 사용자 시나리오 워크스루
```

### 10.3 통합 테스트 시점 및 방법

#### 통합 시점

| 시점 | 트리거 | 실행 범위 | 소요 시간 |
|------|--------|----------|----------|
| 매 커밋 | Pre-commit 훅 | 관련 Unit + Type Check | < 30초 |
| 매 PR | GitHub Actions | Unit + Integration + E2E (크리티컬) | < 5분 |
| develop 머지 | GitHub Actions | 전체 E2E + 스테이징 배포 | < 15분 |
| 주 1회 (수요일) | 스케줄 | 전체 E2E + 성능 + 접근성 + 보안 | < 30분 |
| 릴리스 전 | 수동 트리거 | 전체 스위트 + 크로스 브라우저 + 부하 | < 2시간 |

#### 통합 방법

**1. 컴포넌트 통합 (Bottom-Up)**

```
Phase 1: Atoms 단위 테스트
  Text, Icon, Badge, Button, Toggle -> Storybook + Unit

Phase 2: Molecules 통합 테스트
  StatItem, ReviewItem, NavItem -> 컴포넌트 조합 테스트

Phase 3: Organisms 통합 테스트
  Editor, InspectorPanel, CertificatePreview -> 상태 관리 연동

Phase 4: Pages E2E 테스트
  EditorPage, CertificateModal, SettingsModal -> 전체 사용자 플로우
```

**2. 서비스 통합 (API 경계)**

```
에디터 서비스:
  Editor Component <-> Auto-save API <-> Database
  테스트: MSW로 API 모킹 -> 실제 API 테스트 (staging)

AI 서비스:
  Editor Content <-> AI API Gateway <-> OpenAI/Anthropic
  테스트: MSW 고정 응답 -> 실제 API (staging, rate-limited)

인증 서비스:
  Keystroke Collector <-> Analysis Engine <-> Certificate Issuer
  테스트: 고정 키스트로크 데이터 -> 분석 파이프라인 E2E
```

**3. 크로스 기능 통합 시나리오**

| ID | 시나리오 | 관련 기능 | 우선순위 |
|----|---------|----------|---------|
| CF-001 | 글 작성 -> AI 리뷰 -> 수정 -> 인증서 발행 | 에디터 + AI + 인증 | P0 |
| CF-002 | 오프라인 작성 -> 온라인 복귀 -> 동기화 -> AI 분석 | 에디터 + 스토리지 + AI | P0 |
| CF-003 | 다크 모드 전환 중 Inspector + 인증서 모달 열기 | 테마 + Inspector + 모달 | P1 |
| CF-004 | 설정에서 AI 비활성 -> 에디터 피드백 즉시 제거 | 설정 + AI + 에디터 | P1 |
| CF-005 | 모바일에서 전체 플로우 (작성 -> 인증 -> 공유) | 반응형 + 전체 기능 | P1 |

---

## 부록 A: 테스트 파일 구조

```
tests/
  ├── unit/
  │   ├── editor/
  │   │   ├── text-input.test.ts
  │   │   ├── markdown-parser.test.ts
  │   │   ├── undo-redo.test.ts
  │   │   └── focus-mode.test.ts
  │   ├── keystroke/
  │   │   ├── collector.test.ts
  │   │   ├── analyzer.test.ts
  │   │   └── copy-paste-detector.test.ts
  │   ├── certificate/
  │   │   ├── issuer.test.ts
  │   │   ├── verifier.test.ts
  │   │   └── integrity.test.ts
  │   ├── ai/
  │   │   ├── spelling.test.ts
  │   │   ├── fact-check.test.ts
  │   │   └── summary.test.ts
  │   └── utils/
  │       ├── sanitizer.test.ts
  │       └── crypto.test.ts
  ├── integration/
  │   ├── editor-inspector.test.ts
  │   ├── editor-autosave.test.ts
  │   ├── ai-feedback.test.ts
  │   ├── keystroke-analysis.test.ts
  │   └── certificate-flow.test.ts
  ├── e2e/
  │   ├── editor-writing.spec.ts
  │   ├── certificate-publish.spec.ts
  │   ├── certificate-verify.spec.ts
  │   ├── settings.spec.ts
  │   ├── dark-mode.spec.ts
  │   ├── accessibility.spec.ts
  │   └── mobile/
  │       ├── editor-mobile.spec.ts
  │       └── certificate-mobile.spec.ts
  ├── performance/
  │   ├── typing-latency.bench.ts
  │   ├── large-document.bench.ts
  │   └── k6/
  │       ├── load-test.js
  │       └── stress-test.js
  ├── security/
  │   ├── xss-prevention.spec.ts
  │   ├── csrf-protection.spec.ts
  │   ├── auth-bypass.spec.ts
  │   └── certificate-tampering.spec.ts
  ├── fixtures/
  │   ├── documents/
  │   │   ├── sample-essay.json
  │   │   ├── large-document.json
  │   │   └── markdown-all-features.json
  │   ├── keystroke-logs/
  │   │   ├── human-typing.json
  │   │   ├── copy-paste-heavy.json
  │   │   └── bot-typing.json
  │   └── certificates/
  │       ├── valid-certificate.json
  │       └── tampered-certificate.json
  ├── factories/
  │   ├── document.factory.ts
  │   ├── keystroke.factory.ts
  │   ├── certificate.factory.ts
  │   └── user.factory.ts
  └── mocks/
      ├── handlers.ts          # MSW request handlers
      ├── ai-responses.ts      # AI API mock responses
      └── server.ts            # MSW server setup
```

---

## 부록 B: 테스트 커맨드 모음

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --dir tests/unit",
    "test:integration": "vitest run --dir tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:staging": "STAGING=true playwright test",
    "test:e2e:mobile": "playwright test --project=mobile-chrome --project=mobile-safari",
    "test:a11y": "playwright test tests/e2e/accessibility.spec.ts",
    "test:security": "playwright test tests/security/",
    "test:perf": "vitest bench",
    "test:perf:k6": "k6 run tests/performance/k6/load-test.js",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage && playwright test",
    "test:visual": "npx chromatic --project-token=$CHROMATIC_TOKEN"
  }
}
```

---

## 부록 C: 핵심 메트릭 대시보드

| 메트릭 | 현재 | 목표 | 임계값 (경고) | 임계값 (실패) |
|--------|------|------|-------------|-------------|
| Unit 커버리지 (라인) | - | 80% | < 80% | < 70% |
| Integration 테스트 통과율 | - | 100% | < 100% | < 95% |
| E2E 테스트 통과율 | - | 100% | < 100% | < 98% |
| 타이핑 지연 P95 | - | < 16ms | > 16ms | > 32ms |
| FCP (에디터 페이지) | - | < 1s | > 1.5s | > 2s |
| LCP (에디터 페이지) | - | < 1.5s | > 2s | > 3s |
| INP | - | < 200ms | > 200ms | > 500ms |
| CLS | - | < 0.1 | > 0.1 | > 0.25 |
| JS 번들 (에디터) | - | < 150KB | > 150KB | > 200KB |
| 접근성 점수 | - | > 95 | < 95 | < 90 |
| 보안 취약점 (High) | - | 0 | > 0 | > 0 |
| API P95 응답 시간 | - | < 500ms | > 500ms | > 1s |

---

## 부록 D: 테스트 우선순위 요약

### P0 (Must Have - 릴리스 차단)
총 약 120개 테스트 케이스
- 에디터 핵심 입력/편집 (10)
- XSS 방지 전체 (10)
- 인증서 위변조 방지 (5)
- 키스트로크 수집 정확성 (7)
- 복사/붙여넣기 탐지 핵심 (5)
- AI Graceful Degradation (6)
- 인증/인가 전체 (7)
- CSRF 방지 (4)
- 성능 기준선 (타이핑 지연, FCP, LCP) (8)
- 접근성 핵심 (키보드, 포커스, 스크린 리더) (12)
- 크로스 브라우저 핵심 3종 (Chrome, Firefox, Safari) (15)
- E2E 크리티컬 경로 (인증서 발행/검증, 에디터 기본) (5)
- 다크 모드 핵심 (7)
- 엣지 케이스 핵심 (네트워크 끊김, 대량 붙여넣기, 브라우저 복구) (5)
- 기타 핵심 (14)

### P1 (Should Have - 릴리스 지연 가능)
총 약 150개 테스트 케이스
- 마크다운 심화 파싱
- 코드 블록 구문 강조
- AI 탐지 심화
- 스타일 제안
- 반응형 레이아웃
- 성능 최적화 심화
- 접근성 심화

### P2 (Nice to Have - 다음 릴리스)
총 약 30개 테스트 케이스
- RTL 텍스트
- 인증서 SEO
- 스크린 레코딩 성능
- 제스처 인터랙션
- 인증서 체이닝
