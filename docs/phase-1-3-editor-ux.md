# Phase 1-3: 에디터 UX (Week 3)

## 개발 목표

- 단락 포커스 시스템 동작: 현재 커서 단락만 활성(검정), 나머지 비활성(회색), 400ms ease 전환
- Light/Dark 테마 시스템: 독립 설계된 두 모드, 500ms crossfade 전환, system 자동 감지
- 자동 저장: IndexedDB(Dexie.js)에 타이핑 중단 2초 후 자동 저장
- Focus Mode Soft: opacity 0.4, Cmd+Shift+F 토글 (MVP 범위)

## 선행 조건

- Phase 1-2 완료: TipTap v2 에디터 동작, 리치 텍스트 편집, 에디터 레이아웃

## 아키텍처

```
frontend/packages/editor-react/
├── src/
│   ├── extensions/
│   │   ├── paragraph-focus.ts      # [신규] 단락 포커스 ProseMirror Plugin
│   │   └── focus-mode.ts           # [신규] Focus Mode Soft Plugin
│   ├── hooks/
│   │   ├── useTheme.ts             # [신규] 테마 전환 훅
│   │   └── useAutoSave.ts          # [신규] 자동 저장 훅
│   └── ...

frontend/packages/core/
├── src/
│   └── storage/
│       ├── document-store.ts       # [신규] Dexie.js IndexedDB 스토어
│       └── types.ts                # [신규] 저장 데이터 타입

frontend/packages/ui/
├── tokens/
│   ├── colors.css                  # Light/Dark CSS Variables (Phase 1-1에서 정의)
│   └── theme-provider.tsx          # [신규] 테마 Provider 컴포넌트
```

### 핵심 기술 결정

- **단락 포커스**: ProseMirror `Plugin` + `DecorationSet`으로 비활성 단락에 CSS 클래스 부여. 에디터 스키마 변경 없음.
- **테마**: CSS Variables 토글 (`data-theme` 속성). React Context + `prefers-color-scheme` 미디어 쿼리. localStorage 저장.
- **자동 저장**: Dexie.js (IndexedDB 래퍼). `debounce(2000ms)` 후 저장. 클라우드 동기화는 Post-MVP.
- **Focus Mode**: ProseMirror Decoration으로 비포커스 단락 opacity 조절. Soft(0.4)만 MVP.

## 상세 태스크

### Task 1: 단락 포커스 시스템

