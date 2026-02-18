# Phase 2-3: 인증서 생성 + 검증 페이지 (Week 8)

## 개발 목표

Ed25519 디지털 서명 기반 인증서 생성/발행 시스템을 구현하고, 공개 검증 페이지와 인증서 발행 모달 UI를 완성한다. 글 작성 → 인증서 발행 → 공유 → 검증의 전체 플로우를 연결한다.

## 선행 조건

- Phase 2-2 완료: KeystrokeAnalyzer, ScoringService, WebSocket 핸들러, TimescaleDB 마이그레이션
- OpenAPI 파이프라인 동작: `make openapi-generate`로 클라이언트 코드 생성 가능
- Spring Security + Google OAuth 인증 동작 중

## 아키텍처

```
[인증서 발행 요청] → CertificateController (POST /api/certificates)
    → ScoringService.evaluate(sessionData) → 점수 산정
    → SignatureService.sign(certData) → Ed25519 서명
    → CertificateService.issue() → DB 저장 + shortHash 생성
    → 응답: HumanWrittenCertificate JSON

[검증 요청] → GET /api/verify/{shortHash} → CertificateService.verify()
    → Next.js RSC 렌더링 + OG 메타태그

[공개키] → GET /.well-known/humanwrites-public-key.pem → 오프라인 검증 지원
```

## 상세 태스크

### Task 1: certificates DB 테이블 마이그레이션

- **파일**: `backend/src/main/resources/db/migration/V6__create_certificates.sql`
- **설명**: 인증서 저장 테이블 생성
- **핵심 구현**:
  - 컬럼: id(UUID PK), document_id(FK), user_id(FK), short_hash(VARCHAR(32) UNIQUE), overall_score(REAL), grade(VARCHAR(20)), verification_data(JSONB), ai_usage_data(JSONB), content_hash(VARCHAR(64)), signature(TEXT), status(VARCHAR(20) DEFAULT 'active'), issued_at, expires_at
  - 인덱스: `idx_certificates_short_hash`, `idx_certificates_user`

### Task 2: Ed25519 디지털 서명 서비스

- **파일**: `backend/src/main/kotlin/com/humanwrites/domain/certificate/SignatureService.kt`
- **설명**: JDK 17+ `java.security` 기반 Ed25519 서명/검증
- **핵심 구현**:
  - 키 페어 로드: 환경 변수 또는 설정 파일에서 Ed25519 비밀키 로드 (서버 시작 시)
  - `signCertificate(certData)`: 서명 대상(id, contentHash, overallScore, grade, issuedAt) JSON 직렬화 → Ed25519 서명 → Base64URL 인코딩
  - `verifyCertificate(payload, signature)`: 공개키로 서명 검증
  - SHA-256 content hash 생성 (`sha256(document.content)`)

### Task 3: 인증서 생성 서비스

- **파일**: `backend/src/main/kotlin/com/humanwrites/domain/certificate/CertificateService.kt`
- **설명**: 인증서 발행 비즈니스 로직 (스코어링 → 서명 → 저장)
- **핵심 구현**:
  - `issueCertificate(documentId, userId)`: 세션 데이터 조회 → ScoringService 평가 → grade 판정 → SignatureService 서명 → DB 저장
  - shortHash 생성: UUID + timestamp → SHA-256 → 앞 32자
  - MVP 이분법: Certified (임계값 이상) / Not Certified (미만)
  - `version: "1.0.0"` 고정값 설정 (인증 프로토콜 버전, CLAUDE.md 인증서 구조 준수)
  - `aiAssistance` 기본값: Phase 2-3 시점에서는 AI 미연동이므로 `{ enabled: false, features_used: [], suggestions_accepted: 0, suggestions_rejected: 0, total_suggestions: 0 }`. Phase 2-4에서 실제 값으로 교체
  - `HumanWrittenCertificate` 응답 DTO 구성 (2.2절 데이터 구조 준수)

### Task 4: 인증서 발행 REST API

- **파일**: `backend/src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt`
- **설명**: 인증서 CRUD 엔드포인트
- **핵심 구현**:
  - `POST /api/certificates`: 인증서 발행 (인증 필요)
  - `GET /api/certificates`: 내 인증서 목록 (인증 필요)
  - `DELETE /api/certificates/{id}`: 인증서 취소 (인증 필요)
  - `GET /api/verify/{shortHash}`: 공개 검증 (인증 불필요) → 인증서 JSON 반환
  - `GET /.well-known/humanwrites-public-key.pem`: Ed25519 공개키 PEM 응답

### Task 5: 인증서 발행 모달 UI

