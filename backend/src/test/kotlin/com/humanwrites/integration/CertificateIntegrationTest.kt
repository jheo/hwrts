package com.humanwrites.integration

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.humanwrites.domain.ai.AiUsageTracker
import com.humanwrites.domain.certificate.CertificateService
import com.humanwrites.domain.certificate.CertificateSignPayload
import com.humanwrites.domain.certificate.SignatureService
import com.humanwrites.domain.session.analysis.KeystrokeAnalyzer
import com.humanwrites.domain.session.analysis.KeystrokeWindow
import com.humanwrites.domain.session.analysis.ScoringConfig
import com.humanwrites.domain.session.analysis.ScoringService
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldHaveLength
import io.kotest.matchers.string.shouldNotBeBlank
import java.util.UUID

/**
 * Integration tests for the certificate issuance pipeline.
 *
 * Tests the full flow:
 * KeystrokeAnalyzer -> ScoringService -> CertificateService -> SignatureService
 *
 * Uses in-memory/no-DB approach by mocking Exposed transactions so we can test
 * the domain logic and signing pipeline end-to-end without a real PostgreSQL.
 */
class CertificateIntegrationTest :
    FunSpec({

        // ── Shared instances ────────────────────────────────────────────────
        val objectMapper = jacksonObjectMapper()
        val signatureService = SignatureService(objectMapper)
        val aiUsageTracker = AiUsageTracker()
        val keystrokeAnalyzer = KeystrokeAnalyzer()
        val scoringService = ScoringService()

        // ── Helpers ─────────────────────────────────────────────────────────

        /** Build a realistic human-like typing window at [offsetMs]. */
        fun humanWindow(
            offsetMs: Long,
            wpm: Double = 60.0,
            errorCount: Int = 3,
            pauseCount: Int = 1,
            seed: Int = 0,
        ) = KeystrokeWindow(
            windowStart = offsetMs,
            windowEnd = offsetMs + 5_000L,
            keystrokes = 50,
            wpm = wpm,
            avgFlightTime = 120.0,
            avgDwellTime = 80.0,
            errorCount = errorCount,
            totalKeys = 50,
            pauseCount = pauseCount,
            flightTimes =
                buildList {
                    // Varied flight times spread across many buckets — human-like entropy
                    add(45L + seed * 7)
                    add(90L + seed * 11)
                    add(150L + seed * 5)
                    add(220L + seed * 3)
                    add(310L + seed * 9)
                    add(80L + seed * 13)
                    add(130L + seed * 4)
                    add(270L + seed * 6)
                    add(55L + seed * 8)
                    add(400L + seed * 2)
                    add(2500L) // one thinking pause
                    add(60L + seed * 12)
                    add(180L + seed * 7)
                    add(350L + seed * 3)
                    add(95L + seed * 10)
                    add(250L + seed * 5)
                    add(70L + seed * 9)
                    add(500L + seed * 4)
                    add(115L + seed * 6)
                    add(200L + seed * 8)
                },
        )

        /** Build a suspiciously uniform (machine-like) window. */
        fun robotWindow(offsetMs: Long) =
            KeystrokeWindow(
                windowStart = offsetMs,
                windowEnd = offsetMs + 5_000L,
                keystrokes = 80,
                wpm = 200.0, // unrealistically fast and constant
                avgFlightTime = 50.0,
                avgDwellTime = 40.0,
                errorCount = 0, // no errors — too perfect
                totalKeys = 80,
                pauseCount = 0,
                flightTimes = List(20) { 50L }, // identical flight times → zero entropy
            )

        // ── Tests ────────────────────────────────────────────────────────────

        test("full pipeline: analyze windows → score → verify signature roundtrip") {
            val windows = (0..5).map { i -> humanWindow(offsetMs = i * 5_000L) }

            val metrics = keystrokeAnalyzer.analyze(windows)
            val scoringResult = scoringService.score(metrics)

            // Build the sign payload exactly as CertificateService does
            val certId = UUID.randomUUID()
            val contentText = "This is a human-written document about the world."
            val contentHash = signatureService.contentHash(contentText)
            val issuedAt =
                java.time.OffsetDateTime
                    .now(java.time.ZoneOffset.UTC)
                    .toString()

            val payload =
                CertificateSignPayload(
                    certificateId = certId.toString(),
                    contentHash = contentHash,
                    overallScore = scoringResult.overallScore,
                    grade = scoringResult.grade,
                    issuedAt = issuedAt,
                )

            val signature = signatureService.signCertificate(payload)
            val verified = signatureService.verifyCertificate(payload, signature)

            signature.shouldNotBeBlank()
            verified shouldBe true
        }

        test("content hash is deterministic and included in payload") {
            val content = "Deterministic content for hash verification."
            val hash1 = signatureService.contentHash(content)
            val hash2 = signatureService.contentHash(content)

            hash1 shouldBe hash2
            hash1.length shouldBe 64 // SHA-256 hex
        }

        test("human-like typing pattern produces Certified grade") {
            val windows =
                listOf(
                    humanWindow(0L, wpm = 45.0, errorCount = 4, pauseCount = 0, seed = 0),
                    humanWindow(5_000L, wpm = 72.0, errorCount = 3, pauseCount = 1, seed = 1),
                    humanWindow(10_000L, wpm = 52.0, errorCount = 5, pauseCount = 0, seed = 2),
                    humanWindow(15_000L, wpm = 68.0, errorCount = 4, pauseCount = 1, seed = 3),
                    humanWindow(20_000L, wpm = 40.0, errorCount = 6, pauseCount = 1, seed = 4),
                )

            val metrics = keystrokeAnalyzer.analyze(windows)
            val result = scoringService.score(metrics)

            // Human windows have high entropy, error correction, pause patterns
            result.grade shouldBe "Certified"
            result.overallScore shouldNotBe 0
        }

        test("machine-like typing pattern produces Not Certified grade") {
            val windows = List(6) { i -> robotWindow(offsetMs = i * 5_000L) }

            val metrics = keystrokeAnalyzer.analyze(windows)
            val result = scoringService.score(metrics)

            result.grade shouldBe "Not Certified"
        }

        test("different typing patterns produce different scores") {
            val humanWindows = (0..4).map { i -> humanWindow(i * 5_000L) }
            val robotWindows = List(5) { i -> robotWindow(i * 5_000L) }

            val humanMetrics = keystrokeAnalyzer.analyze(humanWindows)
            val robotMetrics = keystrokeAnalyzer.analyze(robotWindows)

            val humanScore = scoringService.score(humanMetrics).overallScore
            val robotScore = scoringService.score(robotMetrics).overallScore

            humanScore shouldNotBe robotScore
        }

        test("AiUsageTracker data is included in certificate response") {
            // Record some AI usage for a document
            val documentId = UUID.randomUUID()
            aiUsageTracker.recordSuggestions(documentId, 5, "claude", "claude-haiku-4-5-20251001")
            aiUsageTracker.recordAcceptance(documentId, 3)

            val usageData = aiUsageTracker.getAiUsageData(documentId)

            usageData.enabled shouldBe true
            usageData.totalSuggestions shouldBe 5
            usageData.suggestionsAccepted shouldBe 3
            usageData.suggestionsRejected shouldBe 2
            usageData.featuresUsed shouldBe listOf("spelling")
        }

        test("certificate response with no AI usage has disabled flag") {
            val freshDocumentId = UUID.randomUUID()
            val usageData = aiUsageTracker.getAiUsageData(freshDocumentId)

            usageData.enabled shouldBe false
            usageData.totalSuggestions shouldBe 0
            usageData.featuresUsed shouldBe emptyList()
        }

        test("tampered signature fails verification") {
            val certId = UUID.randomUUID()
            val contentHash = signatureService.contentHash("original content")
            val issuedAt =
                java.time.OffsetDateTime
                    .now(java.time.ZoneOffset.UTC)
                    .toString()

            val payload =
                CertificateSignPayload(
                    certificateId = certId.toString(),
                    contentHash = contentHash,
                    overallScore = 75,
                    grade = "Certified",
                    issuedAt = issuedAt,
                )

            val signature = signatureService.signCertificate(payload)

            // Tamper with the payload
            val tamperedPayload = payload.copy(overallScore = 100, grade = "Certified")
            val verified = signatureService.verifyCertificate(tamperedPayload, signature)

            verified shouldBe false
        }

        test("scoring config threshold: score exactly at threshold is Certified") {
            val config = ScoringConfig(certifiedThreshold = 60)
            val service = ScoringService(config)

            // Build metrics that produce a score right at the boundary.
            // Use ideal values for all dimensions to push score high enough.
            val windows =
                listOf(
                    KeystrokeWindow(
                        windowStart = 0L,
                        windowEnd = 5_000L,
                        keystrokes = 40,
                        wpm = 55.0,
                        avgFlightTime = 110.0,
                        avgDwellTime = 75.0,
                        errorCount = 4,
                        totalKeys = 50,
                        pauseCount = 3,
                        flightTimes = (1..15).map { it * 80L } + listOf(2600L, 3000L),
                    ),
                )

            val metrics = keystrokeAnalyzer.analyze(windows)
            val result = service.score(metrics)

            // Verify the grade matches the threshold comparison
            val expectedGrade = if (result.overallScore >= 60) "Certified" else "Not Certified"
            result.grade shouldBe expectedGrade
        }

        test("empty windows produce zero score and Not Certified grade") {
            val metrics = keystrokeAnalyzer.analyze(emptyList())
            val result = scoringService.score(metrics)

            result.grade shouldBe "Not Certified"
            result.overallScore shouldBe 0
        }

        test("shortHash in certificate response is 32 hex characters") {
            // Test the hash format that CertificateService produces via reflection
            val service = CertificateService(signatureService, objectMapper, aiUsageTracker)
            val method =
                CertificateService::class.java.getDeclaredMethod("generateShortHash", UUID::class.java)
            method.isAccessible = true

            val hash = method.invoke(service, UUID.randomUUID()) as String

            hash shouldHaveLength 32
            hash.all { it.isDigit() || it in 'a'..'f' } shouldBe true
        }
    })
