package com.humanwrites.domain.certificate

import com.fasterxml.jackson.databind.ObjectMapper
import com.humanwrites.domain.ai.AiUsageTracker
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Service
class CertificateService(
    private val signatureService: SignatureService,
    private val objectMapper: ObjectMapper,
    private val aiUsageTracker: AiUsageTracker,
) {
    fun issueCertificate(
        documentId: UUID,
        userId: UUID,
        documentTitle: String,
        authorName: String,
        wordCount: Int,
        paragraphCount: Int,
        contentText: String,
        totalEditTime: String,
        overallScore: Int,
        grade: String,
        label: String,
        keystrokeDynamicsScore: Int,
        typingSpeedVariance: Double,
        errorCorrectionRate: Double,
        pausePatternEntropy: Double,
    ): CertificateResponse {
        val certId = UUID.randomUUID()
        val shortHash = generateShortHash(certId)
        val contentHash = signatureService.contentHash(contentText)
        val issuedAt = OffsetDateTime.now(ZoneOffset.UTC)

        val signPayload =
            CertificateSignPayload(
                certificateId = certId.toString(),
                contentHash = contentHash,
                overallScore = overallScore,
                grade = grade,
                issuedAt = issuedAt.toString(),
            )
        val signature = signatureService.signCertificate(signPayload)

        val verificationData =
            objectMapper.writeValueAsString(
                mapOf(
                    "overallScore" to overallScore,
                    "grade" to grade,
                    "label" to label,
                    "keystrokeDynamics" to
                        mapOf(
                            "score" to keystrokeDynamicsScore,
                            "typingSpeedVariance" to typingSpeedVariance,
                            "errorCorrectionRate" to errorCorrectionRate,
                            "pausePatternEntropy" to pausePatternEntropy,
                        ),
                ),
            )

        val aiUsage = aiUsageTracker.getAiUsageData(documentId)
        val aiUsageData =
            objectMapper.writeValueAsString(
                mapOf(
                    "enabled" to aiUsage.enabled,
                    "features_used" to aiUsage.featuresUsed,
                    "suggestions_accepted" to aiUsage.suggestionsAccepted,
                    "suggestions_rejected" to aiUsage.suggestionsRejected,
                    "total_suggestions" to aiUsage.totalSuggestions,
                ),
            )

        transaction {
            Certificates.insert {
                it[Certificates.id] = certId
                it[Certificates.documentId] = documentId
                it[Certificates.userId] = userId
                it[Certificates.shortHash] = shortHash
                it[Certificates.version] = "1.0.0"
                it[Certificates.overallScore] = overallScore.toFloat()
                it[Certificates.grade] = grade
                it[Certificates.label] = label
                it[Certificates.verificationData] = verificationData
                it[Certificates.aiUsageData] = aiUsageData
                it[Certificates.contentHash] = contentHash
                it[Certificates.signature] = signature
                it[Certificates.status] = "active"
                it[Certificates.issuedAt] = issuedAt
                it[Certificates.createdAt] = issuedAt
                it[Certificates.updatedAt] = issuedAt
            }
        }

        return CertificateResponse(
            id = certId.toString(),
            version = "1.0.0",
            shortHash = shortHash,
            document =
                DocumentInfo(
                    title = documentTitle,
                    author = authorName,
                    wordCount = wordCount,
                    paragraphCount = paragraphCount,
                    totalEditTime = totalEditTime,
                    contentHash = contentHash,
                ),
            verification =
                VerificationInfo(
                    overallScore = overallScore,
                    grade = grade,
                    label = label,
                    keystrokeDynamics =
                        KeystrokeDynamicsInfo(
                            score = keystrokeDynamicsScore,
                            typingSpeedVariance = typingSpeedVariance,
                            errorCorrectionRate = errorCorrectionRate,
                            pausePatternEntropy = pausePatternEntropy,
                        ),
                ),
            aiAssistance =
                AiAssistanceInfo(
                    enabled = aiUsage.enabled,
                    featuresUsed = aiUsage.featuresUsed,
                    suggestionsAccepted = aiUsage.suggestionsAccepted,
                    suggestionsRejected = aiUsage.suggestionsRejected,
                    totalSuggestions = aiUsage.totalSuggestions,
                ),
            meta =
                MetaInfo(
                    issuedAt = issuedAt.toString(),
                    expiresAt = null,
                    verifyUrl = "https://humanwrites.app/verify/$shortHash",
                    signature = signature,
                    publicKeyUrl = "/.well-known/humanwrites-public-key.pem",
                ),
        )
    }

    fun findByShortHash(shortHash: String): CertificateEntity? =
        transaction {
            Certificates
                .selectAll()
                .where { Certificates.shortHash eq shortHash }
                .map { row ->
                    CertificateEntity(
                        id = row[Certificates.id],
                        documentId = row[Certificates.documentId],
                        userId = row[Certificates.userId],
                        shortHash = row[Certificates.shortHash],
                        version = row[Certificates.version],
                        overallScore = row[Certificates.overallScore],
                        grade = row[Certificates.grade],
                        label = row[Certificates.label],
                        verificationData = row[Certificates.verificationData],
                        aiUsageData = row[Certificates.aiUsageData],
                        contentHash = row[Certificates.contentHash],
                        signature = row[Certificates.signature],
                        status = row[Certificates.status],
                        issuedAt = row[Certificates.issuedAt],
                        expiresAt = row[Certificates.expiresAt],
                    )
                }.firstOrNull()
        }

    fun findByUserId(userId: UUID): List<CertificateEntity> =
        transaction {
            Certificates
                .selectAll()
                .where { Certificates.userId eq userId }
                .map { row ->
                    CertificateEntity(
                        id = row[Certificates.id],
                        documentId = row[Certificates.documentId],
                        userId = row[Certificates.userId],
                        shortHash = row[Certificates.shortHash],
                        version = row[Certificates.version],
                        overallScore = row[Certificates.overallScore],
                        grade = row[Certificates.grade],
                        label = row[Certificates.label],
                        verificationData = row[Certificates.verificationData],
                        aiUsageData = row[Certificates.aiUsageData],
                        contentHash = row[Certificates.contentHash],
                        signature = row[Certificates.signature],
                        status = row[Certificates.status],
                        issuedAt = row[Certificates.issuedAt],
                        expiresAt = row[Certificates.expiresAt],
                    )
                }
        }

    fun revokeCertificate(
        certId: UUID,
        userId: UUID,
    ): Boolean =
        transaction {
            val deleted =
                Certificates.deleteWhere {
                    (Certificates.id eq certId) and (Certificates.userId eq userId)
                }
            deleted > 0
        }

    private fun generateShortHash(certId: UUID): String {
        val input = "${certId}${System.currentTimeMillis()}"
        val digest = MessageDigest.getInstance("SHA-256")
        return digest
            .digest(input.toByteArray())
            .joinToString("") { "%02x".format(it) }
            .take(32)
    }
}

