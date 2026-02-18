package com.humanwrites.unit

import com.humanwrites.domain.session.analysis.KeystrokeMetrics
import com.humanwrites.domain.session.analysis.ScoringConfig
import com.humanwrites.domain.session.analysis.ScoringService
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.ints.shouldBeGreaterThanOrEqual
import io.kotest.matchers.ints.shouldBeLessThan
import io.kotest.matchers.shouldBe

class ScoringServiceTest :
    FunSpec({

        val service = ScoringService()

        fun humanLikeMetrics() =
            KeystrokeMetrics(
                avgWpm = 55.0,
                wpmVariance = 100.0,
                typingSpeedCV = 0.30,
                flightTimeEntropy = 4.5,
                errorCorrectionRate = 0.08,
                pausePatternEntropy = 2.5,
                burstPauseRatio = 5.0,
                fatigueSlope = -0.5,
                thinkingPauseFrequency = 3.0,
            )

        fun botLikeMetrics() =
            KeystrokeMetrics(
                avgWpm = 80.0,
                wpmVariance = 1.0,
                typingSpeedCV = 0.02,
                flightTimeEntropy = 1.0,
                errorCorrectionRate = 0.0,
                pausePatternEntropy = 0.0,
                burstPauseRatio = 50.0,
                fatigueSlope = 0.5,
                thinkingPauseFrequency = 0.0,
            )

        test("human-like metrics produce Certified grade") {
            val result = service.score(humanLikeMetrics())

            result.overallScore shouldBeGreaterThanOrEqual 60
            result.grade shouldBe "Certified"
        }

        test("human-like metrics produce appropriate label") {
            val result = service.score(humanLikeMetrics())

            // Score should be high enough for "Highly likely" or "Likely"
            (result.label == "Highly likely human-written" || result.label == "Likely human-written") shouldBe true
        }

        test("bot-like metrics produce Not Certified grade") {
            val result = service.score(botLikeMetrics())

            result.overallScore shouldBeLessThan 60
            result.grade shouldBe "Not Certified"
        }

        test("bot-like metrics produce low score") {
            val result = service.score(botLikeMetrics())

            result.overallScore shouldBeLessThan 40
        }

        test("empty metrics (all zeros) produce Not Certified") {
            val emptyMetrics =
                KeystrokeMetrics(
                    avgWpm = 0.0,
                    wpmVariance = 0.0,
                    typingSpeedCV = 0.0,
                    flightTimeEntropy = 0.0,
                    errorCorrectionRate = 0.0,
                    pausePatternEntropy = 0.0,
                    burstPauseRatio = 0.0,
                    fatigueSlope = 0.0,
                    thinkingPauseFrequency = 0.0,
                )
            val result = service.score(emptyMetrics)

            result.grade shouldBe "Not Certified"
        }

        test("keystrokeDynamics contains correct values from metrics") {
            val metrics = humanLikeMetrics()
            val result = service.score(metrics)

            result.keystrokeDynamics.typingSpeedVariance shouldBe metrics.typingSpeedCV
            result.keystrokeDynamics.errorCorrectionRate shouldBe metrics.errorCorrectionRate
            result.keystrokeDynamics.pausePatternEntropy shouldBe metrics.pausePatternEntropy
        }

        test("score is clamped between 0 and 100") {
            // Extremely human-like
            val perfectMetrics =
                KeystrokeMetrics(
                    avgWpm = 55.0,
                    wpmVariance = 100.0,
                    typingSpeedCV = 0.35,
                    flightTimeEntropy = 6.0,
                    errorCorrectionRate = 0.10,
                    pausePatternEntropy = 3.0,
                    burstPauseRatio = 5.0,
                    fatigueSlope = -0.5,
                    thinkingPauseFrequency = 3.0,
                )
            val result = service.score(perfectMetrics)

            result.overallScore shouldBeGreaterThanOrEqual 0
            (result.overallScore <= 100) shouldBe true
        }

        test("custom config changes certified threshold") {
            val strictConfig = ScoringConfig(certifiedThreshold = 90)
            val strictService = ScoringService(strictConfig)

            val result = strictService.score(humanLikeMetrics())

            // Human-like metrics might not pass a 90 threshold
            if (result.overallScore < 90) {
                result.grade shouldBe "Not Certified"
            } else {
                result.grade shouldBe "Certified"
            }
        }

        test("rangeScore returns 100 for value within range") {
            val score = service.rangeScore(0.30, 0.15, 0.60)

            score shouldBe 100.0
        }

        test("rangeScore returns 0 for value far outside range") {
            val score = service.rangeScore(1.0, 0.15, 0.60)

            score shouldBe 0.0
        }

        test("rangeScore returns intermediate for value near boundary") {
            val score = service.rangeScore(0.10, 0.15, 0.60)

            // Should be between 0 and 100, closer to 100
            (score > 0.0) shouldBe true
            (score < 100.0) shouldBe true
        }

        test("fatigueScore rewards natural fatigue") {
            service.fatigueScore(-0.5) shouldBe 100.0
        }

        test("fatigueScore penalizes acceleration") {
            service.fatigueScore(0.5) shouldBe 20.0
        }

        test("fatigueScore gives moderate score for flat") {
            service.fatigueScore(0.0) shouldBe 50.0
        }

        test("burstPauseScore rewards natural ratio") {
            service.burstPauseScore(5.0) shouldBe 100.0
        }

        test("burstPauseScore penalizes mechanical (no pauses)") {
            service.burstPauseScore(25.0) shouldBe 20.0
        }

        test("label categories match score ranges") {
            // Score >= 80 -> "Highly likely human-written"
            val highMetrics =
                humanLikeMetrics().copy(
                    typingSpeedCV = 0.35,
                    flightTimeEntropy = 5.5,
                    errorCorrectionRate = 0.10,
                    burstPauseRatio = 5.0,
                    fatigueSlope = -0.5,
                    thinkingPauseFrequency = 3.0,
                )
            val highResult = service.score(highMetrics)

            if (highResult.overallScore >= 80) {
                highResult.label shouldBe "Highly likely human-written"
            } else if (highResult.overallScore >= 60) {
                highResult.label shouldBe "Likely human-written"
            }
        }
    })
