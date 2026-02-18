package com.humanwrites.domain.certificate

import com.fasterxml.jackson.databind.ObjectMapper
import com.humanwrites.domain.ai.AiUsageTracker
import com.humanwrites.domain.session.KeystrokeService
import com.humanwrites.domain.session.analysis.KeystrokeAnalyzer
import com.humanwrites.domain.session.analysis.ScoringService
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID
import kotlin.math.abs

@Service
class CertificateService(
    private val signatureService: SignatureService,
    private val objectMapper: ObjectMapper,
    private val aiUsageTracker: AiUsageTracker,
    private val scoringService: ScoringService,
    private val keystrokeAnalyzer: KeystrokeAnalyzer,
    private val keystrokeService: KeystrokeService?,
) {
    private val logger = LoggerFactory.getLogger(CertificateService::class.java)

    fun issueCertificate(
        documentId: UUID,
        userId: UUID,
        documentTitle: String,
        authorName: String,
        wordCount: Int,
        paragraphCount: Int,
        contentText: String,
        totalEditTime: String,
        sessionId: UUID? = null,
        clientOverallScore: Int? = null,
        clientGrade: String? = null,
        clientLabel: String? = null,
        clientKeystrokeDynamicsScore: Int? = null,
        clientTypingSpeedVariance: Double? = null,
        clientErrorCorrectionRate: Double? = null,
        clientPausePatternEntropy: Double? = null,
    ): CertificateResponse {
        // Resolve scoring: prefer server-side, fall back to client-provided
        val resolved =
            resolveScoring(
                sessionId = sessionId,
                clientOverallScore = clientOverallScore,
                clientGrade = clientGrade,
                clientLabel = clientLabel,
                clientKeystrokeDynamicsScore = clientKeystrokeDynamicsScore,
                clientTypingSpeedVariance = clientTypingSpeedVariance,
                clientErrorCorrectionRate = clientErrorCorrectionRate,
                clientPausePatternEntropy = clientPausePatternEntropy,
            )

        val certId = UUID.randomUUID()
        val shortHash = generateShortHash(certId)
        val contentHash = signatureService.contentHash(contentText)
        val issuedAt = OffsetDateTime.now(ZoneOffset.UTC)

        val signPayload =
            CertificateSignPayload(
                certificateId = certId.toString(),
                contentHash = contentHash,
                overallScore = resolved.overallScore,
                grade = resolved.grade,
                issuedAt = issuedAt.toString(),
            )
        val signature = signatureService.signCertificate(signPayload)

        val verificationData =
            objectMapper.writeValueAsString(
                mapOf(
                    "overallScore" to resolved.overallScore,
                    "grade" to resolved.grade,
                    "label" to resolved.label,
                    "keystrokeDynamics" to
                        mapOf(
                            "score" to resolved.keystrokeDynamicsScore,
                            "typingSpeedVariance" to resolved.typingSpeedVariance,
                            "errorCorrectionRate" to resolved.errorCorrectionRate,
                            "pausePatternEntropy" to resolved.pausePatternEntropy,
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
                it[Certificates.overallScore] = resolved.overallScore.toFloat()
                it[Certificates.grade] = resolved.grade
                it[Certificates.label] = resolved.label
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
                    overallScore = resolved.overallScore,
                    grade = resolved.grade,
                    label = resolved.label,
                    keystrokeDynamics =
                        KeystrokeDynamicsInfo(
                            score = resolved.keystrokeDynamicsScore,
                            typingSpeedVariance = resolved.typingSpeedVariance,
                            errorCorrectionRate = resolved.errorCorrectionRate,
                            pausePatternEntropy = resolved.pausePatternEntropy,
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

    /**
     * Resolve scoring using server-side computation when possible,
     * falling back to client-provided scores during MVP transition.
     */
    internal fun resolveScoring(
        sessionId: UUID?,
        clientOverallScore: Int?,
        clientGrade: String?,
        clientLabel: String?,
        clientKeystrokeDynamicsScore: Int?,
        clientTypingSpeedVariance: Double?,
        clientErrorCorrectionRate: Double?,
        clientPausePatternEntropy: Double?,
    ): ResolvedScoring {
        // Attempt server-side scoring if sessionId is provided
        if (sessionId != null && keystrokeService != null) {
            val windows = keystrokeService.getKeystrokeWindows(sessionId)
            if (windows.isNotEmpty()) {
                val metrics = keystrokeAnalyzer.analyze(windows)
                val serverResult = scoringService.score(metrics)

                // Compare with client score if both exist; log warning if they differ
                if (clientOverallScore != null) {
                    val diff = abs(serverResult.overallScore - clientOverallScore)
                    if (diff > 10) {
                        logger.warn(
                            "Score mismatch for session {}: server={}, client={}, diff={}",
                            sessionId,
                            serverResult.overallScore,
                            clientOverallScore,
                            diff,
                        )
                    }
                }

                // Server-computed score is authoritative
                return ResolvedScoring(
                    overallScore = serverResult.overallScore,
                    grade = serverResult.grade,
                    label = serverResult.label,
                    keystrokeDynamicsScore = serverResult.keystrokeDynamics.score,
                    typingSpeedVariance = serverResult.keystrokeDynamics.typingSpeedVariance,
                    errorCorrectionRate = serverResult.keystrokeDynamics.errorCorrectionRate,
                    pausePatternEntropy = serverResult.keystrokeDynamics.pausePatternEntropy,
                    source = ScoringSource.SERVER,
                )
            } else {
                logger.info(
                    "No keystroke windows found for session {}; falling back to client score",
                    sessionId,
                )
            }
        }

        // Fallback to client-provided scores
        if (clientOverallScore != null && clientGrade != null) {
            return ResolvedScoring(
                overallScore = clientOverallScore,
                grade = clientGrade,
                label = clientLabel ?: "Client-provided score",
                keystrokeDynamicsScore = clientKeystrokeDynamicsScore ?: 0,
                typingSpeedVariance = clientTypingSpeedVariance ?: 0.0,
                errorCorrectionRate = clientErrorCorrectionRate ?: 0.0,
                pausePatternEntropy = clientPausePatternEntropy ?: 0.0,
                source = ScoringSource.CLIENT,
            )
        }

        // No scoring data available at all
        logger.warn("No scoring data available: no sessionId and no client scores provided")
        return ResolvedScoring(
            overallScore = 0,
            grade = "Not Certified",
            label = "No scoring data available",
            keystrokeDynamicsScore = 0,
            typingSpeedVariance = 0.0,
            errorCorrectionRate = 0.0,
            pausePatternEntropy = 0.0,
            source = ScoringSource.NONE,
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

enum class ScoringSource {
    SERVER,
    CLIENT,
    NONE,
}

data class ResolvedScoring(
    val overallScore: Int,
    val grade: String,
    val label: String,
    val keystrokeDynamicsScore: Int,
    val typingSpeedVariance: Double,
    val errorCorrectionRate: Double,
    val pausePatternEntropy: Double,
    val source: ScoringSource,
)

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
    val document: DocumentInfo? = null,
    val verification: VerificationInfo,
    val aiAssistance: AiAssistanceInfo? = null,
    val meta: MetaInfo? = null,
    val status: String? = null,
    val issuedAt: String? = null,
)

data class CertificateListResponse(
    val certificates: List<CertificateResponse>,
    val totalCount: Int,
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
    val keystrokeDynamics: KeystrokeDynamicsInfo? = null,
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