data class CertificateEntity(
    val id: UUID,
    val documentId: UUID,
    val userId: UUID,
    val shortHash: String,
    val version: String,
    val overallScore: Float,
    val grade: String,
    val label: String?,
    val verificationData: String,
    val aiUsageData: String,
    val contentHash: String,
    val signature: String,
    val status: String,
    val issuedAt: OffsetDateTime,
    val expiresAt: OffsetDateTime?,
)

// Response DTOs following CLAUDE.md HumanWrittenCertificate structure
data class CertificateResponse(
    val id: String,
    val version: String,
    val shortHash: String,
    val document: DocumentInfo,
    val verification: VerificationInfo,
    val aiAssistance: AiAssistanceInfo,
    val meta: MetaInfo,
)

data class DocumentInfo(
    val title: String,
    val author: String,
    val wordCount: Int,
    val paragraphCount: Int,
    val totalEditTime: String,
    val contentHash: String,
)

data class VerificationInfo(
    val overallScore: Int,
    val grade: String,
    val label: String,
    val keystrokeDynamics: KeystrokeDynamicsInfo,
)

data class KeystrokeDynamicsInfo(
    val score: Int,
    val typingSpeedVariance: Double,
    val errorCorrectionRate: Double,
    val pausePatternEntropy: Double,
)

data class AiAssistanceInfo(
    val enabled: Boolean = false,
    val featuresUsed: List<String> = emptyList(),
    val suggestionsAccepted: Int = 0,
    val suggestionsRejected: Int = 0,
    val totalSuggestions: Int = 0,
)

data class MetaInfo(
    val issuedAt: String,
    val expiresAt: String?,
    val verifyUrl: String,
    val signature: String,
    val publicKeyUrl: String,
)
