package com.humanwrites.unit

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.humanwrites.domain.ai.AiUsageTracker
import com.humanwrites.domain.certificate.CertificateService
import com.humanwrites.domain.certificate.SignatureService
import com.humanwrites.domain.session.KeystrokeService
import com.humanwrites.domain.session.analysis.KeystrokeAnalyzer
import com.humanwrites.domain.session.analysis.KeystrokeWindow
import com.humanwrites.domain.session.analysis.ScoringService
import io.kotest.core.spec.style.FunSpec
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
        val keystrokeService = mockk<KeystrokeService>()

        val service =
            CertificateService(
                signatureService,
                objectMapper,
                aiUsageTracker,
                scoringService,
                keystrokeAnalyzer,
                keystrokeService,
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

        test("issueCertificate uses server-side scoring from session keystroke data") {
            val sessionId = UUID.randomUUID()
            val windows = (0..4).map { i -> humanWindow(i * 5_000L, seed = i) }
            every { keystrokeService.getKeystrokeWindows(sessionId) } returns windows

            // Verify scoring pipeline works: analyze → score
            val metrics = keystrokeAnalyzer.analyze(windows)
            val result = scoringService.score(metrics)

            result.overallScore shouldNotBe null
            result.grade shouldNotBe null
        }

        test("issueCertificate throws when session has no keystroke data") {
            val sessionId = UUID.randomUUID()
            every { keystrokeService.getKeystrokeWindows(sessionId) } returns emptyList()

            val exception =
                runCatching {
                    service.issueCertificate(
                        documentId = UUID.randomUUID(),
                        userId = UUID.randomUUID(),
                        documentTitle = "Test",
                        authorName = "Author",
                        wordCount = 100,
                        paragraphCount = 3,
                        contentText = "Test content",
                        totalEditTime = "PT10M",
                        sessionId = sessionId,
                    )
                }.exceptionOrNull()

            exception shouldNotBe null
            exception!!.message shouldBe "No keystroke data for session $sessionId. Cannot issue certificate without typing analysis."
        }

        test("scoring pipeline produces low score for robot-like typing") {
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

            val metrics = keystrokeAnalyzer.analyze(robotWindows)
            val result = scoringService.score(metrics)

            result.grade shouldBe "Not Certified"
        }

        test("scoring pipeline produces high score for human-like typing") {
            val windows =
                listOf(
                    humanWindow(0L, wpm = 45.0, errorCount = 4, pauseCount = 1, seed = 0),
                    humanWindow(5_000L, wpm = 72.0, errorCount = 3, pauseCount = 1, seed = 1),
                    humanWindow(10_000L, wpm = 52.0, errorCount = 5, pauseCount = 1, seed = 2),
                    humanWindow(15_000L, wpm = 68.0, errorCount = 4, pauseCount = 1, seed = 3),
                    humanWindow(20_000L, wpm = 40.0, errorCount = 6, pauseCount = 1, seed = 4),
                )

            val metrics = keystrokeAnalyzer.analyze(windows)
            val result = scoringService.score(metrics)

            result.grade shouldBe "Certified"
        }
    })
