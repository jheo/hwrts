# Phase 1-4: Inspector + 문서 통계 (Week 4)

## 개발 목표
- Inspector 패널 (우측 슬라이드 사이드바, 360px) 구현 및 탭 구조 설계
- 실시간 문서 통계 (단어 수, 단락 수, 읽기 시간) 계산 및 표시
- 키보드 단축키 시스템 (Cmd+Shift+I, Cmd+Shift+F, Cmd+Shift+P, Escape) 통합

## 선행 조건
- Phase 1-3 완료: 단락 포커스 시스템, Light/Dark 테마, IndexedDB 자동 저장, Focus Mode Soft 구현 완료
- TipTap v2 에디터 코어 동작 (리치 텍스트, Markdown 단축키)
- 디자인 토큰 시스템 (CSS Variables) 적용 완료
- UI Atoms/Molecules 기본 컴포넌트 (`Badge`, `Toggle`, `Tooltip`, `StatItem`) 준비

## 아키텍처

### 생성/수정 파일 구조
```
frontend/packages/ui/
├── organisms/
│   └── Inspector/
│       ├── Inspector.tsx              # 메인 컨테이너 (AnimatePresence)
│       ├── InspectorTrigger.tsx       # 미니 아이콘 [i] + 세로 점선
│       ├── InspectorHeader.tsx        # 탭 네비게이션 (통계/리뷰/요약)
│       └── tabs/
│           ├── StatsTab.tsx           # 문서 통계 탭
│           ├── ReviewTab.tsx          # 리뷰 탭 (Phase 2에서 연결)
│           └── SummaryTab.tsx         # AI 요약 탭 (Phase 2에서 연결)
├── molecules/
│   └── StatItem/
│       └── StatItem.tsx              # 단일 통계 항목 (아이콘 + 라벨 + 값)

frontend/packages/editor-react/
├── hooks/
│   ├── useDocumentStats.ts           # 실시간 문서 통계 계산 훅
│   ├── useInspector.ts               # Inspector 열림/닫힘 상태 관리
│   └── useKeyboardShortcuts.ts       # 전역 키보드 단축키 훅

frontend/apps/web/
├── components/
│   └── EditorLayout.tsx              # Inspector 포함 레이아웃 수정
```

### 핵심 기술 결정
- **애니메이션**: `framer-motion` AnimatePresence + `motion.div` (슬라이드 인/아웃 280ms 미만)
- **상태**: Zustand Inspector store (열림/닫힘, 활성 탭)
- **통계 계산**: TipTap `onUpdate` 이벤트 + `requestIdleCallback` 디바운스

## 상세 태스크

### Task 1: Inspector 패널 UI 컴포넌트
- `Inspector.tsx`: 우측 고정 사이드바, `width: 360px`, `framer-motion`으로 슬라이드
  - 열기: `x: 360 -> 0` (ease-out 250ms)
  - 닫기: `x: 0 -> 360` (ease-in 200ms)
  - AnimatePresence로 마운트/언마운트 제어
- `InspectorTrigger.tsx`: 16x16 아이콘(`opacity: 0.3`), 세로 점선 어포던스
  - 호버 시 `opacity: 0.6`, 클릭으로 Inspector 토글
  - 우측 가장자리 500ms 호버로도 열기 지원
- `InspectorHeader.tsx`: 3개 탭 (`통계` | `리뷰` | `요약`)
  - 리뷰/요약 탭은 비활성 상태로 표시 ("Phase 2에서 활성화" placeholder)

### Task 2: 문서 통계 실시간 계산
- `useDocumentStats.ts` 훅 구현:
  ```typescript
  interface DocumentStats {
    wordCount: number;       // 한국어: 공백 기준, 영어: space 기준
    paragraphCount: number;  // 빈 줄 구분 단락 수
    readingTime: number;     // 분 단위 (한국어 500자/분, 영어 200WPM)
    charCount: number;       // 공백 제외 문자 수
  }
  ```
- TipTap `editor.on('update')` 이벤트에서 `requestIdleCallback`으로 비동기 계산
- `StatsTab.tsx`: `StatItem` 4개 렌더링 (단어 수, 단락 수, 읽기 시간, 문자 수)

### Task 3: 키보드 단축키 시스템
- `useKeyboardShortcuts.ts` 전역 훅:
  | 단축키 | 동작 |
  |--------|------|
  | `Cmd+Shift+I` | Inspector 토글 |
  | `Cmd+Shift+F` | Focus Mode Soft 토글 (Phase 1-3에서 구현된 focus-mode.ts 연동) |
  | `Cmd+Shift+P` | Command Palette 열기 (빈 셸, 내용은 Post-MVP) |
  | `Escape` | Inspector 닫기 / Focus Mode 해제 / 모달 닫기 |
