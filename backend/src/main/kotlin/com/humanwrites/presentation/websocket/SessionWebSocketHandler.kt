package com.humanwrites.presentation.websocket

import com.humanwrites.presentation.dto.request.KeystrokeBatchMessage
import com.humanwrites.presentation.dto.request.SessionStartRequest
import com.humanwrites.presentation.dto.response.AnomalyAlertMessage
import com.humanwrites.presentation.dto.response.SessionStartResponse
import com.humanwrites.presentation.dto.response.SessionStatusMessage
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
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val activeSessions = ConcurrentHashMap<UUID, SessionState>()

    data class SessionState(
        val sessionId: UUID,
        val userId: String,
        val documentId: UUID,
        var totalKeystrokes: Int = 0,
        var anomalyCount: Int = 0,
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

        // TODO: Phase 2-2 integration - pass events to KeystrokeAnalyzer for real-time analysis
        // TODO: Batch insert into TimescaleDB via Redis buffer

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
     * Called by AnomalyDetector integration (future).
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
}