- **파일**: `frontend/packages/ui/organisms/CertificateModal.tsx`
- **설명**: 4단계 감정 곡선 모달 (analyzing → review → signing → complete)
- **핵심 구현**:
  - **Step 1 (analyzing)**: 스코어 분석 프로그레스 애니메이션, "글쓰기 패턴을 분석하고 있습니다..."
  - **Step 2 (review)**: 분석 결과 미리보기 (점수, 지표별 상세), Certified/Not Certified 표시
  - **Step 3 (signing)**: 디지털 서명 진행 애니메이션, "인증서에 서명하는 중..."
  - **Step 4 (complete)**: 인증서 카드 + 공유 버튼 (Twitter, LinkedIn, 링크 복사)
  - Radix UI Dialog 기반, 각 단계 전환 시 framer-motion 애니메이션

### Task 6: 공개 검증 페이지

- **파일**: `frontend/apps/web/app/verify/[shortHash]/page.tsx`
- **설명**: Next.js RSC로 서버 렌더링되는 인증서 검증 페이지
- **핵심 구현**:
  - Server Component: `fetch(/api/verify/{shortHash})` → 인증서 데이터 렌더링
  - 인증서 카드: 제목, 저자, 단어 수, 편집 횟수, 소요 시간
  - 타이핑 패턴 시각화: WPM 그래프 (미니 바 차트)
  - 검증 체크리스트: AI 사용 범위 기록 완료, Layer 1 키스트로크 패턴 분석 통과
  - Certificate ID, 발행일 표시

### Task 7: OG 메타태그 자동 생성

- **파일**: `frontend/apps/web/app/verify/[shortHash]/page.tsx` (metadata export)
- **설명**: 소셜 공유 시 미리보기 카드 자동 생성
- **핵심 구현**:
  - `generateMetadata()`: 인증서 데이터 기반 동적 OG 태그
  - `og:title`: "Human Written Certificate - {문서 제목}"
  - `og:description`: "{저자}가 작성한 {단어수}단어 글 - HumanWrites 인증"
  - `og:image`: 동적 OG 이미지 (Next.js `ImageResponse` 또는 정적 템플릿)
  - Twitter Card 메타태그 (`twitter:card`, `twitter:title`)

## 에이전트 팀 구성

| 에이전트 | 역할 | 담당 태스크 | 병렬 가능 |
|----------|------|-------------|-----------|
| `executor` (sonnet) | DB 엔지니어 | Task 1 | Yes (T1↔T5) |
| `executor-high` (opus) | 백엔드 엔지니어 | Task 2, 3, 4 | T1 완료 후 (T2→T3→T4 순차) |
| `designer` (sonnet) | UI 엔지니어 | Task 5 | Yes (T5↔T2) |
| `executor-high` (opus) | 프론트 엔지니어 | Task 6, 7 | T4 완료 후 (API 필요) |
| `architect` (opus) | 코드 리뷰 | 전체 검증 | 모든 태스크 완료 후 |

## 고려 사항

- **Ed25519 키 관리**: 비밀키는 환경 변수(`ED25519_PRIVATE_KEY`)로 주입 (CLAUDE.md 환경변수 규칙 준수). 개발 환경에서는 서버 시작 시 임시 키 자동 생성
- **shortHash 충돌**: 32자 SHA-256 prefix로 충돌 확률 극히 낮으나, DB UNIQUE 제약으로 보장. 충돌 시 재생성
- **인증서 만료**: MVP에서 `expires_at`은 NULL (영구). Post-MVP에서 갱신 정책 결정
- **검증 페이지 캐싱**: ISR(Incremental Static Regeneration) 적용, `revalidate: 3600` (1시간)
- **Not Certified 시 UX**: 모달 Step 2에서 부드럽게 안내, 추가 작성 유도 (비난하지 않음)

## 검증 기준 (체크리스트)

- [ ] `POST /api/certificates` → 인증서 JSON 응답 (shortHash, signature 포함)
- [ ] Ed25519 서명 검증: 공개키로 signature 검증 성공
- [ ] `GET /api/verify/{shortHash}` → 인증서 데이터 정상 반환
- [ ] `GET /.well-known/humanwrites-public-key.pem` → PEM 형식 공개키 응답
- [ ] 인증서 발행 모달: 4단계 전환 애니메이션 정상 동작
- [ ] 검증 페이지: RSC 서버 렌더링, 인증서 카드 표시 확인
- [ ] OG 메타태그: 소셜 공유 미리보기 카드 정상 표시 (Twitter, LinkedIn)
- [ ] Certified/Not Certified 이분법 판정 정확성 테스트

## 산출물

- `SignatureService` (Ed25519 서명/검증)
- `CertificateService` (인증서 발행 비즈니스 로직)
- `CertificateController` (REST API)
- `CertificateModal.tsx` (4단계 발행 모달)
- `verify/[shortHash]/page.tsx` (공개 검증 페이지 + OG 메타태그)
- Flyway 마이그레이션 V6 (certificates 테이블)

## 다음 단계 연결

- **Phase 2-4**: 인증서의 `ai_usage_data` 필드에 AI 맞춤법 사용 기록이 연동됨. AI 리뷰 데이터가 인증서 발행 시 자동 포함
- **Phase 2-5**: E2E 테스트에서 글 작성 → 인증서 발행 → 검증 전체 플로우 검증
