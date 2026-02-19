# QA Cycle 5 - Backend Fixes

**Date**: 2026-02-19
**Scope**: Targeted fixes for Issues #2, #3, #6, #7, #8 identified in QA Cycle 5

---

## Summary

Applied 5 targeted fixes to the backend. All changes are minimal and surgical — no unrelated code touched. spotlessApply and `./gradlew test` both pass cleanly after all changes.

---

## Issue #2 (HIGH): GoogleOAuth2Handler hardcoded localhost redirect

**File**: `src/main/kotlin/com/humanwrites/infrastructure/security/GoogleOAuth2Handler.kt`

**Problem**: `response.sendRedirect("http://localhost:3000/editor")` was hardcoded, breaking any non-local deployment.

**Fix**:
- Added `@Value("\${app.cors.allowed-origins:http://localhost:3000}") private val allowedOrigins: String` to the constructor via Spring injection.
- At redirect time, extracts the first origin with `allowedOrigins.split(",").first().trim()` to derive `frontendUrl`.
- Redirect is now `"$frontendUrl/editor"`, fully configurable via `app.cors.allowed-origins`.

**Reuses existing config key** already declared in `WebConfig`, so no new properties needed.

---

## Issue #3 (MEDIUM): AcceptSuggestionsRequest missing validation

**Files**:
- `src/main/kotlin/com/humanwrites/presentation/dto/request/AiRequests.kt`
- `src/main/kotlin/com/humanwrites/presentation/rest/AiController.kt`

**Problem**: `AcceptSuggestionsRequest.count` had no bounds validation. A client could send `count = -1` or `count = 999999999`, corrupting usage stats. The `acceptSuggestions` endpoint also lacked `@Valid`, so any annotations on the DTO would have been silently ignored.

**Fix**:
- Added `import jakarta.validation.constraints.Min` and `import jakarta.validation.constraints.Max` to `AiRequests.kt`.
- Added `@field:Min(1) @field:Max(1000)` on the `count` field of `AcceptSuggestionsRequest`.
- Added `@Valid` annotation to the `@RequestBody` parameter in `AiController.acceptSuggestions`. (`jakarta.validation.Valid` was already imported.)

---

## Issue #6 (MEDIUM): IssueCertificateRequest missing numeric validation

**File**: `src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt`

**Problem**: `wordCount` and `paragraphCount` in `IssueCertificateRequest` accepted any integer, including negative or astronomically large values that would pass into the signing payload.

**Fix**:
- Added `import jakarta.validation.constraints.Min` and `import jakarta.validation.constraints.Max`.
- Added `@field:Min(0) @field:Max(1_000_000)` on `wordCount`.
- Added `@field:Min(0) @field:Max(100_000)` on `paragraphCount`.
- The class already had `@Valid` on the controller parameter, so these constraints are now enforced automatically.

---

## Issue #7 (MEDIUM): Certificate issuance missing document ownership check

**File**: `src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt`

**Problem**: `issueCertificate` trusted the `documentId` from the request body without verifying the authenticated user owns that document. An attacker could issue a certificate for another user's document.

**Fix**:
- Imported `com.humanwrites.domain.document.DocumentService`.
- Injected `DocumentService` into `CertificateController` constructor.
- Before calling `certificateService.issueCertificate`, added:
  ```kotlin
  val doc = documentService.findById(request.documentId)
      ?: return ResponseEntity.notFound().build()
  if (doc.userId != userId) return ResponseEntity.status(403).build()
  ```
- Uses the existing `DocumentService.findById(UUID)` method (no new service methods needed).
- Returns `404` if document doesn't exist, `403` if user doesn't own it.

---

## Issue #8 (LOW): CORS not configured for /.well-known/**

**File**: `src/main/kotlin/com/humanwrites/config/WebConfig.kt`

**Problem**: `/.well-known/humanwrites-public-key.pem` is a public endpoint used for offline Ed25519 signature verification, but no CORS mapping existed for it. Cross-origin clients (browser-based verifiers) would be blocked.

**Fix**:
- Added a second `registry.addMapping` block in `addCorsMappings`:
  ```kotlin
  registry
      .addMapping("/.well-known/**")
      .allowedOrigins("*")
      .allowedMethods("GET")
      .maxAge(86400)
  ```
- `allowedOrigins("*")` is intentional — the public key must be readable by any origin.
- `allowCredentials` is intentionally omitted (incompatible with `allowedOrigins("*")`).
- 24-hour `maxAge` reduces preflight overhead for repeat verifiers.

---

## Verification

```
./gradlew spotlessApply   → BUILD SUCCESSFUL
./gradlew test            → BUILD SUCCESSFUL (all tests pass)
```

No test failures. No new warnings introduced.

---

## Files Changed

| File | Issue |
|------|-------|
| `src/main/kotlin/com/humanwrites/infrastructure/security/GoogleOAuth2Handler.kt` | #2 |
| `src/main/kotlin/com/humanwrites/presentation/dto/request/AiRequests.kt` | #3 |
| `src/main/kotlin/com/humanwrites/presentation/rest/AiController.kt` | #3 |
| `src/main/kotlin/com/humanwrites/presentation/rest/CertificateController.kt` | #6, #7 |
| `src/main/kotlin/com/humanwrites/config/WebConfig.kt` | #8 |
