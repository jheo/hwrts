# HumanWrites - Lessons Learned

> 개발 과정에서 겪은 문제, 시행착오, 우회 방법을 기록합니다.
> 다음 단계 시작 전 반드시 참조하여 같은 실수를 반복하지 않도록 합니다.

---

## Phase 1-1: 프로젝트 셋업

### 1. ktlint Gradle 플러그인과 Kotlin 2.1.x 호환성 문제
- **문제**: `org.jlleitschuh.gradle.ktlint` 12.1.2가 Kotlin 2.1.10과 호환되지 않음. `KtTokens.HEADER_KEYWORD` 필드 없다는 에러 발생.
- **원인**: ktlint 내부에서 사용하는 Kotlin 컴파일러 API가 Kotlin 2.1.x에서 변경됨.
- **해결**: `com.diffplug.spotless` 7.0.2 + `ktlint("1.5.0")`으로 전환. `./gradlew spotlessCheck` / `spotlessApply` 사용.
- **주의**: Makefile과 GitHub Actions CI의 lint 명령도 함께 변경 필요.

### 2. Next.js 자동 생성 파일 ESLint 충돌
- **문제**: Next.js가 빌드 시 생성하는 `next-env.d.ts`에 triple-slash reference가 포함되어 `@typescript-eslint/triple-slash-reference` 규칙 위반.
- **해결**: `eslint.config.mjs`의 ignores에 `'**/next-env.d.ts'` 추가.

### 3. Docker Desktop vs Colima
- **문제**: `brew install --cask docker` (Docker Desktop)가 sudo 권한 필요로 비대화형 환경에서 설치 실패.
- **해결**: `brew install docker docker-compose colima`로 경량 Docker 런타임 사용. `colima start`로 시작.