- `paragraph-focus.ts`: ProseMirror Plugin 작성
- 커서가 위치한 단락(Node) 감지 → `class="paragraph-active"` Decoration 추가
- 비활성 단락: `color: var(--text-body)` (Light: #767676, Dark: #A3A3A3)
- 활성 단락: `color: var(--text-active)` (Light: #0A0A0A, Dark: #F5F5F5)
- 단락 전환 시 CSS `transition: color 400ms ease, opacity 400ms ease`
- 제목(H1-H3)은 항상 활성 상태 유지 (디밍 제외)
- 구현 방식: `Plugin.props.decorations`에서 현재 selection 기준 decoration 계산

### Task 2: Light/Dark 테마 시스템

- `theme-provider.tsx`: React Context + Provider
  - 3가지 모드: `light`, `dark`, `system`
  - `system` 모드: `window.matchMedia('(prefers-color-scheme: dark)')` 감지
  - `localStorage.getItem('hw-theme')` 에서 사용자 설정 복원
- `<html data-theme="light|dark">` 속성 토글
- 전환 애니메이션: `transition: background-color 500ms ease, color 500ms ease` (body에 적용)
- Phase 1-1 디자인 토큰이 `[data-theme="dark"]`에서 자동 전환
- 토글 UI: 에디터 우상단 아이콘 버튼 (Sun/Moon 아이콘)

### Task 3: 자동 저장 (IndexedDB)

- `document-store.ts`: Dexie.js 스키마 정의
  ```typescript
  interface LocalDocument {
    id: string;           // UUID
    title: string;
    content: string;      // TipTap JSON → string
    wordCount: number;
    updatedAt: number;    // timestamp
  }
  ```
- `useAutoSave.ts` 훅:
  - TipTap `onUpdate` 콜백에서 debounce(2000ms) 후 IndexedDB 저장
  - 저장 상태 표시: "저장됨" / "저장 중..." (에디터 하단 미세 텍스트)
  - 페이지 로드 시 IndexedDB에서 최근 문서 복원
  - `beforeunload` 이벤트에서 미저장 데이터 강제 저장
- TipTap 문서를 JSON으로 직렬화하여 저장 (`editor.getJSON()`)
- 핵심 패키지는 `frontend/packages/core/`에 배치 (DOM 의존 없음)
  - `document-store.ts`는 Dexie.js 의존이 있으므로 브라우저 전용이지만, core 패키지에서 인터페이스만 정의하고 구현은 web앱에서 주입하는 패턴도 고려

### Task 4: Focus Mode (Soft)

- `focus-mode.ts`: ProseMirror Plugin
- Soft 모드: 비활성 단락 opacity 0.4 (단락 포커스 시스템과 결합)
- `Cmd+Shift+F` 토글 키보드 단축키
- 활성화 시: 단락 포커스와 결합하여 비활성 단락이 더 희미해짐
- Zustand 스토어에 `focusMode: 'off' | 'soft'` 상태 저장
- MVP에서는 Soft만 구현. Deep(0.2+blur), Zen(0.1+blur)은 Post-MVP (Iter 1)

### Task 5: Vitest 유닛 테스트 작성

- 단락 포커스 ProseMirror Plugin: 커서 이동 시 활성/비활성 단락 Decoration 정확성 테스트
- 테마 전환: `useTheme` 훅의 light/dark/system 모드 전환 테스트
- 자동 저장: `useAutoSave` 훅의 debounce 동작, IndexedDB 저장/복원 테스트
- Focus Mode Soft: 토글 상태 변경, opacity 적용 Decoration 테스트
- FOUC 방지: 초기 로드 시 올바른 `data-theme` 속성 설정 테스트

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 여부 |
|----------|------|------------|:--:|
| executor-high (FE) | 에디터 UX 핵심 | Task 1, 4 | ✅ |
| executor (FE) | 테마 + 저장 | Task 2, 3 | ✅ |
| qa-tester (sonnet) | 테스트 엔지니어 | Task 5 | Task 1~4 완료 후 |

> Task 1(단락 포커스)과 Task 2(테마)는 독립적이므로 병렬 진행.
> Task 3(자동 저장)은 독립적으로 병렬 진행 가능.
> Task 4(Focus Mode)는 Task 1(단락 포커스) 기반 위에 구축되므로 Task 1 이후 진행.

## 고려 사항

- **단락 포커스 성능**: `DecorationSet`은 문서가 길어질수록 재계산 비용 증가. `DecorationSet.map()`으로 incremental update 필수. 전체 재생성은 금지.
- **테마 전환 깜빡임 (FOUC)**: Next.js SSR에서 초기 HTML은 테마 미적용 상태. `<script>` 인라인으로 `data-theme` 속성을 서버 렌더링 전에 설정하여 FOUC 방지. `cookies` 또는 `localStorage` 기반.
- **IndexedDB 용량**: 단일 문서 최대 크기 제한 불필요 (IndexedDB는 수 GB 지원). 다만 TipTap JSON이 예상보다 클 수 있으므로 직렬화 크기 모니터링.
- **자동 저장 충돌**: 현재 MVP는 단일 문서/단일 탭. 멀티 탭 충돌은 Post-MVP에서 BroadcastChannel API로 해결.
- **Focus Mode + 단락 포커스 상호작용**: Focus Mode가 OFF일 때도 단락 포커스는 동작 (활성/비활성 색상 차이). Focus Mode Soft는 추가로 opacity를 낮춤.
- **접근성**: 단락 포커스 디밍이 저시력 사용자에게 문제 가능. WCAG 대비율(4.5:1) 확인. Focus Mode에서도 활성 단락은 충분한 대비 유지.

## 검증 기준

- [ ] 커서 이동 시 활성 단락/비활성 단락 색상 차이 확인 (400ms 전환)
- [ ] 제목(H1-H3)은 항상 활성 색상 유지
- [ ] Light → Dark 테마 전환 시 500ms crossfade 동작
- [ ] system 모드에서 OS 다크모드 변경 시 자동 전환
- [ ] 페이지 새로고침 후 테마 설정 유지 (localStorage)
- [ ] 타이핑 중단 2초 후 IndexedDB에 문서 자동 저장
- [ ] 페이지 새로고침 후 저장된 문서 자동 복원
- [ ] "저장됨" / "저장 중..." 상태 표시 동작
- [ ] `Cmd+Shift+F` 로 Focus Mode Soft 토글
- [ ] Focus Mode Soft 활성 시 비활성 단락 opacity 0.4
- [ ] FOUC 없이 초기 로드 시 올바른 테마 적용
- [ ] `tsc --noEmit` 에러 0건

## 산출물

- `paragraph-focus.ts` ProseMirror Plugin
- `focus-mode.ts` ProseMirror Plugin
- `theme-provider.tsx` 테마 Provider + `useTheme` 훅
- `document-store.ts` Dexie.js IndexedDB 스토어
- `useAutoSave.ts` 자동 저장 훅
- 에디터 페이지에 테마 토글 버튼 UI

## 다음 단계 연결

→ **Phase 1-4** (Inspector + 통계)에서 Inspector 사이드바 패널 추가.
→ 단락 포커스 시스템이 Phase 1-4 Focus Mode 설정 UI의 기반.
→ 자동 저장 시스템이 Phase 1-5 키스트로크 수집과 함께 세션 데이터 저장의 기반.
→ 테마 시스템이 Inspector 패널 스타일링에 사용됨.
