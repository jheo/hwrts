package com.humanwrites.unit

import com.humanwrites.domain.session.analysis.AnomalyDetector
import com.humanwrites.domain.session.analysis.AnomalyType
import com.humanwrites.domain.session.analysis.KeystrokeAnalyzer
import com.humanwrites.domain.session.analysis.KeystrokeWindow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe

class AnomalyDetectorTest :
    FunSpec({

        val detector = AnomalyDetector(KeystrokeAnalyzer())

        fun normalWindows(): List<KeystrokeWindow> =
            listOf(
                KeystrokeWindow(
                    windowStart = 0L,
                    windowEnd = 5000L,
                    keystrokes = 25,
                    wpm = 60.0,
                    avgFlightTime = 180.0,
                    avgDwellTime = 80.0,
                    errorCount = 2,
                    totalKeys = 25,
                    pauseCount = 1,
                    flightTimes =
                        listOf(
                            45,
                            90,
                            150,
                            220,
                            310,
                            80,
                            130,
                            270,
                            55,
                            400,
                            2500,
                            60,
                            180,
                            350,
                            95,
                            250,
                            70,
                            500,
                            115,
                            200,
                            160,
                            330,
                            75,
                            420,
                            105,
                        ),
                ),
                KeystrokeWindow(
                    windowStart = 5000L,
                    windowEnd = 10000L,
                    keystrokes = 22,
                    wpm = 55.0,
                    avgFlightTime = 190.0,
                    avgDwellTime = 85.0,
                    errorCount = 1,
                    totalKeys = 22,
                    pauseCount = 0,
                    flightTimes =
                        listOf(
                            55,
                            120,
                            280,
                            65,
                            190,
                            350,
                            85,
                            450,
                            110,
                            240,
                            70,
                            380,
                            95,
                            160,
                            300,
                            50,
                            210,
                            130,
                            470,
                            75,
                            260,
                            140,
                        ),
                ),
                KeystrokeWindow(
                    windowStart = 10000L,
                    windowEnd = 15000L,
                    keystrokes = 20,
                    wpm = 50.0,
                    avgFlightTime = 200.0,
                    avgDwellTime = 90.0,
                    errorCount = 3,
                    totalKeys = 20,
                    pauseCount = 2,
                    flightTimes =
                        listOf(
                            60,
                            170,
                            3000,
                            90,
                            320,
                            55,
                            250,
                            410,
                            2200,
                            80,
                            190,
                            360,
                            110,
                            480,
                            70,
                            230,
                            140,
                            500,
                            100,
                            290,
                        ),
                ),
            )

        fun mechanicalWindows(): List<KeystrokeWindow> =
            listOf(
                KeystrokeWindow(
                    windowStart = 0L,
                    windowEnd = 5000L,
                    keystrokes = 30,
                    wpm = 72.0,
                    avgFlightTime = 100.0,
                    avgDwellTime = 60.0,
                    errorCount = 0,
                    totalKeys = 30,
                    pauseCount = 0,
                    flightTimes = List(30) { 100L },
                ),
                KeystrokeWindow(
                    windowStart = 5000L,
                    windowEnd = 10000L,
                    keystrokes = 30,
                    wpm = 72.0,
                    avgFlightTime = 100.0,
                    avgDwellTime = 60.0,
                    errorCount = 0,
                    totalKeys = 30,
                    pauseCount = 0,
                    flightTimes = List(30) { 100L },
                ),
                KeystrokeWindow(
                    windowStart = 10000L,
                    windowEnd = 15000L,
                    keystrokes = 30,
                    wpm = 72.0,
                    avgFlightTime = 100.0,
                    avgDwellTime = 60.0,
                    errorCount = 0,
                    totalKeys = 30,
                    pauseCount = 0,
                    flightTimes = List(30) { 100L },
                ),
            )

        test("no anomalies for normal human typing") {
            val alerts = detector.detect(normalWindows())

            val criticalAlerts = alerts.filter { it.severity == "critical" }
            criticalAlerts.shouldBeEmpty()
        }

        test("returns empty for fewer than MIN_WINDOWS_FOR_DETECTION windows") {
            val twoWindows = normalWindows().take(2)
            val alerts = detector.detect(twoWindows)

            alerts.shouldBeEmpty()
        }

        test("detects unrealistic speed with constant WPM") {
            val alerts = detector.detect(mechanicalWindows())

            val speedAlerts = alerts.filter { it.type == AnomalyType.UNREALISTIC_SPEED }
            speedAlerts shouldHaveSize 1
            speedAlerts[0].severity shouldBe "critical"
            speedAlerts[0].confidence shouldBe 1.0 // CV is exactly 0 < 0.05
        }

        test("detects mechanical rhythm with low entropy") {
            val alerts = detector.detect(mechanicalWindows())

            val rhythmAlerts = alerts.filter { it.type == AnomalyType.MECHANICAL_RHYTHM }
            rhythmAlerts shouldHaveSize 1
            rhythmAlerts[0].severity shouldBe "critical"
        }

        test("detects excessive paste at warning level") {
            val alerts = detector.detect(normalWindows(), pasteRatio = 0.35)

            val pasteAlerts = alerts.filter { it.type == AnomalyType.EXCESSIVE_PASTE }
            pasteAlerts shouldHaveSize 1
            pasteAlerts[0].severity shouldBe "warning"
        }

        test("detects excessive paste at critical level") {
            val alerts = detector.detect(normalWindows(), pasteRatio = 0.55)

            val pasteAlerts = alerts.filter { it.type == AnomalyType.EXCESSIVE_PASTE }
            pasteAlerts shouldHaveSize 1
            pasteAlerts[0].severity shouldBe "critical"
        }

        test("no paste anomaly for low paste ratio") {
            val alerts = detector.detect(normalWindows(), pasteRatio = 0.10)

            val pasteAlerts = alerts.filter { it.type == AnomalyType.EXCESSIVE_PASTE }
            pasteAlerts.shouldBeEmpty()
        }

        test("detects no thinking pauses") {
            // Windows spanning >1 minute with no pauses
            val noPauseWindows =
                listOf(
                    KeystrokeWindow(0L, 20000L, 50, 60.0, 100.0, 70.0, 0, 50, 0, List(50) { (80 + it * 3).toLong() }),
                    KeystrokeWindow(20000L, 40000L, 50, 60.0, 100.0, 70.0, 0, 50, 0, List(50) { (80 + it * 3).toLong() }),
                    KeystrokeWindow(40000L, 70000L, 50, 60.0, 100.0, 70.0, 0, 50, 0, List(50) { (80 + it * 3).toLong() }),
                )
            val alerts = detector.detect(noPauseWindows)

            val pauseAlerts = alerts.filter { it.type == AnomalyType.NO_THINKING_PAUSES }
            pauseAlerts shouldHaveSize 1
            pauseAlerts[0].severity shouldBe "warning"
        }

        test("no thinking pause anomaly when session is too short") {
            // Windows spanning less than 1 minute
            val shortWindows =
                listOf(
                    KeystrokeWindow(0L, 5000L, 20, 60.0, 100.0, 70.0, 0, 20, 0, List(20) { 100L }),
                    KeystrokeWindow(5000L, 10000L, 20, 60.0, 100.0, 70.0, 0, 20, 0, List(20) { 100L }),
                    KeystrokeWindow(10000L, 15000L, 20, 60.0, 100.0, 70.0, 0, 20, 0, List(20) { 100L }),
                )
            val alerts = detector.detect(shortWindows)

            val pauseAlerts = alerts.filter { it.type == AnomalyType.NO_THINKING_PAUSES }
            pauseAlerts.shouldBeEmpty()
        }

        test("anomaly confidence is between 0 and 1") {
            val alerts = detector.detect(mechanicalWindows(), pasteRatio = 0.55)

            alerts.forEach { alert ->
                (alert.confidence >= 0.0) shouldBe true
                (alert.confidence <= 1.0) shouldBe true
            }
        }

        test("anomaly details contain expected keys") {
            val alerts = detector.detect(mechanicalWindows())

            val speedAlert = alerts.first { it.type == AnomalyType.UNREALISTIC_SPEED }
            speedAlert.details.containsKey("cv") shouldBe true
            speedAlert.details.containsKey("avgWpm") shouldBe true

            val rhythmAlert = alerts.first { it.type == AnomalyType.MECHANICAL_RHYTHM }
            rhythmAlert.details.containsKey("entropy") shouldBe true
        }
    })
