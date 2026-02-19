package com.humanwrites.presentation.websocket

import com.humanwrites.domain.session.analysis.AnomalyDetector
import com.humanwrites.domain.session.analysis.KeystrokeWindow
import com.humanwrites.infrastructure.persistence.KeystrokeRepository
import com.humanwrites.presentation.dto.request.KeystrokeBatchMessage
import com.humanwrites.presentation.dto.request.KeystrokeEventDto
import com.humanwrites.presentation.dto.request.SessionStartRequest
import com.humanwrites.presentation.dto.response.AnomalyAlertMessage
import com.humanwrites.presentation.dto.response.SessionStartResponse
import com.humanwrites.presentation.dto.response.SessionStatusMessage
import jakarta.annotation.PostConstruct
import jakarta.annotation.PreDestroy
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Controller
import java.security.Principal
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Controller
class SessionWebSocketHandler(
    private val messagingTemplate: SimpMessagingTemplate,
    private val keystrokeRepository: KeystrokeRepository,
    private val anomalyDetector: AnomalyDetector,
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val activeSessions = ConcurrentHashMap<UUID, SessionState>()

    @PostConstruct
    fun init() {
        logger.info("SessionWebSocketHandler initialized. Note: active sessions are in-memory and will be lost on restart.")
    }

    @PreDestroy
    fun shutdown() {
        val count = activeSessions.size
        if (count > 0) {
            logger.warn("Server shutting down with {} active writing sessions. These sessions will be lost.", count)
        }
        activeSessions.clear()
    }

    data class SessionState(
        val sessionId: UUID,
        val userId: String,
        val documentId: UUID,
        var totalKeystrokes: Int = 0,
        var anomalyCount: Int = 0,
        val recentWindows: MutableList<KeystrokeWindow> = mutableListOf(),
    )

    @MessageMapping("/session.start")
    fun handleSessionStart(
        @Payload request: SessionStartRequest,
        principal: Principal,
    ) {
        val sessionId = UUID.randomUUID()
        val state =
            SessionState(
                sessionId = sessionId,
                userId = principal.name,
                documentId = request.documentId,
            )
        activeSessions[sessionId] = state
        logger.info("Session started: {} for user {}", sessionId, principal.name)

        messagingTemplate.convertAndSendToUser(
            principal.name,
            "/queue/session.status",
            SessionStartResponse(sessionId = sessionId),
        )
    }

    @MessageMapping("/session.keystroke")
    fun handleKeystrokeBatch(
        @Payload batch: KeystrokeBatchMessage,
        principal: Principal,
    ) {
        val state =
            activeSessions[batch.sessionId] ?: run {
                logger.warn("Keystroke batch for unknown session: {}", batch.sessionId)
                return
            }

        // Verify ownership
        if (state.userId != principal.name) {
            logger.warn("User {} tried to send to session {}", principal.name, batch.sessionId)
            return
        }

        state.totalKeystrokes += batch.events.size
        logger.debug("Received {} keystrokes for session {}", batch.events.size, batch.sessionId)

        // Persist to TimescaleDB
        keystrokeRepository.batchInsert(batch.sessionId, batch.events)

        // Build a window from this batch for real-time analysis
        val window = buildWindow(batch.events)
        if (window != null) {
            state.recentWindows.add(window)
        }

        // Run anomaly detection when enough data is available
        if (state.recentWindows.size >= AnomalyDetector.MIN_WINDOWS_FOR_DETECTION) {
            val alerts = anomalyDetector.detect(state.recentWindows)
            if (alerts.isNotEmpty()) {
                state.anomalyCount += alerts.size
                for (alert in alerts) {
                    sendAnomalyAlert(
                        principal.name,
                        AnomalyAlertMessage(
                            sessionId = batch.sessionId,
                            type = alert.type.name,
                            severity = alert.severity,
                            message = alert.message,
                            confidence = alert.confidence,
                        ),
                    )
                }
            }
        }

        // Send status update
        messagingTemplate.convertAndSendToUser(
            principal.name,
            "/queue/session.status",
            SessionStatusMessage(
                sessionId = batch.sessionId,
                status = "active",
                totalKeystrokes = state.totalKeystrokes,
                anomalyCount = state.anomalyCount,
            ),
        )
    }

    @MessageMapping("/session.end")
    fun handleSessionEnd(
        @Payload sessionId: UUID,
        principal: Principal,
    ) {
        val state = activeSessions[sessionId] ?: return
        if (state.userId != principal.name) return
        activeSessions.remove(sessionId)

        logger.info("Session ended: {} (keystrokes: {})", sessionId, state.totalKeystrokes)

        messagingTemplate.convertAndSendToUser(
            principal.name,
            "/queue/session.status",
            SessionStatusMessage(
                sessionId = sessionId,
                status = "ended",
                totalKeystrokes = state.totalKeystrokes,
                anomalyCount = state.anomalyCount,
            ),
        )
    }

    /**
     * Send anomaly alert to specific user.
     */
    fun sendAnomalyAlert(
        userId: String,
        alert: AnomalyAlertMessage,
    ) {
        messagingTemplate.convertAndSendToUser(
            userId,
            "/queue/session.anomaly",
            alert,
        )
    }

    /**
     * Build a KeystrokeWindow from a batch of events for real-time analysis.
     * Returns null if the batch has no keydown events.
     */
    internal fun buildWindow(events: List<KeystrokeEventDto>): KeystrokeWindow? {
        if (events.isEmpty()) return null

        val keydowns = events.filter { it.eventType == "keydown" }
        if (keydowns.isEmpty()) return null

        val windowStart = events.minOf { it.timestampMs }
        val windowEnd = events.maxOf { it.timestampMs }
        val duration = (windowEnd - windowStart).coerceAtLeast(1L)

        // WPM estimate: assume 5 chars per word
        val typingKeys = keydowns.count { it.keyCategory in listOf("letter", "number", "punct") }
        val wpm = if (duration > 0) (typingKeys / 5.0) / (duration / 60000.0) else 0.0

        val flightTimes = events.mapNotNull { it.flightTimeMs?.toLong() }
        val dwellTimes = events.mapNotNull { it.dwellTimeMs }

        val errorCount = keydowns.count { it.keyCategory == "navigation" }
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
