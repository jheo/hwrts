package com.humanwrites.domain.session

import com.humanwrites.domain.session.analysis.KeystrokeWindow
import com.humanwrites.infrastructure.persistence.KeystrokeEventRow
import com.humanwrites.infrastructure.persistence.KeystrokeRepository
import org.springframework.stereotype.Service
import java.util.UUID

/**
 * Service for retrieving keystroke data from writing sessions.
 * Provides aggregated 5-second windows used for scoring.
 */
interface KeystrokeService {
    /**
     * Retrieve aggregated keystroke windows for a given session.
     * Returns empty list if no data is available.
     */
    fun getKeystrokeWindows(sessionId: UUID): List<KeystrokeWindow>
}

@Service
class KeystrokeServiceImpl(
    private val keystrokeRepository: KeystrokeRepository,
) : KeystrokeService {
    companion object {
        const val WINDOW_SIZE_MS = 5000L
    }

    override fun getKeystrokeWindows(sessionId: UUID): List<KeystrokeWindow> {
        val events = keystrokeRepository.findBySessionId(sessionId)
        if (events.isEmpty()) return emptyList()
        return aggregateIntoWindows(events)
    }

    /**
     * Aggregate raw keystroke event rows into 5-second windows.
     * Each window covers [windowStart, windowStart + WINDOW_SIZE_MS).
     */
    internal fun aggregateIntoWindows(events: List<KeystrokeEventRow>): List<KeystrokeWindow> {
        if (events.isEmpty()) return emptyList()

        val sortedEvents = events.sortedBy { it.timestampMs }
        val firstTimestamp = sortedEvents.first().timestampMs
        val lastTimestamp = sortedEvents.last().timestampMs

        val windows = mutableListOf<KeystrokeWindow>()
        var windowStart = firstTimestamp

        while (windowStart <= lastTimestamp) {
            val windowEnd = windowStart + WINDOW_SIZE_MS
            val windowEvents = sortedEvents.filter { it.timestampMs in windowStart until windowEnd }

            if (windowEvents.isNotEmpty()) {
                val window = buildWindowFromEvents(windowEvents, windowStart, windowEnd)
                windows.add(window)
            }

            windowStart = windowEnd
        }

        return windows
    }

    private fun buildWindowFromEvents(
        events: List<KeystrokeEventRow>,
        windowStart: Long,
        windowEnd: Long,
    ): KeystrokeWindow {
        val keydowns = events.filter { it.eventType == "keydown" }
        val typingKeys = keydowns.count { it.keyCategory in listOf("letter", "number", "punct") }

        val duration = (windowEnd - windowStart).coerceAtLeast(1L)
        val wpm = (typingKeys / 5.0) / (duration / 60000.0)

        val flightTimes = events.mapNotNull { it.flightTimeMs?.toLong() }
        val dwellTimes = events.mapNotNull { it.dwellTimeMs }

        val errorCount = keydowns.count { it.keyCategory == "modifier" }
        val pauseCount = flightTimes.count { it >= 2000L }

        return KeystrokeWindow(
            windowStart = windowStart,
            windowEnd = windowEnd,
            keystrokes = keydowns.size,
            wpm = wpm,
            avgFlightTime = if (flightTimes.isNotEmpty()) flightTimes.average() else 0.0,
            avgDwellTime = if (dwellTimes.isNotEmpty()) dwellTimes.average() else 0.0,
            errorCount = errorCount,
            totalKeys = keydowns.size,
            pauseCount = pauseCount,
            flightTimes = flightTimes,
        )
    }
}
