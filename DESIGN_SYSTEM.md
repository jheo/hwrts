# HumanWrites 디자인 시스템 및 UX 전략

> 최종 분석일: 2026-02-18
> 대상: 프로토타입 Pencil 파일 (10개 화면 분석 완료)

---

## 1. 디자인 철학 및 원칙

### 핵심 정체성

HumanWrites는 "사람이 직접 쓴 글"이라는 가치를 지키는 Zen 스타일 에디터입니다.
디자인의 모든 결정은 **"글쓰기 행위 자체를 신성하게 보호한다"** 는 하나의 명제에서 출발합니다.

### 5가지 디자인 원칙

#### 원칙 1: 투명한 배경 (Invisible Interface)
> 인터페이스는 글 뒤로 사라져야 한다.

- UI 요소는 필요할 때만 나타나고, 글쓰기 중에는 사라진다
- 크롬(chrome)을 최소화하여 텍스트가 화면의 주인공이 된다
- 메뉴바, 툴바, 상태바 등 전통적 에디터 UI를 의도적으로 제거한다
- **구현 기준**: 에디터 모드에서 글 이외의 UI 요소가 차지하는 면적이 전체의 5% 미만

#### 원칙 2: 점진적 노출 (Progressive Disclosure)
> 정보는 작성자가 준비되었을 때 제공한다.

- Inspector 패널은 기본 숨김이며, 마우스를 오른쪽 가장자리로 가져갈 때 슬라이드 인
- AI 리뷰 결과는 글쓰기를 마친 후 요약으로 먼저 보여주고, 상세 항목은 클릭 시 확장
- 인증서 발행은 최소 2단계(미리보기 -> 발행)로 진행
- **구현 기준**: 어떤 패널도 사용자의 명시적 의도 없이 자동 표시되지 않음

#### 원칙 3: 고요한 피드백 (Quiet Feedback)
> 알림은 속삭이되 경고는 분명히 한다.

- 맞춤법/스타일 피드백은 본문 내 인라인으로 표시하되, 밑줄 투명도를 낮게 유지
- 심각도별 시각적 계층: 정보(회색) < 스타일(남색) < 경고(황색) < 오류(적색)
- 사운드 피드백 없음. 진동 피드백 없음. 시각적 미세 변화만 허용
- **구현 기준**: 모든 피드백 요소의 최대 투명도는 0.6, Focus Mode에서는 0으로 전환

#### 원칙 4: 인증의 격식 (Ceremonial Certification)
> 인증서는 디지털 문서의 인장이다.

