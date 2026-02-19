package com.humanwrites.presentation.rest

import com.humanwrites.domain.certificate.CertificateListResponse
import com.humanwrites.domain.certificate.CertificateResponse
import com.humanwrites.domain.certificate.CertificateService
import com.humanwrites.domain.certificate.SignatureService
import com.humanwrites.domain.certificate.VerificationInfo
import com.humanwrites.domain.document.DocumentService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Size
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class IssueCertificateRequest(
    val documentId: UUID,
    @field:Size(max = 500)
    val documentTitle: String,
    @field:Size(max = 200)
    val authorName: String,
    @field:Min(0) @field:Max(1_000_000) val wordCount: Int,
    @field:Min(0) @field:Max(100_000) val paragraphCount: Int,
    @field:Size(max = 5_000_000)
    val contentText: String,
    val totalEditTime: String,
    val sessionId: UUID, // Required — server always computes scores from session data
)

@Tag(name = "Certificates", description = "인증서 관리 API")
@RestController
@RequestMapping("/api/certificates")
class CertificateController(
    private val certificateService: CertificateService,
    private val documentService: DocumentService,
) {
    @Operation(summary = "인증서 발행", description = "새 Human Written 인증서를 발행")
    @PostMapping
    fun issueCertificate(
        @Valid @RequestBody request: IssueCertificateRequest,
    ): ResponseEntity<CertificateResponse> {
        val userId = currentUserId()
        val doc =
            documentService.findById(request.documentId)
                ?: return ResponseEntity.notFound().build()
        if (doc.userId != userId) return ResponseEntity.status(403).build()
        val cert =
            certificateService.issueCertificate(
                documentId = request.documentId,
                userId = userId,
                documentTitle = request.documentTitle,
                authorName = request.authorName,
                wordCount = request.wordCount,
                paragraphCount = request.paragraphCount,
                contentText = request.contentText,
                totalEditTime = request.totalEditTime,
                sessionId = request.sessionId,
            )
        return ResponseEntity.ok(cert)
    }

    @Operation(summary = "내 인증서 목록", description = "현재 사용자의 인증서 목록 조회")
    @GetMapping
    fun listCertificates(): ResponseEntity<CertificateListResponse> {
        val userId = currentUserId()
        val certs = certificateService.findByUserId(userId)
        val summaries =
            certs.map { cert ->
                CertificateResponse(
                    id = cert.id.toString(),
                    version = cert.version,
                    shortHash = cert.shortHash,
                    document = null,
                    verification =
                        VerificationInfo(
                            overallScore = cert.overallScore.toInt(),
                            grade = cert.grade,
                            label = cert.label ?: "",
                            keystrokeDynamics = null,
                        ),
                    aiAssistance = null,
                    meta = null,
                    status = cert.status,
                    issuedAt = cert.issuedAt.toString(),
                )
            }
        return ResponseEntity.ok(
            CertificateListResponse(
                certificates = summaries,
                totalCount = summaries.size,
            ),
        )
    }

    @Operation(summary = "인증서 폐기", description = "인증서를 폐기 (소유자만 가능)")
    @DeleteMapping("/{id}")
    fun revokeCertificate(
        @PathVariable id: UUID,
    ): ResponseEntity<Map<String, String>> {
        val userId = currentUserId()
        val revoked = certificateService.revokeCertificate(id, userId)
        return if (revoked) {
            ResponseEntity.ok(mapOf("status" to "revoked"))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    private fun currentUserId(): UUID = SecurityContextHolder.getContext().authentication.principal as UUID
}

@Tag(name = "Verification", description = "인증서 검증 API (공개)")
@RestController
class VerificationController(
    private val certificateService: CertificateService,
    private val signatureService: SignatureService,
) {
    @Operation(summary = "인증서 검증", description = "short hash로 인증서를 공개 검증")
    @GetMapping("/api/verify/{shortHash}")
    fun verifyCertificate(
        @PathVariable shortHash: String,
    ): ResponseEntity<Map<String, Any?>> {
        val cert =
            certificateService.findByShortHash(shortHash)
                ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(
            mapOf(
                "id" to cert.id.toString(),
                "shortHash" to cert.shortHash,
                "version" to cert.version,
                "grade" to cert.grade,
                "overallScore" to cert.overallScore,
                "label" to cert.label,
                "verificationData" to cert.verificationData,
                "aiUsageData" to cert.aiUsageData,
                "contentHash" to cert.contentHash,
                "signature" to cert.signature,
                "status" to cert.status,
                "issuedAt" to cert.issuedAt.toString(),
            ),
        )
    }

    @Operation(summary = "공개키 조회", description = "Ed25519 공개키를 PEM 형식으로 반환 (오프라인 검증용)")
    @GetMapping("/.well-known/humanwrites-public-key.pem", produces = [MediaType.TEXT_PLAIN_VALUE])
    fun getPublicKey(): ResponseEntity<String> = ResponseEntity.ok(signatureService.publicKeyPem)
}
