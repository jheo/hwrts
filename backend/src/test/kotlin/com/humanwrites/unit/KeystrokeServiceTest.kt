package com.humanwrites.unit

import com.humanwrites.domain.session.KeystrokeServiceImpl
import com.humanwrites.infrastructure.persistence.KeystrokeEventRow
import com.humanwrites.infrastructure.persistence.KeystrokeRepository
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.doubles.shouldBeGreaterThan
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import java.time.Instant
import java.util.UUID

class KeystrokeServiceTest :
    FunSpec({

        lateinit var keystrokeRepository: KeystrokeRepository
        lateinit var service: KeystrokeServiceImpl

        beforeEach {
            keystrokeRepository = mockk()
            service = KeystrokeServiceImpl(keystrokeRepository)
        }

        test("getKeystrokeWindows returns empty list for session with no events") {
            val sessionId = UUID.randomUUID()
            every { keystrokeRepository.findBySessionId(sessionId) } returns emptyList()

            val windows = service.getKeystrokeWindows(sessionId)

            windows.shouldBeEmpty()
        }

        test("aggregateIntoWindows groups events into 5-second windows") {
            val now = Instant.now()
            val events =
                listOf(
                    // Window 1: 0-5000ms
                    keystrokeEvent(timestampMs = 100, eventType = "keydown", keyCategory = "letter", flightTimeMs = 120, dwellTimeMs = 80),
                    keystrokeEvent(timestampMs = 300, eventType = "keydown", keyCategory = "letter", flightTimeMs = 150, dwellTimeMs = 75),
                    keystrokeEvent(timestampMs = 600, eventType = "keydown", keyCategory = "letter", flightTimeMs = 100, dwellTimeMs = 90),
                    keystrokeEvent(timestampMs = 1000, eventType = "keydown", keyCategory = "number", flightTimeMs = 200, dwellTimeMs = 70),
                    keystrokeEvent(timestampMs = 2000, eventType = "keydown", keyCategory = "punct", flightTimeMs = 130, dwellTimeMs = 85),
                    // Window 2: 5100-10100ms
                    keystrokeEvent(timestampMs = 5200, eventType = "keydown", keyCategory = "letter", flightTimeMs = 140, dwellTimeMs = 82),
                    keystrokeEvent(timestampMs = 5500, eventType = "keydown", keyCategory = "letter", flightTimeMs = 160, dwellTimeMs = 78),
                    keystrokeEvent(timestampMs = 6000, eventType = "keydown", keyCategory = "letter", flightTimeMs = 110, dwellTimeMs = 88),
                )

            val windows = service.aggregateIntoWindows(events)

            windows shouldHaveSize 2

            // First window starts at 100 (first event timestamp)
            windows[0].windowStart shouldBe 100L
            windows[0].windowEnd shouldBe 5100L
            windows[0].keystrokes shouldBe 5
            windows[0].totalKeys shouldBe 5

            // Second window starts at 5100
            windows[1].windowStart shouldBe 5100L
            windows[1].windowEnd shouldBe 10100L
            windows[1].keystrokes shouldBe 3
        }

        test("aggregateIntoWindows correctly calculates WPM") {
            val events =
                listOf(
                    keystrokeEvent(timestampMs = 0, eventType = "keydown", keyCategory = "letter"),
                    keystrokeEvent(timestampMs = 500, eventType = "keydown", keyCategory = "letter"),
                    keystrokeEvent(timestampMs = 1000, eventType = "keydown", keyCategory = "letter"),
                    keystrokeEvent(timestampMs = 1500, eventType = "keydown", keyCategory = "letter"),
                    keystrokeEvent(timestampMs = 2000, eventType = "keydown", keyCategory = "letter"),
                    keystrokeEvent(timestampMs = 2500, eventType = "keydown", keyCategory = "number"),
                    keystrokeEvent(timestampMs = 3000, eventType = "keydown", keyCategory = "number"),
                    keystrokeEvent(timestampMs = 3500, eventType = "keydown", keyCategory = "number"),
                    keystrokeEvent(timestampMs = 4000, eventType = "keydown", keyCategory = "number"),
                    keystrokeEvent(timestampMs = 4500, eventType = "keydown", keyCategory = "number"),
                )

            val windows = service.aggregateIntoWindows(events)

            windows shouldHaveSize 1
            // 10 typing keys / 5 = 2 words in 5 seconds = 24 WPM
            windows[0].wpm shouldBe 24.0
        }

        test("aggregateIntoWindows counts pauses from flight times >= 2000ms") {
            val events =
                listOf(
                    keystrokeEvent(timestampMs = 0, eventType = "keydown", keyCategory = "letter", flightTimeMs = 100),
                    keystrokeEvent(timestampMs = 200, eventType = "keydown", keyCategory = "letter", flightTimeMs = 2500),
                    keystrokeEvent(timestampMs = 2700, eventType = "keydown", keyCategory = "letter", flightTimeMs = 150),
                    keystrokeEvent(timestampMs = 3000, eventType = "keydown", keyCategory = "letter", flightTimeMs = 3000),
                )

            val windows = service.aggregateIntoWindows(events)

            windows shouldHaveSize 1
            windows[0].pauseCount shouldBe 2
        }

        test("aggregateIntoWindows handles keyup events by excluding from keydown count") {
            val events =
                listOf(
                    keystrokeEvent(timestampMs = 0, eventType = "keydown", keyCategory = "letter"),
                    keystrokeEvent(timestampMs = 80, eventType = "keyup", keyCategory = "letter"),
                    keystrokeEvent(timestampMs = 200, eventType = "keydown", keyCategory = "letter"),
                    keystrokeEvent(timestampMs = 280, eventType = "keyup", keyCategory = "letter"),
                )

            val windows = service.aggregateIntoWindows(events)

            windows shouldHaveSize 1
            windows[0].keystrokes shouldBe 2 // Only keydowns
            windows[0].totalKeys shouldBe 2
        }

        test("aggregateIntoWindows calculates average flight and dwell times") {
            val events =
                listOf(
                    keystrokeEvent(timestampMs = 0, eventType = "keydown", keyCategory = "letter", flightTimeMs = 100, dwellTimeMs = 80),
                    keystrokeEvent(timestampMs = 200, eventType = "keydown", keyCategory = "letter", flightTimeMs = 200, dwellTimeMs = 60),
                    keystrokeEvent(timestampMs = 500, eventType = "keydown", keyCategory = "letter", flightTimeMs = 300, dwellTimeMs = 100),
                )

            val windows = service.aggregateIntoWindows(events)

            windows shouldHaveSize 1
            windows[0].avgFlightTime shouldBe 200.0 // (100+200+300)/3
            windows[0].avgDwellTime shouldBe 80.0 // (80+60+100)/3
        }

        test("aggregateIntoWindows returns flight times list for entropy calculation") {
            val events =
                listOf(
                    keystrokeEvent(timestampMs = 0, eventType = "keydown", keyCategory = "letter", flightTimeMs = 100),
                    keystrokeEvent(timestampMs = 200, eventType = "keydown", keyCategory = "letter", flightTimeMs = 250),
                    keystrokeEvent(timestampMs = 500, eventType = "keydown", keyCategory = "letter", flightTimeMs = 180),
                )

            val windows = service.aggregateIntoWindows(events)

            windows shouldHaveSize 1
            windows[0].flightTimes shouldBe listOf(100L, 250L, 180L)
        }

        test("aggregateIntoWindows skips empty windows") {
            val events =
                listOf(
                    // Window 1: events at 0-5000ms
                    keystrokeEvent(timestampMs = 100, eventType = "keydown", keyCategory = "letter"),
                    // Gap: no events at 5100-10100ms
                    // Window 3: events at 10100-15100ms
                    keystrokeEvent(timestampMs = 11000, eventType = "keydown", keyCategory = "letter"),
                )

            val windows = service.aggregateIntoWindows(events)

            windows shouldHaveSize 2
            windows[0].windowStart shouldBe 100L
            windows[1].windowStart shouldBe 10100L
        }

        test("getKeystrokeWindows delegates to repository and aggregates") {
            val sessionId = UUID.randomUUID()
            val events =
                listOf(
                    keystrokeEvent(timestampMs = 0, eventType = "keydown", keyCategory = "letter", flightTimeMs = 120),
                    keystrokeEvent(timestampMs = 500, eventType = "keydown", keyCategory = "letter", flightTimeMs = 150),
                    keystrokeEvent(timestampMs = 1000, eventType = "keydown", keyCategory = "letter", flightTimeMs = 130),
                )
            every { keystrokeRepository.findBySessionId(sessionId) } returns events

            val windows = service.getKeystrokeWindows(sessionId)

            windows shouldHaveSize 1
            windows[0].keystrokes shouldBe 3
            windows[0].avgFlightTime shouldBeGreaterThan 0.0
        }
    })

private fun keystrokeEvent(
    timestampMs: Long,
    eventType: String = "keydown",
    keyCategory: String = "letter",
    flightTimeMs: Int? = null,
    dwellTimeMs: Int? = null,
) = KeystrokeEventRow(
    id = 0L,
    sessionId = UUID.randomUUID(),
    eventType = eventType,
    keyCategory = keyCategory,
    timestampMs = timestampMs,
    dwellTimeMs = dwellTimeMs,
    flightTimeMs = flightTimeMs,
    time = Instant.now(),
)