- 인증서 UI는 의도적으로 물리적 문서의 질감과 격식을 차용한다
- 크림색 배경(#FAFAF8), 세리프 타이포그래피, 구분선, 검증 배지 등
- 발행 과정은 "의식(ritual)"처럼 단계적이고 엄숙하게 진행
- **구현 기준**: 인증서 영역에서는 Sans-serif 폰트 사용 금지, 최소 3가지 검증 항목 표시

#### 원칙 5: 빛과 어둠의 균형 (Light & Dark Harmony)
> 두 모드는 동등한 시민이다.

- 다크 모드는 라이트 모드의 색상 반전이 아닌, 독립적으로 설계된 경험
- 라이트: 종이 위의 잉크 (명료한 가독성, 낮 시간대 최적화)
- 다크: 밤하늘의 별빛 (몰입형 글쓰기, 눈 피로 감소)
- **구현 기준**: 모든 컬러 토큰은 반드시 Light/Dark 쌍으로 정의

---

## 2. 디자인 시스템 정의

### 2.1 컬러 팔레트

#### 시맨틱 토큰 (CSS Custom Properties)

```css
:root {
  /* ============================================
     SURFACE (배경, 컨테이너)
     ============================================ */
  --surface-primary:       #FFFFFF;    /* 메인 에디터 배경 */
  --surface-secondary:     #FAFAFA;    /* Inspector, 설정 네비게이션 */
  --surface-tertiary:      #F5F3EF;    /* 인증서 검증 페이지 배경 */
  --surface-certificate:   #FAFAF8;    /* 인증서 미리보기 배경 */
  --surface-overlay:       #00000066;  /* 모달 오버레이 (40% 불투명도) */
  --surface-code:          #1A1A1A;    /* 코드 블록 배경 */

  /* ============================================
     TEXT (텍스트 계층)
     ============================================ */
  --text-primary:          #000000;    /* 제목, 활성 본문, 강조 텍스트 */
  --text-body:             #888888;    /* 비활성 본문 단락 */
  --text-active:           #000000;    /* 현재 편집 중인 단락 */
  --text-secondary:        #666666;    /* 설명문, AI 요약 */
  --text-tertiary:         #888888;    /* 라벨, 메타 정보 */
  --text-quaternary:       #AAAAAA;    /* 힌트, 부가 정보 */
  --text-disabled:         #CCCCCC;    /* 비활성 UI 힌트 */

  /* ============================================
     BORDER (구분선, 테두리)
     ============================================ */
  --border-primary:        #E0E0E0;    /* 주요 구분선, 카드 테두리 */
  --border-certificate:    #E8E4DE;    /* 인증서 전용 테두리 (따뜻한 톤) */

  /* ============================================
     REVIEW (리뷰 아이템 심각도)
     ============================================ */
  --review-spelling-bg:    #FEF3C7;    /* 맞춤법 배지 배경 */
  --review-spelling-text:  #92400E;    /* 맞춤법 배지 텍스트 */
  --review-fact-bg:        #FEE2E2;    /* 팩트체크 배지 배경 */
  --review-fact-text:      #991B1B;    /* 팩트체크 배지 텍스트 */
  --review-style-bg:       #E0E7FF;    /* 스타일 배지 배경 */
  --review-style-text:     #3730A3;    /* 스타일 배지 텍스트 */

  /* ============================================
     ACCENT (강조, 상태)
     ============================================ */
  --accent-verified:       #22C55E;    /* 검증 완료 아이콘/텍스트 */
  --accent-primary:        #000000;    /* 주요 CTA 버튼 배경 */
  --accent-primary-text:   #FFFFFF;    /* 주요 CTA 버튼 텍스트 */
}

/* ============================================
   다크 모드 토큰
   ============================================ */
[data-theme="dark"] {
  --surface-primary:       #0A0A0A;    /* 메인 에디터 배경 */
  --surface-secondary:     #141414;    /* Inspector 배경 */
  --surface-tertiary:      #1A1A1A;    /* 보조 배경 */
  --surface-certificate:   #111111;    /* 인증서 미리보기 배경 */
  --surface-overlay:       #00000099;  /* 모달 오버레이 (60% 불투명도) */
  --surface-code:          #0D0D0D;    /* 코드 블록 배경 */

  --text-primary:          #FFFFFF;    /* 제목 */
  --text-body:             #555555;    /* 비활성 본문 */
  --text-active:           #E0E0E0;    /* 현재 편집 중인 단락 */
  --text-secondary:        #888888;    /* 설명문 */
  --text-tertiary:         #666666;    /* 라벨 */
  --text-quaternary:       #444444;    /* 힌트 */
  --text-disabled:         #333333;    /* 비활성 UI */

  --border-primary:        #222222;    /* 구분선 */
  --border-certificate:    #2A2520;    /* 인증서 전용 테두리 */

  --review-spelling-bg:    #422006;    /* 맞춤법 배지 배경 */
  --review-spelling-text:  #FDE68A;    /* 맞춤법 배지 텍스트 */
  --review-fact-bg:        #450A0A;    /* 팩트체크 배지 배경 */
  --review-fact-text:      #FCA5A5;    /* 팩트체크 배지 텍스트 */
  --review-style-bg:       #1E1B4B;    /* 스타일 배지 배경 */
  --review-style-text:     #A5B4FC;    /* 스타일 배지 텍스트 */

  --accent-verified:       #22C55E;    /* 동일 유지 */
  --accent-primary:        #FFFFFF;    /* 반전: 흰색 버튼 */
  --accent-primary-text:   #000000;    /* 반전: 검은 텍스트 */
}
```

#### 리뷰 심각도 컬러 매핑

| 심각도 | 라벨 | 배경 | 텍스트 | 용도 |
|--------|------|------|--------|------|
| Info | Style | `#E0E7FF` | `#3730A3` | 문장 길이, 가독성 제안 |
| Warning | Spelling | `#FEF3C7` | `#92400E` | 맞춤법, 문법 오류 |
| Error | Fact Check | `#FEE2E2` | `#991B1B` | 사실 검증 필요 |
| Success | Verified | `#DCFCE7` | `#166534` | 검증 통과 항목 |

### 2.2 타이포그래피 시스템

#### 폰트 패밀리

| 역할 | 폰트 | 용도 | 근거 |
|------|------|------|------|
| Display / 제목 | **Playfair Display** (Italic) | 문서 제목, 통계 숫자, 인증서 제목, Inspector 제목, 설정 제목 | 세리프 + 이탤릭이 "필기"와 "격식"을 동시에 전달. 문학적 품격 |
| Body / UI | **Inter** | 본문 텍스트, UI 라벨, 버튼, 설명문 | 높은 가독성, 넓은 자간, 숫자 식별성. 글쓰기에 집중할 수 있는 중립적 서체 |

#### 타이포그래피 스케일

```css
/* ============================================
   DISPLAY (제목, 장식적 텍스트)
   ============================================ */
--type-display-xl:    42px / 1.2 / Playfair Display Italic / -1px letter-spacing;
  /* 문서 제목 (에디터 내) */

--type-display-lg:    32px / 1.3 / Playfair Display Italic / -1px letter-spacing;
  /* 인증서 검증 페이지 글 제목 */

--type-display-md:    28px / 1.3 / Playfair Display Italic / normal;
  /* 통계 숫자 (847, 4, 3m) */

--type-display-sm:    24px / 1.3 / Playfair Display Italic 600;
  /* Inspector 제목 */

--type-display-xs:    22px / 1.4 / Playfair Display Italic;
  /* 인증서 모달 제목, 설정 섹션 제목 */

/* ============================================
   BODY (본문 텍스트)
   ============================================ */
--type-body-lg:       17px / 1.75 / Inter Regular;
  /* 에디터 본문 (기본 크기, 사용자 조절 가능) */

--type-body-md:       15px / 1.75 / Inter Regular;
  /* 인증서 검증 페이지 본문 */

--type-body-sm:       14px / 1.6 / Inter Regular;
  /* 모달 설명문, AI 기능 설명 */

/* ============================================
   UI (인터페이스 텍스트)
   ============================================ */
--type-ui-md:         14px / 1.4 / Inter Medium;
  /* 버튼 텍스트, 네비게이션 항목 */

--type-ui-sm:         13px / 1.5 / Inter Regular;
  /* 리뷰 아이템 제목, 검증 항목, 인증서 저자명 */

--type-ui-xs:         12px / 1.4 / Inter Regular;
  /* 리뷰 아이템 설명, 메타 정보, 액션 링크 */

/* ============================================
   LABEL (라벨, 배지)
   ============================================ */
--type-label-lg:      13px / 1.4 / Inter Medium;
  /* Verified 상태 텍스트 */

--type-label-md:      11px / 1.4 / Inter Medium / 1px letter-spacing / uppercase;
  /* 섹션 라벨 (DOCUMENT STATS, REVIEW ITEMS, AI SUMMARY) */

--type-label-sm:      11px / 1.4 / Inter Medium / 2px letter-spacing / uppercase;
  /* 인증서 유형 라벨 (HUMAN-WRITTEN CERTIFICATE) */

--type-label-badge:   10px / 1.2 / Inter Medium;
  /* 리뷰 배지 텍스트 (Spelling, Fact Check, Style) */
```

#### 텍스트 색상 계층 (에디터 내)

| 상태 | 색상 | 용도 |
|------|------|------|
| 활성 단락 | `#000000` (Light) / `#E0E0E0` (Dark) | 현재 커서가 위치한 단락 |
| 비활성 단락 | `#888888` (Light) / `#555555` (Dark) | 편집하지 않는 단락 |
| 커서 | `|` 문자로 표현, 깜빡임 애니메이션 | 현재 입력 위치 |

### 2.3 스페이싱 / 그리드 시스템

#### 기본 단위

```
Base Unit: 4px
스페이싱 스케일: 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64, 100, 160
```

#### 레이아웃 그리드

```
에디터 영역:
  - 최대 본문 폭: 640px (최적 가독성 = 65~75자/행)
  - 상단 패딩: 100px (충분한 여백으로 "종이" 느낌)
  - 좌우 패딩: 160px (에디터 영역 중앙 정렬 시)
  - 단락 간격: 32px

Inspector 사이드바:
  - 폭: 360px
  - 내부 패딩: 32px(상) 28px(좌우)
  - 섹션 간 간격: 24px

설정 모달:
  - 전체 폭: 700px / 높이: 600px
  - 네비게이션 폭: 200px
  - 네비게이션 패딩: 24px(상하) 0(좌우)
  - 네비게이션 아이템 패딩: 12px(상하) 20px(좌우)
  - 콘텐츠 패딩: 32px(상) 36px(좌우)
  - 섹션 간 간격: 32px

인증서 모달:
  - 전체 폭: 560px / 높이: 640px
  - 헤더 패딩: 24px(상하) 32px(좌우)
  - 바디 패딩: 28px(상) 32px(좌우)
  - 섹션 간 간격: 28px

인증서 검증 페이지:
  - 인증서 카드 폭: 640px
  - 카드 패딩: 40px(상하) 48px(좌우)
  - 카드 간 간격: 36px
  - 스크롤 영역 상단 패딩: 48px
```

#### 반응형 브레이크포인트

```css
--breakpoint-desktop:  1440px;   /* 전체 레이아웃 */
--breakpoint-laptop:   1024px;   /* Inspector 오버레이 전환 */
--breakpoint-tablet:    768px;   /* 모달 풀스크린 전환 */
--breakpoint-mobile:    375px;   /* 단일 컬럼 */
```

### 2.4 컴포넌트 라이브러리 목록

#### 원자 (Atoms)

| 컴포넌트 | Props | 설명 |
|----------|-------|------|
| `Text` | `variant`, `color`, `as` | 타이포그래피 스케일 기반 텍스트 |
| `Icon` | `name`, `size`, `color` | Lucide 아이콘 (pen-line, shield-check, circle-check, link 등) |
| `Divider` | `orientation`, `color` | 1px 수평/수직 구분선 |
| `Badge` | `severity: 'info' \| 'warning' \| 'error' \| 'success'` | 리뷰 심각도 배지 |
| `Toggle` | `checked`, `onChange`, `disabled` | On/Off 스위치 (설정 화면) |
| `Slider` | `min`, `max`, `value`, `onChange` | 폰트 크기 조절 등 |
| `Button` | `variant: 'primary' \| 'ghost' \| 'outline'`, `size`, `icon` | CTA 및 액션 버튼 |
| `Avatar` | `src`, `fallback`, `size` | 프로필 이미지 |
| `Cursor` | `blinkRate` | 에디터 커서 (깜빡임 애니메이션) |

#### 분자 (Molecules)

| 컴포넌트 | 구성 | 설명 |
|----------|------|------|
| `StatItem` | Text(숫자) + Text(라벨) | 847 Words, 4 Paragraphs, 3m Read time |
| `ReviewItem` | Badge + Text(제목) + Text(설명) + Text(액션) | 리뷰 항목 카드 |
| `VerifyCheckItem` | Icon(circle-check) + Text | 인증 검증 항목 (녹색 체크) |
| `NavItem` | Icon + Text | 설정 사이드바 네비게이션 항목 |
| `ThemeCard` | Frame(미리보기) + Text(라벨) | Light/Dark 테마 선택 카드 |
| `InputField` | Label + Input + HelpText | 텍스트 입력 (API Key 등) |
| `FeatureToggle` | Text(제목) + Text(설명) + Toggle | AI 기능 개별 토글 |
| `CodeBlock` | Frame(dark bg) + 구문 강조 텍스트 | 코드 블록 렌더링 |

#### 유기체 (Organisms)

| 컴포넌트 | 구성 | 설명 |
|----------|------|------|
| `Editor` | DocumentContainer + ParagraphBlocks | 메인 텍스트 에디터 영역 |
| `InspectorPanel` | SidebarHeader + StatsSection + ReviewSection + AISummary | 우측 슬라이드 인/아웃 패널 |
| `CertificatePreview` | Badge + Label + Title + Author + Meta | 인증서 미리보기 카드 |
| `CertificateCard` | CertificatePreview + Stats + VerifyList + Footer | 검증 페이지 인증서 전체 |
| `SettingsNav` | Header + NavItem[] | 설정 좌측 네비게이션 |
| `SettingsContent` | Header + SectionContent | 설정 우측 콘텐츠 영역 |
| `ArticlePreview` | Title + Paragraph[] | 인증서 검증 페이지 글 미리보기 |

#### 페이지 (Pages/Templates)

| 페이지 | 구성 | 설명 |
|--------|------|------|
| `EditorPage` | Editor + InspectorPanel | 메인 글쓰기 화면 |
| `EditorDarkPage` | Editor (dark variant) | 다크 모드 글쓰기 |
| `CertificateModal` | Overlay + ModalHeader + CertificatePreview + VerifyList + Button | 인증서 발행 모달 |
| `CertificateVerifyPage` | TopBar + CertificateCard + ArticlePreview | 공개 인증서 확인 |
| `SettingsModal` | Overlay + SettingsNav + SettingsContent | 설정 모달 (Account/Storage/Appearance/AI) |

---

## 3. 인터랙션 패턴

### 3.1 에디터 내 AI 피드백 표시 방식 (집중 방해 최소화)

#### 3단계 피드백 모델

```
Level 0: Focus Mode (피드백 완전 차단)
  - 모든 AI 피드백 숨김
  - Inspector 패널 접근 불가
  - 화면에 텍스트만 존재
  - 전환: Cmd+Shift+F 또는 설정에서 토글

Level 1: Ambient Mode (기본 상태)
  - 본문 내 인라인 밑줄로 문제 위치 표시
  - 밑줄 스타일:
    - Spelling: wavy underline, #92400E, opacity 0.3
    - Fact Check: dotted underline, #991B1B, opacity 0.3
    - Style: dashed underline, #3730A3, opacity 0.2
  - 밑줄 위 마우스 호버 시 툴팁으로 간단 설명
  - Inspector 패널은 숨겨진 상태

Level 2: Review Mode (Inspector 활성)
  - Inspector 패널 슬라이드 인
  - 전체 리뷰 아이템 목록 표시
  - 리뷰 아이템 클릭 시 해당 본문 위치로 스크롤 + 하이라이트
  - AI Summary 표시
```

#### 인라인 피드백 상세 스펙

```css
/* 맞춤법 오류 밑줄 */
.underline-spelling {
  text-decoration: wavy underline;
  text-decoration-color: var(--review-spelling-text);
  text-underline-offset: 4px;
  text-decoration-thickness: 1.5px;
  opacity: 0.3;
  transition: opacity 200ms ease;
}
.underline-spelling:hover {
  opacity: 0.8;
}

/* 팩트체크 밑줄 */
.underline-fact {
  text-decoration: dotted underline;
  text-decoration-color: var(--review-fact-text);
  text-underline-offset: 4px;
  text-decoration-thickness: 2px;
  opacity: 0.3;
}

/* 스타일 제안 밑줄 */
.underline-style {
  text-decoration: dashed underline;
  text-decoration-color: var(--review-style-text);
  text-underline-offset: 4px;
  text-decoration-thickness: 1px;
  opacity: 0.2;
}
```

#### 피드백 타이밍 규칙

| 조건 | 동작 |
|------|------|
| 사용자가 타이핑 중 | 피드백 갱신 중단 (debounce 2초) |
| 타이핑 멈춘 후 2초 | 현재 단락만 분석 시작 |
| 타이핑 멈춘 후 5초 | 전체 문서 분석 시작 |
| 단락 이동 시 | 이전 단락 분석 결과 즉시 반영 |
| Focus Mode 진입 | 모든 인라인 표시 즉시 fade out (300ms) |

### 3.2 Inspector 패널 인터랙션

#### 등장/퇴장 트리거

```
열기 조건 (OR):
  1. 마우스를 화면 오른쪽 가장자리 20px 영역에 500ms 이상 유지
  2. 키보드 단축키: Cmd+I (Mac) / Ctrl+I (Win)
  3. 에디터 우상단 미니 아이콘 클릭 (Inspector 닫힌 상태에서만 표시)

닫기 조건 (OR):
  1. 마우스가 Inspector 영역을 벗어난 후 300ms 경과
  2. 동일 단축키 재입력
  3. Escape 키
  4. 에디터 본문 클릭 (글쓰기 복귀 의도)
```

#### 슬라이드 애니메이션 스펙

```css
.inspector-panel {
  transform: translateX(100%);
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
.inspector-panel.open {
  transform: translateX(0);
}

/* 에디터 영역은 Inspector에 의해 밀려나지 않음 (오버레이 방식) */
/* 단, 데스크톱 1440px 이상에서는 나란히 배치 가능 옵션 제공 */
```

#### Inspector 내부 상호작용

| 영역 | 클릭 동작 | 호버 동작 |
|------|-----------|-----------|
| 통계 (Words/Paragraphs/Read time) | 상세 통계 드롭다운 | 숫자 미세 스케일업 (1.05x) |
| 리뷰 아이템 | 해당 본문 위치로 스크롤 + 하이라이트 | 카드 배경 살짝 어두워짐 |
| 리뷰 아이템 "Fix/Review/Simplify" | 해당 수정 제안 적용 모달 표시 | 텍스트 밑줄 표시 |
| AI Summary | 없음 (읽기 전용) | 없음 |
| 하단 힌트 "Move mouse right to toggle" | 없음 | 없음 |

### 3.3 인증서 발행/검증 플로우

#### 발행 플로우 (Certificate Publishing)

```
Step 1: 에디터에서 "Publish" 액션 트리거
  └─ 에디터 배경 blur 처리 (opacity 0.3)
  └─ 반투명 오버레이 페이드인 (300ms)
  └─ 모달 중앙에서 scale(0.95) -> scale(1) 등장 (350ms, ease-out)

Step 2: 인증서 미리보기 모달 표시
  ┌─ 모달 헤더: "Publish Certificate" + 닫기(x) 버튼
  ├─ 설명문: 인증 과정 안내
  ├─ 인증서 미리보기 카드:
  │   ├─ 방패 아이콘 배지
  │   ├─ "HUMAN-WRITTEN CERTIFICATE" 라벨
  │   ├─ 글 제목 + 저자
  │   └─ 메타 정보 (단어수, 날짜)
  ├─ 인증 항목 체크리스트:
  │   ├─ [v] AI 도구 미사용 확인
  │   ├─ [v] 작성 과정 타이핑 패턴 분석 완료
  │   └─ [v] 문체 일관성 검증 통과
  └─ CTA: "인증서 발급 및 링크 생성" 버튼

Step 3: 발급 처리 중
  └─ 버튼 내 로딩 스피너 (600ms~2s)
  └─ 체크 아이콘 순차 등장 애니메이션 (체크1 -> 체크2 -> 체크3, 각 200ms 간격)

Step 4: 발급 완료
  └─ 성공 화면으로 전환 (모달 내용 교체, crossfade 300ms)
  └─ 공유 링크 + 복사 버튼 표시
  └─ "인증서 보기" 버튼으로 검증 페이지 이동 가능
```

#### 검증 플로우 (Certificate Verification - 공개 페이지)

```
URL 구조: humanwrites.app/verify/{certificate-id}

레이아웃:
  ┌─ 상단 바: Zen Writing 로고 + "Verified" 배지 (녹색)
  ├─ 인증서 카드 (중앙 배치):
  │   ├─ 방패 배지
  │   ├─ "HUMAN-WRITTEN CERTIFICATE" / "이 글은 100% 사람이 작성했습니다"
  │   ├─ 글 제목 + 저자
  │   ├─ 통계 (단어수 / 편집 횟수 / 소요 시간)
  │   ├─ 검증 체크리스트 (3항목)
  │   └─ 인증서 ID + 발급일
  └─ 글 본문 미리보기 (전문 펼치기/접기 가능)

배경: #F5F3EF (따뜻한 종이 질감)
카드: #FFFFFF + border #E8E4DE (인증서 전용 따뜻한 테두리)
```

### 3.4 Focus Mode 동작 방식

#### 진입/퇴장

```
진입 트리거:
  - 키보드: Cmd+Shift+F
  - 설정 > Appearance > Focus Mode 토글
  - 에디터 내 컨텍스트 메뉴 (향후)

진입 애니메이션 (총 600ms):
  0ms:   Inspector 패널 슬라이드 아웃 (280ms)
  100ms: 인라인 피드백 밑줄 페이드아웃 (300ms)
  200ms: 비활성 단락 추가 디밍 (#888 -> #C8C8C8, Light / #555 -> #2A2A2A, Dark)
  300ms: 에디터 상하 패딩 증가 (100px -> 160px, 300ms ease)
  400ms: 현재 단락 외 단락 추가 블러 (옵션, blur 1px)

퇴장 애니메이션:
  위 과정의 역순, 총 400ms
```

#### Focus Mode 시각적 상태

```
활성 단락:
  - 텍스트 색상: --text-primary (그대로 유지)
  - 배경: 없음

비활성 단락 (옵션별 3단계):
  Level 1 (Soft):  opacity 0.4
  Level 2 (Medium): opacity 0.2 + blur(0.5px)
  Level 3 (Strict): opacity 0.1 + blur(1px)
  사용자가 설정에서 선택 가능
```

---

## 4. 반응형 전략

### Desktop (1440px 이상)

```
┌──────────────────────────────────────────────────┐
│                                                  │
│         [640px 본문]          [360px Inspector]   │
│                                                  │
│   좌우 여백 자동 계산         좌측 1px 보더        │
│   (에디터 중앙 정렬)          (나란히 배치)        │
│                                                  │
└──────────────────────────────────────────────────┘

설정 모달: 700x600px, 중앙 배치
인증서 모달: 560x640px, 중앙 배치
```

### Laptop (1024px ~ 1439px)

```
┌────────────────────────────────────────┐
│                                        │
│         [640px 본문]                    │
│                                        │
│   Inspector는 오버레이로 전환           │
│   (본문 위에 떠서 표시)                 │
│   배경 dim 처리                        │
│                                        │
└────────────────────────────────────────┘

설정 모달: 700x600px 유지, 스크롤 가능
본문 좌우 패딩: 160px -> 80px
```

### Tablet (768px ~ 1023px)

```
┌──────────────────────────┐
│                          │
│    [본문 100% - 패딩]     │
│                          │
│  Inspector: 하단 시트로   │
│  (바텀 50% 슬라이드업)    │
│                          │
│  설정: 풀스크린 모달      │
│  (네비 탭바로 전환)       │
│                          │
└──────────────────────────┘

본문 최대 폭: 640px 유지, 좌우 패딩 40px
설정 네비게이션: 사이드바 -> 상단 탭바
인증서 모달: 풀스크린
```

### Mobile (375px ~ 767px)

```
┌─────────────────┐
│                 │
│  [본문 100%]     │
│  패딩 20px      │
│                 │
│  Inspector:     │
│  풀스크린 전환   │
│  (바텀 시트      │
│   or 별도 뷰)    │
│                 │
│  설정:          │
│  풀스크린 모달   │
│  스택 네비       │
│                 │
└─────────────────┘

본문 폰트: 17px -> 16px
제목 폰트: 42px -> 28px
단락 간격: 32px -> 24px
상단 패딩: 100px -> 48px
Inspector: 하단에서 슬라이드업, 최대 높이 70vh
인증서 검증: 단일 컬럼, 카드 패딩 축소
```

### 반응형 전환 요약표

| 요소 | Desktop | Laptop | Tablet | Mobile |
|------|---------|--------|--------|--------|
| Inspector | 사이드바 (나란히) | 오버레이 | 바텀시트 | 풀스크린 |
| 설정 모달 | 중앙 모달 700px | 중앙 모달 700px | 풀스크린 | 풀스크린 |
| 설정 네비 | 좌측 사이드바 | 좌측 사이드바 | 상단 탭바 | 스택 네비 |
| 인증서 모달 | 중앙 560px | 중앙 560px | 풀스크린 | 풀스크린 |
| 본문 패딩 | 160px | 80px | 40px | 20px |
| 제목 크기 | 42px | 42px | 36px | 28px |
| 본문 폭 | 640px | 640px | 640px(max) | 100% |

---

## 5. 접근성 (a11y) -- WCAG 2.1 AA 준수 전략

### 5.1 색상 대비

#### 현재 프로토타입 대비 분석 및 개선

| 요소 | 현재 | 대비비 | WCAG AA (4.5:1) | 조치 |
|------|------|--------|-----------------|------|
| 본문 (#888 on #FFF) | 비활성 단락 | 3.54:1 | 미달 | `#767676`으로 변경 (4.54:1) |
| 본문 (#000 on #FFF) | 활성 단락 | 21:1 | 통과 | 유지 |
| 라벨 (#888 on #FAFAFA) | Inspector 라벨 | 3.40:1 | 미달 | `#6B6B6B`으로 변경 (4.89:1) |
| 설명 (#666 on #FFF) | AI Summary 등 | 5.74:1 | 통과 | 유지 |
| 힌트 (#CCC on #FAFAFA) | 패널 힌트 | 1.56:1 | 미달(장식적 허용) | 장식 텍스트로 분류, aria-hidden |
| 힌트 (#AAA on #FFF) | 메타정보 | 2.32:1 | 미달 | `#767676`으로 변경 |
| Spelling (#92400E on #FEF3C7) | 배지 | 5.03:1 | 통과 | 유지 |
| Fact (#991B1B on #FEE2E2) | 배지 | 5.87:1 | 통과 | 유지 |
| Style (#3730A3 on #E0E7FF) | 배지 | 5.14:1 | 통과 | 유지 |
| Dark 본문 (#555 on #0A0A0A) | 비활성 | 3.13:1 | 미달 | `#737373`으로 변경 (4.56:1) |
| Dark 활성 (#E0E0E0 on #0A0A0A) | 활성 단락 | 14.7:1 | 통과 | 유지 |

#### 개선된 접근성 토큰

```css
:root {
  --text-body-a11y:        #767676;    /* 비활성 본문 (기존 #888888에서 개선) */
  --text-tertiary-a11y:    #6B6B6B;    /* 라벨 (기존 #888888에서 개선) */
  --text-quaternary-a11y:  #767676;    /* 메타/힌트 (기존 #AAAAAA에서 개선) */
}

[data-theme="dark"] {
  --text-body-a11y:        #737373;    /* 비활성 본문 (기존 #555555에서 개선) */
}
```

### 5.2 키보드 네비게이션

#### 전역 단축키

| 단축키 | 동작 | 컨텍스트 |
|--------|------|----------|
| `Cmd+I` / `Ctrl+I` | Inspector 토글 | 에디터 |
| `Cmd+Shift+F` | Focus Mode 토글 | 에디터 |
| `Cmd+,` | 설정 열기 | 전역 |
| `Escape` | 모달/패널 닫기 | 모달, Inspector |
| `Tab` | 다음 포커스 가능 요소 | 전역 |
| `Shift+Tab` | 이전 포커스 가능 요소 | 전역 |

#### 포커스 관리 규칙

```
모달 열기:
  1. 포커스 트랩 활성화 (모달 내부로 한정)
  2. 첫 포커스: 모달 닫기 버튼
  3. Tab 순서: 닫기 -> 콘텐츠 -> CTA 버튼
  4. Escape로 닫기 시 트리거 요소로 포커스 복원

Inspector 열기:
  1. 포커스는 에디터에 유지 (Inspector는 보조 패널)
  2. Cmd+I로 열면 Inspector 첫 항목으로 포커스 이동
  3. Inspector 내 Tab으로 리뷰 아이템 순회
  4. Enter로 리뷰 아이템 선택 시 에디터 해당 위치로 이동
```

### 5.3 스크린 리더 지원

#### ARIA 라벨 맵

```html
<!-- 에디터 영역 -->
<main role="main" aria-label="텍스트 에디터">
  <article aria-label="문서: The Art of Simplicity">
    <h1>The Art of Simplicity</h1>
    <p aria-current="true"><!-- 활성 단락 --></p>
    <p><!-- 비활성 단락 --></p>
  </article>
</main>

<!-- Inspector 패널 -->
<aside
  role="complementary"
  aria-label="Inspector 패널"
  aria-hidden="false"  <!-- Inspector가 닫혀있으면 true -->
>
  <section aria-label="문서 통계">...</section>
  <section aria-label="리뷰 항목">
    <div role="alert" aria-live="polite">
      <!-- 새 리뷰 항목 추가 시 스크린 리더에 알림 -->
    </div>
  </section>
  <section aria-label="AI 요약">...</section>
</aside>

<!-- 인증서 모달 -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-label="인증서 발행"
>
  ...
</dialog>

<!-- 리뷰 배지 -->
<span role="status" aria-label="맞춤법 경고: Possible typo detected">
  <span class="badge">Spelling</span>
</span>
```

### 5.4 모션 접근성

```css
@media (prefers-reduced-motion: reduce) {
  /* 모든 전환 애니메이션 비활성화 */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Inspector 즉시 표시/숨김 */
  .inspector-panel {
    transition: none;
  }

  /* Focus Mode 즉시 전환 */
  .paragraph-inactive {
    transition: none;
  }
}
```

---

## 6. 마이크로 인터랙션

### 6.1 에디터 핵심 인터랙션

#### 단락 활성화/비활성화

```css
/* 커서가 단락에 진입할 때 */
.paragraph {
  color: var(--text-body);
  transition: color 400ms ease, opacity 400ms ease;
}
.paragraph.active {
  color: var(--text-active);
}

/* 커서 깜빡임 */
@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.editor-cursor {
  animation: cursor-blink 1s step-end infinite;
  width: 1.5px;
  background: var(--text-primary);
}
```

#### 자동 저장 인디케이터

```
위치: 에디터 우상단 (Inspector 닫힌 상태) 또는 Inspector 하단
동작:
  - 저장 중: 작은 원형 도트 pulse 애니메이션 (opacity 0.3 -> 1, 800ms)
  - 저장 완료: 체크 아이콘으로 morph (200ms), 2초 후 페이드아웃
  - 크기: 8x8px 도트 / 12x12px 체크
  - 색상: var(--text-disabled)
```

### 6.2 Inspector 인터랙션

#### 리뷰 아이템 호버

```css
.review-item {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
}
.review-item:hover {
  background: #F8F8F8;
  border-color: #D0D0D0;
  transform: translateY(-1px);
}
.review-item:active {
  transform: translateY(0);
}
```

#### 통계 숫자 카운트업

```
Inspector 최초 표시 시 통계 숫자 카운트업 애니메이션:
  - 0 -> 847 (Words): 600ms, ease-out
  - 0 -> 4 (Paragraphs): 400ms, ease-out
  - 0 -> 3m (Read time): 500ms, ease-out
  - 각 숫자 시작 시점: 100ms 딜레이로 스태거
  - 폰트: Playfair Display Italic 28px
```

### 6.3 인증서 관련 애니메이션

#### 검증 체크 순차 등장

```css
.verify-check {
  opacity: 0;
  transform: translateX(-8px);
}
.verify-check.visible {
  opacity: 1;
  transform: translateX(0);
  transition: opacity 300ms ease, transform 300ms ease;
}

/* 스태거 딜레이 */
.verify-check:nth-child(1) { transition-delay: 0ms; }
.verify-check:nth-child(2) { transition-delay: 150ms; }
.verify-check:nth-child(3) { transition-delay: 300ms; }
```

#### 인증서 발급 버튼 상태 변화

```
Idle:      검은 배경 + 흰 텍스트 + 링크 아이콘
Hover:     배경 #1A1A1A, scale(1.01)
Loading:   텍스트 -> 스피너로 교체 (crossfade 200ms)
Success:   배경 #22C55E로 전환 + 체크 아이콘 + "발급 완료!" 텍스트
           (500ms 후 링크 공유 UI로 전환)
```

#### 방패 배지 애니메이션 (인증서 카드)

```css
@keyframes badge-appear {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.1) rotate(10deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}
.certificate-badge {
  animation: badge-appear 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 6.4 모달 전환

```css
/* 오버레이 */
.modal-overlay {
  opacity: 0;
  transition: opacity 300ms ease;
}
.modal-overlay.visible {
  opacity: 1;
}

/* 모달 본체 */
.modal {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
  transition: opacity 300ms ease, transform 350ms cubic-bezier(0.4, 0, 0.2, 1);
}
.modal.visible {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* 닫기 */
.modal.closing {
  opacity: 0;
  transform: scale(0.98) translateY(5px);
  transition-duration: 200ms;
}
```

### 6.5 테마 전환 (Light <-> Dark)

```css
/* 전체 화면 크로스페이드 */
:root {
  transition:
    background-color 500ms ease,
    color 500ms ease;
}

/* 개별 요소 전환은 CSS 변수 transition으로 처리 */
* {
  transition:
    background-color 300ms ease,
    color 300ms ease,
    border-color 300ms ease,
    box-shadow 300ms ease;
}
```

---

## 7. 프로토타입 개선점

### 7.1 구조적 개선

#### [높음] 디자인 토큰/변수 미정의
- **현재**: .pen 파일에 변수(variables)가 하나도 정의되지 않음. 모든 색상이 하드코딩
- **개선**: 위 2.1절의 CSS Custom Properties를 Pencil 변수 시스템으로 등록
- **영향**: 테마 전환, 일관성 유지, 다크모드 구현 효율

#### [높음] 재사용 컴포넌트 미정의
- **현재**: 10개 화면 모두 개별 프레임으로 구성, reusable 컴포넌트가 0개
- **개선**: Badge, ReviewItem, StatItem, NavItem, VerifyCheckItem, Button, Toggle 등을 재사용 컴포넌트로 추출
- **영향**: 설계 일관성, 유지보수성, 개발 효율

#### [중간] 다크 모드 화면 커버리지 부족
- **현재**: 에디터 1개 화면만 다크 모드 존재. Inspector, 설정, 인증서의 다크 모드 없음
- **개선**: 모든 화면에 대해 Light/Dark 쌍 제작

### 7.2 시각적 개선

#### [높음] 접근성 색상 대비 미달
- **현재**: 비활성 본문(#888), 라벨(#888), 힌트(#CCC, #AAA) 모두 WCAG AA 미달
- **개선**: 5절에서 제시한 a11y 토큰으로 교체
- **영향**: WCAG 2.1 AA 인증 불가

#### [중간] Inspector 패널 하단 힌트 텍스트 개선
- **현재**: "Move mouse right to toggle" 이라는 텍스트가 상시 표시
- **개선**: 첫 3회 방문 시에만 표시 후 자동 숨김. 대신 오른쪽 가장자리에 미세한 그래디언트 힌트(2px 폭) 상시 표시
- **이유**: 학습 완료 후에는 불필요한 시각적 노이즈

#### [중간] 에디터 본문 타이포그래피 폰트 선택
- **현재**: 본문에 Inter 사용 (시스템/UI 폰트)
- **제안**: 글쓰기 전용 본문 서체로 **Lora** 또는 **Source Serif 4** 옵션 추가. Inter는 UI 텍스트에만 사용하고, 사용자가 에디터 본문 폰트를 선택할 수 있도록 설정에서 제공
- **이유**: 에디터의 "글쓰기" 경험을 차별화. 세리프 본문 서체가 종이 위의 글쓰기 느낌을 강화

#### [낮음] 코드 블록 구문 강조 색상 체계
- **현재**: 코드 블록 내 텍스트 색상이 제한적 (#4ADE80, #60A5FA 등)
- **개선**: 별도의 코드 전용 컬러 팔레트 정의 (키워드, 문자열, 주석, 함수명 등 구분)

### 7.3 인터랙션 개선

#### [높음] Focus Mode 프로토타입 부재
- **현재**: 설정에 Focus Mode 토글이 있으나, 실제 Focus Mode 화면이 없음
- **개선**: Focus Mode 적용 상태의 에디터 프로토타입 추가 (비활성 단락 디밍, Inspector 숨김, 확장된 여백)

#### [높음] 모바일/태블릿 뷰 부재
- **현재**: 모든 화면이 1440px 폭의 데스크톱 전용
- **개선**: 최소 768px(태블릿), 375px(모바일) 프로토타입 추가
- **우선순위**: 에디터 > 인증서 검증 > 설정 순

#### [중간] Inspector 진입점 불명확
- **현재**: 마우스를 오른쪽으로 이동해야 Inspector가 열린다는 것이 프로토타입에서 명확하지 않음
- **개선**: 에디터 우측에 미세한 "손잡이" UI 요소 추가 (세로 점선 또는 작은 화살표, opacity 0.2)

#### [중간] 인증서 발행 진입점 불명확
- **현재**: 에디터에서 인증서 모달로 어떻게 진입하는지 트리거 UI가 없음
- **개선**: Inspector 하단 또는 에디터 상단에 "Publish" 버튼/메뉴 추가

### 7.4 콘텐츠/카피 개선

#### [낮음] 언어 혼재
- **현재**: 인증서 모달은 한국어, 에디터 UI는 영어 (Inspector, Document Stats 등)
- **개선**: i18n 시스템 적용. 기본 언어 설정에 따라 전체 UI 언어 통일
- **참고**: 인증서 검증 페이지는 다국어 사용자를 고려해 한국어+영어 병기도 가능

#### [낮음] AI Summary 위치 재고
- **현재**: Inspector 최하단에 위치하여 스크롤 필요 가능성
- **제안**: 접이식(collapsible) 섹션으로 변경. 또는 Inspector 상단에 요약 한 줄 표시 후 "더 보기"로 확장

---

## 부록: 아이콘 시스템

### 사용 아이콘 라이브러리: Lucide

| 아이콘명 | 용도 | 위치 |
|----------|------|------|
| `pen-line` | Zen Writing 로고 | 인증서 검증 상단바 |
| `shield-check` | 인증 배지, 검증 상태 | 인증서 카드, 상단바 |
| `circle-check` | 검증 항목 통과 | 인증서 체크리스트 |
| `link` | 링크 생성 | 발행 버튼 |
| `user` | 계정 | 설정 네비게이션 |
| `hard-drive` | 저장소 | 설정 네비게이션 |
| `palette` | 외형 | 설정 네비게이션 |
| `brain` / `sparkles` | AI 연동 | 설정 네비게이션 |
| `info` | 정보/About | 설정 네비게이션 |
| `x` | 닫기 | 모달 헤더 |

### 아이콘 크기 규격

| 용도 | 크기 | stroke-width |
|------|------|-------------|
| 네비게이션 | 16x16px | 1.5px |
| 인라인 (배지 내부) | 16x16px | 2px |
| 헤더/로고 | 18x18px | 1.5px |
| 인증서 배지 내부 | 24x24px | 2px |

---

## 부록: 구현 우선순위 로드맵

### Phase 1: 코어 에디터 (MVP)
1. 에디터 텍스트 렌더링 + 커서
2. 단락 활성/비활성 상태 전환
3. Light/Dark 테마 전환
4. Focus Mode 기본 구현

### Phase 2: AI 피드백
5. 인라인 피드백 밑줄 시스템
6. Inspector 패널 (슬라이드 인/아웃)
7. 리뷰 아이템 표시 + 본문 연결
8. AI Summary 영역

### Phase 3: 인증 시스템
9. 인증서 발행 모달
10. 인증서 검증 공개 페이지
11. 발행 플로우 애니메이션

### Phase 4: 설정 및 고도화
12. 설정 모달 (Account / Storage / Appearance / AI)
13. 코드 블록 렌더링
14. 반응형 레이아웃 (Tablet / Mobile)
15. i18n 다국어 지원
