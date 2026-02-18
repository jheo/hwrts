# HumanWrites 통합 프로젝트 계획서 (Master Plan)

> **버전**: 3.0 (전원 합의)
> **작성일**: 2026-02-18
> **최종 수정**: 2026-02-18
> **상태**: 최종 확정 (7인 전문가 조건부 찬성 → PM 최종 결정 10건 반영)
> **역할**: 프로젝트 매니저 통합 문서

---

## 목차

1. [프로젝트 개요 및 비전](#1-프로젝트-개요-및-비전)
2. [핵심 기능 요구사항 (PRD)](#2-핵심-기능-요구사항-prd)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [확정 기술 스택](#4-확정-기술-스택)
5. [데이터 모델](#5-데이터-모델)
6. [Human Written 인증 시스템 상세](#6-human-written-인증-시스템-상세)
7. [AI 어시스트 시스템 상세](#7-ai-어시스트-시스템-상세)
8. [UX/UI 전략](#8-uxui-전략)
9. [API 설계](#9-api-설계)
10. [개발 로드맵 (10주 MVP + Post-MVP 이터레이션)](#10-개발-로드맵-10주-mvp--post-mvp-이터레이션)
11. [에이전트 팀 개발 전략](#11-에이전트-팀-개발-전략)
12. [테스트 및 검증 계획](#12-테스트-및-검증-계획)
13. [멀티플랫폼 확장 전략](#13-멀티플랫폼-확장-전략)
14. [보안 및 프라이버시](#14-보안-및-프라이버시)
15. [비기능 요구사항](#15-비기능-요구사항)
16. [리스크 및 완화 방안](#16-리스크-및-완화-방안)
17. [성공 지표 (KPI)](#17-성공-지표-kpi)
18. [비용 모델](#18-비용-모델)
19. [Phase 3 리뷰 결과 반영 요약](#19-phase-3-리뷰-결과-반영-요약)
20. [부록](#부록)

---

## 1. 프로젝트 개요 및 비전

### 1.1 핵심 가치 제안

**"당신의 글이 당신의 것임을 증명하는 글쓰기 도구"**

AI가 생성한 콘텐츠가 범람하는 시대에, HumanWrites는 세 가지 문제를 동시에 해결한다:

| 문제 | HumanWrites의 해답 |
|------|---------------------|
| 글쓰기 도구가 너무 복잡하다 | **Zen 에디터**: 글 자체에만 집중하는 미니멀 인터페이스 |
| 내 글이 AI가 아닌 내가 썼음을 증명할 수 없다 | **Human Written 인증**: 타이핑 행위 자체를 기록하고 검증 가능한 인증서 발행 |
| AI 보조를 받으면 "사람이 쓴 글"이 아니게 된다 | **AI 어시스트**: 글을 대신 쓰지 않고, 맞춤법/팩트/스타일만 비침습적으로 제안 |

**핵심 원칙**: AI는 "조수"이지 "저자"가 아니다. AI 어시스트 기능은 글의 내용을 생성하지 않으며, 인증서에 AI 사용 여부와 범위를 투명하게 기록한다.

> *출처: 기획자 - 제품 전략 문서 1.1절*

### 1.2 차별화 포인트

#### "과정 기반 인증" vs "결과 기반 탐지"

| 차원 | 기존 도구 (GPTZero 등) | HumanWrites |
|------|----------------------|-------------|
| **방법** | 완성된 텍스트를 사후 통계 분석 | 글쓰기 과정 자체(키스트로크, 편집 패턴, 시간 흐름)를 기록하여 증명 |
| **정확도** | 오탐율 1.5~3% | 과정 기록 기반으로 위조 극히 어려움 |
| **투명성** | 결과만 제시 | 전 과정 투명 공개 |
| **시점** | 사후(post-hoc) | 실시간(in-process) |

#### "비침습적 AI 보조" 포지셔닝

- Grammarly/Notion AI: 텍스트를 직접 수정하거나 생성 (AI가 저자 역할)
- HumanWrites: AI는 밑줄/제안만 표시, 적용은 사용자가 명시적으로 선택
- AI 보조를 받더라도 인증서에 "AI 사용 범위"가 투명하게 기록됨

#### "글쓰기 도구 + 인증"의 통합

기존 시장에서 글쓰기 도구(iA Writer 등)와 검증 도구(GPTZero 등)는 완전히 분리되어 있다. HumanWrites는 글을 쓰는 행위 자체가 인증 데이터를 생성하므로, 별도 도구가 불필요하다.

### 1.3 타겟 사용자

#### Primary 세그먼트

| 페르소나 | 핵심 니즈 | HumanWrites 가치 |
|----------|-----------|-------------------|
| **프리랜서 작가/저널리스트** (이서연, 34세) | 작성 원본 증명, 편집자 신뢰 확보 | 인증서 링크로 즉시 검증 가능 |
| **학생/연구자** (박준호, 26세) | 학술 무결성 증명 | 타이핑 패턴 + AI 미사용 인증 |
| **콘텐츠 크리에이터** (Alex Chen, 29세) | 브랜드 신뢰도, 차별화 | 공개 검증 페이지로 독자가 직접 확인 |
| **전문 저널리스트** (김하은, 42세) | 팩트 체크 보조, 인간 작성 증명 | 편집장/독자에게 기사 작성 과정의 투명성 제공 |

> *출처: UX 디자이너 - UX 전략 문서 1.1절 페르소나*

#### Secondary 세그먼트

| 세그먼트 | 핵심 니즈 |
|----------|-----------|
| **작가 지망생** | 집중 환경, 진행 상황 추적 |
| **기업 콘텐츠팀** | 팀 단위 인증, 콘텐츠 정책 준수 |
| **출판사/미디어** | 일괄 검증, API 연동 |

#### 시장 규모

- **TAM**: 글로벌 디지털 콘텐츠 제작 도구 시장 ~$25B + AI 콘텐츠 탐지 시장 ~$1.1B
- **SAM**: 미니멀 글쓰기 앱 사용자 ~15M + AI 검증 필요 작가/학생 ~50M = 겹치는 영역 ~5M
- **SOM (3년)**: 100K MAU, 10K 유료 구독자, ARR $1.2M

---

## 2. 핵심 기능 요구사항 (PRD)

### 2.1 Zen 에디터

#### 제품 철학

에디터의 모든 결정은 **"글쓰기 행위 자체를 신성하게 보호한다"**는 명제에서 출발한다. UI 요소가 차지하는 면적은 전체의 5% 미만이어야 하며, 어떤 패널도 사용자의 명시적 의도 없이 자동 표시되지 않는다.

#### MVP 필수 기능 (축소된 범위)

| ID | 기능 | 상세 | 수용 기준 |
|----|------|------|-----------|
| E-001 | **리치 텍스트 에디팅** | 제목(H1-H3), 본문, 굵게, 기울임, 링크, 인용 | Markdown 단축키 지원 (`#`, `**`, `` ` `` 등) |
| E-002 | **단락 포커스 시스템** | 현재 커서 위치 단락만 활성(검정), 나머지 비활성(회색) | 단락 전환 시 400ms ease 애니메이션 |
| E-003 | **Focus Mode (Soft만)** | Soft(0.4)만 MVP에 포함 | Cmd+Shift+F 토글 |
| E-004 | **Light/Dark 테마** | 독립 설계된 두 모드 (반전이 아닌 개별 최적화) | 500ms crossfade 전환, system 자동 감지 |
| E-005 | **자동 저장** | 로컬 저장소(IndexedDB)에 실시간 자동 저장 | 타이핑 중단 2초 후 저장 |
| E-006 | **문서 통계** | 단어 수, 단락 수, 읽기 시간 실시간 계산 | Inspector 패널 내 표시 |
| E-007 | **Inspector 패널** | 우측 슬라이드 사이드바 (통계, 리뷰) | 미니 아이콘 + 세로 점선 어포던스, Cmd+I |
| E-008 | **키보드 단축키** | Cmd+I, Cmd+Shift+F, Cmd+K, Escape 등 | Command Palette (Cmd+K) |

> *출처: 기획자 PRD + UX 디자이너 에디터 UX 심화 + 프론트엔드 개발자 에디터 아키텍처*
>
> **v3.0 변경**: MVP 범위를 대폭 축소하여 핵심 글쓰기 경험에 집중한다. Focus Mode는 Soft만 MVP에 포함하고, 저장은 IndexedDB 로컬만 지원한다. Desktop만 MVP 대상이다.

#### Post-MVP 확장 기능

| ID | 기능 | 우선순위 | 이터레이션 |
|----|------|----------|-----------|
| E-009 | **반응형 레이아웃** (Desktop 외 Laptop/Tablet/Mobile) | 높음 | Iter 5 |
| E-010 | **코드 블록** 구문 강조 지원 | 높음 | Iter 1 |
| E-011 | **Typewriter Mode** (현재 줄 화면 40% 고정) | 높음 | Iter 1 |
| E-012 | **Floating Toolbar** (텍스트 선택 시 서식) | 중간 | Iter 1 |
| E-013 | **Slash Commands** (빈 줄에서 "/" 명령 메뉴) | 중간 | Iter 1 |
| E-014 | **Focus Mode Deep/Zen** (0.2+blur / 0.1+blur) | 높음 | Iter 1 |
| E-101 | 본문 폰트 선택 (Lora / Source Serif 4 / Inter / JetBrains Mono) | 높음 | Iter 1 |
| E-102 | 폰트 크기 조절 (14~24px 슬라이더) | 높음 | Iter 1 |
| E-103 | 다중 문서 관리 (폴더, 검색) | 높음 | Iter 4 |
| E-104 | Markdown/PDF/DOCX 내보내기 | 중간 | Iter 4+ |
| E-105 | 버전 히스토리 (스냅샷, 차이점 비교) | 중간 | Iter 4+ |
| E-106 | 클라우드 동기화 (멀티 디바이스) | 중간 | Iter 4 |
| E-107 | Writing Goal (단어 수 목표 + 미니 프로그레스 바) | 중간 | Iter 5+ |
| E-108 | 커스텀 테마 | 낮음 | Iter 5+ |
| E-109 | 협업 편집 (CRDT) | 낮음 | Iter 6+ |
| E-110 | 오프라인 모드 (PWA) | 중간 | Iter 5 |
| E-111 | Screen Recording (Opt-in) | 중간 | Iter 3+ |

### 2.2 Human Written 인증

#### 인증 방법론: 과정 기반 증명(Process-Based Proof)

##### MVP 검증 모델: Layer 1만 (키스트로크 다이나믹스)

```
MVP (Layer 1 only):
  키스트로크 다이나믹스 (100%)
  ├── 키 누름 시간 (Dwell Time)
  ├── 키 간 간격 (Flight Time)
  ├── 타이핑 속도 변화 패턴
  ├── 오류 빈도 및 수정 패턴
  └── 일시 정지 패턴 (생각하는 시간)

Post-MVP (3계층 확장):
  Layer 1: 키스트로크 다이나믹스 (40%)  ← MVP에서 검증 완료
  Layer 2: 편집 패턴 분석 (35%)         ← Iter 2
    ├── 편집 이벤트 타임라인
    ├── 커서 이동 패턴 (순차 vs 점프)
    ├── 사고 흐름 지표
    └── 구조 변경 패턴
  Layer 3: 콘텐츠 무결성 검증 (25%)     ← Iter 2
    ├── AI 텍스트 유사도 (Perplexity/Burstiness)
    ├── 문체 일관성
    └── 외부 소스 붙여넣기 비율
```

> **v3.0 변경**: MVP에서는 Layer 1(키스트로크 다이나믹스)만 구현한다. Layer 2(편집 패턴), Layer 3(콘텐츠 무결성), ONNX DistilBERT, GPTZero 연동은 모두 Post-MVP로 이동한다. 3계층 가중치(40/35/25)는 Post-MVP 확장 시 적용한다.

##### 신뢰도 등급

**MVP: 이분법 (Certified / Not Certified)**

| 등급 | 판정 | 라벨 | 인증서 발행 |
|------|------|------|-------------|
| **Certified** | Layer 1 임계값 통과 | **Human Written** | 가능 (표준 배지) |
| **Not Certified** | Layer 1 임계값 미달 | **Not Certified** | 불가 |

> **v3.0 변경**: MVP에서는 Certified / Not Certified 이분법으로 단순화한다. 6등급 체계(A+/A/B/C/D/F)는 Post-MVP(Iter 2)에서 Layer 2, Layer 3 도입과 함께 활성화한다.

**Post-MVP: 6등급 체계 (Iter 2+)**

| 등급 | 점수 | 라벨 | 인증서 발행 |
|------|------|------|-------------|
| A+ | 95-100 | **Fully Human** | 가능 (풀 인증, 금색 배지) |
| A | 85-94 | **Human Written** | 가능 (표준 인증, 은색 배지) |
| B | 70-84 | **Mostly Human** | 가능 (AI 보조 표기, 동색 배지) |
| C | 50-69 | **Mixed** | 조건부 (상세 내역 공개) |
| D | 30-49 | **Likely AI-Assisted** | 불가 |
| F | 0-29 | **Likely AI-Generated** | 불가 |

##### 인증서 데이터 구조

```typescript
interface HumanWrittenCertificate {
  // 식별
  id: string;                    // UUID v4
  version: string;               // 인증 프로토콜 버전
  shortHash: string;             // 32자 short hash (URL용)

  // 문서 정보
  document: {
    title: string;
    author: string;
    wordCount: number;
    paragraphCount: number;
    createdAt: ISO8601;
    completedAt: ISO8601;
    totalEditTime: Duration;     // 실제 활성 편집 시간
    contentHash: string;         // SHA-256
  };

  // 검증 결과
  verification: {
    overallScore: number;        // 0-100
    // MVP: 'Certified' | 'Not Certified'
    // Post-MVP: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
    grade: 'Certified' | 'Not Certified';
    label: string;

    keystrokeDynamics: {
      score: number;
      typingSpeedVariance: number;
      errorCorrectionRate: number;
      pausePatternEntropy: number;
    };

    // Post-MVP (Iter 2+)
    editPattern?: {
      score: number;
      nonLinearEditRatio: number;
      revisionFrequency: number;
      cursorJumpEntropy: number;
    };

    // Post-MVP (Iter 2+)
    contentIntegrity?: {
      score: number;
      aiSimilarityIndex: number;
      pasteRatio: number;
      stylistic_consistency: number;
    };
  };

  // AI 사용 투명성
  aiAssistance: {
    enabled: boolean;
    features_used: string[];
    suggestions_accepted: number;
    suggestions_rejected: number;
    total_suggestions: number;
  };

  // 검증 메타
  meta: {
    issuedAt: ISO8601;
    expiresAt: ISO8601 | null;
    verifyUrl: string;           // humanwrites.app/verify/{shortHash}
    signature: string;           // Ed25519 디지털 서명
    publicKeyUrl: string;        // /.well-known/humanwrites-public-key.pem
  };
}
```

### 2.3 AI 어시스트

#### 설계 철학: "비침습적 AI"

1. **AI는 글을 쓰지 않는다** - 문장/단락 생성 기능 미제공
2. **제안은 사용자가 명시적으로 수락해야 적용** - 자동 수정 없음
3. **모든 AI 활동은 투명하게 기록** - 인증서에 반영
4. **기능별 개별 On/Off** - 사용자가 원하는 수준만 활성화

#### 기능 상세

**MVP: 맞춤법/문법 검사만**

| 기능 | 트리거 타이밍 | 인라인 표시 | Inspector 표시 | 인증서 기록 | MVP |
|------|-------------|-----------|--------------|------------|:---:|
| **맞춤법/문법** | 타이핑 멈춤 1.5초 (단어) / 3초 (단락) | wavy underline (opacity 0.3) | Review Item | "맞춤법 제안 N건 중 M건 수락" | O |
| **팩트 체크** | 전체 분석 후 / 수동 요청 | dotted underline (opacity 0.3) | Review Item + 출처 | "팩트 체크 N건 수행, M건 수정" | Iter 3 |
| **스타일 제안** | 타이핑 멈춤 8초 (전체 문서) | dashed underline (opacity 0.2) | Review Item | "스타일 제안 N건 중 M건 수락" | Iter 3 |
| **AI 요약** | Inspector 열기 시 / 500단어 변화 시 | N/A | AI Summary 섹션 | N/A | Iter 3 |

> *출처: 기획자 PRD 2.C절 + UX 디자이너 AI 어시스트 UX 4절 + 프론트엔드 개발자 AI 피드백 타이밍 규칙*
>
> **v3.0 변경**: MVP에서는 맞춤법/문법 검사만 포함한다. 팩트 체크, 스타일 제안, AI 요약은 Post-MVP Iter 3으로 이동한다.

---

## 3. 시스템 아키텍처

### 3.1 프로젝트 구조 (폴리글랏)

프론트엔드(TypeScript)와 백엔드(Kotlin)를 분리한 폴리글랏 구조를 채택한다. 각각 독립적인 빌드 시스템(Turborepo / Gradle)을 사용하며, Makefile로 통합 오케스트레이션한다.

```
humanwrites/
├── frontend/                    # TypeScript (Turborepo 관리)
│   ├── apps/
│   │   ├── web/                 # Next.js 15 웹앱 (App Router)
│   │   ├── desktop/             # Tauri v2 데스크톱 앱
│   │   ├── mobile/              # Capacitor 모바일 앱
│   │   └── vscode/              # VS Code Extension
│   │
│   ├── packages/
│   │   ├── core/                # 순수 TypeScript 코어 로직 (DOM/Node 의존성 제로)
│   │   │   ├── typing-analyzer/ # 타이핑 분석 알고리즘
│   │   │   ├── certificate/     # 인증서 생성/검증 (클라이언트 사이드)
│   │   │   ├── scoring/         # 신뢰도 스코어 계산 (미리보기용)
│   │   │   └── ai-detector/     # AI 텍스트 탐지 (통계 분석, 클라이언트)
│   │   │
│   │   ├── ui/                  # 공유 UI 컴포넌트 (Radix + Tailwind)
│   │   │   ├── atoms/           # Text, Icon, Badge, Button, Toggle, Tooltip 등
│   │   │   ├── molecules/       # StatItem, ReviewItem, InlinePopover, Toast 등
│   │   │   ├── organisms/       # Inspector, CertificateCard, ShareModal 등
│   │   │   └── tokens/          # 디자인 토큰 (CSS Variables)
│   │   │
│   │   ├── editor-react/        # TipTap 기반 에디터 React 컴포넌트
│   │   │   ├── extensions/      # ProseMirror 확장 (TypingAnalytics, FocusMode 등)
│   │   │   ├── toolbar/         # Floating Toolbar, Slash Commands
│   │   │   └── hooks/           # useEditor, useTypingMetrics 등
│   │   │
│   │   ├── api-client/          # orval 자동 생성 API 클라이언트 (TanStack Query hooks)
│   │   │
│   │   └── realtime/            # WebSocket(STOMP, 순수 WebSocket) + SSE 클라이언트 유틸리티
│   │
│   ├── turbo.json               # Turborepo 파이프라인 설정
│   ├── pnpm-workspace.yaml      # pnpm 워크스페이스
│   └── package.json
│
├── backend/                     # Kotlin (Gradle 관리)
│   ├── build.gradle.kts         # Gradle Kotlin DSL
│   ├── settings.gradle.kts
│   └── src/main/kotlin/com/humanwrites/
│       ├── config/              # Spring 설정 (Security, WebSocket, JDBC, Redis 등)
│       ├── domain/              # DDD 기반 도메인
│       │   ├── user/            # 사용자, 인증, 설정
│       │   ├── document/        # 문서, 버전 관리
│       │   ├── session/         # 글쓰기 세션, 키스트로크 분석
│       │   ├── certificate/     # 인증서 생성, 검증, 서명
│       │   └── ai/              # AI 어시스트 (맞춤법, 팩트체크, 스타일, 요약)
│       ├── infrastructure/      # 인프라스트럭처 계층
│       │   ├── persistence/     # Exposed ORM (JDBC + Virtual Threads)
│       │   ├── security/        # Spring Security, JWT, OAuth2
│       │   ├── cache/           # Redis (세션, 캐시, Rate Limiting)
│       │   └── external/        # AI 프로바이더 (Claude, OpenAI) RestClient 호출
│       └── presentation/        # 프레젠테이션 계층
│           ├── rest/            # REST API 컨트롤러
│           ├── websocket/       # STOMP WebSocket 핸들러
│           ├── sse/             # SSE 엔드포인트 (AI 스트리밍)
│           └── dto/             # 요청/응답 DTO
│
├── schema/                      # OpenAPI 스키마 (공유, 자동 생성)
│   └── openapi.yaml             # SpringDoc에서 자동 생성 → orval 입력
│
├── docker/                      # 로컬 개발 환경
│   └── docker-compose.yml       # PostgreSQL+TimescaleDB, Redis
│
├── scripts/                     # 빌드/개발 유틸리티 스크립트
├── Makefile                     # 통합 빌드 오케스트레이션
└── .github/workflows/           # CI/CD (frontend.yml + backend.yml 분리)
```

> **핵심 설계 원칙**:
> - **프론트/백 분리**: 프론트엔드(TypeScript)와 백엔드(Kotlin)는 독립적인 빌드 시스템을 사용하며, OpenAPI 스키마로만 연결된다
> - **OpenAPI as Single Source of Truth**: 백엔드 SpringDoc이 생성한 `openapi.yaml`에서 orval이 TypeScript API 클라이언트를 자동 생성한다
> - `frontend/packages/core`는 순수 TypeScript로 DOM/Node 의존성 제로 → 웹, 데스크톱, 모바일, VS Code 모두에서 공유
> - `frontend/packages/editor-react`는 React 의존성이 있으므로 웹/데스크톱/모바일에서만 사용
> - `frontend/packages/ui`는 Radix UI Primitives 기반으로 접근성 기본 제공
> - **인프라 비의존**: 백엔드는 Spring Profile로 환경을 분리하고, 포트/어댑터 패턴으로 클라우드 서비스를 추상화한다

### 3.2 서비스 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                        클라이언트 레이어                          │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Web App  │  │ Desktop  │  │  Mobile  │  │  VS Code │       │
│  │ (Next.js)│  │ (Tauri)  │  │(Capacitor│  │(Extension│       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│       └──────────────┼──────────────┼──────────────┘             │
│                      │              │                            │
│            ┌─────────▼──────────────▼─────────┐                 │
│            │   frontend/packages/core (Pure TS)│                 │
│            │  typing-analyzer | certificate    │                 │
│            │  scoring | ai-detector            │                 │
│            └──────────────────────────────────┘                 │
│                      │                                          │
│            ┌─────────▼────────────────────────┐                 │
│            │   api-client (orval generated)    │                 │
│            │   + realtime (STOMP/SSE client)   │                 │
│            └──────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
              │ REST / WebSocket(STOMP) / SSE
              │
    ┌─────────▼───────────────────────────────────────┐
    │  Spring Boot 3.x (Kotlin, Spring MVC            │
    │                + Virtual Threads, Java 21)       │
    │                                                  │
    │  ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
    │  │   REST   │ │ WebSocket│ │      SSE        │  │
    │  │Controller│ │  (STOMP) │ │ (SseEmitter /   │  │
    │  │  (MVC)   │ │@Message  │ │ ResponseBody    │  │
    │  │          │ │ Mapping  │ │  Emitter)       │  │
    │  └────┬─────┘ └────┬─────┘ └──────┬──────────┘  │
    │       └─────────────┼──────────────┘             │
    │                     │                            │
    │  ┌──────────────────▼──────────────────────┐     │
    │  │          Domain Layer (DDD)              │     │
    │  │  user | document | session | cert | ai  │     │
    │  └──────────────────┬──────────────────────┘     │
    │                     │                            │
    │  ┌──────────────────▼──────────────────────┐     │
    │  │       Infrastructure Layer               │     │
    │  │  Exposed (JDBC) | Security | Redis      │     │
    │  │  External AI Clients (RestClient)       │     │
    │  └──────────────────────────────────────────┘     │
    └─────────────────────┬────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐  ┌──────▼──────┐  ┌────▼─────────┐
    │ PostgreSQL │  │   Redis 7   │  │ AI Providers │
    │    16      │  │   Cache +   │  │ (RestClient) │
    │ +Timescale │  │   Session   │  │ Claude /     │
    └───────────┘  └─────────────┘  │ OpenAI       │
                                    └──────────────┘
```

### 3.3 패키지 간 의존 관계

```
                    ┌──────────────────┐
                    │  schema/         │
                    │  openapi.yaml    │  ← Single Source of Truth
                    │  (SpringDoc 생성) │
                    └────────┬─────────┘
                             │ orval codegen
                             ▼
                    ┌──────────────────┐
                    │  api-client      │  ← 자동 생성 (TanStack Query hooks)
                    │  (generated)     │
                    └────────┬─────────┘
                             │
   core ─────────────────────┼──────────► editor-react
     │                       │                  │
     ▼                       ▼                  ▼
    ui ◄────────────── apps/web ◄────────────── ui
                          │
                    ┌─────┘
                    ▼
              realtime (STOMP/SSE client)

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                    │ HTTP / WS / SSE
                    ▼
              backend/ (Spring Boot, Kotlin)
              └── domain / infrastructure / presentation
```

**프론트엔드 의존 규칙**:
- `api-client` → OpenAPI 스키마에서 자동 생성 (수동 편집 금지)
- `core` → 순수 TypeScript, 외부 의존 없음
- `ui` → 외부 의존 없음
- `editor-react` → `core`, `ui` 의존
- `realtime` → STOMP(순수 WebSocket), EventSource 클라이언트
- `apps/web` → 필요한 packages 의존

**프론트-백 연결 규칙**:
- 타입 공유는 `shared-types` 패키지가 아닌 **OpenAPI 스키마**가 Single Source of Truth
- 백엔드 SpringDoc이 `openapi.yaml` 자동 생성 → orval이 TypeScript 클라이언트 자동 생성
- 프론트엔드는 백엔드 코드를 직접 참조하지 않음

---

## 4. 확정 기술 스택

프론트엔드와 백엔드를 명확히 분리한 기술 스택이다. 백엔드는 Kotlin + Spring Boot (Spring MVC + Virtual Threads, Java 21)로, 프론트엔드는 Next.js + TypeScript 생태계를 유지한다.

### 4.1 프론트엔드 기술 스택

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | SSR/SSG(검증 페이지), API Routes(SSE 프록시), 에코시스템 |
| **Editor** | TipTap v2 (ProseMirror) | 안정 버전, 확장성, 한국어 IME 지원, 플러그인 시스템, 활발한 커뮤니티 |
| **State** | Zustand + TanStack Query | 로컬 상태(에디터) + 서버 상태(orval 생성 hooks) 분리 |
| **Styling** | Tailwind CSS v4 + CSS Variables | 디자인 토큰 연동, 빠른 개발, 퍼지로 번들 최소화 |
| **UI** | Radix UI Primitives | 접근성(a11y) 기본 제공, headless 컴포넌트 |
| **API Client** | orval (OpenAPI Generator) | OpenAPI 스키마에서 TanStack Query hooks 자동 생성 |
| **WebSocket** | STOMP.js (순수 WebSocket) | STOMP over WebSocket, Spring 네이티브 호환 (SockJS 제거) |
| **SSE** | Next.js Route Handler (프록시) | Vercel AI SDK 호환 SSE 프록시, 백엔드 SSE 릴레이 |
| **Auth (Client)** | jose (JWT 검증) | Next.js 미들웨어에서 JWT 검증, HttpOnly Cookie 기반 |
| **Build (Frontend)** | Turborepo + pnpm | 패키지별 독립 빌드, incremental 빌드 캐시 |
| **Testing (Frontend)** | Vitest + Playwright + MSW | 유닛/E2E/API 모킹, 빠른 실행, TS 네이티브 |
| **Desktop** | Tauri v2 | 경량(Rust 기반), 웹뷰 활용, 크로스플랫폼 |
| **Mobile** | Capacitor | 웹 코드 90%+ 재사용, 네이티브 플러그인 |
| **Monitoring** | Sentry + PostHog | 에러 추적 + 제품 분석(퍼널, 리텐션) |

### 4.2 백엔드 기술 스택

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Backend Framework** | Spring Boot 3.x + Kotlin (Spring MVC + Virtual Threads, Java 21) | Virtual Threads로 블로킹 코드를 논블로킹처럼 처리, WS/SSE 네이티브, Kotlin Coroutines 사용 가능 (suspend fun controllers) |
| **ORM** | Exposed (JDBC) | Kotlin 네이티브 DSL, Virtual Threads가 JDBC blocking I/O 처리 → R2DBC 불필요 |
| **Auth** | Spring Security + OAuth2 | JWT + HttpOnly Cookie, OAuth2 Client (MVP: Google만, Post-MVP: GitHub/Apple) |
| **Primary DB** | PostgreSQL 16 | ACID, JSONB, 전문 검색, 안정성 |
| **Time-series** | TimescaleDB (PG 확장) | 키스트로크 시계열 데이터 최적화, PG 생태계 활용 |
| **Cache** | Redis 7 | 세션 캐시, AI 응답 캐시, Rate Limiting |
| **API Docs** | SpringDoc OpenAPI | 자동 스키마 생성, TypeScript 클라이언트 생성 기반 |
| **Build (Backend)** | Gradle Kotlin DSL | Spring Boot 공식 권장 |
| **Serialization** | Jackson + jackson-module-kotlin | Spring Boot starter 포함, 추가 의존성 불필요, SpringDoc 완벽 호환 |
| **HTTP Client** | RestClient (Spring 6.1+) | AI API 호출, Virtual Threads에서 동기식으로 호출해도 스레드 블로킹 없음 |
| **Testing (Backend)** | Kotest + MockK + Testcontainers | Kotlin 네이티브 테스트, 실제 DB/Redis 통합 테스트 (목표: < 5분) |
| **DB Migration** | Flyway | 표준, TimescaleDB 호환 |
| **Signing** | Ed25519 (JDK 17+ java.security) | 인증서 비대칭 서명, 공개키 오프라인 검증 |

> **v3.0 변경 (백엔드 기술 스택)**:
> - **WebFlux → Spring MVC + Virtual Threads (Java 21)**: Reactive 스택(Mono, Flux, R2DBC) 전면 제거. Virtual Threads가 blocking I/O를 효율적으로 처리하므로 `Dispatchers.IO` 래핑 불필요. 직접 blocking 호출 가능.
> - **Exposed + R2DBC → Exposed (JDBC) 단독**: 이중 ORM 해소. 키스트로크 배치 INSERT도 JDBC + Virtual Threads로 충분.
> - **kotlinx.serialization → Jackson + jackson-module-kotlin**: Spring Boot starter에 포함, SpringDoc과 완벽 호환.
> - **RabbitMQ 제거**: MVP에서는 Redis만 사용 (캐시 + 세션). 메시지 큐 필요 시 Post-MVP에서 Redis Streams 검토.
> - **FileStoragePort 제거**: MVP는 로컬 저장소(IndexedDB)만. 클라우드 스토리지는 Post-MVP.
> - **ONNX Runtime 제거**: MVP는 Layer 1만. DistilBERT는 Post-MVP(Iter 2).
> - **WebClient → RestClient**: Virtual Threads 환경에서 동기식 HTTP 클라이언트로 충분.

### 4.3 공통 인프라

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **AI** | Claude / OpenAI (RestClient 호출) | 스트리밍 응답, 프로바이더 추상화 |
| **CI/CD** | GitHub Actions | frontend.yml + backend.yml 분리, PR 자동 검증 |
| **Local Dev** | Docker Compose | PostgreSQL+TimescaleDB, Redis |
| **Build Orchestration** | Makefile | 프론트/백 통합 빌드, 스키마 생성 파이프라인 |

> **PM 판단 - 기술 스택 변경 이력**:
> - **v2.0**: Hono(Node.js) → Spring Boot 3.x + Kotlin(WebFlux) 변경
> - **v3.0**: Spring WebFlux → Spring MVC + Virtual Threads (Java 21) 변경. 근거: Reactive 스택의 복잡성 제거, Virtual Threads로 동일한 처리량 달성, 코드 가독성 향상, 이중 ORM(Exposed+R2DBC) 해소

---

## 5. 데이터 모델

### 5.1 ERD

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    users     │       │    documents     │       │ writing_sessions │
├──────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)      │──┐    │ id (PK)          │──┐    │ id (PK)          │
│ email        │  │    │ user_id (FK)     │  │    │ document_id (FK) │
│ name         │  │    │ title            │  │    │ user_id (FK)     │
│ avatar_url   │  │    │ content          │  │    │ started_at       │
│ created_at   │  │    │ word_count       │  │    │ ended_at         │
│ updated_at   │  │    │ status           │  │    │ active_duration  │
└──────────────┘  │    │ created_at       │  │    │ keystrokes_count │
       │          │    │ updated_at       │  │    │ metadata (JSONB) │
       │          │    └──────────────────┘  │    └──────────────────┘
       │          │             │             │             │
       │    ┌─────┘             │             │             │
       │    │                   │             │             │
       │    ▼                   ▼             │             ▼
┌──────┴───────────┐  ┌─────────────────┐    │  ┌───────────────────┐
│  oauth_accounts  │  │document_versions│    │  │ keystroke_events  │
├──────────────────┤  ├─────────────────┤    │  │  (TimescaleDB)    │
│ id (PK)          │  │ id (PK)         │    │  ├───────────────────┤
│ user_id (FK)     │  │ document_id(FK) │    │  │ time (PK)         │
│ provider         │  │ version_num     │    │  │ session_id (FK)   │
│ provider_id      │  │ content         │    │  │ event_type        │
│ created_at       │  │ word_count      │    │  │ key_category      │
└──────────────────┘  │ created_at      │    │  │ dwell_time_ms     │
                      └─────────────────┘    │  │ flight_time_ms    │
                                             │  │ wpm_instant       │
       ┌─────────────────────────────────────┘  │ position          │
       │                                        │ is_error          │
       ▼                                        │ metadata (JSONB)  │
┌──────────────────┐                            └───────────────────┘
│  certificates    │
├──────────────────┤       ┌──────────────────┐
│ id (PK)          │       │  ai_reviews      │
│ document_id (FK) │       ├──────────────────┤
│ user_id (FK)     │       │ id (PK)          │
│ short_hash       │       │ document_id (FK) │
│ overall_score    │       │ review_type      │
│ grade            │       │ content (JSONB)  │
│ verification_data│       │ ai_provider      │
│ ai_usage_data    │       │ ai_model         │
│ content_hash     │       │ suggestions_count│
│ signature        │       │ accepted_count   │
│ issued_at        │       │ created_at       │
│ expires_at       │       └──────────────────┘
│ status           │
└──────────────────┘       ┌──────────────────┐
                           │screen_recordings │
                           ├──────────────────┤
                           │ id (PK)          │
                           │ session_id (FK)  │
                           │ storage_url      │
                           │ duration_sec     │
                           │ resolution       │
                           │ size_bytes       │
                           │ expires_at       │
                           │ created_at       │
                           └──────────────────┘
```

### 5.2 핵심 엔티티 스키마 (SQL)

```sql
-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  avatar_url    TEXT,
  password_hash TEXT,  -- Argon2id (OAuth 전용 사용자는 NULL)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth Accounts
CREATE TABLE oauth_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  provider      VARCHAR(50) NOT NULL,  -- MVP: 'google' only, Post-MVP: 'github', 'apple'
  provider_id   VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- User Settings
CREATE TABLE user_settings (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme         VARCHAR(10) DEFAULT 'system',
  font_family   VARCHAR(50) DEFAULT 'Inter',
  font_size     INT DEFAULT 17,
  focus_mode    VARCHAR(10) DEFAULT 'soft',
  ai_enabled    BOOLEAN DEFAULT true,
  ai_spelling   BOOLEAN DEFAULT true,
  ai_grammar    BOOLEAN DEFAULT true,
  ai_fact_check BOOLEAN DEFAULT true,
  ai_style      BOOLEAN DEFAULT false,
  ai_summary    BOOLEAN DEFAULT true,
  ai_provider   VARCHAR(20) DEFAULT 'claude',
  locale        VARCHAR(10) DEFAULT 'ko',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  word_count    INT DEFAULT 0,
  paragraph_count INT DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'draft',  -- draft, published, archived
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_user ON documents(user_id, updated_at DESC);

-- Document Versions
CREATE TABLE document_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_num   INT NOT NULL,
  content       TEXT NOT NULL,
  word_count    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version_num)
);

-- Writing Sessions
CREATE TABLE writing_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  active_duration INTERVAL,
  keystrokes_count INT DEFAULT 0,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Keystroke Events (TimescaleDB Hypertable)
CREATE TABLE keystroke_events (
  time            TIMESTAMPTZ NOT NULL,
  session_id      UUID NOT NULL REFERENCES writing_sessions(id),
  event_type      VARCHAR(20) NOT NULL,  -- 'keydown', 'keyup', 'paste', 'delete'
  key_category    VARCHAR(20),           -- 'letter', 'number', 'punct', 'modifier', 'nav'
  dwell_time_ms   REAL,
  flight_time_ms  REAL,
  wpm_instant     REAL,
  position        INT,
  is_error        BOOLEAN DEFAULT false,
  metadata        JSONB DEFAULT '{}'::jsonb
);

SELECT create_hypertable('keystroke_events', 'time',
  chunk_time_interval => INTERVAL '1 day'
);

-- Certificates
CREATE TABLE certificates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID REFERENCES documents(id),
  user_id           UUID REFERENCES users(id),
  short_hash        VARCHAR(32) UNIQUE NOT NULL,
  overall_score     REAL NOT NULL,
  grade             VARCHAR(20) NOT NULL,
  verification_data JSONB NOT NULL,
  ai_usage_data     JSONB NOT NULL,
  content_hash      VARCHAR(64) NOT NULL,  -- SHA-256
  signature         TEXT NOT NULL,          -- Ed25519 디지털 서명
  status            VARCHAR(20) DEFAULT 'active',  -- active, expired, revoked
  issued_at         TIMESTAMPTZ DEFAULT NOW(),
  expires_at        TIMESTAMPTZ
);

CREATE INDEX idx_certificates_short_hash ON certificates(short_hash);
CREATE INDEX idx_certificates_user ON certificates(user_id, issued_at DESC);

-- AI Reviews
CREATE TABLE ai_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID REFERENCES documents(id) ON DELETE CASCADE,
  review_type       VARCHAR(20) NOT NULL,  -- 'spelling', 'grammar', 'fact_check', 'style', 'summary'
  content           JSONB NOT NULL,
  ai_provider       VARCHAR(20) NOT NULL,
  ai_model          VARCHAR(50) NOT NULL,
  suggestions_count INT DEFAULT 0,
  accepted_count    INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Screen Recordings (Opt-in, Post-MVP)
CREATE TABLE screen_recordings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES writing_sessions(id) ON DELETE CASCADE,
  storage_url     TEXT NOT NULL,         -- FileStorage URL (S3/MinIO/Local)
  duration_sec    INT NOT NULL,
  resolution      VARCHAR(20) NOT NULL,  -- '720p'
  size_bytes      BIGINT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,  -- 90일 후
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 TimescaleDB 시계열 전략

```sql
-- 압축 정책: 7일 후 자동 압축
SELECT add_compression_policy('keystroke_events',
  compress_after => INTERVAL '7 days'
);

-- 보존 정책: 90일 후 삭제
SELECT add_retention_policy('keystroke_events',
  drop_after => INTERVAL '90 days'
);

-- Continuous Aggregate: 5초 윈도우 집계
CREATE MATERIALIZED VIEW keystroke_stats_5s
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 seconds', time) AS bucket,
  session_id,
  COUNT(*) AS keystroke_count,
  AVG(dwell_time_ms) AS avg_dwell_time,
  AVG(flight_time_ms) AS avg_flight_time,
  AVG(wpm_instant) AS avg_wpm,
  STDDEV(flight_time_ms) AS flight_time_stddev,
  SUM(CASE WHEN is_error THEN 1 ELSE 0 END) AS error_count
FROM keystroke_events
GROUP BY bucket, session_id;
```

> *출처: 백엔드 개발자 - TimescaleDB 시계열 전략 + 아키텍트 - 타이핑 데이터 클라이언트 5초 윈도우 집계 설계*

---

## 6. Human Written 인증 시스템 상세

### 6.1 3계층 검증 모델

위 2.2절에서 정의한 3계층(키스트로크 40% + 편집패턴 35% + 콘텐츠무결성 25%)을 구현하는 상세 설계이다.

#### Layer 1: 키스트로크 다이나믹스 (40%)

**분석 지표:**

| 지표 | 계산 방법 | 인간 기대값 | 봇/AI 기대값 |
|------|-----------|-----------|-------------|
| 타이핑 속도 변동성 | WPM의 표준편차/평균 (CV) | 0.15~0.4 (검증 필요) | <0.05 (검증 필요) |
| 키 간 간격 엔트로피 | flight_time 분포의 Shannon entropy | 높음 >3.0 (검증 필요) | 낮음 <2.0 (검증 필요) |
| 오류 수정 비율 | backspace/delete 비율 | 5~15% (검증 필요) | <1% (검증 필요) |
| 일시정지 패턴 | 2초+ 일시정지 빈도 | 자연스러운 분포 (검증 필요) | 균일 또는 부재 |
| 버스트-일시정지 비율 | 빠른 입력 구간 vs 정지 구간 | 불규칙적 교차 (검증 필요) | 일정한 패턴 |
| 피로도 곡선 | 시간에 따른 WPM 변화 | 점진적 하락 (검증 필요) | 일정 유지 |

> **v3.0 추가**: 위 기대값은 Phase 1 Week 5 파일럿 검증에서 실측 데이터로 교정한다. "검증 필요" 라벨은 파일럿 후 제거된다.

#### 파일럿 검증 (Phase 1, Week 5)

MVP 출시 전, Layer 1 임계값의 유효성을 실측 데이터로 교정한다.

| 항목 | 내용 |
|------|------|
| **대상** | 10명 (다양한 타이핑 속도/습관) |
| **시나리오** | (a) 직접 작성, (b) AI 보고 타이핑, (c) 복사-붙여넣기 |
| **목표** | 시나리오 (a)와 (c)의 구분 가능 여부 확인, 임계값 교정 |
| **한계 인정** | 시나리오 (b) "AI를 보고 직접 타이핑"은 Layer 1만으로 구분이 어려울 수 있음을 문서에 명시 |
| **산출물** | 교정된 임계값 테이블, 시나리오별 분포 분석, 한계 보고서 |
| **일정** | Phase 1 Week 5 (에디터 + 키스트로크 수집 완료 후) |

> **v3.0 추가**: 타이핑 분석의 핵심 전제를 실측 데이터로 검증하는 파일럿을 Phase 1에 포함한다. 시나리오 (b)의 한계를 투명하게 인정하며, Post-MVP에서 Layer 2/3로 보완한다.

#### Layer 2: 편집 패턴 분석 (35%)

| 지표 | 설명 | 인간 특성 | AI 특성 |
|------|------|-----------|---------|
| 비선형 편집 비율 | 이전 위치로 돌아가 수정하는 빈도 | 높음 (30~60%) | 낮음 (<10%) |
| 커서 점프 엔트로피 | 커서 이동 거리의 다양성 | 높은 엔트로피 | 순차적 이동 |
| 재방문 빈도 | 같은 위치를 재방문하는 횟수 | 빈번 | 거의 없음 |
| 세션 패턴 | 글쓰기 세션의 시간 분포 | 불규칙 | N/A |

#### Layer 3: 콘텐츠 무결성 (25%)

**3-Layer AI 텍스트 탐지** (아키텍트 설계):

```
Step 1: 통계 분석 (빠르고 가벼움)
  ├── Perplexity 분석: 텍스트의 통계적 예측 가능성
  ├── Burstiness 분석: 문장 길이/복잡도의 변동성
  └── 결과: "AI 의심" 또는 "인간 가능성 높음"

Step 2: DistilBERT Fine-tuned 모델 (중간 비용)
  ├── HumanWrites 자체 학습 모델
  ├── 한국어/영어 이중 언어 지원
  └── Step 1에서 "AI 의심" 시에만 실행

Step 3: GPTZero API 교차 검증 (외부 의존)
  ├── 최종 확인용
  ├── Step 2에서도 "AI 의심" 시에만 실행
  └── 비용 최적화 (전체 텍스트의 ~5%만 외부 API 호출)
```

### 6.2 타이핑 분석 파이프라인 (클라이언트 → 서버)

```
┌─────────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                       │
│                                                             │
│  ProseMirror Plugin                                        │
│  (handleKeyDown + appendTransaction)                        │
│        │                                                    │
│        ▼                                                    │
│  로컬 이벤트 버퍼                                            │
│  (50이벤트 OR 500ms → 배치)                                  │
│        │                                                    │
│        ▼                                                    │
│  Web Worker (메트릭 계산)                                    │
│  ├── 5초 윈도우 집계 → 통계 벡터 생성                         │
│  ├── 키 카테고리만 기록 (실제 키값 수집 안 함)                  │
│  └── 원시 데이터 즉시 폐기                                   │
│        │                                                    │
│        ▼                                                    │
│  WebSocket 전송 (배치)                                       │
│  + Beacon API (페이지 언로드 시 보장)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          서버 (Spring MVC + Virtual Threads, Java 21)         │
│                                                             │
│  STOMP WebSocket Handler (@MessageMapping)                   │
│        │                                                    │
│        ▼                                                    │
│  Redis 버퍼 (5분 윈도우)                                     │
│        │                                                    │
│        ▼                                                    │
│  JDBC 배치 Insert → TimescaleDB                              │
│  (Virtual Threads가 blocking I/O 처리)                       │
│                                                             │
│  이상 탐지 (실시간, Kotlin Coroutines / Virtual Threads):    │
│  ├── unrealistic_consistent_speed                           │
│  ├── mechanical_rhythm                                      │
│  ├── excessive_paste                                        │
│  └── no_thinking_pauses                                     │
└─────────────────────────────────────────────────────────────┘
```

> **프라이버시 핵심**: 키 카테고리(letter, number, punctuation)만 수집하며 실제 키 값은 절대 수집하지 않는다. 통계 벡터만 서버로 전송하고 원시 데이터는 클라이언트에서 즉시 폐기한다.
>
> *출처: 아키텍트 - 보안 설계 + 프론트엔드 개발자 - 타이핑 수집 아키텍처*

### 6.3 AI 텍스트 탐지

6.1절 Layer 3에서 설명한 3-Layer 탐지를 사용한다. **MVP에서는 Layer 3 전체가 Post-MVP로 이동**한다. Post-MVP Iter 2에서 Step 1(통계 분석)을 도입하고, 이후 Step 2(DistilBERT), Step 3(GPTZero 교차 검증)을 순차 도입한다.

### 6.4 신뢰도 스코어 산정

```typescript
function calculateOverallScore(
  keystrokeScore: number,  // 0-100
  editPatternScore: number, // 0-100
  contentScore: number      // 0-100
): number {
  const weighted =
    keystrokeScore * 0.40 +
    editPatternScore * 0.35 +
    contentScore * 0.25;

  return Math.round(weighted);
}

function determineGrade(score: number): CertificateGrade {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}
```

### 6.5 인증서 생성 및 디지털 서명 (Ed25519)

MVP부터 Ed25519 비대칭 서명을 사용한다. JDK 17+ `java.security.KeyPairGenerator("Ed25519")`를 활용하며, 공개키를 `/.well-known/humanwrites-public-key.pem`에 노출하여 오프라인 검증을 가능하게 한다.

```kotlin
// 백엔드 (Kotlin) - Ed25519 서명 프로세스
import java.security.KeyPairGenerator
import java.security.Signature

// 서버 시작 시 키 페어 로드 (환경 변수 또는 Vault에서)
val keyPair = KeyPairGenerator.getInstance("Ed25519").generateKeyPair()

fun signCertificate(cert: CertificateData): String {
    // 1. content hash (문서 내용의 무결성)
    val contentHash = sha256(cert.document.content)

    // 2. 서명 대상 데이터 직렬화
    val payload = jacksonObjectMapper().writeValueAsString(mapOf(
        "id" to cert.id,
        "contentHash" to contentHash,
        "overallScore" to cert.verification.overallScore,
        "grade" to cert.verification.grade,
        "issuedAt" to cert.meta.issuedAt,
    ))

    // 3. Ed25519 서명
    val signer = Signature.getInstance("Ed25519")
    signer.initSign(keyPair.private)
    signer.update(payload.toByteArray())
    return Base64.getUrlEncoder().encodeToString(signer.sign())
}

// 공개키 노출 엔드포인트
// GET /.well-known/humanwrites-public-key.pem
// → 검증자가 공개키를 다운로드하여 오프라인 검증 가능
```

```typescript
// 클라이언트 (TypeScript) - 오프라인 검증
async function verifyCertificate(cert: HumanWrittenCertificate): Promise<boolean> {
  // 1. 공개키 fetch (캐시 가능)
  const publicKeyPem = await fetch(cert.meta.publicKeyUrl).then(r => r.text());
  const publicKey = await crypto.subtle.importKey('spki', pemToBuffer(publicKeyPem),
    { name: 'Ed25519' }, false, ['verify']);

  // 2. 서명 검증
  const payload = JSON.stringify({
    id: cert.id, contentHash: cert.document.contentHash,
    overallScore: cert.verification.overallScore,
    grade: cert.verification.grade, issuedAt: cert.meta.issuedAt,
  });
  return crypto.subtle.verify('Ed25519', publicKey,
    base64UrlToBuffer(cert.meta.signature), new TextEncoder().encode(payload));
}
```

> **v3.0 변경**: HMAC-SHA256을 제거하고 MVP부터 Ed25519 비대칭 서명을 사용한다. Phase 4 마이그레이션 계획이 불필요해졌다. 공개키 기반 오프라인 검증이 가능하여 서버 의존 없이 인증서 진위를 확인할 수 있다.
>
> **향후 확장**: 선택적 Merkle Tree 블록체인 앵커링 (아키텍트 제안).

### 6.6 공개 검증 페이지

**URL**: `humanwrites.app/verify/{short-hash}`

**구현**: Next.js RSC (Server Component) + OG 메타태그 자동 생성

```
┌──────────────────────────────────────────────┐
│  [Pen] HumanWrites    [Verified ✓] Jun Heo  │
│                        Feb 18, 2026          │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  [Shield] HUMAN-WRITTEN CERTIFICATE  │    │
│  │                                      │    │
│  │  "The Art of Simplicity"             │    │
│  │  by June Heo                         │    │
│  │                                      │    │
│  │  847 words · 24 edits · 45min        │    │
│  │                                      │    │
│  │  Typing Pattern Analysis             │    │
│  │  ▁▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▁ (WPM 그래프) │    │
│  │                                      │    │
│  │  ✓ AI 도구 미사용 확인               │    │
│  │  ✓ 타이핑 패턴 분석 완료             │    │
│  │  ✓ 문체 일관성 검증 통과             │    │
│  │                                      │    │
│  │  Certificate ID: HW-2026-XXXX        │    │
│  │  Issued: Feb 18, 2026                │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  [글 본문 미리보기 / 펼치기]                  │
│                                              │
│  Powered by HumanWrites                      │
│  Privacy Policy | Methodology | Report       │
└──────────────────────────────────────────────┘
```

---

## 7. AI 어시스트 시스템 상세

### 7.1 AI 게이트웨이 아키텍처

```
┌──────────────────────────────────────────────────┐
│          AI Gateway (Spring Boot Service)          │
│                                                    │
│  ┌──────────┐  ┌───────────────┐                  │
│  │  Cache    │  │  Provider     │                  │
│  │  Layer    │  │  Router       │                  │
│  │ (Redis   │  │               │                  │
│  │  24h TTL)│  │ Claude ◄──────┤                  │
│  └────┬─────┘  │ OpenAI ◄──────┤                  │
│       │        └───────────────┘                  │
│       │                                            │
│  ┌────▼──────────────────────────────────────┐    │
│  │     Rate Limiter (Redis Sliding Window)    │    │
│  │  AI: 20req/min  |  Cert: 5req/hour        │    │
│  └────────────────────────────────────────────┘    │
│                                                    │
│  HTTP Client: RestClient (Spring 6.1+)             │
│  Virtual Threads: blocking I/O 자동 처리           │
│  Kotlin Coroutines: suspend fun 사용 가능          │
└──────────────────────────────────────────────────┘
```

**캐시 전략**: 동일 텍스트에 대한 반복 요청은 Redis 캐시(24시간 TTL)에서 응답. 비용 절감 효과 ~40%.

### 7.2 맞춤법/문법 검사

- **지원 언어**: MVP에서 한국어 + 영어
- **프롬프트 설계**: 텍스트를 청크 단위(단락)로 분석, 오류 위치(from, to)와 수정 제안 반환
- **응답 형식**: `{ errors: [{ range, type, message, suggestion }] }`
- **코드 블록 제외**: 코드 블록 내 텍스트는 검사 대상에서 제외

### 7.3 팩트 체크

- **대상**: 날짜, 수치, 고유명사, 인용문 등 검증 가능한 사실 진술
- **신뢰도 3단계**: 정보제공(회색) / 주의(황색) / 경고(적색)
- **출처 제공**: 가능한 경우 검증 출처 URL 포함

### 7.4 스타일 제안

- **대상**: 문장 길이(45단어 초과), 수동태, 반복 표현, 가독성 점수
- **표시**: 가장 약한 시각적 강도 (dashed underline, opacity 0.2)
- **철학**: 스타일은 "틀린 것"이 아니라 "제안"

### 7.5 AI 요약

- **생성 조건**: 200단어 이상, 마지막 타이핑 후 10초, 이전 요약 대비 20%+ 변경
- **전송**: SSE 스트리밍 (SseEmitter / ResponseBodyEmitter → Next.js Route Handler 프록시)
- **위치**: Inspector 패널 내 접이식 섹션

### 7.6 비용 최적화

| 전략 | 효과 |
|------|------|
| Redis 캐시 (24h TTL) | 반복 요청 ~40% 감소 |
| 단락 단위 분석 (전체 문서 아님) | 토큰 사용량 ~60% 감소 |
| 맞춤법은 경량 모델 (GPT-4o-mini/Haiku) | 비용 ~90% 감소 |
| 팩트 체크/스타일은 고급 모델 (GPT-4o/Sonnet) | 정확도 유지 |
| 3-Layer AI 탐지 (단계적 실행) | 외부 API 호출 ~95% 감소 |
| Redis 기반 큐잉 (피크 분산) | Rate limit 회피 |

---

## 8. UX/UI 전략

### 8.1 Zen 에디터 UX

#### 핵심 원칙: "존재하되 사라져라" (Be Present, Be Invisible)

```
글쓰기 집중도 스펙트럼:

[최대 집중] ◀────────────────────────▶ [최대 보조]

Focus Mode     Ambient Mode     Review Mode     Settings
  |                |                |              |
  피드백 0%      피드백 30%      피드백 100%    설정 100%
  UI 0%          UI 5%           UI 40%         UI 100%
  인증 숨김      인증 수동        인증 표시      인증 관리
```

#### Focus Mode (MVP: Soft만)

| 모드 | 비활성 단락 | 인라인 피드백 | Inspector | 여백 | 적합 용도 | MVP |
|------|-----------|-------------|-----------|------|-----------|:---:|
| **Soft** | opacity 0.4 | 숨김 | 숨김 | 기본 | 전체 흐름 보면서 집중 | O |
| **Deep** | opacity 0.2 + blur(0.5px) | 숨김 | 접근 불가 | 상하 160px | 한 단락 완전 몰입 | Iter 1 |
| **Zen** | opacity 0.1 + blur(1px) | 숨김 | 완전 숨김 | 최대 | 극한 몰입, 장문 작성 | Iter 1 |

> **v3.0 변경**: MVP에서는 Focus Mode Soft만 포함. Deep/Zen은 Post-MVP Iter 1에서 구현한다. Typewriter Mode와 Focus Mode의 중첩 동작은 Post-MVP에서 정의한다.

#### Inspector 진입점

```
항상 보이는 요소 (Inspector 닫힌 상태):
  ┌─────────────────────────────────────────────────────┐
  │                                                 [i] │  <- 16x16 아이콘, opacity 0.3
  │                                                  |  │  <- 세로 점선 어포던스
  │          [에디터 본문]                            |  │
  └─────────────────────────────────────────────────────┘

열기: [i] 클릭 / Cmd+I / 우측 가장자리 500ms 호버 / 세 손가락 좌 스와이프
닫기: Cmd+I / Escape / 외부 클릭 / [x] 닫기 / 세 손가락 우 스와이프
```

#### 온보딩: "쓰면서 배운다" (Learn by Writing)

온보딩은 별도 튜토리얼이 아니라, 에디터 안에서 글을 쓰는 행위를 통해 자연스럽게 진행:
1. **Welcome Screen**: "Write. Prove. Trust." + [Start Writing]
2. **Ghost Text Guide**: 에디터 내 연한 회색 가이드 텍스트
3. **Contextual Tooltips**: 100단어 후 Inspector 안내, 첫 피드백 시 AI 안내, 500단어 시 인증 안내

> *출처: UX 디자이너 - UX 전략 문서 1.3절, 2절*

### 8.2 인증 UX

#### 디자인 원칙: "수집하되, 감시하지 마라"

타이핑 분석은 "감시당하는 느낌"이 아닌 "보호받는 느낌"을 전달해야 한다.

| 인증 단계 | 사용자 인지 수준 | 표현 방식 |
|-----------|------------------|-----------|
| 타이핑 패턴 수집 | 무의식 | 없음 (백그라운드) |
| 수집 상태 표시 | 미약 | Inspector 하단 녹색 Recording 도트 + Confidence 바 |
| 인증 준비 완료 | 중간 | Inspector 상단 "Ready to certify" 배지 |
| 인증서 발행 | 명시적 | Publish 버튼 클릭으로 모달 진입 |

#### 인증서 발행 감정 곡선

```
기대감 ──────── 긴장감 ──────── 안도감 ──────── 자부심
   |               |               |              |
[미리보기]    [분석 중...]     [발급 완료]    [공유]
```

**4단계 모달 플로우**: analyzing → review → signing → complete

#### 배지 변형

| 변형 | 용도 | 크기 |
|------|------|------|
| **Full Badge** | 인증서 카드, 검증 페이지 | 120x48px |
| **Compact Badge** | 에디터 내, 공유 링크 | 80x28px |
| **Inline Badge** | 본문 내 삽입, SNS | 인라인 텍스트 |
| **Stamp Badge** | 인증서 카드 내부 (격식) | 원형/사각 도장 |

> *출처: UX 디자이너 - 인증 UX 3절*

### 8.3 AI 어시스트 UX

#### 피드백 타이밍 규칙

```
[타이핑 중]       → 피드백 갱신 완전 중단
[멈춤 + 1.5초]   → 현재 단어 맞춤법만 체크
[멈춤 + 3초]     → 현재 단락 전체 분석 (문법, 스타일)
[멈춤 + 8초]     → 전체 문서 분석 (Inspector에만 반영)
[단락 이탈]       → 이전 단락 피드백 즉시 인라인 표시
```

#### 인라인 밑줄 시스템

| 유형 | 밑줄 스타일 | 색상 | 호버 동작 |
|------|-----------|------|-----------|
| 맞춤법 | wavy | #92400E (opacity 0.3) | Fix / Ignore / Learn |
| 팩트 체크 | dotted | #991B1B (opacity 0.3) | Review / Ignore / Mark as Correct |
| 스타일 | dashed | #3730A3 (opacity 0.2) | Show Suggestion / Ignore |

#### 피드백 우선순위 (동일 위치 겹칠 때)

맞춤법 오류 > 팩트 체크 > 문법 > 스타일

### 8.4 디자인 시스템

#### 컬러 팔레트 (접근성 개선 포함)

```css
:root {
  /* Surface */
  --surface-primary:    #FFFFFF;
  --surface-secondary:  #FAFAFA;
  --surface-certificate: #F5F3EF;
  --surface-code:       #1A1A1A;

  /* Text (접근성 개선) */
  --text-active:        #0A0A0A;
  --text-body:          #767676;    /* WCAG AA 충족 (4.54:1) */
  --text-tertiary:      #6B6B6B;    /* WCAG AA 충족 (4.89:1) */

  /* Accent */
  --accent-verified:    #166534;

  /* Feedback */
  --feedback-spelling:  #92400E;
  --feedback-fact:      #991B1B;
  --feedback-style:     #3730A3;

  /* Recording */
  --recording-active:   #22C55E;
}

/* 다크 모드 접근성 토큰 (WCAG AA 4.5:1 보장) */
[data-theme="dark"] {
  --surface-primary:    #1A1A1A;
  --surface-secondary:  #242424;
  --surface-certificate: #2A2825;
  --surface-code:       #0D0D0D;

  --text-active:        #F5F5F5;
  --text-body:          #A3A3A3;    /* WCAG AA 충족 on #1A1A1A (4.64:1) */
  --text-tertiary:      #8F8F8F;    /* WCAG AA 충족 on #1A1A1A (4.52:1) */

  --accent-verified:    #4ADE80;

  --feedback-spelling:  #FCD34D;
  --feedback-fact:      #FCA5A5;
  --feedback-style:     #A5B4FC;

  --recording-active:   #4ADE80;
}

/* 고대비 모드 (prefers-contrast: more) - 인라인 밑줄 접근성 보강 */
@media (prefers-contrast: more) {
  :root {
    --feedback-spelling-opacity: 0.6;
    --feedback-fact-opacity: 0.6;
    --feedback-style-opacity: 0.5;
  }
}
```

> **v3.0 변경**: DESIGN_SYSTEM.md와 PROJECT_PLAN.md의 컬러 토큰 불일치를 해결한다. 다크 모드 접근성 토큰 추가 (WCAG AA 4.5:1 보장). `prefers-contrast: more` 대응으로 인라인 밑줄 접근성을 보강한다.

#### 타이포그래피

| 용도 | 영문 서체 | 한국어 서체 |
|------|-----------|-----------|
| 표시 제목 | Playfair Display | Noto Serif KR |
| UI | Inter | Pretendard |
| 에디터 (산세리프) | Inter | Pretendard |
| 에디터 (세리프) | Lora / Source Serif 4 | Nanum Myeongjo |
| 코드 | JetBrains Mono | JetBrains Mono |

#### 핵심 컴포넌트 라이브러리

**Atoms**: Text, Icon, Badge, Button, Toggle, Tooltip, ProgressBar, Dot, Kbd, Skeleton, Overlay

**Molecules**: StatItem, ReviewItem, InlinePopover, FloatingToolbar, CommandPalette, SlashMenu, ConfidenceMeter, Toast, ShareCard

**Organisms**: Inspector, CertificateCard, CertificateModal, ShareModal, OnboardingOverlay, TypingVisualizer, PrivacyConsent, EditorStatusBar

> *출처: UX 디자이너 - 디자인 시스템 제안 5절*

### 8.5 반응형 전략

**MVP: Desktop만 지원**

| 브레이크포인트 | 레이아웃 | Inspector | MVP |
|-------------|---------|-----------|:---:|
| **Desktop** (1440px+) | 본문 640px + 여백 | 사이드바 (360px) | O |
| **Laptop** (1024px) | 본문 640px | 오버레이 사이드바 | Iter 5 |
| **Tablet** (768px) | 본문 640px | 바텀 시트 | Iter 5 |
| **Mobile** (375px) | 본문 풀 폭 | 바텀 시트 (전체 높이) | Iter 5 |

**모바일 특수 고려사항 (Post-MVP Iter 5)**:
- 키보드 위 액세서리 바 (서식 도구)
- 최소 터치 타겟 44x44px
- Focus Mode: 상태 바/네비게이션 바 숨김

> **v3.0 변경**: MVP는 Desktop(1440px+)만 지원. 반응형 4단계는 Post-MVP Iter 5로 이동.

---

## 9. API 설계

### 9.1 프로토콜 전략

모든 API는 REST 기반으로 통일하며, 실시간 통신에 WebSocket(STOMP)과 SSE를 사용한다. OpenAPI 스키마가 프론트-백 타입 공유의 Single Source of Truth 역할을 한다.

| 프로토콜 | 용도 | 구현 |
|----------|------|------|
| **REST API** | 모든 CRUD, 인증, 검증 | Spring MVC + SpringDoc OpenAPI |
| **WebSocket (STOMP)** | 타이핑 스트림, 실시간 세션 상태 | Spring WebSocket + STOMP + @MessageMapping (순수 WebSocket, SockJS 제거) |
| **SSE** | AI 응답 스트리밍 (요약, 맞춤법 등) | SseEmitter / ResponseBodyEmitter + Next.js Route Handler 프록시 |

**타입 공유 파이프라인**:
```
Spring Boot (Kotlin DTO) → SpringDoc → openapi.yaml → orval → TypeScript (TanStack Query hooks)
```

### 9.2 REST API 엔드포인트

#### Auth API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 (JWT + HttpOnly Cookie) |
| POST | `/api/auth/oauth/{provider}` | OAuth 로그인 (MVP: Google만, Post-MVP: GitHub/Apple) |
| POST | `/api/auth/refresh` | Access Token 갱신 |
| POST | `/api/auth/logout` | 로그아웃 (Cookie 무효화) |

#### Documents API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/documents` | 문서 목록 조회 |
| GET | `/api/documents/{id}` | 문서 상세 조회 |
| POST | `/api/documents` | 문서 생성 |
| PUT | `/api/documents/{id}` | 문서 저장 (자동/수동) |
| DELETE | `/api/documents/{id}` | 문서 삭제 |

#### Certificates API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/certificates` | 인증서 발행 |
| GET | `/api/certificates` | 내 인증서 목록 |
| DELETE | `/api/certificates/{id}` | 인증서 취소 |
| GET | `/api/verify/{shortHash}` | 인증서 공개 검증 (비인증) |
| GET | `/.well-known/humanwrites-public-key.pem` | Ed25519 공개키 (오프라인 검증용) |

#### AI Assist API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/ai/spelling` | 맞춤법 검사 |
| POST | `/api/ai/fact-check` | 팩트 체크 |
| POST | `/api/ai/style` | 스타일 제안 |
| GET | `/api/ai/summary/{documentId}` | AI 요약 (SSE 스트리밍) |

#### Users API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/users/settings` | 사용자 설정 조회 |
| PUT | `/api/users/settings` | 사용자 설정 변경 |
| POST | `/api/users/export` | GDPR 데이터 내보내기 |
| DELETE | `/api/users` | 계정 삭제 |

#### Recordings API (Post-MVP)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/recordings` | 스크린 레코딩 업로드 |
| DELETE | `/api/recordings/{id}` | 레코딩 삭제 |

#### Sync API (Post-MVP)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/sync/pull` | 동기화 풀 |
| POST | `/api/sync/push` | 동기화 푸시 |

### 9.3 실시간 통신

#### WebSocket (STOMP over WebSocket)

타이핑 스트림에 STOMP 프로토콜을 사용한다. 순수 WebSocket을 사용하며 SockJS는 제거한다.

```
STOMP Destinations:
  /app/session.keystroke      # 클라이언트 → 서버 (키스트로크 배치)
  /app/session.start          # 클라이언트 → 서버 (세션 시작)
  /app/session.end            # 클라이언트 → 서버 (세션 종료)
  /user/queue/session.status  # 서버 → 클라이언트 (세션 상태 업데이트)
  /user/queue/session.anomaly # 서버 → 클라이언트 (이상 탐지 알림)
```

```kotlin
// 클라이언트 → 서버 (키스트로크 배치)
data class KeystrokeBatchMessage(
    val sessionId: String,
    val events: List<KeystrokeEvent>
)

data class KeystrokeEvent(
    val time: Long,
    val eventType: String,       // "keydown", "keyup", "paste", "delete"
    val keyCategory: String,     // "letter", "number", "punct", "modifier"
    val dwellTimeMs: Float? = null,
    val flightTimeMs: Float? = null,
    val wpmInstant: Float? = null,
    val position: Int,
    val isError: Boolean = false
)

// 서버 → 클라이언트 (세션 상태)
data class SessionStatusMessage(
    val confidence: Int,           // 0-100
    val keystrokesCount: Int,
    val readyToCertify: Boolean,
    val anomalies: List<String>    // 감지된 이상 패턴
)
```

**프론트엔드 연결** (STOMP.js, 순수 WebSocket):
```typescript
// frontend/packages/realtime/src/stomp-client.ts
const client = new Client({
  brokerURL: `${WS_BASE_URL}/ws`,  // 순수 WebSocket (SockJS 제거)
  onConnect: () => {
    client.subscribe('/user/queue/session.status', (message) => {
      const status: SessionStatusMessage = JSON.parse(message.body);
      // Zustand store 업데이트
    });
  },
  // STOMP 연결 상태 UX
  onStompError: (frame) => {
    useConnectionStore.getState().setStatus('error');
  },
  onDisconnect: () => {
    useConnectionStore.getState().setStatus('disconnected');
  },
  onWebSocketClose: () => {
    useConnectionStore.getState().setStatus('reconnecting');
  },
  reconnectDelay: 5000,  // 5초 후 자동 재연결
});
```

**STOMP 연결 상태 UX**:

| 상태 | 표시 | 동작 |
|------|------|------|
| `connected` | 녹색 도트 (Inspector 하단) | 정상 데이터 전송 |
| `reconnecting` | 황색 도트 + "재연결 중..." | 로컬 버퍼에 이벤트 누적 |
| `disconnected` | 적색 도트 + "연결 끊김" | Beacon API로 최종 배치 전송 시도 |
| `error` | 적색 도트 + 에러 메시지 | 사용자에게 재시도 안내 |

#### SSE (AI 응답 스트리밍)

AI 요약 등 스트리밍 응답에 SSE를 사용한다. 백엔드 Spring MVC에서 `SseEmitter`로 스트리밍하며, Next.js Route Handler가 SSE 프록시 역할을 한다 (Vercel AI SDK `useCompletion` 호환).

```kotlin
// 백엔드 SSE 엔드포인트 (Spring MVC + SseEmitter)
@GetMapping("/api/ai/summary/{documentId}", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
fun streamSummary(@PathVariable documentId: String): SseEmitter {
    val emitter = SseEmitter(60_000L)  // 60초 타임아웃
    // Virtual Thread에서 blocking AI 호출 → 스트리밍
    Thread.startVirtualThread {
        try {
            aiService.generateSummary(documentId).forEach { chunk ->
                emitter.send(SseEmitter.event().data(chunk))
            }
            emitter.complete()
        } catch (e: Exception) {
            emitter.completeWithError(e)
        }
    }
    return emitter
}
```

```typescript
// frontend/apps/web/app/api/ai/summary/[documentId]/route.ts (Next.js SSE 프록시)
// v3.0: HttpOnly Cookie 기반 인증 → cookies() API 사용
import { cookies } from 'next/headers';

export async function GET(req: Request, { params }: { params: { documentId: string } }) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session-token')?.value;
  const backendUrl = `${BACKEND_URL}/api/ai/summary/${params.documentId}`;
  const response = await fetch(backendUrl, {
    headers: { Cookie: `session-token=${sessionToken}` },
  });
  return new Response(response.body, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### 9.4 Rate Limiting

Redis 기반 sliding window 방식으로 구현한다 (Spring MVC Filter).

| 엔드포인트 | 제한 | 윈도우 |
|-----------|------|--------|
| AI 관련 API | 20 req | 1분 |
| 인증서 발행 | 5 req | 1시간 |
| 일반 GET | 200 req | 1분 |
| 일반 POST | 50 req | 1분 |
| WebSocket 메시지 | 100 msg | 1초 |

### 9.5 OpenAPI 스키마 생성 파이프라인

```
1. 백엔드 Kotlin DTO + @Schema 어노테이션 정의
2. SpringDoc이 런타임에 openapi.yaml 자동 생성
3. Gradle task로 openapi.yaml을 schema/ 디렉터리에 export
4. orval이 schema/openapi.yaml → frontend/packages/api-client/ TypeScript 코드 생성
5. 생성된 TanStack Query hooks를 프론트엔드에서 사용

# Makefile 예시
schema-generate:
	cd backend && ./gradlew generateOpenApiDocs
	cp backend/build/openapi/openapi.yaml schema/openapi.yaml

client-generate:
	cd frontend && npx orval --config orval.config.ts

api-sync: schema-generate client-generate
```

> **v3.0 확정**: `openapi.yaml`은 SpringDoc에서 자동 생성하되, git에는 수동 커밋한다. CI에서 스키마 변경 감지 시 클라이언트 재생성을 알림으로 통보한다.

---

## 10. 개발 로드맵 (10주 MVP + Post-MVP 이터레이션)

> **v3.0 변경**: 14주 4-Phase 구조에서 **10주 MVP + 2주 단위 Post-MVP 이터레이션**으로 재구성. MVP 범위를 대폭 축소하여 핵심 가치(글쓰기 + 인증 + 맞춤법 AI)에 집중한다.

### 10.1 Phase 1: 코어 에디터 (Week 1-5)

**목표**: 에디터에서 글을 쓰고 키스트로크가 수집된다 (M1)

```
Week 1: 프로젝트 셋업
  ├── Turborepo + Next.js 15 프론트엔드 초기 설정
  ├── Gradle + Spring Boot 3.x (MVC + Virtual Threads, Java 21) 백엔드 초기 설정
  ├── Docker Compose 로컬 개발 환경 (PostgreSQL+TimescaleDB, Redis)
  ├── Makefile 통합 빌드 오케스트레이션
  └── 디자인 토큰 시스템 (CSS Variables, Light/Dark)

Week 2: TipTap v2 에디터 코어
  ├── TipTap v2 에디터 코어 (리치 텍스트, Markdown 단축키)
  ├── 제목(H1-H3), 본문, 굵게, 기울임, 링크, 인용
  └── 기본 에디터 레이아웃 (Desktop 640px 본문)

Week 3: 단락 포커스 + 테마 + 자동 저장
  ├── 단락 포커스 시스템 (활성/비활성, 400ms ease)
  ├── Light/Dark 테마 시스템 (500ms crossfade, system 감지)
  └── 자동 저장 (IndexedDB, 타이핑 중단 2초 후)

Week 4: Inspector + 문서 통계 + Focus Mode(Soft)
  ├── Inspector 패널 (슬라이드 인/아웃)
  ├── 문서 통계 (단어 수, 단락 수, 읽기 시간)
  ├── Focus Mode Soft (opacity 0.4)
  └── Command Palette (Cmd+K) + 키보드 단축키

Week 5: 키스트로크 수집 + 타이핑 분석 파일럿 검증
  ├── 타이핑 데이터 수집 ProseMirror Plugin
  ├── Web Worker 메트릭 계산 (5초 윈도우 집계)
  ├── WebSocket(STOMP) 배치 전송 (순수 WebSocket)
  ├── 파일럿 검증: 10명 × 3 시나리오 (직접 작성/AI 보고 타이핑/복사-붙여넣기)
  └── 임계값 교정 + 한계 보고서 작성
```

**마일스톤 M1 (Week 5)**: 에디터에서 글을 쓰고 키스트로크가 수집된다. 파일럿 검증으로 Layer 1 임계값이 실측 데이터로 교정된다.

### 10.2 Phase 2: 인증 + AI + 통합 (Week 6-10)

**목표**: 글 작성 -> 인증서 발행 -> 공유 -> 검증 + 맞춤법 AI 동작 (M2)

```
Week 6: Spring Boot API + 인증
  ├── Flyway DB 마이그레이션 (PostgreSQL + TimescaleDB 스키마)
  ├── Spring Boot API 서버 (REST 컨트롤러, Spring MVC)
  ├── Spring Security + Google OAuth (JWT + HttpOnly Cookie)
  └── JDBC + Exposed ORM 설정 (Virtual Threads)

Week 7: OpenAPI 파이프라인 + 키스트로크 분석
  ├── SpringDoc OpenAPI + orval 클라이언트 생성 파이프라인
  ├── openapi.yaml git 커밋 전략 확정 (자동 생성 → 수동 커밋)
  ├── 키스트로크 분석 알고리즘 (Layer 1, 파일럿 교정 임계값 반영)
  └── JDBC 배치 Insert → TimescaleDB (Virtual Threads)

Week 8: 인증서 생성 (Ed25519) + 발행 모달 + 공개 검증
  ├── 인증서 데이터 구조 + Ed25519 디지털 서명
  ├── 공개키 노출 (/.well-known/humanwrites-public-key.pem)
  ├── 인증서 발행 모달 UI (4단계 애니메이션)
  ├── 인증서 발행 API + Certified/Not Certified 이분법
  ├── 검증 페이지 UI (RSC + OG 메타태그)
  └── 소셜 공유 (Twitter/LinkedIn)

Week 9: AI 맞춤법 검사 + 인라인 피드백
  ├── AI 게이트웨이 (RestClient + Provider Router)
  ├── Redis 캐시 레이어 (24h TTL)
  ├── 맞춤법/문법 검사 구현 (한국어 + 영어, Claude Haiku)
  ├── 인라인 밑줄 시스템 (wavy underline)
  ├── Inspector 리뷰 아이템 연동
  └── AI 사용 기록 모듈 (인증서 연동)

Week 10: 통합 테스트 + 성능 최적화 + 버그 수정
  ├── E2E 테스트 (글 작성 → 인증서 발행 → 검증)
  ├── 성능 최적화 (타이핑 지연 < 16ms, 번들 최적화)
  ├── 인증 실패/에러 플로우 UX
  ├── Graceful Degradation (AI 장애 시)
  └── 버그 수정 + 코드 정리
```

**마일스톤 M2 (Week 10)**: 글 작성 -> 인증서 발행 -> 공유 -> 검증 + 맞춤법 AI가 동작한다.

### 10.3 Post-MVP 이터레이션 (2주 단위)

**목표**: 검증된 MVP를 기반으로 기능을 점진적으로 확장한다.

```
Iter 1 (2주): Focus Mode 심화 + 에디터 확장
  ├── Focus Mode Deep/Zen
  ├── Typewriter Mode
  ├── Floating Toolbar + Slash Commands
  ├── 코드 블록 구문 강조 (highlight.js)
  └── Typewriter + Focus Mode 중첩 동작 정의

Iter 2 (2주): 인증 고도화 (Layer 2 + Layer 3)
  ├── Layer 2: 편집 패턴 분석 알고리즘
  ├── Layer 3: 콘텐츠 무결성 (통계 분석)
  ├── 6등급 체계 활성화 (A+/A/B/C/D/F)
  ├── 사용자 향 등급 3단계 단순화 레이어
  └── 인증 경계값 테스트

Iter 3 (2주): AI 확장 (팩트 체크 + 스타일 + 요약)
  ├── 팩트 체크 엔진
  ├── 스타일 제안 엔진
  ├── AI 요약 SSE 스트리밍 (SseEmitter → Next.js 프록시)
  ├── 기능별 On/Off 토글
  └── Screen Recording (Opt-in)

Iter 4 (2주): OAuth 추가 + 클라우드 동기화
  ├── OAuth GitHub/Apple 추가
  ├── 클라우드 동기화 (문서 + 인증서)
  ├── 다중 문서 관리 (폴더, 검색)
  └── 내보내기 (Markdown, PDF, DOCX)

Iter 5 (2주): 반응형 + 모바일 + 접근성
  ├── 반응형 레이아웃 4단계 (Laptop/Tablet/Mobile)
  ├── 접근성 개선 (WCAG 2.1 AA)
  ├── i18n (한국어/영어)
  └── PWA 오프라인 지원

Iter 6+ (계속): 플랫폼 확장
  ├── Tauri v2 데스크톱 앱
  ├── Capacitor 모바일 앱
  ├── 공개 API + Webhook
  ├── DistilBERT AI 탐지 모델 (ONNX Runtime)
  └── VS Code Extension
```

### 10.4 마일스톤 요약

```
Week:  1  2  3  4  5  6  7  8  9  10  │  Post-MVP (2주 단위)
       ┌──────────────────┐            │
Ph1:   │   코어 에디터     │ M1 (W5)   │
       └──────────────────┘            │
                        ┌──────────────┤  ┌────┐┌────┐┌────┐┌────┐┌────┐
Ph2:                    │인증+AI+통합  │  │It.1││It.2││It.3││It.4││It.5│ ...
                        └──────────────┤  └────┘└────┘└────┘└────┘└────┘
                                  M2(W10)│
```

| 마일스톤 | 시점 | 검증 기준 |
|----------|------|-----------|
| **M1** | Week 5 | 에디터에서 글을 쓰고 키스트로크가 수집된다. 파일럿 검증 완료. |
| **M2** | Week 10 | 글 작성 → 인증서 발행 → 공유 → 검증 + 맞춤법 AI 동작. |

---

## 11. 에이전트 팀 개발 전략

### 11.1 모듈 분리 및 인터페이스 계약

병렬 개발의 핵심은 **모듈 경계의 명확한 정의**와 **OpenAPI 스키마 기반 계약**이다. 프론트엔드와 백엔드는 OpenAPI 스키마로만 연결되며, 각 팀은 독립적으로 개발할 수 있다.

#### 모듈 A (Editor) ↔ 모듈 B (Collector)

```typescript
interface KeystrokeEvent {
  type: 'keydown' | 'keyup';
  keyCategory: string;          // 'letter' | 'number' | 'punct' | 'modifier'
  timestamp: number;            // performance.now()
  dwellTime?: number;
  flightTime?: number;
}

interface EditEvent {
  type: 'insert' | 'delete' | 'replace' | 'cursor_move' | 'paste';
  position: { from: number; to: number };
  contentLength?: number;       // 내용 길이만 (실제 내용 아님)
  timestamp: number;
  source: 'keyboard' | 'paste' | 'ai_suggestion';
}

interface DataCollector {
  onKeystroke(event: KeystrokeEvent): void;
  onEdit(event: EditEvent): void;
  onSessionStart(documentId: string): void;
  onSessionEnd(): void;
  getSessionData(): SessionData;
}
```

#### 모듈 B (Collector) ↔ 모듈 C (Certifier)

```typescript
interface SessionData {
  documentId: string;
  sessionId: string;
  startedAt: number;
  endedAt: number;
  keystrokeStats: KeystrokeStatVector[];  // 5초 윈도우 집계
  editEvents: EditEvent[];
  pasteRatio: number;
  totalActiveTime: number;
}

interface VerificationRequest {
  document: { title: string; content: string; author: string };
  sessionData: SessionData[];
  aiUsageData: AIUsageData;
}

interface VerificationResult {
  overallScore: number;
  grade: CertificateGrade;
  layers: {
    keystroke: LayerResult;
    editPattern: LayerResult;
    contentIntegrity: LayerResult;
  };
  certificate?: HumanWrittenCertificate;
}
```

#### 모듈 D (AI Assist) ↔ 모듈 A (Editor)

```typescript
interface ReviewItem {
  id: string;
  type: 'spelling' | 'grammar' | 'fact_check' | 'style';
  severity: 'info' | 'warning' | 'error';
  range: { from: number; to: number };
  message: string;
  suggestion?: string;
  source?: string;
}

interface AIFeedbackProvider {
  getReviewItems(content: string, options: ReviewOptions): Promise<ReviewItem[]>;
  getSummary(content: string): AsyncIterable<string>;  // SSE 스트림
  applySuggestion(itemId: string): Promise<TextEdit>;
}

interface AIUsageData {
  enabled: boolean;
  featuresUsed: string[];
  suggestionsTotal: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
}
```

### 11.2 5개 병렬 팀 구성

| 팀 | 에이전트 | 역할 | 담당 영역 |
|----|----------|------|-----------|
| **Team 1** (프론트 코어) | `executor-high` | 프론트엔드 코어 | Editor 코어, ProseMirror 확장, STOMP/SSE 클라이언트 |
| **Team 2** (백엔드) | `executor-high` | 백엔드 엔지니어 | Spring Boot API (MVC + Virtual Threads), WebSocket(STOMP), SSE, Exposed(JDBC) |
| **Team 3** (알고리즘) | `executor` | 알고리즘 엔지니어 | Collector, 분석 알고리즘, 스코어링 |
| **Team 4** (UI) | `designer` + `executor` | UI 엔지니어 | UI 컴포넌트, 모달, 검증 페이지 |
| **Team 5** (인프라/통합) | `executor` | 인프라 엔지니어 | Docker, DB 마이그레이션, CI/CD, OpenAPI 파이프라인 |
| **Architect** | `architect` | 아키텍트 | 코드 리뷰, 통합 검증, 설계 결정 |
| **QA** | `qa-tester` | QA 엔지니어 | 테스트 작성, 검증, 접근성 |

### 11.3 Phase별 작업 매트릭스

```
Phase 1: 코어 에디터 (Week 1-5):
            Week 1      Week 2      Week 3      Week 4      Week 5
Team 1 (FE):  [Setup ──] [TipTap v2 Core ─] [Focus+Theme] [Inspector] [STOMP Client ─]
Team 2 (BE):  [Spring Boot MVC + VT Setup ──] [STOMP Handler ─────────] [JDBC Batch ───]
Team 3 (Algo):                     [Collector ProseMirror Plugin ──────] [파일럿 검증 ──]
Team 4 (UI):  [Design Tokens + Atoms ─────────────────────────────────────────────────]
Team 5 (Infra): [Polyglot + Docker (PG+Redis)] [DB Schema ─] [CI/CD ──────────────────]

Phase 2: 인증 + AI + 통합 (Week 6-10):
            Week 6      Week 7      Week 8      Week 9      Week 10
Team 1 (FE):  [orval Client ──────] [Verify Page + Modal] [AI Inline UI] [Integration ─]
Team 2 (BE):  [REST API + Auth(Google)] [OpenAPI + Cert API] [AI Gateway(RestClient)──]
Team 3 (Algo): [Layer 1 Algorithm (교정 반영) ──────────────] [Spelling Engine ───────]
Team 4 (UI):  [Cert Modal + Share ─────────────] [Inline Feedback ──────────────────────]
Team 5 (Infra): [Flyway + OpenAPI Pipeline ────] [Redis Cache ─] [Perf + Bug Fix ───────]
```

### 11.4 통합 체크포인트

| # | 시점 | 통합 대상 | 검증 방법 |
|---|------|-----------|-----------|
| 1 | Week 2 끝 | Editor + UI 컴포넌트 | TipTap v2 에디터에서 디자인 토큰 기반 UI 렌더링 |
| 2 | Week 5 끝 (M1) | Editor + Collector + 파일럿 | 글 쓰면서 키스트로크 수집 + 파일럿 검증 완료 |
| 3 | Week 8 끝 | Collector + Certifier + 검증 페이지 | 글 작성 → Ed25519 인증서 발행 → 검증 URL |
| 4 | Week 10 끝 (M2) | 전체 통합 (에디터 + 인증 + AI 맞춤법) | E2E: 글 작성 → AI 맞춤법 → 인증서 발행 → 검증 |

### 11.5 Claude Code 에이전트 역할 매핑

| 작업 유형 | 에이전트 | 모델 |
|-----------|----------|------|
| 프론트엔드 초기 설정 (Turborepo, Next.js) | `executor-high` | opus |
| 백엔드 초기 설정 (Gradle, Spring Boot) | `executor-high` | opus |
| TipTap 에디터 코어 | `executor-high` | opus |
| ProseMirror 확장 개발 | `executor-high` | opus |
| UI 컴포넌트 (Atoms/Molecules) | `designer` | sonnet |
| 페이지 레이아웃 (Inspector, 모달) | `designer` + `executor` | sonnet |
| Spring Boot REST API | `executor-high` | opus |
| Spring WebSocket(STOMP) 핸들러 | `executor-high` | opus |
| Spring Security + Google OAuth 설정 | `executor-high` | opus |
| Exposed (JDBC) 퍼시스턴스 | `executor` | sonnet |
| Flyway DB 마이그레이션 | `executor` | sonnet |
| 타이핑 분석 알고리즘 | `executor-high` | opus |
| AI 게이트웨이 (RestClient) | `executor` | sonnet |
| Ed25519 서명 + 공개키 검증 | `executor-high` | opus |
| OpenAPI 파이프라인 (SpringDoc + orval) | `executor` | sonnet |
| Docker Compose + Makefile | `executor` | sonnet |
| 프론트엔드 테스트 (Vitest, Playwright) | `qa-tester` | sonnet |
| 백엔드 테스트 (Kotest, Testcontainers) | `qa-tester` | sonnet |
| 코드 리뷰 | `architect` | opus |
| 보안 감사 | `security-reviewer` | opus |
| 성능 최적화 | `architect` + `executor-high` | opus |

### 11.6 코딩 컨벤션 및 품질 게이트

#### 프론트엔드 코딩 컨벤션 (TypeScript)

```
1. TypeScript strict mode 필수
2. ESLint + Prettier 엄격 설정
3. 함수/변수: camelCase, 타입/인터페이스: PascalCase
4. 파일: kebab-case.ts, 컴포넌트: PascalCase.tsx
5. import 순서: node_modules → packages → relative (자동 정렬)
6. 주석: 공개 API에 JSDoc, 내부는 최소한
7. 에러 처리: Result<T, E> 패턴 또는 try-catch (async)
8. 테스트: 기능 파일과 동일 디렉터리에 *.test.ts
9. API 클라이언트: orval 자동 생성 코드 수동 편집 금지
```

#### 백엔드 코딩 컨벤션 (Kotlin)

```
1. Kotlin 공식 코딩 컨벤션 준수 (ktlint 적용)
2. 클래스: PascalCase, 함수/변수: camelCase, 상수: UPPER_SNAKE_CASE
3. 패키지: com.humanwrites.{domain}.{layer}
4. data class 적극 활용 (DTO, 도메인 모델)
5. Virtual Threads 기반 blocking I/O 허용, Kotlin Coroutines 선택적 사용 (suspend fun)
6. 에러 처리: sealed class Result<T> 또는 Spring @ExceptionHandler
7. DDD 계층 분리: presentation → domain → infrastructure
8. 테스트: src/test/kotlin 미러 구조, *Test.kt / *Spec.kt (Kotest)
9. API DTO에 @Schema 어노테이션 필수 (OpenAPI 자동 생성용)
```

#### 품질 게이트 (모든 PR 필수)

**프론트엔드 PR:**

| 게이트 | 기준 | 도구 |
|--------|------|------|
| TypeScript | 에러 0건 | `tsc --noEmit` |
| Lint | 에러 0건 | ESLint |
| Unit 테스트 | 100% 통과 | Vitest |
| 커버리지 | 신규 코드 80%+ | Vitest --coverage |
| 번들 크기 | 에디터 <150KB, 인증서 <50KB | size-limit |
| 접근성 (UI 변경 시) | axe-core 통과 | Playwright + axe |

**백엔드 PR:**

| 게이트 | 기준 | 도구 |
|--------|------|------|
| Kotlin 컴파일 | 에러 0건 | `./gradlew compileKotlin` |
| Lint | 에러 0건 | ktlint |
| Unit 테스트 | 100% 통과 | Kotest |
| Integration 테스트 | 100% 통과 | Testcontainers |
| 커버리지 | 신규 코드 80%+ | JaCoCo |
| OpenAPI 스키마 | 변경 시 클라이언트 재생성 | SpringDoc + orval |
| 보안 (보안 관련 변경 시) | 보안 리뷰어 승인 | 수동 |

---

## 12. 테스트 및 검증 계획

### 12.1 테스트 피라미드

```
                /\
               /  \
              / E2E \          10% (~50 시나리오)
             /--------\
            /Integration\      25% (~150 테스트)
           /--------------\
          /     Unit        \  65% (~400 테스트)
         /____________________\

총 ~600 테스트, 핵심 ~300 케이스
```

| 계층 | 목표 커버리지 | 대상 | 실행 시간 |
|------|-------------|------|-----------|
| Unit | 80% 라인 | 순수 함수, 상태 관리, 파서, 알고리즘 | < 30초 |
| Integration | 70% 기능 | 컴포넌트 조합, API 연동, 스토어 (Testcontainers < 5분) | < 5분 |
| E2E | 100% 크리티컬 경로 | 사용자 시나리오, 전체 플로우 | < 10분 |

### 12.2 영역별 테스트 케이스 요약

| 영역 | 케이스 수 | P0 (릴리스 차단) | 핵심 테스트 |
|------|----------|-----------------|------------|
| **에디터** | ~63 | 텍스트 입력, IME, XSS 방지, Focus Mode | ED-U-001~010, FM-U-001~006 |
| **인증** | ~52 | 키스트로크 수집, 패턴 분석, 위변조 방지 | KA-U-001~007, CT-S-001~005 |
| **AI** | ~31 | 맞춤법, Graceful Degradation | SP-001~007, GD-001~006 |
| **보안** | ~35 | XSS, CSRF, 인증/인가, 암호화 | XSS-001~010, AUTH-001~007 |
| **성능** | ~28 | 타이핑 지연 <16ms, 메인 스레드 블로킹 0 | PF-ED-001~005 |
| **접근성** | ~42 | 스크린 리더, 키보드, 색상 대비 | SR-001~008, KN-001~008 |

> *출처: 테스트 전문가 - 전체 테스트 전략 문서*

### 12.3 CI/CD 파이프라인

프론트엔드와 백엔드를 분리된 워크플로우로 관리한다.

```yaml
# .github/workflows/frontend.yml - 프론트엔드 PR 검증
jobs:
  1. unit-test:        Vitest + 커버리지 80% 게이트
  2. integration-test: Vitest + 컴포넌트 통합
  3. e2e-test:         Playwright (Chrome/Firefox/WebKit 매트릭스)
  4. accessibility:    Playwright + axe-core
  5. type-check:       tsc --noEmit
  6. security-audit:   pnpm audit --audit-level=high
  7. bundle-size:      size-limit 체크

# .github/workflows/backend.yml - 백엔드 PR 검증
jobs:
  1. compile:          ./gradlew compileKotlin
  2. lint:             ./gradlew ktlintCheck
  3. unit-test:        ./gradlew test (Kotest) + JaCoCo 커버리지 80%
  4. integration-test: ./gradlew integrationTest (Testcontainers, 목표 < 5분)
  5. openapi-check:    OpenAPI 스키마 변경 감지 → 클라이언트 재생성 알림
  6. security-audit:   ./gradlew dependencyCheckAnalyze

# 스테이징 배포 (develop 브랜치)
  → 프론트: Preview 배포
  → 백엔드: Docker 이미지 빌드 + 스테이징 배포
  → E2E 전체 스위트
  → Lighthouse CI (LCP<3s, CLS<0.1, a11y>95)

# Pre-commit 훅
  → 프론트: lint-staged (ESLint + Prettier) + tsc --noEmit --incremental
  → 백엔드: ktlint + ./gradlew compileKotlin
```

### 12.4 추가 테스트 전략 (v3.0)

#### 인증 경계값 테스트

| 시나리오 | 입력 | 기대 결과 |
|----------|------|-----------|
| 최소 키스트로크 | 100자 미만 문서 | Not Certified (데이터 부족) |
| 임계값 경계 | Layer 1 점수 = 임계값 정확히 | 정의된 등급으로 분류 |
| 극단적 빠른 타이핑 | WPM > 200 지속 | 이상 탐지 발동 |
| 극단적 느린 타이핑 | WPM < 5 지속 | 정상 (사고 시간) |
| 전체 붙여넣기 | paste 비율 100% | Not Certified |
| 부분 붙여넣기 | paste 비율 30% | Certified (경고 포함) |
| 세션 중단 후 재개 | 브라우저 새로고침 | 세션 데이터 병합 |

#### 한국어 IME 테스트 매트릭스

| 환경 | IME | 테스트 항목 |
|------|-----|-----------|
| Chrome (Windows) | MS IME | 조합 중 키스트로크 정확도, 완성 후 이벤트 |
| Chrome (macOS) | macOS 기본 IME | 조합/완성 전환, 한영 전환 시 이벤트 |
| Firefox (Linux) | ibus/fcitx | 조합 상태 감지, 이벤트 순서 |
| Safari (macOS) | macOS 기본 IME | compositionstart/end 이벤트 처리 |
| Mobile Chrome | Gboard 한국어 | 자동완성, 스와이프 입력 시 이벤트 |

> TipTap v2의 ProseMirror `handleKeyDown`에서 `compositionstart`/`compositionend` 이벤트를 올바르게 처리하는지 검증한다.

#### WebSocket/SSE 테스트 전략

| 프로토콜 | 테스트 항목 | 도구 |
|----------|-----------|------|
| **WebSocket (STOMP)** | 연결/재연결, 메시지 순서, 배치 전송, 연결 끊김 시 Beacon API 폴백 | Playwright + custom WS interceptor |
| **WebSocket (STOMP)** | 동시 연결 1,000개, 메시지 처리량 | k6 WebSocket |
| **SSE** | 스트리밍 시작/종료, 프록시 인증 (HttpOnly Cookie), 타임아웃 | Playwright + EventSource mock |
| **SSE** | SseEmitter 타임아웃, 클라이언트 끊김 감지 | Kotest + MockMvc |

### 12.5 부하 테스트 (k6)

| 시나리오 | 목표 | 측정 |
|----------|------|------|
| WebSocket 동시 연결 | 1,000 동시 연결 유지 | 연결 성공률, 메시지 지연 |
| REST API 처리량 | 500 RPS 유지 | P95 응답 시간 < 200ms |
| TimescaleDB 배치 Insert | 10K rows/sec | JDBC 배치 처리 시간 |
| AI API 동시 요청 | 20 req/min (Rate Limit 내) | 큐 대기 시간, 캐시 히트율 |
| 인증서 발행 동시 요청 | 5 req/hour (Rate Limit 내) | Ed25519 서명 처리 시간 |

```bash
# k6 실행 예시
k6 run --vus 1000 --duration 5m tests/load/websocket-connections.js
k6 run --vus 100 --duration 5m --rps 500 tests/load/rest-api.js
k6 run --vus 50 --duration 5m tests/load/timescaledb-insert.js
```

### 12.6 성능 벤치마크

| 메트릭 | 목표 | 경고 임계값 | 실패 임계값 |
|--------|------|-----------|-----------|
| 타이핑 지연 (P95) | < 16ms | > 16ms | > 32ms |
| FCP (에디터) | < 1s | > 1.5s | > 2s |
| LCP (에디터) | < 1.5s | > 2s | > 3s |
| INP | < 200ms | > 200ms | > 500ms |
| CLS | < 0.1 | > 0.1 | > 0.25 |
| JS 번들 (에디터) | < 150KB | > 150KB | > 200KB |
| 메모리 (10K 단어) | < 150MB | > 150MB | > 250MB |
| 인증서 발행 | < 3초 | > 3초 | > 10초 |
| 검증 API (P95) | < 200ms | > 500ms | > 1s |

---

## 13. 멀티플랫폼 확장 전략

### 13.1 코어 로직 공유 (frontend/packages/core)

`frontend/packages/core`는 순수 TypeScript로 DOM/Node.js 의존성이 없으므로 모든 플랫폼에서 공유할 수 있다:

| 공유 모듈 | 웹 | Desktop | Mobile | VS Code |
|-----------|:--:|:-------:|:------:|:-------:|
| typing-analyzer | O | O | O | O |
| certificate | O | O | O | O |
| scoring | O | O | O | O |
| ai-detector | O | O | O | O |

### 13.2 웹 → Desktop (Tauri v2)

- **시기**: Phase 4 (Week 13-14 기반 작업, 이후 본격 개발)
- **구조**: Tauri v2 + Next.js 웹뷰
- **추가 기능**: 로컬 파일 시스템 저장, 시스템 트레이, 자동 업데이트
- **오프라인**: 글쓰기 + 타이핑 분석 오프라인 가능, 온라인 복귀 시 동기화

### 13.3 웹 → Mobile (Capacitor)

- **시기**: Phase 4+ (Post-MVP)
- **구조**: Capacitor + Next.js 래핑
- **웹 코드 재사용률**: 90%+
- **모바일 전용**: 키보드 액세서리 바, 제스처 (핀치 줌, 스와이프), 하단 시트 Inspector

### 13.4 VS Code Extension

- **시기**: Phase 4+ (Post-MVP)
- **구조**: VS Code Extension API + packages/core
- **기능**: 인라인 데코레이션(밑줄), 사이드바(Inspector), 상태 바(통계), 명령 팔레트

### 13.5 확장 로드맵

```
Phase 4:     Desktop 기반 작업 + VS Code 설계
Phase 5:     Desktop 출시 (Tauri v2)
Phase 6:     Mobile 출시 (Capacitor)
Phase 7:     VS Code Extension 출시
Phase 8+:    브라우저 확장, API 파트너십
```

---

## 14. 보안 및 프라이버시

### 14.1 타이핑 데이터 프라이버시

| 원칙 | 구현 |
|------|------|
| **키 카테고리만 수집** | 실제 키 값(문자) 수집 안 함. 'letter', 'number', 'punct' 카테고리만 |
| **클라이언트 집계** | 5초 윈도우 통계 벡터만 서버 전송, 원시 이벤트 즉시 폐기 |
| **전송 암호화** | TLS 1.3 필수 |
| **저장 암호화** | Envelope encryption (AES-256) |
| **보존 기간** | 90일 후 자동 삭제 (TimescaleDB retention policy) |

### 14.2 스크린 레코딩 보호 (Post-MVP)

| 원칙 | 구현 |
|------|------|
| **Opt-in** | 기본 OFF, 사용자 명시적 동의 필요 |
| **에디터 영역만** | 전체 화면 아닌 에디터 영역만 캡처 |
| **해상도/프레임** | 1fps, 720p (최소한의 품질) |
| **보관** | 90일 후 자동 삭제 |
| **저장 위치** | FileStoragePort 구현체 (S3/MinIO/Local, 암호화) |

### 14.3 인증서 위변조 방지

| 위협 | 대응 |
|------|------|
| 인증서 데이터 변조 | Ed25519 비대칭 서명 (MVP부터), 공개키 오프라인 검증 |
| 인증서 ID 추측 | UUID v4 + 32자 nanoid short hash |
| 타이핑 로그 사후 조작 | 5초 윈도우별 해시 체인 |
| 자동화 타이핑 시뮬레이션 | 다중 레이어 이상 탐지 (속도, 리듬, 일시정지) |

### 14.4 API 보안

| 영역 | 구현 |
|------|------|
| 인증 | JWT (httpOnly cookie) + Refresh Token Rotation |
| 비밀번호 | Argon2id 해싱 |
| CSRF | SameSite=Lax cookie + Origin 헤더 검증 |
| XSS | 에디터 콘텐츠 새니타이징, CSP 헤더 |
| Rate Limiting | Redis 기반 sliding window |
| API Key (공개 API) | HMAC 서명 인증 |

### 14.5 GDPR/개인정보보호법 준수

| 요구사항 | 구현 |
|----------|------|
| 데이터 열람 | `users.export` API → ZIP 다운로드 |
| 데이터 삭제 | `users.delete` API → 72시간 내 전체 삭제 |
| 동의 관리 | 최초 사용 시 동의 모달, 설정에서 관리 |
| 익명화 | 분석 후 원본 데이터 익명화 처리 |
| 데이터 이동 | 표준 JSON 포맷으로 내보내기 |

---

## 15. 비기능 요구사항

### 15.1 성능 목표

| 메트릭 | 목표 | 측정 |
|--------|------|------|
| 에디터 입력 지연 | < 16ms (60fps) | PerformanceObserver |
| 에디터 초기 로드 (LCP) | < 2초 | Lighthouse |
| Inspector 슬라이드 | < 280ms | 애니메이션 프레임 |
| 인증서 발행 | < 3초 | API 요청→응답 |
| 검증 페이지 로드 (LCP) | < 1.5초 | Lighthouse |
| AI 피드백 (맞춤법) | < 2초 | API 요청→UI |
| 자동 저장 | < 100ms | IndexedDB 완료 |
| 메모리 (10K 단어) | < 150MB | DevTools |
| 번들 크기 (초기 로드) | < 200KB gzip | 빌드 분석 |
| Core Web Vitals | LCP<2.5s, INP<200ms, CLS<0.1 | CrUX |

### 15.2 확장성 목표

| 메트릭 | Phase 1-2 | Phase 3-4 | 장기 |
|--------|-----------|-----------|------|
| 동시 사용자 | 100 | 1,000 | 10,000+ |
| 인증서 저장 | 10K | 100K | 1M+ |
| API RPS | 50 | 500 | 5,000+ |
| 문서 크기 | 50K 단어 | 100K 단어 | 무제한 |

**인프라 비의존 설계** (상세 내용은 15.2.1절 참조):
- 로컬 개발: Docker Compose (PostgreSQL+TimescaleDB, Redis)
- 배포: 특정 클라우드에 비의존적 설계 (AWS/GCP/Azure 모두 가능)
- FileStoragePort 추상화로 S3/MinIO/Local 어댑터 교체 가능
- Spring Profile 기반 환경 분리 (local, staging, prod)
- 장기: 인증 엔진 마이크로서비스 분리 고려

#### 15.2.1 인프라 비의존 설계 원칙

특정 클라우드 프로바이더에 의존하지 않는 설계를 원칙으로 한다. AWS 배포를 우선 고려하되, GCP/Azure로 전환 가능한 아키텍처를 유지한다.

**포트/어댑터 패턴 (헥사고날 아키텍처)**:

| 포트 (인터페이스) | 로컬 개발 어댑터 | 프로덕션 어댑터 (예시) |
|------------------|-----------------|---------------------|
| `FileStoragePort` | Local 파일시스템 / MinIO | AWS S3 / GCP Cloud Storage |
| `MessageQueuePort` | Redis Streams (Post-MVP) | RabbitMQ / AWS SQS (Post-MVP) |
| `CachePort` | Redis | Redis (ElastiCache 등) |
| `DatabasePort` | PostgreSQL (Docker) | PostgreSQL (RDS / Cloud SQL) |
| `TimeSeriesPort` | TimescaleDB (Docker) | TimescaleDB (Timescale Cloud) |

**Spring Profile 기반 환경 분리**:

```yaml
# application-local.yml (로컬 개발)
spring:
  profiles: local
  datasource:
    url: jdbc:postgresql://localhost:5432/humanwrites
    username: postgres
    password: local
  threads:
    virtual:
      enabled: true  # Virtual Threads 활성화 (Java 21)
  data:
    redis:
      host: localhost

# application-prod.yml (프로덕션)
spring:
  profiles: prod
  datasource:
    url: ${DATABASE_URL}
  threads:
    virtual:
      enabled: true
  data:
    redis:
      host: ${REDIS_HOST}
```

**Docker Compose 로컬 개발 환경**:

```yaml
# docker/docker-compose.yml (MVP: PostgreSQL + Redis만)
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: humanwrites
      POSTGRES_PASSWORD: local

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # Post-MVP: 필요 시 추가
  # rabbitmq:
  #   image: rabbitmq:3-management-alpine
  #   ports: ["5672:5672", "15672:15672"]
  # minio:
  #   image: minio/minio
  #   ports: ["9000:9000", "9001:9001"]
```

**설계 원칙 요약**:
1. **모든 외부 서비스는 인터페이스(Port)로 추상화** - 구현체(Adapter) 교체 가능
2. **표준 프로토콜 사용** - S3 API, AMQP, PostgreSQL wire protocol
3. **환경 변수 + Spring Profile로 환경 분리** - 코드 변경 없이 배포 환경 전환
4. **Docker Compose로 로컬 개발 완결** - 외부 서비스 의존 없이 즉시 개발 시작 가능
5. **CI/CD에서도 Docker 기반 테스트** - Testcontainers로 실제 DB/Redis 통합 테스트 (목표 < 5분)

### 15.3 접근성 (WCAG 2.1 AA)

| 카테고리 | 요구사항 |
|----------|----------|
| **색상 대비** | 모든 텍스트 4.5:1 이상 (개선 토큰 적용) |
| **키보드 접근** | 모든 기능 키보드로 접근 가능, Skip to Content 링크 |
| **스크린 리더** | 시맨틱 HTML + ARIA (main, aside, dialog, aria-live) |
| **모션 감소** | prefers-reduced-motion 지원 (모든 애니메이션 즉시 완료) |
| **포커스 표시** | 2px solid outline, offset 2px, 고대비 색상 |
| **색상 독립** | 색상만으로 정보 전달 안 함 (배지: 색상+텍스트, 밑줄: 색상+스타일) |

> *출처: UX 디자이너 - 접근성 7.1절 + 테스트 전문가 - 접근성 테스트 42 케이스*

### 15.4 국제화

| 우선순위 | 언어 | 시기 |
|----------|------|------|
| P0 | 한국어, 영어 | MVP |
| P1 | 일본어 | Phase 5 |
| P2 | 중국어(간체), 스페인어, 프랑스어 | Phase 6+ |

**구현**: next-intl, 번역 키 기반, 네임스페이스 구조 (common, editor, inspector, certificate, settings, ai)

**인증서 특수 처리**: 라벨 항상 영어 병기 ("사람이 직접 작성한 글 인증서" / "HUMAN-WRITTEN CERTIFICATE")

---

## 16. 리스크 및 완화 방안

### 16.1 기술적 리스크

| 리스크 | 확률 | 영향 | 완화 방안 |
|--------|------|------|-----------|
| 에디터 성능 저하 (키스트로크 수집 → 입력 지연) | 중 | 높음 | Web Worker 분리, requestIdleCallback, 배치 전송 |
| 타이핑 분석 정확도 부족 (오탐/미탐) | 높음 | 높음 | 초기 보수적 기준, 점진적 ML 도입, 사용자 피드백 루프 |
| AI 프로바이더 의존 (API 변경/장애) | 중 | 중 | 프로바이더 추상화, 폴백, 로컬 모델 옵션 |
| TipTap 커스텀 확장 복잡성 | 중 | 중 | 초기 2주 프로토타입 위험 검증, 기능 범위 제한 |
| 인증서 위조 시도 (타이핑 시뮬레이션) | 낮음 | 높음 | 다중 레이어 검증, 이상 탐지, 주기적 보안 감사 |

### 16.2 제품 리스크

| 리스크 | 확률 | 영향 | 완화 방안 |
|--------|------|------|-----------|
| 인증 신뢰도 시장 수용 | 중 | 높음 | 초기 사용자 테스트, 교육/미디어 파일럿, 방법론 공개 |
| 프라이버시 우려 (키스트로크 수집 거부감) | 중 | 중 | 로컬 처리 우선, 원본 비전송, 명확한 프라이버시 정책, UX 프레이밍 |
| "비침습적 AI" 가치 인식 부족 | 중 | 중 | "AI가 쓰지 않는다" 철학 명확 커뮤니케이션, 인증 시너지 |

### 16.3 일정 리스크

| 리스크 | 확률 | 영향 | 완화 방안 |
|--------|------|------|-----------|
| 에디터 코어 지연 | 중 | 높음 | 초기 2주 프로토타입, 스코프 엄격 관리 |
| 인증 알고리즘 개발 지연 | 중 | 중 | MVP 단순 규칙 기반, ML은 Phase 4 |
| 통합 이슈 (프론트-백 인터페이스 불일치) | 중 | 중 | OpenAPI 스키마 기반 계약, orval 자동 생성, 통합 체크포인트 E2E |

### 16.4 에이전트 개발 리스크

| 리스크 | 확률 | 영향 | 완화 방안 |
|--------|------|------|-----------|
| 코드 스타일 불일치 | 높음 | 중 | ESLint + Prettier 엄격, AGENTS.md 컨벤션, architect 검증 |
| 컨텍스트 유실 | 중 | 중 | OpenAPI 스키마 기반 계약, AGENTS.md 아키텍처 문서 |
| 중복 구현 | 중 | 낮음 | 공유 패키지 사전 구축, explore 에이전트 확인 |
| 테스트 누락 | 중 | 높음 | Architect 검증에 커버리지 포함, CI 임계값 설정 |

---

## 17. 성공 지표 (KPI)

### 17.1 기술적 KPI

| 메트릭 | 목표 | 측정 주기 |
|--------|------|-----------|
| 에디터 입력 지연 (P95) | < 16ms | 매 릴리스 |
| Core Web Vitals (LCP) | < 2.5s | 주간 |
| 에디터 크래시율 | < 0.1% | 일간 |
| 인증서 발행 성공률 | > 99.5% | 일간 |
| 검증 API 응답시간 (P95) | < 200ms | 일간 |
| 테스트 커버리지 | > 80% | 매 PR |
| 빌드 시간 (incremental) | < 60초 | 매 PR |
| 프로덕션 에러율 | < 0.5% | 일간 |

### 17.2 사용자 KPI

| 메트릭 | M3 목표 | M4 목표 | 6개월 목표 |
|--------|---------|---------|-----------|
| MAU | 500 | 5,000 | 20,000 |
| WAU/MAU | 40% | 50% | 60% |
| 문서 생성 수 (월) | 2,000 | 20,000 | 100,000 |
| 평균 글쓰기 세션 | 15분 | 20분 | 25분 |
| 유료 전환율 | 2% | 5% | 8% |
| NPS | > 30 | > 40 | > 50 |
| 30일 리텐션 | 10% | 15% | 25% |

### 17.3 인증 시스템 KPI

| 메트릭 | 목표 | 의미 |
|--------|------|------|
| 인증서 발행 비율 | > 30% (완성 문서 중) | 사용자가 인증을 가치 있게 여기는 정도 |
| 인증서 공유 비율 | > 50% (발행된 인증서 중) | 외부 커뮤니케이션 활용 정도 |
| 검증 페이지 방문 | 인증서당 평균 5회 | 실제 검증 활용 정도 |
| False Positive Rate | < 2% | AI 작성 → 인간으로 잘못 인증 |
| False Negative Rate | < 5% | 인간 작성 → AI로 잘못 판단 |
| A+/A 등급 비율 | > 60% (정상 사용자) | 일반 인간 글쓰기의 높은 등급 |

---

## 18. 비용 모델

> **v3.0 신설**: 7인 리뷰에서 운영 비용 가시성 요청에 따라 신설한다.

### 18.1 MAU별 월 운영 비용 추정

| 항목 | MAU 500 | MAU 5,000 | MAU 20,000 |
|------|---------|-----------|------------|
| **AI API (Claude Haiku 맞춤법)** | ~$5 (~$0.01/문서, 500문서) | ~$50 (5,000문서) | ~$200 (20,000문서) |
| **PostgreSQL + TimescaleDB** | $15 (소규모 인스턴스) | $50 (중간 인스턴스) | $200 (대형 인스턴스) |
| **Redis** | $10 (캐시 512MB) | $25 (캐시 2GB) | $75 (캐시 8GB) |
| **Spring Boot 서버** | $20 (1 인스턴스) | $60 (2 인스턴스) | $200 (4 인스턴스 + LB) |
| **키스트로크 저장소** | ~$2 (TimescaleDB 압축) | ~$15 | ~$50 |
| **기타 (도메인, 인증서 등)** | $10 | $15 | $25 |
| **월 합계** | **~$62** | **~$215** | **~$750** |

> 추정 근거:
> - AI API: Claude Haiku 기준 ~1,000 토큰/문서, 입력 $0.25/M + 출력 $1.25/M
> - 키스트로크: 5초 윈도우 집계, 문서당 ~500KB, TimescaleDB 7일 후 압축 + 90일 삭제
> - 서버: Spring Boot + Virtual Threads, 단일 인스턴스로 MAU 5,000까지 대응 가능

### 18.2 프리미엄 모델 초안

| 플랜 | 가격 | 포함 |
|------|------|------|
| **Free** | $0 | 월 3회 인증서 발행, 맞춤법 AI (하루 5회), 로컬 저장 |
| **Pro** | $10/월 | 무제한 인증서 발행, 무제한 AI, 클라우드 동기화, 우선 지원 |
| **Team** (Post-MVP) | $8/월/인 | Pro + 팀 관리, 일괄 검증, API 접근 |

**손익분기점 추정**:
- MAU 5,000 기준, 유료 전환율 5% = 250명 × $10 = $2,500/월
- 월 운영 비용 ~$215 → **월 수익 ~$2,285**

---

## 19. Phase 3 리뷰 결과 반영 요약

v3.0은 7명의 전문가 리뷰에서 전원 "조건부 찬성"을 받은 후, PM이 최종 결정을 내려 반영한 버전이다.

### 반영된 10건의 변경사항

| # | 변경 | 영향 범위 | 핵심 사유 |
|---|------|-----------|-----------|
| 1 | **Spring WebFlux → Spring MVC + Virtual Threads (Java 21)** | 3.2, 4.2, 9, 11, 12 전역 | Reactive 스택 복잡성 제거, 이중 ORM 해소, 코드 가독성 향상 |
| 2 | **HMAC-SHA256 → Ed25519 (MVP부터)** | 6.5, 14.3, 인증서 구조 | 비대칭 서명으로 오프라인 검증 가능, Phase 4 마이그레이션 불필요 |
| 3 | **MVP 범위 대폭 축소 + 일정 재구성** | 2, 6, 7, 10, 17 | 14주 4-Phase → 10주 MVP + 2주 이터레이션, 핵심 가치에 집중 |
| 4 | **kotlinx.serialization → Jackson + jackson-module-kotlin** | 4.2 | Spring Boot starter 포함, SpringDoc 완벽 호환 |
| 5 | **타이핑 분석 파일럿 검증 추가** | 6.1, 10 | Phase 1 Week 5에 10명 대상 실측 검증, 임계값 교정 |
| 6 | **비용 모델 섹션 신설** | 18절 (신규) | MAU별 운영 비용 추정, 프리미엄 모델 초안 |
| 7 | **테스트 전략 보강** | 12 | k6 부하 테스트, 인증 경계값, 한국어 IME 매트릭스, WebSocket/SSE 전략 |
| 8 | **디자인 토큰 통합** | 8.4 | 다크 모드 접근성 토큰 추가, prefers-contrast: more 대응 |
| 9 | **프론트엔드 통신 개선** | 9.3, 4.1 | SockJS 제거 → 순수 WebSocket, SSE 프록시 인증 수정, TipTap v3 → v2 |
| 10 | **UX 보강** | 8.1, 8.2, 9.3 | 인증 실패/에러 플로우, STOMP 연결 상태 UX, Focus Mode MVP 축소 |

### MVP에서 제거되어 Post-MVP로 이동한 항목

| 카테고리 | 이동된 항목 | 이터레이션 |
|----------|-----------|-----------|
| 에디터 | Focus Mode Deep/Zen, Typewriter Mode, Floating Toolbar, Slash Commands, 코드 블록 구문 강조 | Iter 1 |
| 인증 | Layer 2(편집 패턴), Layer 3(콘텐츠 무결성), 6등급 체계, ONNX DistilBERT, GPTZero | Iter 2 |
| AI | 팩트 체크, 스타일 제안, AI 요약 | Iter 3 |
| 인프라 | OAuth GitHub/Apple, 클라우드 동기화, RabbitMQ, FileStoragePort, Screen Recording | Iter 3-4 |
| 프론트 | 반응형 4단계 (Desktop 외), PWA, 내보내기, i18n | Iter 4-5 |
| 플랫폼 | 공개 API, Tauri/Capacitor, VS Code Extension | Iter 6+ |

### 기술적 주요 결정 사유

1. **Virtual Threads를 선택한 이유**: R2DBC와 Exposed 이중 ORM의 복잡성을 제거하면서도, Java 21 Virtual Threads가 blocking I/O를 효율적으로 처리하여 동일한 처리량을 달성할 수 있다. Kotlin Coroutines도 여전히 사용 가능하다.

2. **Ed25519를 MVP부터 사용하는 이유**: HMAC-SHA256은 대칭키 방식으로 서버가 검증해야 하지만, Ed25519 비대칭 서명은 공개키로 오프라인 검증이 가능하다. JDK 17+에서 네이티브 지원하므로 추가 의존성이 없다.

3. **MVP 범위를 축소한 이유**: 핵심 가치 제안(글쓰기 + 인증 + AI 맞춤법)을 10주 내에 검증하고, 사용자 피드백을 반영하여 점진적으로 확장하는 전략이 리스크를 최소화한다.

4. **파일럿 검증을 Phase 1에 포함한 이유**: Layer 1 키스트로크 분석의 기대값이 이론적 추정치이므로, MVP 출시 전 실측 데이터로 교정해야 한다. 시나리오 (b) "AI 보고 타이핑"의 한계를 투명하게 인정한다.

---

## 부록

### A. 모듈 간 인터페이스 계약

#### A.1 프론트엔드 내부 인터페이스 (TypeScript)

본 문서 11.1절에 핵심 인터페이스를 정의하였다. 프론트엔드 내부 공유 타입은 `frontend/packages/core/src/` 디렉터리에서 관리한다:

| 파일 | 내용 |
|------|------|
| `keystroke.ts` | KeystrokeEvent, KeystrokeStatVector, SessionData |
| `edit.ts` | EditEvent, PasteEvent |
| `certificate.ts` | HumanWrittenCertificate, CertificateGrade, VerificationResult (클라이언트 사이드) |
| `ai.ts` | ReviewItem, AISummary, AIUsageData, AIFeedbackProvider |

#### A.2 프론트-백 API 계약 (OpenAPI)

프론트엔드와 백엔드 간 타입 공유는 OpenAPI 스키마가 Single Source of Truth이다:

| 소스 | 경로 | 내용 |
|------|------|------|
| OpenAPI 스키마 | `schema/openapi.yaml` | 전체 REST API 스키마 (SpringDoc 자동 생성) |
| TypeScript 클라이언트 | `frontend/packages/api-client/` | orval 자동 생성 (TanStack Query hooks) |
| Kotlin DTO | `backend/src/.../presentation/dto/` | 요청/응답 DTO (@Schema 어노테이션) |

#### A.3 백엔드 도메인 모델 (Kotlin)

| 패키지 | 내용 |
|--------|------|
| `domain.user` | User, UserSettings, OAuthAccount |
| `domain.document` | Document, DocumentVersion |
| `domain.session` | WritingSession, KeystrokeEvent, SessionData |
| `domain.certificate` | Certificate, CertificateGrade, VerificationResult |
| `domain.ai` | AIReview, AIUsageData, ReviewType |

### B. 참조 문서 목록

| 문서 | 경로 | 작성자 |
|------|------|--------|
| 제품 전략 및 개발 계획서 | `.omc/plans/humanwrites-product-strategy.md` | 기획자/PM |
| UX 전략 및 사용자 경험 심화 분석 | `UX_STRATEGY.md` | UX/UI 디자이너 |
| QA 테스트 전략 및 계획서 | `TEST_STRATEGY.md` | 테스트 전문가 |
| 디자인 시스템 | `DESIGN_SYSTEM.md` | UX/UI 디자이너 |

---

*이 문서는 HumanWrites 프로젝트의 마스터 플랜으로, 6명의 전문가(시스템 아키텍트, UX/UI 디자이너, 프론트엔드 개발자, 백엔드 개발자, 테스트 전문가, 기획자)의 분석 결과를 PM이 통합하여 작성하였다. v2.0에서 백엔드를 Node.js/Hono에서 **Kotlin + Spring Boot (WebFlux)**로 전환하고, 인프라를 클라우드 비의존적 설계로 변경하였다. AI 에이전트 팀은 이 문서를 참조하여 **Kotlin + Spring Boot 백엔드 + Next.js 프론트엔드** 조합으로 실제 개발을 수행한다.*
