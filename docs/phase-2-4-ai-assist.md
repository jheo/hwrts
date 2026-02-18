# Phase 2-4: AI 맞춤법 + 인라인 피드백 (Week 9)

## 개발 목표

AI 게이트웨이 서비스를 구축하고 맞춤법/문법 검사 기능을 구현한다. 프론트엔드에서 인라인 wavy underline 피드백과 Inspector 리뷰 탭을 연동하며, 모든 AI 사용 기록을 인증서에 투명하게 반영한다.

## 선행 조건

- Phase 2-3 완료: CertificateService, SignatureService, 인증서 발행 API, 검증 페이지
- OpenAPI 파이프라인 동작: api-client 생성 가능
- Redis 가동 중 (캐시 레이어용)
- AI Provider API Key 확보 (Claude 또는 OpenAI)

## 아키텍처

```
[에디터: 타이핑 중단 1.5초] → POST /api/ai/spelling (현재 단락)
    → AiGatewayService
        → Redis 캐시 확인 (24h TTL)
        → Cache Miss → ProviderRouter → Claude Haiku / OpenAI GPT-4o-mini
        → RestClient(Spring 6.1+) 동기 호출 (Virtual Threads)
    → ReviewItem[] 응답
    → 프론트: wavy underline 렌더링 + Inspector ReviewItem 목록

[AI 사용 기록] → AiUsageTracker → 인증서 발행 시 aiAssistance 데이터 포함
```

## 상세 태스크

### Task 1: AI 게이트웨이 서비스

- **파일**: `backend/src/main/kotlin/com/humanwrites/domain/ai/AiGatewayService.kt`, `backend/src/main/kotlin/com/humanwrites/domain/ai/provider/AiProvider.kt`
- **설명**: AI Provider 추상화 + Redis 캐시 + Rate Limiting
- **핵심 구현**:
  - `AiProvider` 인터페이스: `fun analyzeSpelling(text: String, locale: String): List<ReviewItem>`
  - `ClaudeProvider`, `OpenAiProvider` 구현체 (RestClient 사용)
  - `ProviderRouter`: 사용자 설정(`ai_provider`)에 따라 프로바이더 선택
  - Redis 캐시: 텍스트 해시 기반 키, 24시간 TTL, 동일 텍스트 반복 요청 ~40% 감소
  - Rate Limiter: Redis Sliding Window, AI API 20req/min

### Task 2: 맞춤법/문법 검사 엔드포인트

- **파일**: `backend/src/main/kotlin/com/humanwrites/presentation/rest/AiController.kt`
- **설명**: `POST /api/ai/spelling` REST API
- **핵심 구현**:
  - 요청 DTO: `{ text: string, locale: 'ko' | 'en', documentId: string }`
  - 응답 DTO: `{ items: ReviewItem[] }` where ReviewItem = `{ id, type, severity, range: {from, to}, message, suggestion, source }` (source: 'ai_model' | 'user_ignore')
  - 단락 단위 분석 (전체 문서가 아닌 현재 단락만 전송 → 토큰 ~60% 절감)
  - 코드 블록 내 텍스트 검사 제외 로직
  - 경량 모델 사용: Claude Haiku 또는 GPT-4o-mini

### Task 3: 프론트엔드 인라인 피드백 시스템

- **파일**: `frontend/packages/editor-react/extensions/InlineFeedback.ts`, `frontend/packages/ui/molecules/InlinePopover.tsx`
- **설명**: TipTap Decoration 기반 wavy underline + 호버 툴팁
- **핵심 구현**:
  - ProseMirror Decoration: ReviewItem의 range에 wavy underline 적용
  - 밑줄 스타일: `text-decoration: wavy underline`, 색상 Light `--feedback-spelling: #92400E` / Dark `--feedback-spelling: #FCD34D`, opacity 0.3
  - 호버 시 InlinePopover: "Fix" (수정 적용) / "Ignore" (이번만 무시) / "Learn" (사전 추가)
  - "Fix" 클릭 시 ProseMirror transaction으로 텍스트 교체
  - 피드백 우선순위: 동일 위치에 복수 피드백 시 맞춤법 > 문법 순서

### Task 4: 피드백 타이밍 제어

- **파일**: `frontend/packages/editor-react/hooks/useAiFeedback.ts`
- **설명**: 타이핑 중단 후 적절한 시점에 AI 요청
- **핵심 구현**:
  - 타이핑 중: 피드백 갱신 완전 중단 (debounce)
  - 타이핑 중단 1.5초 후: 현재 단락 맞춤법 검사 요청
  - 단락 이탈 시: 이전 단락 피드백 즉시 인라인 표시
  - 중복 요청 방지: 동일 단락 내용 변경 없으면 재요청 안 함
  - AbortController: 새 요청 시 이전 미완료 요청 취소

### Task 5: Inspector 리뷰 탭 연동

- **파일**: `frontend/packages/ui/organisms/Inspector.tsx` (리뷰 탭 추가)
- **설명**: Inspector 패널에 ReviewItem 목록 표시 + 클릭 시 본문 연동
- **핵심 구현**:
  - 리뷰 탭: ReviewItem 리스트 (아이콘 + 메시지 + 수정 제안)
  - 클릭 시: 에디터 본문 해당 위치로 스크롤 + 해당 단어 하이라이트
  - 수정 적용/무시 버튼: 인라인 팝오버와 동일 동작
  - 카운터 배지: 리뷰 탭 아이콘에 미해결 항목 수 표시

