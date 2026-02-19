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
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Controller
import java.security.Principal
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicInteger

@Controller
class SessionWebSocketHandler(
    private val messagingTemplate: SimpMessagingTemplate,
    private val keystrokeRepository: KeystrokeRepository,
    private val anomalyDetector: AnomalyDetector,
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val activeSessions = ConcurrentHashMap<UUID, SessionState>()

    companion object {
        /** Maximum events per STOMP keystroke batch to prevent DoS. */
        const val MAX_BATCH_SIZE = 500

        /** Maximum recent windows to keep per session to prevent unbounded growth. */
        const val MAX_RECENT_WINDOWS = 100
    }

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

    class SessionState(
        val sessionId: UUID,
        val userId: String,
        val documentId: UUID,
        val totalKeystrokes: AtomicInteger = AtomicInteger(0),
        val anomalyCount: AtomicInteger = AtomicInteger(0),
        val recentWindows: CopyOnWriteArrayList<KeystrokeWindow> = CopyOnWriteArrayList(),
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

        // Limit batch size to prevent DoS
        if (batch.events.size > MAX_BATCH_SIZE) {
            logger.warn("Batch size {} exceeds limit {} for session {}", batch.events.size, MAX_BATCH_SIZE, batch.sessionId)
            return
        }

        // Validate individual keystroke events
        val validEventTypes = setOf("keydown", "keyup")
        val validCategories = setOf("letter", "number", "punct", "modifier", "navigation", "function", "other")

        val validatedEvents =
            batch.events.filter { event ->
                event.eventType in validEventTypes &&
                    event.keyCategory in validCategories &&
                    event.timestampMs >= 0 &&
                    (event.dwellTimeMs == null || event.dwellTimeMs in 0..30000) &&
                    (event.flightTimeMs == null || event.flightTimeMs in 0..300000)
            }

        if (validatedEvents.isEmpty()) return

        state.totalKeystrokes.addAndGet(validatedEvents.size)
        logger.debug("Received {} keystrokes for session {}", validatedEvents.size, batch.sessionId)

        // Persist to TimescaleDB
        keystrokeRepository.batchInsert(batch.sessionId, validatedEvents)

        // Build a window from this batch for real-time analysis
        val window = buildWindow(validatedEvents)
        if (window != null) {
            state.recentWindows.add(window)
            // Cap window list size
            while (state.recentWindows.size > MAX_RECENT_WINDOWS) {
                state.recentWindows.removeAt(0)
            }
        }

        // Run anomaly detection when enough data is available
        if (state.recentWindows.size >= AnomalyDetector.MIN_WINDOWS_FOR_DETECTION) {
            val alerts = anomalyDetector.detect(state.recentWindows)
            if (alerts.isNotEmpty()) {
                state.anomalyCount.addAndGet(alerts.size)
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
                totalKeystrokes = state.totalKeystrokes.get(),
                anomalyCount = state.anomalyCount.get(),
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

        logger.info("Session ended: {} (keystrokes: {})", sessionId, state.totalKeystrokes.get())

        messagingTemplate.convertAndSendToUser(
            principal.name,
            "/queue/session.status",
            SessionStatusMessage(
                sessionId = sessionId,
                status = "ended",
                totalKeystrokes = state.totalKeystrokes.get(),
                anomalyCount = state.anomalyCount.get(),
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
    @Scheduled(fixedRate = 300_000) // Every 5 minutes
    fun cleanupAbandonedSessions() {
        val cutoff = System.currentTimeMillis() - 1_800_000 // 30 minutes
        val removed =
            activeSessions.entries.removeIf { (_, state) ->
                val lastActivity = state.recentWindows.lastOrNull()?.windowEnd ?: 0L
                lastActivity > 0 && lastActivity < cutoff
            }
        if (removed) {
            logger.info("Cleaned up abandoned sessions. Active: {}", activeSessions.size)
        }
    }

    internal fun buildWindow(events: List<KeystrokeEventDto>): KeystrokeWindow? {
        if (events.isEmpty()) return null

        val keydowns = events.filter { it.eventType == "keydown" }
        if (keydowns.isEmpty()) return null

        val windowStart = events.minOf { it.timestampMs }
        val windowEnd = events.maxOf { it.timestampMs }
        val duration = (windowEnd - windowStart).coerceAtLeast(1L)

        // WPM estimate: assume 5 chars per word
        val typingKeys = keydowns.count { it.keyCategory in listOf("letter", "number", "punct") }
        val wpm =
            if (duration >= 1000L) {
                (typingKeys / 5.0) / (duration / 60000.0)
            } else {
                0.0 // Insufficient duration for meaningful WPM
            }

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
