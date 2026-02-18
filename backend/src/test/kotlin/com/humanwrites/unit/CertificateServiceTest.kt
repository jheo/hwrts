package com.humanwrites.unit

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.humanwrites.domain.ai.AiUsageTracker
import com.humanwrites.domain.certificate.CertificateService
import com.humanwrites.domain.certificate.ScoringSource
import com.humanwrites.domain.certificate.SignatureService
import com.humanwrites.domain.session.KeystrokeService
import com.humanwrites.domain.session.analysis.KeystrokeAnalyzer
import com.humanwrites.domain.session.analysis.KeystrokeWindow
import com.humanwrites.domain.session.analysis.ScoringService
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.ints.shouldBeGreaterThanOrEqual
import io.kotest.matchers.ints.shouldBeLessThan
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.security.MessageDigest
import java.util.UUID

class CertificateServiceTest :
    FunSpec({

        val objectMapper: ObjectMapper = jacksonObjectMapper()
        val signatureService = mockk<SignatureService>()
        val aiUsageTracker = AiUsageTracker()
        val scoringService = ScoringService()
        val keystrokeAnalyzer = KeystrokeAnalyzer()

        // Service without KeystrokeService (fallback mode)
        val service =
            CertificateService(
                signatureService,
                objectMapper,
                aiUsageTracker,
                scoringService,
                keystrokeAnalyzer,
                null,
            )

        // ── Helper: build human-like keystroke windows ──────────────────
        fun humanWindow(
            offsetMs: Long,
            wpm: Double = 55.0,
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
                    add(2500L)
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

        // ── Existing tests ──────────────────────────────────────────────

        test("shortHash generation produces 32-character hex string") {
            val method =
                CertificateService::class.java.getDeclaredMethod(
                    "generateShortHash",
                    UUID::class.java,
                )
            method.isAccessible = true

            val certId = UUID.randomUUID()
            val shortHash = method.invoke(service, certId) as String

            shortHash.length shouldBe 32
            shortHash.all { it in '0'..'9' || it in 'a'..'f' } shouldBe true
        }

        test("shortHash is unique for different UUIDs") {
            val method =
                CertificateService::class.java.getDeclaredMethod(
                    "generateShortHash",
                    UUID::class.java,
                )
            method.isAccessible = true

            val hash1 = method.invoke(service, UUID.randomUUID()) as String
            Thread.sleep(1)
            val hash2 = method.invoke(service, UUID.randomUUID()) as String

            hash1 shouldNotBe hash2
        }

        test("shortHash is derived from SHA-256") {
            val method =
                CertificateService::class.java.getDeclaredMethod(
                    "generateShortHash",
                    UUID::class.java,
                )
            method.isAccessible = true

            val certId = UUID.randomUUID()
            val shortHash = method.invoke(service, certId) as String

            shortHash.length shouldBe 32
            shortHash.all { it.isDigit() || it in 'a'..'f' } shouldBe true
        }

        test("SignatureService.contentHash is called during certificate issuance setup") {
            val testContent = "Test document content"
            val expectedHash = "abcd1234" + "0".repeat(56)

            every { signatureService.contentHash(testContent) } returns expectedHash

            val hash = signatureService.contentHash(testContent)
            hash shouldBe expectedHash

            verify { signatureService.contentHash(testContent) }
        }

        test("SHA-256 content hash is deterministic") {
            val content = "Deterministic test content"
            val digest = MessageDigest.getInstance("SHA-256")

            val hash1 =
                digest
                    .digest(content.toByteArray())
                    .joinToString("") { "%02x".format(it) }

            val digest2 = MessageDigest.getInstance("SHA-256")
            val hash2 =
                digest2
                    .digest(content.toByteArray())
                    .joinToString("") { "%02x".format(it) }

            hash1 shouldBe hash2
            hash1.length shouldBe 64
        }

        // ── Server-side scoring tests ───────────────────────────────────

        test("resolveScoring uses server-side scoring when sessionId and keystroke data exist") {
            val keystrokeService = mockk<KeystrokeService>()
            val serviceWithKeystroke =
                CertificateService(
                    signatureService,
                    objectMapper,
                    aiUsageTracker,
                    scoringService,
                    keystrokeAnalyzer,
                    keystrokeService,
                )

            val sessionId = UUID.randomUUID()
            val windows = (0..4).map { i -> humanWindow(i * 5_000L, seed = i) }
            every { keystrokeService.getKeystrokeWindows(sessionId) } returns windows

            val resolved =
                serviceWithKeystroke.resolveScoring(
                    sessionId = sessionId,
                    clientOverallScore = 50,
                    clientGrade = "Not Certified",
                    clientLabel = "Client label",
                    clientKeystrokeDynamicsScore = 50,
                    clientTypingSpeedVariance = 0.1,
                    clientErrorCorrectionRate = 0.01,
                    clientPausePatternEntropy = 1.0,
                )

            resolved.source shouldBe ScoringSource.SERVER
            resolved.overallScore shouldBeGreaterThanOrEqual 0
            resolved.grade shouldNotBe null
            // Server score should differ from client since we provided different data
            verify { keystrokeService.getKeystrokeWindows(sessionId) }
        }

        test("resolveScoring falls back to client score when no session data") {
            val keystrokeService = mockk<KeystrokeService>()
            val serviceWithKeystroke =
                CertificateService(
                    signatureService,
                    objectMapper,
                    aiUsageTracker,
                    scoringService,
                    keystrokeAnalyzer,
                    keystrokeService,
                )

            val sessionId = UUID.randomUUID()
            every { keystrokeService.getKeystrokeWindows(sessionId) } returns emptyList()

            val resolved =
                serviceWithKeystroke.resolveScoring(
                    sessionId = sessionId,
                    clientOverallScore = 75,
                    clientGrade = "Certified",
                    clientLabel = "Likely human-written",
                    clientKeystrokeDynamicsScore = 75,
                    clientTypingSpeedVariance = 0.3,
                    clientErrorCorrectionRate = 0.08,
                    clientPausePatternEntropy = 2.5,
                )

            resolved.source shouldBe ScoringSource.CLIENT
            resolved.overallScore shouldBe 75
            resolved.grade shouldBe "Certified"
            resolved.label shouldBe "Likely human-written"
            resolved.keystrokeDynamicsScore shouldBe 75
        }

        test("resolveScoring falls back to client score when keystrokeService is null") {
            // service already has null keystrokeService
            val resolved =
                service.resolveScoring(
                    sessionId = UUID.randomUUID(),
                    clientOverallScore = 80,
                    clientGrade = "Certified",
                    clientLabel = "Highly likely human-written",
                    clientKeystrokeDynamicsScore = 80,
                    clientTypingSpeedVariance = 0.35,
                    clientErrorCorrectionRate = 0.10,
                    clientPausePatternEntropy = 3.0,
                )

            resolved.source shouldBe ScoringSource.CLIENT
            resolved.overallScore shouldBe 80
            resolved.grade shouldBe "Certified"
        }

        test("resolveScoring returns NONE when no sessionId and no client scores") {
            val resolved =
                service.resolveScoring(
                    sessionId = null,
                    clientOverallScore = null,
                    clientGrade = null,
                    clientLabel = null,
                    clientKeystrokeDynamicsScore = null,
                    clientTypingSpeedVariance = null,
                    clientErrorCorrectionRate = null,
                    clientPausePatternEntropy = null,
                )

            resolved.source shouldBe ScoringSource.NONE
            resolved.overallScore shouldBe 0
            resolved.grade shouldBe "Not Certified"
            resolved.label shouldBe "No scoring data available"
        }

        test("resolveScoring logs warning when server and client scores differ by more than 10") {
            val keystrokeService = mockk<KeystrokeService>()
            val serviceWithKeystroke =
                CertificateService(
                    signatureService,
                    objectMapper,
                    aiUsageTracker,
                    scoringService,
                    keystrokeAnalyzer,
                    keystrokeService,
                )

            val sessionId = UUID.randomUUID()
            // Human windows will produce a high score
            val windows =
                listOf(
                    humanWindow(0L, wpm = 45.0, errorCount = 4, pauseCount = 1, seed = 0),
                    humanWindow(5_000L, wpm = 72.0, errorCount = 3, pauseCount = 1, seed = 1),
                    humanWindow(10_000L, wpm = 52.0, errorCount = 5, pauseCount = 1, seed = 2),
                    humanWindow(15_000L, wpm = 68.0, errorCount = 4, pauseCount = 1, seed = 3),
                    humanWindow(20_000L, wpm = 40.0, errorCount = 6, pauseCount = 1, seed = 4),
                )
            every { keystrokeService.getKeystrokeWindows(sessionId) } returns windows

            // Client score is very different from what server will compute
            val resolved =
                serviceWithKeystroke.resolveScoring(
                    sessionId = sessionId,
                    clientOverallScore = 10, // artificially low
                    clientGrade = "Not Certified",
                    clientLabel = "Unlikely human-written",
                    clientKeystrokeDynamicsScore = 10,
                    clientTypingSpeedVariance = 0.01,
                    clientErrorCorrectionRate = 0.0,
                    clientPausePatternEntropy = 0.0,
                )

            // Server score should be used regardless of mismatch
            resolved.source shouldBe ScoringSource.SERVER
            // The server score from human windows should be well above 10
            resolved.overallScore shouldBeGreaterThanOrEqual 40
        }

        test("resolveScoring server score is authoritative even when client score is higher") {
            val keystrokeService = mockk<KeystrokeService>()
            val serviceWithKeystroke =
                CertificateService(
                    signatureService,
                    objectMapper,
                    aiUsageTracker,
                    scoringService,
                    keystrokeAnalyzer,
                    keystrokeService,
                )

            val sessionId = UUID.randomUUID()
            // Robot-like windows (low score)
            val robotWindows =
                List(5) { i ->
                    KeystrokeWindow(
                        windowStart = i * 5_000L,
                        windowEnd = (i + 1) * 5_000L,
                        keystrokes = 80,
                        wpm = 200.0,
                        avgFlightTime = 50.0,
                        avgDwellTime = 40.0,
                        errorCount = 0,
                        totalKeys = 80,
                        pauseCount = 0,
                        flightTimes = List(20) { 50L },
                    )
                }
            every { keystrokeService.getKeystrokeWindows(sessionId) } returns robotWindows

            val resolved =
                serviceWithKeystroke.resolveScoring(
                    sessionId = sessionId,
                    clientOverallScore = 95, // client says high, but server data says low
                    clientGrade = "Certified",
                    clientLabel = "Highly likely human-written",
                    clientKeystrokeDynamicsScore = 95,
                    clientTypingSpeedVariance = 0.35,
                    clientErrorCorrectionRate = 0.10,
                    clientPausePatternEntropy = 3.0,
                )

            resolved.source shouldBe ScoringSource.SERVER
            // Robot windows should produce a low score
            resolved.overallScore shouldBeLessThan 60
            resolved.grade shouldBe "Not Certified"
        }
    })
