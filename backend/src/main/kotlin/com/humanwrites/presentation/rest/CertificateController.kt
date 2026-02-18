package com.humanwrites.presentation.rest

import com.humanwrites.domain.certificate.CertificateResponse
import com.humanwrites.domain.certificate.CertificateService
import com.humanwrites.domain.certificate.SignatureService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
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
    val documentTitle: String,
    val authorName: String,
    val wordCount: Int,
    val paragraphCount: Int,
    val contentText: String,
    val totalEditTime: String,
    // Scoring results (passed from client after session analysis)
    val overallScore: Int,
    val grade: String,
    val label: String,
    val keystrokeDynamicsScore: Int,
    val typingSpeedVariance: Double,
    val errorCorrectionRate: Double,
    val pausePatternEntropy: Double,
)

@Tag(name = "Certificates", description = "인증서 관리 API")
@RestController
@RequestMapping("/api/certificates")
class CertificateController(
    private val certificateService: CertificateService,
) {
    @Operation(summary = "인증서 발행", description = "새 Human Written 인증서를 발행")
    @PostMapping
    fun issueCertificate(
        @RequestBody request: IssueCertificateRequest,
    ): ResponseEntity<CertificateResponse> {
        val userId = currentUserId()
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
                overallScore = request.overallScore,
                grade = request.grade,
                label = request.label,
                keystrokeDynamicsScore = request.keystrokeDynamicsScore,
                typingSpeedVariance = request.typingSpeedVariance,
                errorCorrectionRate = request.errorCorrectionRate,
                pausePatternEntropy = request.pausePatternEntropy,
            )
        return ResponseEntity.ok(cert)
    }

    @Operation(summary = "내 인증서 목록", description = "현재 사용자의 인증서 목록 조회")
    @GetMapping
    fun listCertificates(): ResponseEntity<List<Map<String, Any?>>> {
        val userId = currentUserId()
        val certs = certificateService.findByUserId(userId)
        val summaries =
            certs.map { cert ->
                mapOf(
                    "id" to cert.id.toString(),
                    "shortHash" to cert.shortHash,
                    "grade" to cert.grade,
                    "overallScore" to cert.overallScore,
                    "status" to cert.status,
                    "issuedAt" to cert.issuedAt.toString(),
                )
            }
        return ResponseEntity.ok(summaries)
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
