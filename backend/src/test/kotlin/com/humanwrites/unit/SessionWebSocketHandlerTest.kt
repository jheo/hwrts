package com.humanwrites.unit

import com.humanwrites.domain.session.analysis.AnomalyDetector
import com.humanwrites.domain.session.analysis.KeystrokeAnalyzer
import com.humanwrites.infrastructure.persistence.KeystrokeRepository
import com.humanwrites.presentation.dto.request.KeystrokeBatchMessage
import com.humanwrites.presentation.dto.request.KeystrokeEventDto
import com.humanwrites.presentation.dto.request.SessionStartRequest
import com.humanwrites.presentation.dto.response.SessionStartResponse
import com.humanwrites.presentation.dto.response.SessionStatusMessage
import com.humanwrites.presentation.websocket.SessionWebSocketHandler
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.springframework.messaging.simp.SimpMessagingTemplate
import java.security.Principal
import java.util.UUID

class SessionWebSocketHandlerTest :
    FunSpec({

        lateinit var messagingTemplate: SimpMessagingTemplate
        lateinit var keystrokeRepository: KeystrokeRepository
        lateinit var anomalyDetector: AnomalyDetector
        lateinit var handler: SessionWebSocketHandler
        lateinit var principal: Principal

        beforeEach {
            messagingTemplate = mockk(relaxed = true)
            keystrokeRepository = mockk(relaxed = true)
            anomalyDetector = AnomalyDetector(KeystrokeAnalyzer())
            handler = SessionWebSocketHandler(messagingTemplate, keystrokeRepository, anomalyDetector)
            principal = mockk()
            every { principal.name } returns "user-123"
        }

        test("handleSessionStart creates session and sends response") {
            val request = SessionStartRequest(documentId = UUID.randomUUID())

            handler.handleSessionStart(request, principal)

            val destinationSlot = slot<String>()
            val userSlot = slot<String>()
            val payloadSlot = slot<SessionStartResponse>()

            verify {
                messagingTemplate.convertAndSendToUser(
                    capture(userSlot),
                    capture(destinationSlot),
                    capture(payloadSlot),
                )
            }

            userSlot.captured shouldBe "user-123"
            destinationSlot.captured shouldBe "/queue/session.status"
            payloadSlot.captured.status shouldBe "active"
        }

        test("handleKeystrokeBatch updates keystroke count and sends status") {
            // First start a session to get a valid sessionId
            val docId = UUID.randomUUID()
            handler.handleSessionStart(SessionStartRequest(documentId = docId), principal)

            // Capture the sessionId from the start response
            val startPayloadSlot = slot<SessionStartResponse>()
            verify {
                messagingTemplate.convertAndSendToUser(
                    any(),
                    any(),
                    capture(startPayloadSlot),
                )
            }
            val sessionId = startPayloadSlot.captured.sessionId

            // Send a keystroke batch
            val batch =
                KeystrokeBatchMessage(
                    sessionId = sessionId,
                    events =
                        listOf(
                            KeystrokeEventDto(
                                eventType = "keydown",
                                keyCategory = "letter",
                                timestampMs = 1000L,
                                dwellTimeMs = 80,
                            ),
                            KeystrokeEventDto(
                                eventType = "keyup",
                                keyCategory = "letter",
                                timestampMs = 1080L,
                            ),
                        ),
                )

            handler.handleKeystrokeBatch(batch, principal)

            val statusSlot = slot<SessionStatusMessage>()
            verify(atLeast = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-123"),
                    eq("/queue/session.status"),
                    capture(statusSlot),
                )
            }

            statusSlot.captured.sessionId shouldBe sessionId
            statusSlot.captured.status shouldBe "active"
            statusSlot.captured.totalKeystrokes shouldBe 2
        }

        test("handleKeystrokeBatch persists events via repository") {
            val docId = UUID.randomUUID()
            handler.handleSessionStart(SessionStartRequest(documentId = docId), principal)

            val startPayloadSlot = slot<SessionStartResponse>()
            verify {
                messagingTemplate.convertAndSendToUser(any(), any(), capture(startPayloadSlot))
            }
            val sessionId = startPayloadSlot.captured.sessionId

            val events =
                listOf(
                    KeystrokeEventDto(
                        eventType = "keydown",
                        keyCategory = "letter",
                        timestampMs = 1000L,
                        dwellTimeMs = 80,
                        flightTimeMs = 120,
                    ),
                )

            handler.handleKeystrokeBatch(
                KeystrokeBatchMessage(sessionId = sessionId, events = events),
                principal,
            )

            verify {
                keystrokeRepository.batchInsert(sessionId, events)
            }
        }

        test("handleKeystrokeBatch ignores unknown session") {
            val batch =
                KeystrokeBatchMessage(
                    sessionId = UUID.randomUUID(),
                    events =
                        listOf(
                            KeystrokeEventDto(
                                eventType = "keydown",
                                keyCategory = "letter",
                                timestampMs = 1000L,
                            ),
                        ),
                )

            handler.handleKeystrokeBatch(batch, principal)

            verify(exactly = 0) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }
        }

        test("handleKeystrokeBatch rejects wrong user") {
            // Start session as user-123
            val docId = UUID.randomUUID()
            handler.handleSessionStart(SessionStartRequest(documentId = docId), principal)

            val startPayloadSlot = slot<SessionStartResponse>()
            verify {
                messagingTemplate.convertAndSendToUser(any(), any(), capture(startPayloadSlot))
            }
            val sessionId = startPayloadSlot.captured.sessionId

            // Try to send keystrokes as a different user
            val otherPrincipal = mockk<Principal>()
            every { otherPrincipal.name } returns "other-user"

            val batch =
                KeystrokeBatchMessage(
                    sessionId = sessionId,
                    events =
                        listOf(
                            KeystrokeEventDto(
                                eventType = "keydown",
                                keyCategory = "letter",
                                timestampMs = 1000L,
                            ),
                        ),
                )

            handler.handleKeystrokeBatch(batch, otherPrincipal)

            // Only the session start response should have been sent, no status update for keystrokes
            verify(exactly = 1) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }
        }

        test("handleSessionEnd removes session and sends ended status") {
            // Start a session
            val docId = UUID.randomUUID()
            handler.handleSessionStart(SessionStartRequest(documentId = docId), principal)

            val startPayloadSlot = slot<SessionStartResponse>()
            verify {
                messagingTemplate.convertAndSendToUser(any(), any(), capture(startPayloadSlot))
            }
            val sessionId = startPayloadSlot.captured.sessionId

            // End the session
            handler.handleSessionEnd(sessionId, principal)

            val statusSlot = slot<SessionStatusMessage>()
            verify(atLeast = 1) {
                messagingTemplate.convertAndSendToUser(
                    eq("user-123"),
                    eq("/queue/session.status"),
                    capture(statusSlot),
                )
            }

            statusSlot.captured.sessionId shouldBe sessionId
            statusSlot.captured.status shouldBe "ended"
            statusSlot.captured.totalKeystrokes shouldBe 0
        }

        test("handleSessionEnd ignores already ended session") {
            handler.handleSessionEnd(UUID.randomUUID(), principal)

            verify(exactly = 0) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }
        }

        test("keystroke batch after session end is ignored") {
            // Start and end a session
            val docId = UUID.randomUUID()
            handler.handleSessionStart(SessionStartRequest(documentId = docId), principal)

            val startPayloadSlot = slot<SessionStartResponse>()
            verify {
                messagingTemplate.convertAndSendToUser(any(), any(), capture(startPayloadSlot))
            }
            val sessionId = startPayloadSlot.captured.sessionId

            handler.handleSessionEnd(sessionId, principal)

            // Clear invocations to isolate the next call
            io.mockk.clearMocks(messagingTemplate, answers = false)

            // Try sending keystrokes to ended session
            val batch =
                KeystrokeBatchMessage(
                    sessionId = sessionId,
                    events =
                        listOf(
                            KeystrokeEventDto(
                                eventType = "keydown",
                                keyCategory = "letter",
                                timestampMs = 2000L,
                            ),
                        ),
                )

            handler.handleKeystrokeBatch(batch, principal)

            verify(exactly = 0) {
                messagingTemplate.convertAndSendToUser(any(), any(), any())
            }
        }
    })
