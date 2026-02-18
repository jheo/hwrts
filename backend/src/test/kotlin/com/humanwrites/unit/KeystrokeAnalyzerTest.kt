package com.humanwrites.unit

import com.humanwrites.domain.session.analysis.KeystrokeAnalyzer
import com.humanwrites.domain.session.analysis.KeystrokeWindow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.doubles.plusOrMinus
import io.kotest.matchers.doubles.shouldBeGreaterThan
import io.kotest.matchers.doubles.shouldBeLessThan
import io.kotest.matchers.shouldBe

class KeystrokeAnalyzerTest :
    FunSpec({

        val analyzer = KeystrokeAnalyzer()

        fun humanLikeWindows(): List<KeystrokeWindow> =
            listOf(
                KeystrokeWindow(
                    windowStart = 0L,
                    windowEnd = 5000L,
                    keystrokes = 25,
                    wpm = 60.0,
                    avgFlightTime = 120.0,
                    avgDwellTime = 80.0,
                    errorCount = 2,
                    totalKeys = 25,
                    pauseCount = 1,
                    flightTimes =
                        listOf(
                            100,
                            130,
                            90,
                            150,
                            200,
                            80,
                            110,
                            140,
                            95,
                            160,
                            2500,
                            120,
                            130,
                            85,
                            175,
                            105,
                            190,
                            115,
                            145,
                            100,
                            135,
                            155,
                            125,
                            170,
                            110,
                        ),
                ),
                KeystrokeWindow(
                    windowStart = 5000L,
                    windowEnd = 10000L,
                    keystrokes = 22,
                    wpm = 55.0,
                    avgFlightTime = 130.0,
                    avgDwellTime = 85.0,
                    errorCount = 1,
                    totalKeys = 22,
                    pauseCount = 0,
                    flightTimes =
                        listOf(
                            110,
                            140,
                            100,
                            160,
                            85,
                            130,
                            150,
                            95,
                            170,
                            115,
                            125,
                            190,
                            105,
                            145,
                            135,
                            180,
                            90,
                            155,
                            120,
                            165,
                            140,
                            110,
                        ),
                ),
                KeystrokeWindow(
                    windowStart = 10000L,
                    windowEnd = 15000L,
                    keystrokes = 20,
                    wpm = 50.0,
                    avgFlightTime = 140.0,
                    avgDwellTime = 90.0,
                    errorCount = 3,
                    totalKeys = 20,
                    pauseCount = 2,
                    flightTimes =
                        listOf(
                            130,
                            150,
                            110,
                            3000,
                            170,
                            95,
                            140,
                            160,
                            2200,
                            120,
                            180,
                            100,
                            155,
                            135,
                            190,
                            115,
                            145,
                            125,
                            175,
                            105,
                        ),
                ),
                KeystrokeWindow(
                    windowStart = 15000L,
                    windowEnd = 20000L,
                    keystrokes = 18,
                    wpm = 45.0,
                    avgFlightTime = 150.0,
                    avgDwellTime = 95.0,
                    errorCount = 2,
                    totalKeys = 18,
                    pauseCount = 1,
                    flightTimes = listOf(140, 160, 120, 180, 2800, 100, 150, 170, 95, 135, 190, 110, 165, 125, 155, 145, 185, 115),
                ),
            )

        test("analyze with human-like windows produces reasonable metrics") {
            val metrics = analyzer.analyze(humanLikeWindows())

            metrics.avgWpm shouldBeGreaterThan 40.0
            metrics.avgWpm shouldBeLessThan 70.0
            metrics.typingSpeedCV shouldBeGreaterThan 0.05
            metrics.flightTimeEntropy shouldBeGreaterThan 1.0
            metrics.errorCorrectionRate shouldBeGreaterThan 0.0
            metrics.errorCorrectionRate shouldBeLessThan 0.20
            metrics.thinkingPauseFrequency shouldBeGreaterThan 0.0
        }

        test("analyze with empty windows returns zero metrics") {
            val metrics = analyzer.analyze(emptyList())

            metrics.avgWpm shouldBe 0.0
            metrics.wpmVariance shouldBe 0.0
            metrics.typingSpeedCV shouldBe 0.0
            metrics.flightTimeEntropy shouldBe 0.0
            metrics.errorCorrectionRate shouldBe 0.0
            metrics.pausePatternEntropy shouldBe 0.0
            metrics.burstPauseRatio shouldBe 0.0
            metrics.fatigueSlope shouldBe 0.0
            metrics.thinkingPauseFrequency shouldBe 0.0
        }

        test("analyze with single window returns zero fatigue slope") {
            val single =
                listOf(
                    KeystrokeWindow(
                        windowStart = 0L,
                        windowEnd = 5000L,
                        keystrokes = 20,
                        wpm = 50.0,
                        avgFlightTime = 120.0,
                        avgDwellTime = 80.0,
                        errorCount = 1,
                        totalKeys = 20,
                        pauseCount = 0,
                        flightTimes =
                            listOf(
                                100,
                                130,
                                90,
                                150,
                                200,
                                80,
                                110,
                                140,
                                95,
                                160,
                                120,
                                130,
                                85,
                                175,
                                105,
                                190,
                                115,
                                145,
                                100,
                                135,
                            ),
                    ),
                )
            val metrics = analyzer.analyze(single)

            metrics.fatigueSlope shouldBe 0.0
            metrics.avgWpm shouldBe 50.0
        }

        test("calculateShannonEntropy with uniform distribution returns high entropy") {
            // Values spread evenly across many buckets (50ms buckets)
            val uniformValues = (1..100).map { it * 50L }
            val entropy = analyzer.calculateShannonEntropy(uniformValues, bucketSize = 50)

            // 100 unique buckets -> log2(100) ~= 6.64
            entropy shouldBeGreaterThan 5.0
        }

        test("calculateShannonEntropy with single value returns zero entropy") {
            val sameValues = List(50) { 100L }
            val entropy = analyzer.calculateShannonEntropy(sameValues, bucketSize = 50)

            entropy shouldBe (0.0 plusOrMinus 1e-10)
        }

        test("calculateShannonEntropy with empty list returns zero") {
            val entropy = analyzer.calculateShannonEntropy(emptyList(), bucketSize = 50)

            entropy shouldBe 0.0
        }

        test("fatigue slope is negative for decreasing WPM windows") {
            val decreasingWpmWindows =
                listOf(
                    KeystrokeWindow(0L, 5000L, 30, 70.0, 100.0, 70.0, 1, 30, 0, listOf(100, 110, 90)),
                    KeystrokeWindow(5000L, 10000L, 25, 60.0, 110.0, 75.0, 1, 25, 1, listOf(110, 120, 100)),
                    KeystrokeWindow(10000L, 15000L, 22, 50.0, 120.0, 80.0, 2, 22, 1, listOf(120, 130, 110)),
                    KeystrokeWindow(15000L, 20000L, 18, 40.0, 140.0, 90.0, 2, 18, 2, listOf(140, 150, 130)),
                )
            val metrics = analyzer.analyze(decreasingWpmWindows)

            metrics.fatigueSlope shouldBeLessThan 0.0
        }

        test("fatigue slope is positive for increasing WPM windows") {
            val increasingWpmWindows =
                listOf(
                    KeystrokeWindow(0L, 5000L, 18, 40.0, 140.0, 90.0, 2, 18, 2, listOf(140, 150, 130)),
                    KeystrokeWindow(5000L, 10000L, 22, 50.0, 120.0, 80.0, 2, 22, 1, listOf(120, 130, 110)),
                    KeystrokeWindow(10000L, 15000L, 25, 60.0, 110.0, 75.0, 1, 25, 1, listOf(110, 120, 100)),
                    KeystrokeWindow(15000L, 20000L, 30, 70.0, 100.0, 70.0, 1, 30, 0, listOf(100, 110, 90)),
                )
            val metrics = analyzer.analyze(increasingWpmWindows)

            metrics.fatigueSlope shouldBeGreaterThan 0.0
        }

        test("burst-pause ratio is high when no long pauses") {
            val noPauseWindows =
                listOf(
                    KeystrokeWindow(0L, 5000L, 25, 60.0, 100.0, 70.0, 1, 25, 0, listOf(100, 110, 90, 120, 80)),
                    KeystrokeWindow(5000L, 10000L, 25, 60.0, 100.0, 70.0, 1, 25, 0, listOf(100, 110, 90, 120, 80)),
                )
            val metrics = analyzer.analyze(noPauseWindows)

            // No pauses >= 2000ms, so burstPauseRatio should be totalTime (no pause time to divide by)
            metrics.burstPauseRatio shouldBeGreaterThan 100.0
        }
    })