- `useEventListener`로 `keydown` 이벤트 바인딩
- TipTap 에디터 내부 단축키와 충돌 방지 (`event.stopPropagation` 전략)

### Task 4: EditorLayout 통합
- `EditorLayout.tsx` 수정: Inspector 패널을 에디터 우측에 배치
- 본문 영역 640px 고정, Inspector 열림 시 본문이 좌측으로 밀리지 않음 (오버레이 방식)
- Desktop 1440px+ 기준, Inspector가 본문 영역 밖 우측에 위치

### Task 5: Vitest 유닛 테스트 작성

- `useDocumentStats` 훅: 한국어/영어/혼합 문서의 단어 수, 단락 수, 읽기 시간 계산 정확성 테스트
- `useInspector` 훅: 열림/닫힘 상태 전환 테스트
- `useKeyboardShortcuts` 훅: 단축키 바인딩 동작 테스트, TipTap 내부 단축키와 충돌 없음 확인
- Inspector 탭 전환 렌더링 테스트

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 |
|----------|------|------------|:---------:|
| `designer` (sonnet) | UI 엔지니어 | Task 1 (Inspector UI 컴포넌트) | O |
| `executor` (sonnet) | 프론트엔드 엔지니어 | Task 2 (문서 통계), Task 3 (키보드 단축키) | O |
| `executor` (sonnet) | 통합 엔지니어 | Task 4 (EditorLayout 통합) | X (Task 1 완료 후) |
| `qa-tester` (sonnet) | 테스트 엔지니어 | Task 5 (Vitest 유닛 테스트) | Task 1~4 완료 후 |
| `architect` (opus) | 코드 리뷰 | 전체 통합 검증 | X (최종) |

## 고려 사항
- Inspector 애니메이션은 280ms 미만 유지 (성능 요구사항)
- Focus Mode에서 Inspector 열기 시: Focus Mode 자동 해제가 아닌 Inspector만 숨김 상태 유지
- 한국어/영어 혼합 문서의 단어 수 계산: 한글은 문자 기반, 영문은 공백 기반 하이브리드 방식
- 리뷰/요약 탭은 빈 placeholder만 구현하되, 컴포넌트 구조는 Phase 2 연결이 가능하도록 설계
- Command Palette(`Cmd+Shift+P`)는 모달 셸만 구현, 실제 명령 목록은 이후 단계에서 추가
- Focus Mode Soft는 Phase 1-3에서 구현 완료 (`focus-mode.ts`). 이 단계에서는 키보드 단축키 연동만 담당

## 검증 기준 (체크리스트)
- [ ] Inspector 패널이 Cmd+Shift+I로 열리고 닫힌다 (슬라이드 애니메이션 < 280ms)
- [ ] 미니 아이콘 [i] 클릭으로 Inspector가 토글된다
- [ ] 우측 가장자리 500ms 호버로 Inspector가 열린다
- [ ] Escape 키로 Inspector가 닫힌다
- [ ] 문서 통계(단어 수, 단락 수, 읽기 시간)가 실시간 갱신된다
- [ ] 한국어/영어 혼합 문서에서 단어 수가 정확하다
- [ ] Inspector 3개 탭(통계/리뷰/요약) 전환이 동작한다
- [ ] 키보드 단축키가 TipTap 에디터 단축키와 충돌하지 않는다
- [ ] Light/Dark 테마에서 Inspector가 올바르게 렌더링된다

## 산출물
- `frontend/packages/ui/organisms/Inspector/` 컴포넌트 일체
- `frontend/packages/editor-react/hooks/useDocumentStats.ts`
- `frontend/packages/editor-react/hooks/useInspector.ts`
- `frontend/packages/editor-react/hooks/useKeyboardShortcuts.ts`
- Inspector Storybook 스토리 (`Inspector.stories.tsx`)

## 다음 단계 연결
- **Phase 1-5** (Week 5): 키스트로크 수집 ProseMirror Plugin이 Inspector 하단 녹색 Recording 도트와 연결
- **Phase 2-4** (Week 9): AI 맞춤법 검사 결과가 Inspector 리뷰 탭에 `ReviewItem`으로 렌더링
- **Phase 2-3** (Week 8): 인증서 발행 시 Inspector 상단 "Ready to certify" 배지 표시
