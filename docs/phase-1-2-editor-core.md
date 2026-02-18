# Phase 1-2: 에디터 코어 (Week 2)

## 개발 목표

- TipTap v2 (ProseMirror 기반) 에디터가 동작하여 리치 텍스트 편집 가능
- 제목 (H1-H3), 본문, 굵게, 기울임, 링크, 인용 블록 지원
- Markdown 단축키 (`#`, `**`, `` ` ``, `>` 등) 동작
- Desktop 최적화 레이아웃 (본문 영역 640px 중앙 정렬)
- 에디터 React 컴포넌트 구조 확립

## 선행 조건

- Phase 1-1 완료: 모노레포 구조, Next.js 앱, 디자인 토큰 시스템 동작

## 아키텍처

```
frontend/packages/editor-react/
├── src/
│   ├── Editor.tsx                  # 메인 에디터 컴포넌트
│   ├── EditorProvider.tsx          # Context Provider (에디터 인스턴스)
│   ├── extensions/
│   │   ├── index.ts                # 확장 번들 export
│   │   ├── starter-kit.ts          # TipTap StarterKit 커스텀 설정
│   │   ├── heading.ts              # H1-H3 확장 (Markdown 단축키)
│   │   ├── link.ts                 # 링크 확장 (Cmd+K)
│   │   └── blockquote.ts           # 인용 블록 확장
│   ├── hooks/
│   │   ├── useEditor.ts            # TipTap 에디터 훅 래퍼
│   │   └── useEditorState.ts       # 에디터 상태 구독 훅
│   └── index.ts                    # 패키지 public API
│
frontend/apps/web/app/editor/
├── page.tsx                        # 에디터 페이지
└── layout.tsx                      # 에디터 전용 레이아웃 (미니멀)
```

### 핵심 기술 결정

- **TipTap v2**: ProseMirror 래퍼. `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link` 등
- **상태 관리**: Zustand로 에디터 외부 상태 (문서 메타, UI 상태). 에디터 내부 상태는 ProseMirror가 관리
- **스타일링**: Tailwind + CSS Variables (Phase 1-1 디자인 토큰). 에디터 본문은 `prose` 클래스 기반 타이포그래피
- **한국어 IME**: TipTap v2는 ProseMirror의 `compositionstart`/`compositionend` 이벤트 처리 내장. 별도 처리 불필요하나 테스트 필수

## 상세 태스크

### Task 1: TipTap v2 설치 및 에디터 초기화

- 패키지 설치: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `dompurify`, `@types/dompurify`
- DOMPurify 설정: TipTap 콘텐츠 정화 (CLAUDE.md 보안원칙 #1 "TipTap DOMPurify 정화 필수" 준수). `dangerouslySetInnerHTML` 사용 금지
- `Editor.tsx`: `useEditor` 훅으로 TipTap 인스턴스 생성
- `EditorProvider.tsx`: React Context로 에디터 인스턴스 공유
- StarterKit 기본 확장: Document, Paragraph, Text, Bold, Italic, Strike, Code, History(Undo/Redo)
- `editor-react/package.json`에 peer dependency: `react`, `react-dom`

### Task 2: 제목 (H1-H3) + Markdown 단축키

- `heading.ts` 확장: H1(`#`), H2(`##`), H3(`###`) Markdown 입력 규칙
- TipTap `InputRule`로 줄 시작 `# ` 입력 시 자동 변환
- 제목 스타일: Playfair Display Italic, 크기 차등 (H1: 32px, H2: 26px, H3: 22px)
- 제목에서 Enter 시 본문 Paragraph로 자동 전환

### Task 3: 리치 텍스트 서식

- 굵게 (`**text**` 또는 `Cmd+B`), 기울임 (`*text*` 또는 `Cmd+I`)
- 인라인 코드 (`` `code` ``)
- 인용 블록 (`> ` 입력 시 변환, 좌측 3px 보더 스타일)
- StarterKit에 포함된 기본 Markdown InputRule 활용

### Task 4: 링크 확장

- `link.ts` 확장: `@tiptap/extension-link`
- `Cmd+K` 단축키로 링크 삽입 다이얼로그 (간단한 input)
- 링크 스타일: `--text-primary` 색상 + underline
- 링크 호버 시 URL 표시 툴팁 (Radix Tooltip)
- 자동 링크 감지 (URL 패턴 입력 시 자동 링크화)

### Task 5: 에디터 레이아웃

- 에디터 페이지: 전체 화면, 배경 `--surface-primary`
- 본문 영역: 최대 640px, 수평 중앙 정렬, `padding: 80px 0`
- 제목 영역: 본문 상단, placeholder "제목 없음" (회색)
- 본문 placeholder: "글을 쓰기 시작하세요..." (회색)
- UI 크롬 최소화: 상단바/하단바 없음. 에디터 전체가 글쓰기 영역
- 폰트: 본문 Inter 17px/1.75, 제목 Playfair Display Italic

### Task 6: 에디터 상태 관리 (Zustand)

- `useEditorStore`: 문서 제목, 단어 수, 수정 여부 등 메타 상태
- TipTap `onUpdate` 콜백에서 Zustand 스토어 업데이트
- 에디터 내용 변경 감지 → `isDirty` 플래그

### Task 7: Vitest 유닛 테스트 작성

- TipTap 에디터 초기화/마운트 테스트
- Markdown 단축키 변환 테스트 (`#` → H1, `**` → Bold 등)
- 링크 삽입/제거 테스트
- Zustand 에디터 스토어 상태 업데이트 테스트
- 한국어 IME 조합 입력 시 에디터 안정성 테스트

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 여부 |
|----------|------|------------|:--:|
| executor-high (FE) | 에디터 코어 개발 | Task 1, 2, 3, 4, 6 | - |
| designer + executor | 에디터 레이아웃/스타일 | Task 5 | ✅ |
| qa-tester (sonnet) | 테스트 엔지니어 | Task 7 | Task 1~6 완료 후 |

> Task 1(초기화) 완료 후 Task 2~4(확장)와 Task 5(레이아웃)는 병렬 진행 가능.
> Task 6(상태 관리)은 Task 1 이후 언제든 진행 가능.

## 고려 사항

- **한국어 IME 처리**: TipTap v2의 ProseMirror는 `compositionstart`/`compositionend` 내장 지원하나, 조합 중 커서 위치 이탈 버그 가능. 반드시 한국어 입력 E2E 테스트 필요.
- **ProseMirror Schema**: StarterKit 기본 스키마로 시작. Phase 1-5에서 키스트로크 수집 플러그인 추가 시 스키마 확장 없이 Plugin으로 처리.
- **SSR 호환**: TipTap은 클라이언트 전용. Next.js App Router에서 `'use client'` 디렉티브 필수. dynamic import + `ssr: false` 고려.
- **번들 크기**: TipTap StarterKit은 ~50KB gzip. 전체 에디터 번들 목표 < 150KB.
- **접근성**: `role="textbox"`, `aria-label`, `aria-multiline="true"` 속성. ProseMirror 기본 제공하나 확인 필요.

## 검증 기준

- [ ] 에디터 페이지(`/editor`)에서 텍스트 입력/편집 가능
- [ ] H1, H2, H3 Markdown 단축키 (`#`, `##`, `###`) 동작
- [ ] 굵게 (`Cmd+B`, `**`), 기울임 (`Cmd+I`, `*`) 동작
- [ ] 인용 블록 (`>`) 동작
- [ ] 링크 삽입 (`Cmd+K`) 동작
- [ ] Undo/Redo (`Cmd+Z`/`Cmd+Shift+Z`) 동작
- [ ] 한국어 입력 정상 동작 (조합 중 깨짐 없음)
- [ ] 본문 640px 중앙 정렬 레이아웃
- [ ] 디자인 토큰 (폰트, 색상) 적용 확인
- [ ] `tsc --noEmit` 에러 0건
- [ ] 에디터 번들 크기 < 150KB gzip

## 산출물

- `frontend/packages/editor-react/src/` 전체 에디터 컴포넌트
- `frontend/apps/web/app/editor/page.tsx` 에디터 페이지
- Zustand 에디터 상태 스토어
- TipTap 확장: heading, link, blockquote (StarterKit 커스텀)

## 다음 단계 연결

→ **Phase 1-3** (에디터 UX)에서 단락 포커스 시스템, 테마 전환, 자동 저장 추가.
→ 에디터 `onUpdate` 콜백이 Phase 1-3 자동 저장의 트리거가 됨.
→ ProseMirror Plugin 시스템이 Phase 1-5 키스트로크 수집의 기반.
