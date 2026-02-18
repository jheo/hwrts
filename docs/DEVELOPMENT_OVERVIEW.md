# HumanWrites 개발 진행 관리

> **목적**: 전체 개발 과정을 한눈에 파악하는 관리용 문서
> **원본**: PROJECT_PLAN.md (v3.0)
> **최종 수정**: 2026-02-18

---

## 전체 구조

- **MVP 10주**: Phase 1 (Week 1-5, 코어 에디터) + Phase 2 (Week 6-10, 인증+AI+통합)
- **Post-MVP**: 2주 단위 이터레이션 (Iter 1~6+)
- **기술 스택**: Next.js 15 + TipTap v2 (프론트) / Spring Boot 3.x + Kotlin + Virtual Threads (백엔드)
- **빌드**: Turborepo + pnpm (프론트) / Gradle Kotlin DSL (백엔드) / Makefile (통합)

---

## 단계별 요약표

| 단계 | 기간 | 목표 | 상세문서 | 상태 |
|------|------|------|---------|------|
| Phase 1-1 | Week 1 | 프로젝트 셋업 (모노레포, Spring Boot, Docker, CI) | [phase-1-1-setup.md](./phase-1-1-setup.md) | ✅ |
| Phase 1-2 | Week 2 | TipTap v2 에디터 코어 (리치 텍스트, Markdown) | [phase-1-2-editor-core.md](./phase-1-2-editor-core.md) | ✅ |
| Phase 1-3 | Week 3 | 에디터 UX (단락 포커스, 테마, 자동 저장) | [phase-1-3-editor-ux.md](./phase-1-3-editor-ux.md) | ✅ |
| Phase 1-4 | Week 4 | Inspector 패널 + 문서 통계 | [phase-1-4-inspector.md](./phase-1-4-inspector.md) | ✅ |
| Phase 1-5 | Week 5 | 키스트로크 수집 + 파일럿 검증 | [phase-1-5-keystroke.md](./phase-1-5-keystroke.md) | ✅ |
| Phase 2-1 | Week 6 | Spring Boot REST API + Google OAuth | [phase-2-1-backend-api.md](./phase-2-1-backend-api.md) | ⬜ |
| Phase 2-2 | Week 7 | OpenAPI 파이프라인 + 키스트로크 분석 알고리즘 | [phase-2-2-certification.md](./phase-2-2-certification.md) | ⬜ |
| Phase 2-3 | Week 8 | 인증서 (Ed25519) + 검증 페이지 | [phase-2-3-certificate-ui.md](./phase-2-3-certificate-ui.md) | ⬜ |
| Phase 2-4 | Week 9 | AI 맞춤법 검사 + 인라인 피드백 | [phase-2-4-ai-assist.md](./phase-2-4-ai-assist.md) | ⬜ |
| Phase 2-5 | Week 10 | 통합 테스트 + 성능 최적화 | [phase-2-5-integration.md](./phase-2-5-integration.md) | ⬜ |

---

## 의존 관계 다이어그램

```
Phase 1-1 (셋업)
  ├──→ Phase 1-2 (에디터 코어)
  │       └──→ Phase 1-3 (에디터 UX + Focus Mode Soft)
  │               └──→ Phase 1-4 (Inspector + 통계)
  │                       └──→ Phase 1-5 (키스트로크 수집)
  │                               └──→ Phase 2-1에 파일럿 데이터 전달
  └──→ Phase 2-1 (백엔드 API) ← Phase 1-1의 Spring Boot/Docker 기반 + Phase 1-5 파일럿 데이터
          └──→ Phase 2-2 (OpenAPI + 분석 알고리즘)
                  └──→ Phase 2-3 (인증서 + 검증 페이지)
                          └──→ Phase 2-4 (AI 맞춤법)
                                  └──→ Phase 2-5 (통합 테스트)

병렬 가능:
  - Phase 1-2 ~ 1-5 (프론트) ∥ Phase 2-1 시작 준비 (백엔드 스키마)
  - UI 컴포넌트 (디자인 토큰, Atoms) 는 Phase 1-1부터 전 기간 병렬 진행
```

---

## 핵심 마일스톤

| 마일스톤 | 시점 | 검증 기준 |
|----------|------|-----------|
| **M1** | Week 5 끝 | 에디터에서 글을 쓰고 키스트로크가 수집된다. 파일럿 검증(10명x3시나리오) 완료. |
| **M2** | Week 10 끝 | 글 작성 → 인증서 발행 → 공유 → 검증 + 맞춤법 AI 동작. E2E 테스트 통과. |

---

## 통합 체크포인트

| # | 시점 | 통합 대상 | 검증 방법 |
|---|------|-----------|-----------|
| 1 | Week 2 끝 | Editor + UI 컴포넌트 | TipTap v2 에디터에서 디자인 토큰 기반 UI 렌더링 |
| 2 | Week 5 끝 (M1) | Editor + Collector + 파일럿 | 글 쓰면서 키스트로크 수집 + 파일럿 검증 완료 |
| 3 | Week 8 끝 | Collector + Certifier + 검증 페이지 | 글 작성 → Ed25519 인증서 발행 → 검증 URL |
| 4 | Week 10 끝 (M2) | 전체 통합 | E2E: 글 작성 → AI 맞춤법 → 인증서 발행 → 검증 |

---

## 5개 병렬 팀 구성

| 팀 | 역할 | 에이전트 | 담당 영역 |
|----|------|----------|-----------|
| Team 1 (FE 코어) | 프론트엔드 코어 | `executor-high` | Editor, ProseMirror 확장, STOMP/SSE 클라이언트 |
| Team 2 (BE) | 백엔드 | `executor-high` | Spring Boot API, WebSocket, SSE, Exposed(JDBC) |
| Team 3 (알고리즘) | 알고리즘 | `executor` | Collector, 분석 알고리즘, 스코어링 |
| Team 4 (UI) | UI | `designer` + `executor` | UI 컴포넌트, 모달, 검증 페이지 |
| Team 5 (인프라) | 인프라/통합 | `executor` | Docker, DB 마이그레이션, CI/CD, OpenAPI |
| Architect | 아키텍트 | `architect` | 코드 리뷰, 통합 검증, 설계 결정 |
| QA | QA | `qa-tester` | 테스트 작성, 검증, 접근성 |

---

## 각 단계 문서 공통 구조

모든 `phase-X-Y-*.md` 문서는 아래 구조를 따른다:

1. **개발 목표** - 이 단계가 끝났을 때 달성해야 할 것 (구체적, 검증 가능)
2. **선행 조건** - 시작 전 완료되어야 할 것
3. **아키텍처** - 생성/수정되는 파일 구조, 핵심 기술 결정
4. **상세 태스크** - 각 태스크의 설명, 파일 경로, 핵심 구현 포인트
5. **에이전트 팀 구성** - 역할, 담당 태스크, 병렬 가능 여부
6. **고려 사항** - 기술적 주의점, 엣지 케이스
7. **검증 기준** - 체크리스트 (완료 조건)
8. **산출물** - 생성되는 파일/기능 목록
9. **다음 단계 연결** - 다음 단계에 전달되는 것

---

## 품질 게이트 (모든 PR)

**프론트엔드**: `tsc --noEmit` 에러 0 / ESLint 에러 0 / Vitest 100% 통과 / 커버리지 80%+
**백엔드**: `./gradlew compileKotlin` 에러 0 / ktlint 에러 0 / Kotest 100% 통과 / JaCoCo 80%+