### Task 6: AI 사용 기록 모듈

- **파일**: `backend/src/main/kotlin/com/humanwrites/domain/ai/AiUsageTracker.kt`
- **설명**: AI 제안/수락/거절 추적, 인증서 aiAssistance 데이터 생성
- **핵심 구현**:
  - 이벤트 기록: 제안 생성, 제안 수락, 제안 거절 각각 카운트
  - `getAiUsageData(documentId)`: `{ enabled, features_used, suggestions_accepted, suggestions_rejected, total_suggestions }` 반환
  - 인증서 발행 시 CertificateService가 AiUsageTracker 데이터를 `ai_usage_data` JSONB에 포함

### Task 7: AI Integration 설정 UI

- **파일**: `frontend/apps/web/app/settings/ai/page.tsx`
- **설명**: AI 기능 On/Off 토글 및 Provider 설정
- **핵심 구현**:
  - 마스터 토글: AI 어시스트 전체 On/Off
  - 개별 토글: 맞춤법/문법 (MVP), 팩트 체크(disabled, Post-MVP), 스타일(disabled, Post-MVP)
  - Provider 선택: Claude / OpenAI 라디오 버튼
  - `PUT /api/users/settings` API로 저장

### Task 8: ai_reviews DB 마이그레이션

- **파일**: `backend/src/main/resources/db/migration/V7__create_ai_reviews.sql`
- **설명**: AI 리뷰 기록 테이블 생성
- **핵심 구현**:
  - 컬럼: id(UUID PK), document_id(FK), review_type(VARCHAR(20)), content(JSONB), ai_provider(VARCHAR(20)), ai_model(VARCHAR(50)), suggestions_count(INT), accepted_count(INT), created_at
  - `review_type`: 'spelling', 'grammar' (MVP), 'fact_check', 'style' (Post-MVP)

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 |
|----------|------|-------------|-----------|
| `executor-high` (opus) | 백엔드 엔지니어 | Task 1, 2, 6 | T8 완료 후 (T1→T2 순차) |
| `executor` (sonnet) | DB 엔지니어 | Task 8 | Yes (T8↔T3) |
| `executor-high` (opus) | 프론트 코어 | Task 3, 4 | Yes (T3↔T1) |
| `designer` (sonnet) | UI 엔지니어 | Task 5, 7 | T3 완료 후 |
| `architect` (opus) | 코드 리뷰 | 전체 검증 | 모든 태스크 완료 후 |

## 고려 사항

- **AI 프롬프트 설계**: 단락 단위 입력, 오류 위치(from, to)를 정확히 반환하도록 구조화된 출력(JSON mode) 사용
- **비용 최적화**: 경량 모델(Haiku/GPT-4o-mini)로 맞춤법 처리, Redis 캐시 24h TTL로 반복 요청 절감
- **Graceful Degradation**: AI 프로바이더 장애 시 에디터 정상 작동 보장. 에러 시 Inspector에 "AI 서비스 일시 중단" 표시, 재시도 버튼 제공
- **인증서 투명성**: AI 사용 여부가 인증서에 명확히 기록. AI Off 상태에서 작성 시 `aiAssistance.enabled: false`
- **한국어 지원**: AI 프롬프트에 locale 파라미터 전달, 한국어 맞춤법 규칙 반영

## 검증 기준 (체크리스트)

- [ ] `POST /api/ai/spelling` → ReviewItem 배열 정상 반환 (한국어, 영어)
- [ ] Redis 캐시: 동일 텍스트 2회 요청 시 캐시 히트 확인
- [ ] 인라인 wavy underline: 맞춤법 오류 위치에 정확히 표시
- [ ] 호버 팝오버: Fix/Ignore/Learn 버튼 동작 확인
- [ ] Fix 클릭 시 에디터 텍스트 정확히 교체
- [ ] 피드백 타이밍: 타이핑 중 피드백 미표시, 1.5초 후 표시
- [ ] Inspector 리뷰 탭: 항목 클릭 → 본문 스크롤 + 하이라이트
- [ ] AI 사용 기록: 인증서 발행 시 aiAssistance 데이터 포함 확인
- [ ] AI Off 상태: 에디터 정상 동작, 인라인 피드백 미표시

## 산출물

- `AiGatewayService`, `ClaudeProvider`, `OpenAiProvider` (AI 게이트웨이)
- `AiController` (맞춤법 REST API)
- `InlineFeedback.ts` (ProseMirror Decoration 확장)
- `useAiFeedback.ts` (피드백 타이밍 훅)
- Inspector 리뷰 탭, AI 설정 페이지
- `AiUsageTracker` (AI 사용 기록)
- Flyway 마이그레이션 V7 (ai_reviews 테이블)

## 다음 단계 연결

- **Phase 2-5**: E2E 테스트에서 AI 맞춤법 → 수정 수락 → 인증서 발행 시 AI 사용 기록 포함 검증
- **Post-MVP Iter 3**: 팩트 체크(dotted underline), 스타일 제안(dashed underline), AI 요약(SSE 스트리밍) 확장
